const assert = require('node:assert/strict')
const { execFileSync, spawn } = require('node:child_process')
const { createServer } = require('node:http')
const { mkdtempSync, readFileSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join } = require('node:path')

const authOrigin = 'http://127.0.0.1:35431'
const restOrigin = 'http://127.0.0.1:35432'
const gatewayOrigin = 'http://127.0.0.1:35433'
const appOrigin = 'http://127.0.0.1:35430'
const accounts = ['owner', 'test-admin', 'member']
const withMemberships = process.argv.includes('--membership-a')
const withNus = withMemberships || process.argv.includes('--step2b')
const withBusinesses = withNus || process.argv.includes('--step2a')
const password = 'Local-only-fixture-123!'
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

async function waitFor(check, label) {
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      const result = await check()
      if (result) return result
    } catch {
      // Wait for the isolated service or page to finish starting.
    }
    await delay(500)
  }
  throw new Error(`Timed out: ${label}`)
}

async function auth(path, account) {
  const response = await fetch(authOrigin + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: `${account}@crm.test`, password }),
  })
  if (!response.ok) throw new Error(`Local Auth ${path} returned ${response.status}`)
  return response.json()
}

function db(...args) {
  return dbInput(undefined, ...args)
}

function dbInput(input, ...args) {
  return execFileSync('docker', ['compose', '-p', 'crm-step1-acceptance', '-f',
    'supabase/rollouts/crm-step-1/acceptance.compose.yml', 'exec', '-T', 'db', ...args],
  { encoding: 'utf8', input })
}

async function rest(session, path, method = 'GET', body) {
  const headers = { 'content-type': 'application/json', prefer: 'return=representation' }
  if (session) headers.authorization = `Bearer ${session.access_token}`
  const response = await fetch(restOrigin + path, { headers, method, body: JSON.stringify(body) })
  return { status: response.status, data: await response.json() }
}

async function verifyApi(sessions) {
  const [owner, admin, member] = sessions
  for (const session of [null, admin, member]) {
    for (const table of ['crm_customers', 'crm_customer_services', 'crm_locations', 'crm_services', 'crm_records']) {
      const { status, data } = await rest(session, `/${table}?select=id`)
      if (session) assert.deepEqual({ status, data }, { status: 200, data: [] })
      else assert.ok([401, 403].includes(status))
    }
    const denied = await rest(session, '/rpc/crm_create_customer', 'POST', {
      customer: { name: 'Unauthorized fixture' }, relations: [],
    })
    assert.ok([401, 403].includes(denied.status))
    if (session) {
      const update = await rest(session, '/crm_customers?id=eq.1', 'PATCH', { name: 'Unauthorized fixture' })
      assert.deepEqual(update.data, [])
    }
  }
  const created = await rest(owner, '/rpc/crm_create_customer', 'POST', {
    customer: { name: 'Acceptance customer' }, relations: [{ location_id: 1, service_id: 1 }],
  })
  assert.equal(created.status, 200)
  const path = `/crm_customers?id=eq.${created.data}`
  const joined = await rest(owner, path + '&select=id,crm_customer_services(location_id,service_id)')
  assert.deepEqual(joined.data[0].crm_customer_services, [{ location_id: 1, service_id: 1 }])
  for (const edit of [{ nickname: 'Edited fixture' }, { archived: true }, { archived: false }]) {
    const response = await rest(owner, path, 'PATCH', edit)
    assert.deepEqual(Object.fromEntries(Object.keys(edit).map(key => [key, response.data[0][key]])), edit)
  }
  assert.equal((await rest(owner, path, 'DELETE')).status, 403)
  const rolledBack = await rest(owner, '/rpc/crm_create_customer', 'POST', {
    customer: { name: 'Must roll back' }, relations: [{ location_id: 1, service_id: 99999 }],
  })
  assert.equal(rolledBack.data.code, '23503')
  assert.deepEqual((await rest(owner, '/crm_customers?name=eq.Must%20roll%20back')).data, [])
  console.log('PASS Auth JWTs and Data API CRM authorization, create, edit, archive, restore, rollback, delete denial')
}

async function verifyRevocation(owner) {
  const changes = [
    ["update public.profiles set status='scheduled_deletion', deleted_at=now() where email='owner@crm.test'",
      "update public.profiles set status='active', deleted_at=null where email='owner@crm.test'"],
    ["update public.profiles set is_admin=false where email='owner@crm.test'",
      "update public.profiles set is_admin=true where email='owner@crm.test'"],
    ['delete from crm_private.access_owner',
      "insert into crm_private.access_owner(user_id) select id from public.profiles where email='owner@crm.test'"],
  ]
  for (const [revoke, restore] of changes) {
    db('psql', '-X', '-v', 'ON_ERROR_STOP=1', '-c', revoke)
    try {
      assert.deepEqual((await rest(owner, '/crm_customers')).data, [])
      assert.equal((await rest(owner, '/rpc/is_crm_admin', 'POST', {})).data, false)
      assert.equal((await rest(owner, '/rpc/crm_create_customer', 'POST', {
        customer: { name: 'Revoked fixture' }, relations: [],
      })).status, 403)
    } finally {
      db('psql', '-X', '-v', 'ON_ERROR_STOP=1', '-c', restore)
    }
  }
  console.log('PASS Existing Auth session denied after scheduled deletion, admin removal, CRM permission removal')
}

function startGateway() {
  const server = createServer(async (request, response) => {
    response.setHeader('access-control-allow-origin', appOrigin)
    response.setHeader('access-control-allow-headers', '*')
    response.setHeader('access-control-allow-methods', 'GET,HEAD,POST,PATCH,DELETE,OPTIONS')
    response.setHeader('access-control-expose-headers', 'content-range')
    if (request.method === 'OPTIONS') return response.writeHead(204).end()
    const match = request.url.match(/^\/(auth|rest)\/v1(\/.*)$/)
    if (!match) return response.writeHead(404).end()
    const origin = match[1] === 'auth' ? authOrigin : restOrigin
    const headers = { ...request.headers }
    delete headers.host
    try {
      const upstream = await fetch(origin + match[2], {
        method: request.method, headers, redirect: 'manual',
        ...(['GET', 'HEAD'].includes(request.method) ? {} : { body: request, duplex: 'half' }),
      })
      for (const name of ['content-type', 'content-range']) {
        if (upstream.headers.has(name)) response.setHeader(name, upstream.headers.get(name))
      }
      response.writeHead(upstream.status).end(Buffer.from(await upstream.arrayBuffer()))
    } catch {
      response.writeHead(502).end()
    }
  })
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(35433, '127.0.0.1', () => resolve(server))
  })
}

async function verifyBrowser(sessions) {
  const gateway = await startGateway()
  const chromeProfile = mkdtempSync(join(tmpdir(), 'crm-step1-chrome-'))
  const env = {
    ...process.env, NEXT_PUBLIC_SUPABASE_URL: gatewayOrigin,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'crm-acceptance-local-only',
  }
  const app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '-H', '127.0.0.1', '-p', '35430'],
    { env, stdio: 'inherit', windowsHide: true })
  const browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-background-networking', '--no-first-run',
    '--remote-debugging-port=35434', `--user-data-dir=${chromeProfile}`, 'about:blank',
  ], { windowsHide: true, stdio: 'ignore' })
  let socket
  let readBrowserState
  try {
    await waitFor(async () => (await fetch(appOrigin + '/login')).ok, 'loopback app')
    const targets = await waitFor(async () => (await fetch('http://127.0.0.1:35434/json/list')).json(), 'Chrome')
    socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl)
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true })
      socket.addEventListener('error', reject, { once: true })
    })
    let id = 0
    const pending = new Map()
    socket.addEventListener('message', ({ data }) => {
      const result = JSON.parse(data)
      pending.get(result.id)?.(result)
      pending.delete(result.id)
    })
    function send(method, params = {}) {
      const requestId = ++id
      return new Promise((resolve, reject) => {
        pending.set(requestId, result => result.error ? reject(new Error(result.error.message)) : resolve(result.result))
        socket.send(JSON.stringify({ id: requestId, method, params }))
      })
    }
    const evaluate = async expression => (await send('Runtime.evaluate', { expression, returnByValue: true })).result?.value
    readBrowserState = () => evaluate("({ path: location.pathname, text: document.body?.innerText.slice(0, 1000) })")
    const click = label => evaluate(`Array.from(document.querySelectorAll('button')).find(button =>
      button.textContent.trim() === ${JSON.stringify(label)})?.click()`)
    const fill = (selector, value) => evaluate(`(() => {
      const input = document.querySelector(${JSON.stringify(selector)});
      const prototype = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, ${JSON.stringify(value)});
      input.dispatchEvent(new Event('input', { bubbles: true }));
    })()`)
    const hasText = value => evaluate(`document.body.innerText.includes(${JSON.stringify(value)})`)
    const select = (selector, value) => evaluate(`(() => {
      const field = document.querySelector(${JSON.stringify(selector)});
      field.value = ${JSON.stringify(value)};
      field.dispatchEvent(new Event('change', { bubbles: true }));
    })()`)
    socket.addEventListener('message', ({ data }) => {
      if (JSON.parse(data).method === 'Page.javascriptDialogOpening') {
        void send('Page.handleJavaScriptDialog', { accept: true })
      }
    })
    await send('Page.enable')
    await send('Network.enable')
    await send('Network.setBlockedURLs', { urls: ['*supabase.co*'] })
    if (withMemberships) await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
    await send('Page.navigate', { url: appOrigin + '/login' })
    await waitFor(() => evaluate(`location.origin === '${appOrigin}' && document.readyState === 'complete'`), 'login origin')
    const routes = [['/admin/customers', '顧客管理'], ['/admin/customers/1', 'existing fixture'],
      ['/admin/customers/settings', '担当先・サービス設定']]
    for (let index = 0; index < sessions.length; index++) {
      await evaluate(`localStorage.setItem('sb-127-auth-token', ${JSON.stringify(JSON.stringify(sessions[index]))})`)
      for (const [path, expected] of routes) {
        await send('Page.navigate', { url: appOrigin + path })
        const destination = index === 0 ? path : index === 1 ? '/admin' : '/'
        const expectedText = index === 0 ? expected : index === 1 ? '管理' : ''
        await waitFor(() => evaluate(`location.pathname === ${JSON.stringify(destination)} &&
          document.body.innerText.includes(${JSON.stringify(expectedText)}) &&
          !document.body.innerText.includes('読み込み中...')`), `${accounts[index]} ${path}`)
      }
      console.log(`PASS Browser CRM list, record and settings access: ${accounts[index]}`)
      if (index === 0) {
        if (withBusinesses && !withMemberships) {
          await send('Page.navigate', { url: appOrigin + '/admin/customers' })
          await waitFor(() => hasText('existing fixture'), 'migrated customer')
          await select('select[aria-label="事業で絞り込み"]', 'third_place')
          await waitFor(() => evaluate("document.body.innerText.includes('existing fixture') && !document.body.innerText.includes('Unassigned fixture')"), 'business filter')
          await select('select[aria-label="事業で絞り込み"]', 'unassigned')
          await waitFor(() => evaluate("document.body.innerText.includes('Unassigned fixture') && !document.body.innerText.includes('existing fixture')"), 'unassigned filter')
          await send('Page.navigate', { url: appOrigin + '/admin/customers/1' })
          await waitFor(() => hasText('未確認'), 'migrated customer stage')
          await click('＋ 事業を追加')
          await waitFor(() => hasText('追加する事業'), 'add business form')
          await select('section[aria-label="顧客の事業情報"] select', 'moments')
          await fill('section[aria-label="顧客の事業情報"] textarea', 'Synthetic business note')
          await click('事業情報を保存')
          await waitFor(() => hasText('Synthetic business note'), 'saved business note')
          assert.ok(await hasText('3rd place'))
          assert.ok(await hasText('moments'))
          const clickMoments = label => evaluate(`Array.from(document.querySelectorAll('section[aria-label="顧客の事業情報"] li'))
            .find(row => row.innerText.includes('moments'))?.querySelectorAll('button').forEach(button => {
              if (button.textContent.trim() === ${JSON.stringify(label)}) button.click();
            })`)
          await clickMoments('事業情報を編集')
          await waitFor(() => hasText('momentsの事業情報'), 'edit business form')
          await fill('section[aria-label="顧客の事業情報"] textarea', 'Edited business note')
          await click('事業情報を保存')
          await waitFor(() => hasText('Edited business note'), 'edited business note')
          await clickMoments('事業をアーカイブ')
          await waitFor(() => hasText('事業を復元'), 'archived business relationship')
          await clickMoments('事業を復元')
          await waitFor(() => evaluate("document.body.innerText.includes('Edited business note') && !document.body.innerText.includes('事業を復元')"), 'restored business relationship')
          console.log('PASS Browser business filters, multi-business add, edit, archive and restore')
        }
        const chooseMembership = label => evaluate(`[...document.querySelectorAll('form label')].find(item =>
          item.textContent.trim() === ${JSON.stringify(label)})?.querySelector('input[type=checkbox]')?.click()`)
        if (withMemberships) {
          await send('Page.navigate', { url: appOrigin + '/admin/customers/1' })
          await waitFor(() => hasText('所属未設定'), 'legacy customer remains unclassified')
          await click('所属を編集')
          await waitFor(() => hasText('所属（複数選択可）'), 'unified edit form')
          await chooseMembership('M.glitter')
          await chooseMembership('moments')
          await chooseMembership('Lilly')
          await chooseMembership('NUS')
          assert.ok(await evaluate("(() => {const f=document.querySelector('form');return f && f.scrollWidth<=f.clientWidth})()"))
          await click('保存')
          await waitFor(() => evaluate("document.querySelector('section[aria-label=\"現在の所属\"]')?.innerText.includes('M.glitter・NUS・Lilly') && document.body.innerText.includes('M.glitterのブランド：moments')"), 'save three groups and brand on same customer')
          console.log('PASS Mobile width unified membership edit, legacy preservation and multiple affiliations')
        }
        if (withNus) {
          if (!withMemberships) {
          await click('＋ 事業を追加')
          await waitFor(() => hasText('追加する事業'), 'add NUS to an existing customer')
          await select('section[aria-label="顧客の事業情報"] select', 'nus')
          await evaluate(`(() => {
            const field = document.querySelectorAll('section[aria-label="顧客の事業情報"] form select')[1];
            field.value = 'prospect'; field.dispatchEvent(new Event('change', { bubbles: true }));
          })()`)
          await click('事業情報を保存')
          }
          await waitFor(() => hasText('NUS情報を編集'), 'active NUS panel')
          await click('NUS情報を編集')
          await waitFor(() => hasText('アップライン'), 'NUS edit form')
          await evaluate(`Array.from(document.querySelectorAll('section[aria-label="NUS情報"] label')).find(label =>
            label.textContent.trim() === 'アップライン').querySelector('input').click()`)
          await fill('section[aria-label="NUS情報"] textarea', 'Synthetic NUS product note')
          await click('NUS情報を保存')
          await waitFor(() => evaluate("document.body.innerText.includes('Synthetic NUS product note') && document.body.innerText.includes('関係性：アップライン')"), 'NUS detail save')
          await click('連絡意思を記録')
          await waitFor(() => hasText('本人の意思'), 'contact preference form')
          await select('section[aria-label="連絡意思"] select', 'global')
          await evaluate(`document.querySelectorAll('section[aria-label="連絡意思"] select')[2].value = 'all_contact';
            document.querySelectorAll('section[aria-label="連絡意思"] select')[2].dispatchEvent(new Event('change', { bubbles: true }))`)
          await evaluate(`document.querySelector('section[aria-label="連絡意思"] input[type=checkbox]').click()`)
          await click('連絡意思を保存')
          await waitFor(() => hasText('ビジネス案内・商品案内・事務連絡'), 'global refusal blocks all NUS purposes')
          await send('Page.navigate', { url: appOrigin + '/admin/customers' })
          await waitFor(() => hasText('existing fixture'), 'CRM list after NUS edit')
          await select('select[aria-label="事業で絞り込み"]', 'nus')
          await waitFor(() => evaluate("!!document.querySelector('section[aria-label=\"NUS関係者の絞り込み\"]') && document.body.innerText.includes('existing fixture') && !document.body.innerText.includes('Unassigned fixture')"), 'NUS filtered list')
          await select('section[aria-label="NUS関係者の絞り込み"] select', withMemberships ? 'unconfirmed' : 'prospect')
          await waitFor(() => hasText('existing fixture'), 'NUS stage filter')
          console.log('PASS Browser NUS stage, relationship, profile, global refusal and filters')
        }
        await send('Page.navigate', { url: appOrigin + '/admin/customers' })
        await waitFor(() => hasText('＋ 新規顧客'), 'new customer control')
        await click('＋ 新規顧客')
        await waitFor(() => hasText('顧客を登録'), 'customer form')
        if (withMemberships) {
          await fill('input[name=name]', 'existing fixture')
          await click('顧客を登録')
          await waitFor(() => hasText('既存のカルテを開いてください'), 'duplicate candidate instead of creating')
        }
        await fill('input[name=name]', 'Browser customer')
        if (withMemberships) {
          await chooseMembership('M.glitter')
          await chooseMembership('unite')
          await chooseMembership('Lilly')
        }
        await click('顧客を登録')
        const detail = await waitFor(() => evaluate("location.pathname.match(/^\\/admin\\/customers\\/\\d+$/) && document.body.innerText.includes('Browser customer') && location.pathname"), 'browser registration')
        if (withMemberships) {
          assert.ok(await hasText('M.glitter・Lilly'))
          assert.ok(await hasText('M.glitterのブランド：unite'))
        }
        await click('編集')
        await waitFor(() => hasText(withMemberships ? '顧客情報と所属を編集' : '顧客情報を編集'), 'edit form')
        await fill('input[name=name]', 'Browser customer edited')
        await click('保存')
        await waitFor(() => hasText('Browser customer edited'), 'browser edit')
        await click('この顧客をアーカイブ')
        await waitFor(() => evaluate("location.pathname === '/admin/customers'"), 'browser archive')
        await send('Page.navigate', { url: appOrigin + detail })
        await waitFor(() => hasText('アーカイブから復元'), 'restore control')
        await click('アーカイブから復元')
        await waitFor(() => hasText('この顧客をアーカイブ'), 'browser restore')
        console.log('PASS Browser customer registration, edit, archive and restore')
      } else if (index === 1) {
        await send('Page.navigate', { url: appOrigin + '/admin/thai' })
        await waitFor(() => evaluate("location.pathname === '/admin/thai' && !!document.querySelector('h1')"), 'existing admin route')
        console.log('PASS Test administrator retains the existing admin route')
      } else {
        for (const [path, expected] of [['/asanas', 'Synthetic pose'], ['/sequences', 'Synthetic sequence'],
          ['/presets', 'Synthetic preset'], ['/mypage', 'プロフィール']]) {
          await send('Page.navigate', { url: appOrigin + path })
          if (path === '/asanas') {
            await waitFor(() => evaluate(`Array.from(document.querySelectorAll('button')).some(button =>
              button.textContent.includes('アーサナ') && button.textContent.includes('1件'))`), 'dictionary category with fixture')
            await evaluate(`Array.from(document.querySelectorAll('button')).find(button =>
              button.textContent.includes('アーサナ') && button.textContent.includes('1件') &&
              button.textContent.includes('▶'))?.click()`)
          }
          await waitFor(() => hasText(expected), `existing route with data ${path}`)
        }
        await fill('input[placeholder="表示名を入力"]', 'Synthetic updated profile')
        await click('表示名を保存')
        await waitFor(() => hasText('表示名を保存しました'), 'profile update')
        await click('退会する')
        await waitFor(() => hasText('退会申請中です'), 'general user scheduled deletion')
        await click('退会申請を取り消す')
        await waitFor(() => hasText('退会申請を取り消しました'), 'general user deletion cancellation')
        console.log('PASS General user dictionary, sequence, preset reads, profile edit, deletion request and cancellation')
      }
    }
    await evaluate('localStorage.clear()')
    await send('Page.navigate', { url: appOrigin + '/admin/customers' })
    await waitFor(() => evaluate("location.pathname === '/login'"), 'anonymous redirect')
    console.log('PASS Browser anonymous access redirect')
  } catch (error) {
    if (readBrowserState) console.error('Synthetic browser state:', await readBrowserState())
    throw error
  } finally {
    socket?.close()
    browser.kill()
    app.kill()
    gateway.close()
    try { rmSync(chromeProfile, { recursive: true, force: true }) } catch { /* Chrome can briefly hold its files */ }
  }
}

async function main() {
  await waitFor(async () => (await fetch(authOrigin + '/health')).ok, 'local GoTrue')
  await waitFor(async () => (await fetch(restOrigin)).ok, 'local PostgREST')
  if (process.argv.includes('--seed')) {
    for (const account of accounts) await auth('/signup', account)
    const fixtureScript = readFileSync(join(__dirname, 'acceptance-fixture.sh'), 'utf8').replaceAll('\r\n', '\n')
    dbInput(fixtureScript, 'bash')
    if (withBusinesses) {
      const fixture = `
update public.crm_services set name = 'ヨガ' where id = 1;
insert into public.crm_services (name) values ('ピラティス'), ('ネイル'), ('ヒプノ'), ('占い');
insert into public.crm_customer_services (customer_id, location_id, service_id) values (1, 1, 1);
insert into public.crm_customers (name) values ('Unassigned fixture');
`
      let migration = readFileSync(join(__dirname, '../crm-step-2a/01-businesses.sql'), 'utf8')
      if (withNus) migration += readFileSync(join(__dirname, '../crm-step-2b/01-nus.sql'), 'utf8')
      if (withMemberships) migration += readFileSync(join(__dirname, '../crm-membership-a/01-memberships.sql'), 'utf8')
      dbInput(fixture + migration + "\nnotify pgrst, 'reload schema';\n", 'psql', '-X', '-v', 'ON_ERROR_STOP=1')
    }
  }
  const sessions = await Promise.all(accounts.map(account => auth('/token?grant_type=password', account)))
  for (let index = 0; index < sessions.length; index++) {
    const response = await fetch(authOrigin + '/user', {
      headers: { authorization: `Bearer ${sessions[index].access_token}` },
    })
    assert.equal((await response.json()).email, `${accounts[index]}@crm.test`)
  }
  assert.equal(new Set(sessions.map(session => session.user.id)).size, 3)
  await verifyApi(sessions)
  if (withMemberships) {
    const tables = ['crm_groups', 'crm_customer_groups', 'crm_customer_group_brands']
    for (const session of [null, sessions[1], sessions[2]]) {
      for (const table of tables) {
        const response = await rest(session, `/${table}`)
        if (session) assert.deepEqual(response, { status: 200, data: [] })
        else assert.ok([401, 403].includes(response.status))
      }
      const write = await rest(session, '/rpc/crm_save_customer_memberships', 'POST', {
        target_customer_id: null, customer: { name: 'Denied' }, relations: [], selected_groups: ['nus'], selected_brands: [],
      })
      assert.ok([401, 403].includes(write.status))
    }
    console.log('PASS Data API membership rows and atomic save deny unauthorized users')
  }
  if (withNus) {
    for (const session of [null, sessions[1], sessions[2]]) {
      for (const table of ['crm_nus_profiles', 'crm_nus_customer_relationships', 'crm_contact_preference_events', 'crm_contact_preferences_current']) {
        const response = await rest(session, `/${table}`)
        if (session) assert.deepEqual(response, { status: 200, data: [] })
        else assert.ok([401, 403].includes(response.status))
      }
      const write = await rest(session, '/rpc/crm_save_nus_profile', 'POST', {
        target_customer_id: 1, details: {}, relationship_types: [],
      })
      assert.ok([401, 403].includes(write.status))
    }
    console.log('PASS Data API NUS rows and write RPC deny unauthorized users')
  }
  await verifyRevocation(sessions[0])
  if (process.argv.includes('--browser')) await verifyBrowser(sessions)
}

main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
