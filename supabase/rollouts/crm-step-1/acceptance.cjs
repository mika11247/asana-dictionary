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
const withCommonName = process.argv.includes('--common-name')
const legacyAppDir = process.env.CRM_ACCEPTANCE_LEGACY_APP_DIR
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
  const responseBody = await response.text()
  return { status: response.status, data: responseBody ? JSON.parse(responseBody) : null }
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
    customer: { name: 'Acceptance customer', nickname: 'Acceptance customer' }, relations: [{ location_id: 1, service_id: 1 }],
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
    customer: { name: 'Must roll back', nickname: 'Must roll back' }, relations: [{ location_id: 1, service_id: 99999 }],
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

function startGateway(nusFailure = () => 0) {
  const server = createServer(async (request, response) => {
    response.setHeader('access-control-allow-origin', appOrigin)
    response.setHeader('access-control-allow-headers', '*')
    response.setHeader('access-control-allow-methods', 'GET,HEAD,POST,PATCH,DELETE,OPTIONS')
    response.setHeader('access-control-expose-headers', 'content-range')
    if (request.method === 'OPTIONS') return response.writeHead(204).end()
    const match = request.url.match(/^\/(auth|rest)\/v1(\/.*)$/)
    if (!match) return response.writeHead(404).end()
    const failure = request.url.startsWith('/rest/v1/crm_nus_profiles?') && nusFailure()
    if (failure) return response.writeHead(failure, { 'content-type': 'application/json' }).end('{}')
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
  let nusFailure = 0
  const gateway = await startGateway(() => nusFailure)
  const chromeProfile = mkdtempSync(join(tmpdir(), 'crm-step1-chrome-'))
  const env = {
    ...process.env, NEXT_PUBLIC_SUPABASE_URL: gatewayOrigin,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'crm-acceptance-local-only',
  }
  const app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '-H', '127.0.0.1', '-p', '35430'],
    { env, cwd: legacyAppDir || process.cwd(), stdio: 'inherit', windowsHide: true })
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
      if (withCommonName && index === 0) {
        const owner = sessions[0]
        const oldLinks = await rest(owner, '/crm_customer_services?customer_id=eq.1&order=id')
        await send('Page.navigate', { url: appOrigin + '/admin/customers/1' })
        await waitFor(() => hasText('名前未登録'), 'legacy customer with no display name')
        await click('所属を編集')
        await waitFor(() => hasText('フルネーム（任意）'), 'legacy common form')
        assert.equal(await evaluate("document.querySelector('input[name=nickname]').required"), false)
        await select('select[name=photo_permission]', 'ok')
        await click('保存')
        await waitFor(() => evaluate("!document.querySelector('input[name=nickname]')"), 'legacy save without nickname')
        const legacy = await rest(owner, '/crm_customers?id=eq.1&select=name,nickname,photo_permission')
        assert.deepEqual(legacy.data, [{ name: 'existing fixture', nickname: null, photo_permission: 'ok' }])
        assert.deepEqual(await rest(owner, '/crm_customer_services?customer_id=eq.1&order=id'), oldLinks)

        const chooseGroup = (name) => evaluate(`[...document.querySelectorAll('form label')].find(label => label.textContent.trim() === ${JSON.stringify(name)}).querySelector('input').click()`)
        const ids = []
        for (const group of ['M.glitter', 'Lilly', 'NUS']) {
          await send('Page.navigate', { url: appOrigin + '/admin/customers' })
          await waitFor(() => hasText('＋ 新規顧客'), 'customer list')
          await click('＋ 新規顧客')
          await waitFor(() => hasText('フルネーム（任意）'), 'shared registration field order')
          assert.deepEqual(await evaluate("Array.from(document.querySelectorAll('form input[name]')).slice(0,3).map(input => input.name)"), ['nickname', 'name', 'name_yomi'])
          assert.equal(await evaluate("document.querySelector('input[name=nickname]').required"), true)
          await chooseGroup(group)
          if (group === 'M.glitter') assert.equal(await evaluate("!!document.querySelector('form label:has(select option[value=candidate])')"), false)
          if (group === 'Lilly') {
            await select('form select', 'ticket')
            await evaluate("[...document.querySelectorAll('form label')].find(label => label.textContent.trim()==='ヨガ')?.querySelector('input').click()")
          }
          if (group === 'NUS') {
            await select('form label:has(select option[value="candidate"]) select', 'candidate')
            await evaluate("document.querySelector('form details').open = true")
            await fill('form details textarea', 'Registration NUS note')
          }
          await fill('input[name=nickname]', '共通テスト名')
          await click('顧客を登録')
          if (ids.length) {
            await waitFor(() => hasText('既存のカルテを開いてください'), 'duplicate candidate across affiliations')
            for (const id of ids) assert.ok(await hasText('#' + id))
            await evaluate("document.querySelector('section[aria-label=\"既存顧客の候補\"] input').click()")
            await click('顧客を登録')
          }
          const path = await waitFor(() => evaluate("location.pathname.match(/^\\/admin\\/customers\\/\\d+$/) && document.querySelector('main h1')?.textContent.includes('共通テスト名') && location.pathname"), 'nickname-only record')
          const id = path.split('/').pop()
          ids.push(id)
          assert.deepEqual((await rest(owner, '/crm_customers?id=eq.' + id + '&select=name,name_yomi,nickname')).data,
            [{ name: null, name_yomi: null, nickname: '共通テスト名' }])
          await click('所属を編集')
          await waitFor(() => hasText('フルネーム（任意）'), 'common edit')
          await fill('input[name=name]', 'Synthetic formal ' + group)
          await fill('input[name=name_yomi]', '合成ふりがな')
          if (group === 'Lilly') await chooseGroup('NUS')
          await click('保存')
          await waitFor(() => hasText('Synthetic formal ' + group), 'formal name supplemental line')
          await click('所属を編集')
          await waitFor(() => hasText('フルネーム（任意）'), 'reopen common edit')
          await fill('input[name=name]', '')
          await fill('input[name=name_yomi]', '')
          if (group === 'Lilly') {
            await click('保存')
            await waitFor(() => hasText('空欄にすることを確認'), 'shared clear confirmation required')
            await evaluate("Array.from(document.querySelectorAll('form label')).find(label => label.textContent.includes('で共通の氏名情報')).querySelector('input').click()")
          }
          await click('保存')
          await waitFor(() => evaluate("!document.querySelector('input[name=nickname]')"), 'formal fields cleared')
          assert.deepEqual((await rest(owner, '/crm_customers?id=eq.' + id + '&select=name,name_yomi,nickname')).data,
            [{ name: null, name_yomi: null, nickname: '共通テスト名' }])
          assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'))
        }
        await send('Page.navigate', { url: appOrigin + '/admin/customers' })
        await waitFor(() => hasText('＋ 新規顧客'), 'list after edits')
        for (const [group, count] of [['M.glitter', 1], ['Lilly', 1], ['NUS', 2]]) {
          await click('条件をすべて解除')
          await click(group)
          await fill('input[placeholder^="名前"]', '共通テスト名')
          await waitFor(() => evaluate(`document.querySelectorAll('article').length === ${count}`), 'group search by display name')
        }
        console.log('PASS Common name: legacy save, all groups, duplicate IDs, optional fields, shared-name confirmation and 390px search')
        const id = ids[2]
        const categoryPath = '/crm_nus_categories?customer_id=eq.' + id + '&select=category,other_label'
        const relationshipPath = '/crm_nus_customer_relationships?customer_id=eq.' + id + '&order=type_code'
        const businessPath = '/crm_customer_businesses?customer_id=eq.' + id + '&business_code=eq.nus'
        const consentPath = '/crm_contact_preference_events?customer_id=eq.' + id
        assert.deepEqual((await rest(owner, categoryPath)).data, [{ category: 'candidate', other_label: null }])
        assert.deepEqual((await rest(owner, '/crm_nus_profiles?customer_id=eq.' + id + '&select=product_note')).data,
          [{ product_note: 'Registration NUS note' }])
        assert.equal((await rest(owner, businessPath, 'PATCH', { stage: 'prospect' })).status, 200)
        const details = {
          product_interest: 'interested', product_note: 'Synthetic product note', business_interest: 'considering',
          disclosure_status: 'unknown', product_proposal_status: 'done', product_proposal_on: '2020-01-01',
          business_proposal_status: 'unknown',
        }
        assert.ok((await rest(owner, '/rpc/crm_save_nus_profile', 'POST', {
          target_customer_id: Number(id), details, relationship_types: [{ type_code: 'upline' }, { type_code: 'downline' }],
        })).status < 300)
        await send('Page.navigate', { url: appOrigin + '/admin/customers/' + id })
        await waitFor(() => hasText('NUS情報を編集'), 'NUS detail loaded')
        await click('連絡意思を記録')
        await waitFor(() => hasText('本人の意思'), 'NUS preference input')
        await select('section[aria-label="連絡意思"] select', 'global')
        await evaluate("document.querySelector('section[aria-label=\"連絡意思\"] input[type=checkbox]').click()")
        await click('連絡意思を保存')
        await waitFor(async () => (await rest(owner, consentPath)).data.length === 1, 'global refusal saved')
        const [oldRelations, oldBusiness, oldConsent] = await Promise.all([relationshipPath, businessPath, consentPath].map(path => rest(owner, path)))
        const lillyId = ids[1]
        await send('Page.navigate', { url: appOrigin + '/admin/customers/' + lillyId })
        await waitFor(() => hasText('Lilly情報を編集'), 'Lilly dedicated information')
        await click('所属を編集')
        await waitFor(() => hasText('Lillyの会員種別'), 'common edit loads Lilly fields')
        assert.equal(await evaluate("document.querySelector('form select').value"), 'ticket')
        await evaluate("[...document.querySelectorAll('form label')].find(label => label.textContent.trim()==='マシンピラティス').querySelector('input').click()")
        await click('保存')
        await waitFor(() => evaluate("!document.querySelector('input[name=nickname]')"), 'Lilly edit saved')
        assert.deepEqual((await rest(owner, '/crm_lilly_profiles?customer_id=eq.' + lillyId + '&select=membership,service_codes')).data,
          [{ membership: 'ticket', service_codes: ['yoga', 'machine'] }])
        await send('Page.navigate', { url: appOrigin + '/admin/customers/' + id })
        await waitFor(() => hasText('NUS情報を編集'), 'NUS detail for common edit')
        await click('所属を編集')
        await waitFor(() => hasText('NUS専用情報'), 'common edit loads NUS fields')
        assert.equal(await evaluate("document.querySelector('form label:has(select option[value=candidate]) select').value"), 'candidate')
        await evaluate("document.querySelector('form details').open=true")
        assert.equal(await evaluate("document.querySelector('form details textarea').value"), 'Synthetic product note')
        await click('保存')
        await waitFor(() => evaluate("!document.querySelector('input[name=nickname]')"), 'untouched dedicated fields saved safely')
        for (const [code, label, memo] of [
          ['user','愛用者'], ['downline','ダウンライン'], ['upline','アップライン'],
          ['other','その他','合成メモ'], ['other','その他','編集後の合成メモ'], ['candidate','候補'], ['', '未設定'],
        ]) {
          await click('NUS情報を編集')
          await waitFor(() => hasText('NUS情報を保存'), 'NUS classification edit')
          await select('section[aria-label="NUS情報"] form select', code)
          if (memo) await fill('section[aria-label="NUS情報"] input[maxlength="200"]', memo)
          await click('NUS情報を保存')
          await waitFor(() => hasText('NUS区分：' + label), 'saved NUS classification')
          assert.deepEqual((await rest(owner, categoryPath)).data, [{ category: code || null, other_label: memo || null }])
          await send('Page.navigate', { url: appOrigin + '/admin/customers' })
          await waitFor(() => hasText('＋ 新規顧客'), 'NUS list')
          await click('NUS')
          await waitFor(() => evaluate("!!document.querySelector('#filters-nus select')"), 'NUS category filter')
          await select('#filters-nus select', code || 'unset')
          await waitFor(() => evaluate(`!!document.querySelector('article a[href="/admin/customers/${id}"]')`), 'NUS filter match')
          await send('Page.navigate', { url: appOrigin + '/admin/customers/' + id })
          await waitFor(() => hasText('NUS情報を編集'), 'reopen NUS profile')
        }
        assert.deepEqual(await rest(owner, relationshipPath), oldRelations)
        assert.deepEqual(await rest(owner, businessPath), oldBusiness)
        assert.deepEqual(await rest(owner, consentPath), oldConsent)
        assert.ok(await hasText('Synthetic product note'))
        assert.ok(await hasText('2020-01-01'))
        assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'))
        console.log('PASS NUS single category, legacy conflicts preserved, refusal preservation and 390px filters')
        for (const theme of ['light','dark']) {
          await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme }] })
          await send('Page.navigate', { url: appOrigin + '/admin/customers' })
          await waitFor(() => hasText('＋ 新規顧客'), 'CRM list theme')
          await click('＋ 新規顧客')
          await waitFor(() => hasText('顧客を登録'), 'CRM dialog theme')
          const metrics = await evaluate(`(() => {
            const surface = document.querySelector('[role=dialog] > div')
            const input = surface.querySelector('input[name=nickname]')
            const ctx = document.createElement('canvas').getContext('2d')
            function luminance(color) {
              ctx.clearRect(0,0,1,1); ctx.fillStyle=color; ctx.fillRect(0,0,1,1)
              const rgb=[...ctx.getImageData(0,0,1,1).data].slice(0,3).map(x=>x/255).map(x=>x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4)
              return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722
            }
            function ratio(a,b) { const values=[luminance(a),luminance(b)].sort((x,y)=>y-x); return (values[0]+0.05)/(values[1]+0.05) }
            const frame=getComputedStyle(surface), field=getComputedStyle(input)
            const search=document.querySelector('input[placeholder^="名前"]')
            return [ratio(frame.color,frame.backgroundColor), ratio(field.color,field.backgroundColor),
              ratio(getComputedStyle(search,'::placeholder').color,getComputedStyle(search).backgroundColor),
              document.documentElement.scrollWidth<=innerWidth]
          })()`)
          assert.ok(metrics.slice(0,3).every(value => value >= 4.5), theme + ' contrast ' + metrics)
          assert.equal(metrics[3], true)
        }
        console.log('PASS CRM 390px light and dark form, dialog and search contrast')
        await send('Emulation.setEmulatedMedia', { features: [] })
        continue
      }
      if (legacyAppDir) {
        if (index !== 0) continue
        await send('Page.navigate', { url: appOrigin + '/admin/customers' })
        await waitFor(() => hasText('＋ 新規顧客'), 'legacy application customer list')
        await click('＋ 新規顧客')
        await waitFor(() => hasText('顧客を登録'), 'legacy customer form')
        await fill('input[name=name]', 'Legacy UI fixture')
        await click('顧客を登録')
        await waitFor(() => hasText('Legacy UI fixture'), 'old app registers after new schema')
        await click('編集')
        await waitFor(() => hasText('顧客情報と所属を編集'), 'legacy edit form')
        await fill('input[name=name]', 'Legacy UI edited')
        await click('保存')
        await waitFor(() => hasText('Legacy UI edited'), 'old app edits after new schema')
        console.log('PASS Production 969dbd9 browser list, record, create and edit with the new DB schema')
        continue
      }
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
          const legacyBefore = await rest(sessions[0], '/crm_customer_services?customer_id=eq.1&location_id=eq.1&order=id')
          await send('Page.navigate', { url: appOrigin + '/admin/customers' })
          await waitFor(() => hasText('existing fixture'), 'customer list loaded')
          await click('所属未設定')
          await waitFor(() => hasText('existing fixture'), 'legacy service customer is still unassigned')
          await click('旧サービス情報を確認')
          await evaluate("document.querySelector('#filters-legacy input').click()")
          await waitFor(() => evaluate("document.body.innerText.includes('existing fixture') && !document.body.innerText.includes('Unassigned fixture')"), 'legacy location filter')
          await click('旧サービス情報を確認（1件適用中）')
          await waitFor(() => hasText('1件適用中'), 'collapsed filter summary')
          await click('条件をすべて解除')
          await click('Lilly')
          await waitFor(() => hasText('該当する顧客はいません。'), 'legacy service alone does not count as Lilly membership')
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
          await click('Lilly情報を編集')
          await select('section[aria-label="Lilly専用情報"] select', 'monthly')
          await evaluate("document.querySelectorAll('section[aria-label=\"Lilly専用情報\"] input[type=checkbox]')[1].click()")
          await click('Lilly情報を保存')
          await waitFor(() => hasText('月謝（通い放題）'), 'Lilly membership save')
          assert.deepEqual(await rest(sessions[0], '/crm_customer_services?customer_id=eq.1&location_id=eq.1&order=id'), legacyBefore)
          await send('Page.navigate', { url: appOrigin + '/admin/customers' })
          await waitFor(() => hasText('existing fixture'), 'membership list loaded')
          await click('M.glitter')
          const brand = (name) => evaluate(`[...document.querySelectorAll('#filters-mglitter label')].find(label => label.textContent.trim() === ${JSON.stringify(name)}).querySelector('input').click()`)
          assert.equal(await evaluate("document.querySelectorAll('#filters-mglitter input').length"), 7)
          await brand('3rd place')
          await waitFor(() => hasText('該当する顧客はいません。'), 'legacy business is not an explicit brand')
          await brand('moments')
          await waitFor(() => hasText('existing fixture'), 'explicit brand matches')
          await click('Lilly')
          await waitFor(() => hasText('existing fixture'), 'same customer matches Lilly')
          assert.equal(await evaluate("document.querySelectorAll('article').length"), 1)
          assert.equal(await evaluate("document.querySelector('#filters-mglitter').hidden"), true)
          await click('M.glitter')
          await select('#filters-lilly select', 'monthly')
          await evaluate("document.querySelectorAll('#filters-lilly input')[0].click()")
          await waitFor(() => hasText('該当する顧客はいません。'), 'Lilly profile does not infer services from legacy rows')
          await evaluate("document.querySelectorAll('#filters-lilly input')[1].click()")
          await waitFor(() => hasText('existing fixture'), 'Lilly service OR and membership AND')
          await click('所属未設定')
          await waitFor(() => hasText('Unassigned fixture'), 'unassigned OR group')
          await click('M.glitter')
          assert.equal(await evaluate("document.querySelectorAll('#filters-mglitter input:checked').length"), 2)
          assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'))
          await send('Page.navigate', { url: appOrigin + '/admin/customers/1' })
          await waitFor(() => hasText('NUS情報を編集'), 'return to customer detail')
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
          if (withMemberships) await click('NUS')
          else await select('select[aria-label="事業で絞り込み"]', 'nus')
          const nusStage = withMemberships ? '#filters-nus select' : 'section[aria-label="NUS関係者の絞り込み"] select'
          await waitFor(() => evaluate(`!!document.querySelector(${JSON.stringify(nusStage)}) && document.body.innerText.includes('existing fixture') && !document.body.innerText.includes('Unassigned fixture')`), 'NUS filtered list')
          await select(nusStage, withMemberships ? 'unconfirmed' : 'prospect')
          await waitFor(() => hasText('existing fixture'), 'NUS stage filter')
          if (withMemberships) {
            nusFailure = 503
            await click('NUS')
            await click('NUS')
            await waitFor(() => hasText('NUS情報を読み込めませんでした。'), 'NUS only failure')
            assert.equal(await hasText('該当する顧客はいません。'), false)
            await click('Lilly')
            await waitFor(() => hasText('一部の検索結果'), 'mixed results disclose incomplete NUS branch')
            assert.ok(await hasText('existing fixture'))
            nusFailure = 403
            await click('NUS')
            await click('NUS')
            await waitFor(() => hasText('CRMを閲覧できません。'), 'NUS authorization failure hides results')
            assert.equal(await hasText('existing fixture'), false)
            nusFailure = 0
          }
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
          await chooseMembership('Lilly')
          assert.equal(await evaluate("document.querySelector('input[name=name]')"), null)
          await fill('input[name=nickname]', 'existing fixture')
          await click('顧客を登録')
          await waitFor(() => hasText('既存のカルテを開いてください'), 'Lilly nickname candidate')
          await fill('input[name=nickname]', 'Nickname-only fixture')
          await select('form select', 'ticket')
          await evaluate("const choices = document.querySelectorAll('form fieldset input[type=checkbox]'); choices[choices.length - 3].click(); choices[choices.length - 1].click()")
          await click('顧客を登録')
          await waitFor(() => hasText('Lilly情報を編集'), 'nickname-only Lilly registration')
          const nickId = await evaluate("location.pathname.split('/').pop()")
          const nick = await rest(sessions[0], `/crm_customers?id=eq.${nickId}&select=name,name_yomi,nickname,crm_lilly_profiles(membership,service_codes)`)
          assert.deepEqual(nick.data, [{ name: null, name_yomi: null, nickname: 'Nickname-only fixture',
            crm_lilly_profiles: { membership: 'ticket', service_codes: ['yoga', 'machine'] } }])
          await send('Page.navigate', { url: appOrigin + '/admin/customers' })
          await waitFor(() => hasText('＋ 新規顧客'), 'return to list from Lilly-only record')
          await click('＋ 新規顧客')
          await waitFor(() => hasText('顧客を登録'), 'reopen customer form')
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
          const id = detail.split('/').pop()
          for (const table of ['crm_customer_services', 'crm_records']) {
            assert.deepEqual(await rest(sessions[0], `/${table}?customer_id=eq.${id}`), { status: 200, data: [] })
          }
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
        if (withMemberships) {
          const owner = sessions[0]
          const create = (customer, groups, relations = []) => rest(owner, '/rpc/crm_save_customer_memberships', 'POST', {
            target_customer_id: null, customer, relations, selected_groups: groups, selected_brands: [],
          })
          const legacy = await create({ name: 'Formal Lilly only', name_yomi: 'Formal reading' }, ['lilly'],
            [{ location_id: 1, service_id: 1, membership_type: '回数券' }])
          assert.equal(legacy.status, 200)
          const path = `/crm_customer_services?customer_id=eq.${legacy.data}&location_id=eq.1`
          const legacyServices = await rest(owner, path)
          assert.equal(legacyServices.data.length, 1, 'old app payload retains newly registered Lilly link')
          const details = { name: 'Formal Lilly only', name_yomi: 'Formal reading' }
          const oldEdit = (groups, relations) => rest(owner, '/rpc/crm_save_customer_memberships', 'POST', {
            target_customer_id: legacy.data, customer: details, relations, selected_groups: groups, selected_brands: [],
          })
          assert.equal((await oldEdit(['lilly'], [{ location_id: 1, service_id: 1, membership_type: '月謝' }])).status, 200)
          assert.deepEqual(await rest(owner, path), legacyServices)
          await send('Page.navigate', { url: appOrigin + `/admin/customers/${legacy.data}` })
          await waitFor(() => hasText(`呼び名未登録 #${legacy.data}`), 'formal name without nickname uses ID fallback')
          assert.equal(await hasText('Formal Lilly only'), false)
          assert.equal(await hasText('Formal reading'), false)
          await click('所属を編集')
          await waitFor(() => hasText('顧客情報と所属を編集'), 'Lilly shared edit')
          assert.equal(await evaluate("!!document.querySelector('input[name=name]')"), false)
          await click('保存')
          await waitFor(() => evaluate("!document.querySelector('input[name=nickname]')"), 'shared edit saved')
          assert.deepEqual(await rest(owner, path), legacyServices)
          for (const group of ['mglitter', 'nus']) {
            assert.equal((await oldEdit(['lilly', group], [])).status, 200)
            assert.deepEqual(await rest(owner, path), legacyServices)
            await send('Page.navigate', { url: appOrigin + `/admin/customers/${legacy.data}?view=lilly` })
            await waitFor(() => hasText(`呼び名未登録 #${legacy.data}`), 'joint membership Lilly view')
            await click('所属を編集')
            await waitFor(() => hasText('顧客情報と所属を編集'), 'joint shared edit')
            assert.equal(await evaluate("!!document.querySelector('input[name=name], input[name=name_yomi]')"), false)
            await click('キャンセル')
          }
          await click('Lilly情報を編集')
          await fill('section[aria-label="Lilly専用情報"] input:not([type=checkbox])', 'Nickname-only fixture')
          await click('Lilly情報を保存')
          await waitFor(() => hasText('Nickname-only fixture'), 'Lilly nickname update')
          const sameNames = await rest(owner, '/crm_customers?nickname=eq.Nickname-only%20fixture&select=id,name,name_yomi')
          assert.equal(sameNames.data.length, 2)
          assert.ok(sameNames.data.some(({ name, name_yomi }) => name === details.name && name_yomi === details.name_yomi))
          await send('Page.navigate', { url: appOrigin + '/admin/customers' })
          await waitFor(() => hasText('＋ 新規顧客'), 'list loaded for Lilly search')
          await click('Lilly')
          await fill('input[placeholder^="名前"]', 'Nickname-only fixture')
          await waitFor(() => evaluate("document.querySelectorAll('article').length === 2"), 'duplicate nicknames remain searchable as distinct IDs')
          assert.equal(await hasText('Formal Lilly only'), false)
          await fill('input[placeholder^="名前"]', 'Formal Lilly only')
          await waitFor(() => hasText('該当する顧客はいません。'), 'Lilly search does not match hidden formal name')
          for (const group of ['mglitter', 'nus']) {
            assert.ok((await create({ nickname: 'Missing required name' }, [group])).status >= 400)
          }
          assert.ok((await rest(owner, '/rpc/crm_create_customer', 'POST', {
            customer: { nickname: 'Missing required name' }, relations: [],
          })).status >= 400)
          console.log('PASS Lilly nickname privacy, distinct IDs, old app payloads, legacy rows and required shared names')
        }
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
alter table public.crm_customers add constraint crm_customers_name_not_blank check (length(trim(name)) > 0);
update public.crm_services set name = 'ヨガ' where id = 1;
insert into public.crm_services (name) values ('ピラティス'), ('ネイル'), ('ヒプノ'), ('占い');
insert into public.crm_customer_services (customer_id, location_id, service_id) values (1, 1, 1);
insert into public.crm_customers (name) values ('Unassigned fixture');
`
      let migration = readFileSync(join(__dirname, '../crm-step-2a/01-businesses.sql'), 'utf8')
      if (withNus) migration += readFileSync(join(__dirname, '../crm-step-2b/01-nus.sql'), 'utf8')
      if (withMemberships) migration += readFileSync(join(__dirname, '../crm-membership-a/01-memberships.sql'), 'utf8') +
        readFileSync(join(__dirname, '../crm-lilly/01-lilly.sql'), 'utf8') + `
update public.crm_customers set nickname='existing fixture' where id=1;
update public.crm_customer_services set membership_type='回数券' where customer_id=1 and location_id=1 and service_id=1;
insert into public.crm_customer_services (customer_id, location_id, service_id, membership_type)
values (1, 1, 2, '月謝');
`
      if (withCommonName) migration += "update public.crm_customers set nickname=null where id=1;\n" +
        readFileSync(join(__dirname, '../crm-common-name/01-common-name.sql'), 'utf8') +
        readFileSync(join(__dirname, '../crm-nus-category/01-category.sql'), 'utf8') +
        readFileSync(join(__dirname, '../crm-membership-form/01-save-details.sql'), 'utf8')
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
  if (withCommonName) {
    for (const [path, args] of [
      ['/rpc/crm_create_customer', { customer: { name: 'Formal only rejected' }, relations: [] }],
      ['/rpc/crm_create_nus_customer', { customer: { name: 'Formal only rejected' }, relations: [] }],
      ['/rpc/crm_save_customer_memberships', { target_customer_id: null, customer: { name: 'Formal only rejected' }, relations: [], selected_groups: ['mglitter'], selected_brands: [] }],
      ['/rpc/crm_create_customer_with_lilly', { customer: { nickname: '  ' }, relations: [], selected_groups: ['lilly'], selected_brands: [], membership_code: 'unknown', selected_services: [] }],
      ['/crm_customers', { name: 'Direct insert rejected' }],
    ]) {
      const rejected = await rest(sessions[0], path, 'POST', args)
      assert.equal(rejected.data.code, '23514')
    }
    console.log('PASS DB and RPC enforce a nonblank nickname for every new customer')
    const input = { customer: { nickname: 'NUS atomic rollback' }, relations: [], selected_groups: ['nus'],
      selected_brands: [], lilly_details: null, category_code: 'other', other_value: '  ' }
    assert.equal((await rest(sessions[0], '/rpc/crm_create_customer_with_nus_category', 'POST', input)).data.code, '23514')
    assert.deepEqual((await rest(sessions[0], '/crm_customers?nickname=eq.NUS%20atomic%20rollback')).data, [])
    const combinedFailure = await rest(sessions[0], '/rpc/crm_save_customer_membership_details', 'POST', {
      target_customer_id: null, customer: { nickname: 'Combined rollback fixture' }, relations: [], selected_groups: ['lilly','nus'], selected_brands: [],
      lilly_patch: { membership: 'ticket', services: ['yoga'] }, nus_category_patch: { category: 'other' }, nus_profile_patch: null,
    })
    assert.equal(combinedFailure.data.code, '23514')
    assert.deepEqual((await rest(sessions[0], '/crm_customers?nickname=eq.Combined%20rollback%20fixture')).data, [])
    const mixed = await rest(sessions[0], '/rpc/crm_create_customer_with_nus_category', 'POST', {
      ...input, customer: { nickname: 'NUS mixed membership fixture' }, selected_groups: ['mglitter', 'nus', 'lilly'],
      selected_brands: ['moments'], lilly_details: { membership: 'ticket', services: ['yoga'] },
      category_code: 'downline', other_value: null,
    })
    assert.equal(mixed.status, 200)
    const mixedRecord = await rest(sessions[0], '/crm_customers?id=eq.' + mixed.data +
      '&select=crm_customer_groups(group_code),crm_lilly_profiles(membership,service_codes),crm_nus_categories(category)')
    assert.deepEqual(mixedRecord.data[0].crm_customer_groups.map(({ group_code }) => group_code).sort(), ['lilly', 'mglitter', 'nus'])
    assert.deepEqual(mixedRecord.data[0].crm_lilly_profiles, { membership: 'ticket', service_codes: ['yoga'] })
    assert.deepEqual(mixedRecord.data[0].crm_nus_categories, { category: 'downline' })
    for (const session of [null, sessions[1], sessions[2]]) {
      const read = await rest(session, '/crm_nus_categories')
      if (session) assert.deepEqual(read, { status: 200, data: [] })
      else assert.ok([401, 403].includes(read.status))
      for (const [name, args] of [
        ['crm_create_customer_with_nus_category', { ...input, category_code: 'candidate', other_value: null }],
        ['crm_save_nus_profile_and_category', { target_customer_id: 1, details: {}, category_code: 'candidate', other_value: null }],
        ['crm_save_customer_membership_details', { target_customer_id: null, customer: { nickname: 'Denied' }, relations: [], selected_groups: ['nus'], selected_brands: [], lilly_patch: null, nus_category_patch: { category: 'candidate' }, nus_profile_patch: null }],
      ]) {
        assert.ok([401, 403].includes((await rest(session, '/rpc/' + name, 'POST', args)).status))
      }
    }
    console.log('PASS NUS category RLS, RPC denial and atomic rollback')
  }
  if (withMemberships) {
    const tables = ['crm_groups', 'crm_customer_groups', 'crm_customer_group_brands', 'crm_lilly_profiles']
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
      const lillyWrite = await rest(session, '/rpc/crm_save_lilly_profile', 'POST', {
        target_customer_id: 1, membership_code: 'trial', selected_services: [], nickname_value: 'Denied',
      })
      assert.ok([401, 403].includes(lillyWrite.status))
    }
    const invalidLilly = await rest(sessions[0], '/rpc/crm_create_customer_with_lilly', 'POST', {
      customer: { nickname: 'Atomic failure fixture' }, relations: [], selected_groups: ['lilly'], selected_brands: [],
      membership_code: 'trial', selected_services: ['yoga', 'invalid'],
    })
    assert.ok(invalidLilly.status >= 400)
    assert.deepEqual((await rest(sessions[0], '/crm_customers?nickname=eq.Atomic%20failure%20fixture')).data, [])
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
