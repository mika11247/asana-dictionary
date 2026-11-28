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
const withRecordContext = process.argv.includes('--record-context')
const withPrivateImages = process.argv.includes('--private-images')
const imageRollbackDir = process.env.ASANA_ACCEPTANCE_ROLLBACK_DIR
const imageBrowserOnly = withPrivateImages && process.argv.includes('--image-browser-only')
const imageCompatibility = withPrivateImages && process.argv.includes('--image-compatibility')
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

function verifyRecordMigration() {
  const query = (input) => dbInput(input, 'psql', '-X', '-Atq', '-v', 'ON_ERROR_STOP=1').trim()
  const fingerprint = `select md5(jsonb_agg(to_jsonb(r)-'record_group_code'-'record_brand_code'-'location_label'-'service_label' order by r.id)::text)
    from public.crm_records r where r.location_id is not null or r.service_id is not null;`
  const oldHash = query(fingerprint)
  const migration = readFileSync(join(__dirname, '../crm-records/02-import-record-context.sql'), 'utf8')
  const apply = (prefix = '') => query("begin;\n" + prefix + "set local crm.records_source_hash='" + oldHash + "';\n" + migration + "\ncommit;")
  assert.throws(() => apply("alter table crm_records disable trigger crm_validate_record_context;\nupdate crm_records set service_id=2 where id=1;\n"),
    /Unapproved legacy record source/)
  assert.equal(query(fingerprint), oldHash)
  apply()
  assert.equal(query("select count(*) from crm_records where service_label='ヨガ' and record_group_code is not null;"), '4')
  assert.equal(query(fingerprint), oldHash)
  const resultHash = query('select md5(jsonb_agg(to_jsonb(r) order by id)::text) from crm_records r;')
  apply()
  assert.equal(query('select md5(jsonb_agg(to_jsonb(r) order by id)::text) from crm_records r;'), resultHash)
  assert.throws(() => apply("alter table crm_records disable trigger crm_validate_record_context;\nalter table crm_records disable trigger set_crm_records_updated_at;\nupdate crm_records set location_label='Synthetic conflicting location' where id=1;\n"),
    /Existing record context conflicts/)
  assert.equal(query('select md5(jsonb_agg(to_jsonb(r) order by id)::text) from crm_records r;'), resultHash)
  console.log('PASS Four historical records, original fields, zero-change replay, invalid source and conflict rollback')
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
  assert.deepEqual(joined.data[0].crm_customer_services, withRecordContext ? [] : [{ location_id: 1, service_id: 1 }])
  for (const edit of [{ nickname: 'Edited fixture' }, { archived: true }, { archived: false }]) {
    const response = await rest(owner, path, 'PATCH', edit)
    assert.deepEqual(Object.fromEntries(Object.keys(edit).map(key => [key, response.data[0][key]])), edit)
  }
  assert.equal((await rest(owner, path, 'DELETE')).status, 403)
  if (!withRecordContext) {
    const rolledBack = await rest(owner, '/rpc/crm_create_customer', 'POST', {
      customer: { name: 'Must roll back', nickname: 'Must roll back' }, relations: [{ location_id: 1, service_id: 99999 }],
    })
    assert.equal(rolledBack.data.code, '23503')
    assert.deepEqual((await rest(owner, '/crm_customers?name=eq.Must%20roll%20back')).data, [])
  }
  console.log('PASS Auth JWTs and Data API CRM authorization, create, edit, archive, restore and delete denial')
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

function startGateway(nusFailure = () => 0, imageChecks = {}) {
  const server = createServer(async (request, response) => {
    const rollbackOrigin = 'http://127.0.0.1:35436'
    response.setHeader('access-control-allow-origin',
      imageRollbackDir && request.headers.origin === rollbackOrigin ? rollbackOrigin : appOrigin)
    response.setHeader('access-control-allow-headers', '*')
    response.setHeader('access-control-allow-methods', 'GET,HEAD,POST,PATCH,DELETE,OPTIONS')
    response.setHeader('access-control-expose-headers', 'content-range')
    if (request.method === 'OPTIONS') return response.writeHead(204).end()
    const match = request.url.match(/^\/(auth|rest|storage)\/v1(\/.*)$/)
    if (!match) return response.writeHead(404).end()
    const failure = request.url.startsWith('/rest/v1/crm_nus_profiles?') && nusFailure()
    if (failure) return response.writeHead(failure, { 'content-type': 'application/json' }).end('{}')
    if (request.method === 'PATCH' && request.url.startsWith('/rest/v1/asanas?') && imageChecks.failSave) {
      imageChecks.failSave = false
      return response.writeHead(503, { 'content-type': 'application/json' }).end('{}')
    }
    if (request.method === 'GET' && imageChecks.failDownload &&
        /\/object\/(?:authenticated\/)?asana-images-private\//.test(request.url)) {
      imageChecks.failedDownloads = (imageChecks.failedDownloads || 0) + 1
      response.writeHead(503, { 'Content-Type': 'application/json' })
      response.end('{}')
      return
    }
    const origin = { auth: authOrigin, rest: restOrigin, storage: 'http://127.0.0.1:35435' }[match[1]]
    const headers = { ...request.headers }
    delete headers.host
    try {
      const chunks = []
      if (!['GET', 'HEAD'].includes(request.method)) {
        for await (const chunk of request) chunks.push(chunk)
      }
      const upstream = await fetch(origin + match[2], {
        method: request.method, headers, redirect: 'manual',
        ...(['GET', 'HEAD'].includes(request.method) ? {} : { body: Buffer.concat(chunks) }),
        signal: AbortSignal.timeout(15000),
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
  const imageFixture = withPrivateImages ? await import('../asana-image-privacy/acceptance.mjs') : null
  let nusFailure = 0
  const imageChecks = {}
  const gateway = await startGateway(() => nusFailure, imageChecks)
  const chromeProfile = mkdtempSync(join(tmpdir(), 'crm-step1-chrome-'))
  const env = {
    ...process.env, NEXT_PUBLIC_SUPABASE_URL: gatewayOrigin,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'crm-acceptance-local-only',
    SUPABASE_SERVICE_ROLE_KEY: imageFixture?.serviceToken ?? '',
    NEXT_PUBLIC_PRIVATE_ASANA_UPLOADS: imageFixture && !imageCompatibility ? 'true' : 'false',
  }
  const app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '-H', '127.0.0.1', '-p', '35430'],
    { env, cwd: legacyAppDir || process.cwd(), stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
  let appLog = ''
  for (const stream of [app.stdout, app.stderr]) {
    stream.on('data', chunk => {
      appLog += chunk.toString()
      if (!imageFixture) process.stdout.write(chunk)
    })
  }
  let rollbackApp
  const browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-background-networking', '--no-first-run',
    '--remote-debugging-port=35434', `--user-data-dir=${chromeProfile}`, 'about:blank',
  ], { windowsHide: true, stdio: 'ignore' })
  let socket
  let readBrowserState
  try {
    await waitFor(async () => (await fetch(appOrigin + '/login')).ok, 'loopback app')
    if (imageFixture) await imageFixture.verifyImages({ sessions, appOrigin, gatewayOrigin, compatibility: imageCompatibility })
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
      ...(withRecordContext ? [] : [['/admin/customers/settings', '担当先・サービス設定']])]
    if (withPrivateImages) {
      const openCategory = async () => {
        await waitFor(() => evaluate("[...document.querySelectorAll('button')].some(b => b.textContent.includes('アーサナ') && b.textContent.includes('▶'))"), 'dictionary category')
        await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.includes('アーサナ') && b.textContent.includes('▶')).click()")
      }
      const verifyPrivateImage = async () => {
        await waitFor(() => evaluate("[...document.images].some(i => i.alt === 'Synthetic pose')"), 'image mounted')
        await evaluate("[...document.images].find(i => i.alt === 'Synthetic pose').scrollIntoView()")
        await waitFor(() => evaluate("[...document.images].some(i => i.alt === 'Synthetic pose' && i.naturalWidth > 0 && i.src.startsWith('blob:'))"), 'private Blob image')
      }
      await evaluate(`localStorage.setItem('sb-127-auth-token', ${JSON.stringify(JSON.stringify(sessions[0]))})`)
      await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
      for (const theme of ['light', 'dark']) {
        await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme }] })
        await send('Page.navigate', { url: appOrigin + '/asanas' })
        await openCategory()
        await verifyPrivateImage()
        assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'))
      }
      await evaluate("window.print = () => { window.printImageReady = Boolean(document.querySelector('[data-asana-print-content] img')?.naturalWidth); window.dispatchEvent(new Event('afterprint')) }")
      await evaluate("[...document.querySelectorAll('span')].find(span => span.textContent.trim() === '詳細')?.click()")
      await waitFor(() => evaluate("[...document.querySelectorAll('button')].some(b => b.textContent.trim() === '📄')"), 'dictionary print button')
      await click('📄')
      await waitFor(() => evaluate('window.printImageReady === true'), 'dictionary print waits for private Blob image')
      await send('Page.navigate', { url: appOrigin + '/today-asana' })
      await verifyPrivateImage()
      const sequence = await rest(sessions[0], '/sequences?select=id')
      await send('Page.navigate', { url: appOrigin + '/sequences/' + sequence.data[0].id })
      await verifyPrivateImage()
      await evaluate("window.print = () => { window.sequencePrintImageReady = [...document.images].some(i => i.alt === 'Synthetic pose' && i.naturalWidth > 0 && i.src.startsWith('blob:')) }")
      await click('📄 PDF出力')
      await waitFor(() => evaluate('window.sequencePrintImageReady === true'), 'sequence print waits for private Blob image')

      const owner = sessions[0]
      const getPose = async () => (await rest(owner, '/asanas?title=eq.Synthetic%20pose&select=id,image_url,private_image_path')).data[0]
      const before = await getPose()
      const row = '/asanas?id=eq.' + before.id
      const chooseImage = async () => {
        await evaluate(`(() => {
          window.fixtureAlert = ''
          window.alert = text => { window.fixtureAlert = text }
          const canvas = document.createElement('canvas')
          canvas.width = canvas.height = 8
          canvas.getContext('2d').fillRect(0, 0, 8, 8)
          canvas.toBlob(blob => {
            const input = document.querySelector('input[type=file]')
            const dt = new DataTransfer()
            dt.items.add(new File([blob], 'synthetic.png', { type: 'image/png' }))
            input.files = dt.files
            input.dispatchEvent(new Event('change', { bubbles: true }))
          })
        })()`)
        await waitFor(() => evaluate("[...document.images].some(i => i.alt === 'プレビュー' && i.src.startsWith('blob:'))"), 'new image preview')
      }
      const edit = async () => {
        await send('Page.navigate', { url: appOrigin + '/asanas/' + before.id + '/edit' })
        await waitFor(() => hasText('変更を保存する'), 'asana edit form')
        await chooseImage()
      }
      if (imageCompatibility) {
        const preview = async prefix => {
          await send('Page.navigate', { url: appOrigin + '/asanas/' + before.id + '/edit' })
          await waitFor(() => evaluate("[...document.images].some(i => i.alt === 'プレビュー')"), 'edit preview mounted')
          await evaluate("[...document.images].find(i => i.alt === 'プレビュー').scrollIntoView()")
          await waitFor(() => evaluate(`[...document.images].some(i => i.alt === 'プレビュー' && i.complete && i.naturalWidth > 0 && i.src.startsWith(${JSON.stringify(prefix)}))`), 'existing image in edit form')
          await evaluate('window.alert = () => {}')
        }
        const localPreview = () => evaluate("[...document.images].find(i => i.alt === 'プレビュー' && i.src.startsWith('blob:'))?.src")
        const assertReleased = url => waitFor(async () => (await send('Runtime.evaluate', {
          expression: `fetch(${JSON.stringify(url)}).then(() => false, () => true)`,
          awaitPromise: true, returnByValue: true,
        })).result?.value, 'discarded preview Blob URL revoked')
        await preview('blob:')
        assert.equal(await evaluate("document.querySelector('input[type=file]').disabled"), true)
        await click('変更を保存する')
        await waitFor(() => evaluate("location.pathname === '/asanas'"), 'private reference preserved on save')
        assert.deepEqual(await getPose(), before)
        assert.equal((await rest(owner, row, 'PATCH', { private_image_path: null })).status, 200)
        await preview(before.image_url)
        assert.equal(await evaluate("document.querySelector('input[type=file]').disabled"), false)
        await chooseImage()
        const first = await localPreview()
        await chooseImage()
        await waitFor(async () => {
          const current = await localPreview()
          return current && current !== first
        }, 'new local preview replaces first selection')
        await assertReleased(first)
        const discarded = await localPreview()
        await click('画像を外す')
        await assertReleased(discarded)
        assert.deepEqual(await getPose(), { ...before, private_image_path: null })
        await chooseImage()
        const cancelledEdit = await localPreview()
        await evaluate(`document.querySelector('a[href="/asanas"]').click()`)
        await waitFor(() => evaluate("location.pathname === '/asanas'"), 'left editor without saving')
        await assertReleased(cancelledEdit)
        assert.deepEqual(await getPose(), { ...before, private_image_path: null })
        await send('Page.navigate', { url: appOrigin + '/asanas' })
        await openCategory()
        await evaluate("window.print = () => { window.publicPrintReady = [...document.querySelectorAll('[data-asana-print-content] img')].some(i => i.naturalWidth && i.src.includes('/object/public/asana-images/')); window.dispatchEvent(new Event('afterprint')) }")
        await evaluate("[...document.querySelectorAll('span')].find(span => span.textContent.trim() === '詳細')?.click()")
        await waitFor(() => evaluate("[...document.querySelectorAll('button')].some(b => b.textContent.trim() === '📄')"), 'public dictionary print button')
        await click('📄')
        await waitFor(() => evaluate('window.publicPrintReady === true'), 'public image ready in print')
        await edit()
        const savedPreview = await localPreview()
        await click('変更を保存する')
        await waitFor(() => evaluate("location.pathname === '/asanas'"), 'public replacement saved')
        await assertReleased(savedPreview)
        const legacyReplacement = await getPose()
        assert.notEqual(legacyReplacement.image_url, before.image_url)
        assert.ok(legacyReplacement.image_url.includes('/object/public/asana-images/'))
        assert.equal(legacyReplacement.private_image_path, null)
        await send('Page.navigate', { url: appOrigin + '/asana-create' })
        await waitFor(() => evaluate("!!document.querySelector('input[type=file]')"), 'new asana form')
        await chooseImage()
        const cancelled = await localPreview()
        await click('🗑️ 画像を取り消す')
        await assertReleased(cancelled)
        await fill('input[placeholder="例：山のポーズ"]', 'Compatibility fixture')
        await chooseImage()
        const newPreview = await localPreview()
        await click('登録する')
        await waitFor(() => evaluate("location.pathname === '/asanas'"), 'new asana saved')
        await assertReleased(newPreview)
        const newPose = (await rest(owner, '/asanas?title=eq.Compatibility%20fixture&select=image_url,private_image_path')).data[0]
        assert.ok(newPose.image_url.includes('/object/public/asana-images/'))
        assert.equal(newPose.private_image_path, null)
        assert.equal((await rest(owner, row, 'PATCH', { private_image_path: before.private_image_path })).status, 200)
        imageChecks.failDownload = true
        await send('Page.navigate', { url: appOrigin + '/asanas' })
        await openCategory()
        await waitFor(() => evaluate("[...document.images].some(i => i.alt === 'Synthetic pose')"), 'private row mounted alongside public row')
        await evaluate("[...document.images].find(i => i.alt === 'Synthetic pose').scrollIntoView()")
        await waitFor(() => imageChecks.failedDownloads >= 2, 'failed authenticated download retried')
        assert.equal(await evaluate("[...document.images].find(i => i.alt === 'Synthetic pose').getAttribute('src')"), null)
        imageChecks.failDownload = false
        await send('Page.navigate', { url: appOrigin + '/asanas' })
        await openCategory()
        await verifyPrivateImage()
        await waitFor(() => evaluate("[...document.images].some(i => i.alt === 'Compatibility fixture' && i.naturalWidth > 0 && i.src.includes('/object/public/asana-images/'))"), 'public and private images rendered together')
        const signedInPreview = await evaluate("[...document.images].find(i => i.alt === 'Synthetic pose').src")
        await click('🚪 ログアウト')
        await waitFor(() => evaluate("!document.body.innerText.includes('owner 様')"), 'logged out')
        await assertReleased(signedInPreview)
        await evaluate(`localStorage.setItem('sb-127-auth-token', ${JSON.stringify(JSON.stringify(sessions[1]))})`)
        await send('Page.navigate', { url: appOrigin + '/asanas' })
        await openCategory()
        assert.equal(await evaluate("[...document.images].some(i => i.src.startsWith('blob:'))"), false)
        console.log('PASS Compatibility flag off: API disabled, both image formats, edit/create/print, preview release, failure without fallback and account switch')
        return
      }
      assert.equal((await rest(owner, row, 'PATCH', { private_image_path: null })).status, 200)
      await edit()
      imageChecks.failSave = true
      await click('変更を保存する')
      await waitFor(() => evaluate("window.fixtureAlert.includes('保存できませんでした')"), 'failed dictionary save')
      assert.deepEqual(await getPose(), { ...before, private_image_path: null })
      await click('変更を保存する')
      await waitFor(() => evaluate("location.pathname === '/asanas'"), 'successful dictionary save')
      const replacement = await getPose()
      assert.equal(replacement.image_url, null)
      assert.ok(replacement.private_image_path && replacement.private_image_path !== before.private_image_path)
      await edit()
      const competing = await imageFixture.uploadFixtureImage(appOrigin, owner)
      assert.equal((await rest(owner, row, 'PATCH', { private_image_path: competing })).status, 200)
      await click('変更を保存する')
      await waitFor(() => evaluate("window.fixtureAlert.includes('別の画面で画像が更新')"), 'conflicting dictionary edit')
      assert.equal((await getPose()).private_image_path, competing)
      console.log('PASS Browser image replacement, failed save keeps old link and concurrent edit wins')

      const foreign = await imageFixture.uploadFixtureImage(appOrigin, sessions[1])
      const escapedForeign = foreign.replaceAll("'", "''")
      dbInput(`
insert into public.asanas (user_id,title,image_url,private_image_path)
select user_id,'Fixture migrated legacy source','${before.image_url.replaceAll("'", "''")}',private_image_path
from public.asanas where id=${before.id};
insert into public.initial_sequence_items (initial_sequence_id, position, type, preset_key, asana_title, image_url, private_image_path)
select p.id, v.pos, 'asana', v.key, v.title, v.url, v.path
from public.initial_sequences p cross join lateral (
  select 1, 'public-image', 'Fixture public image', '/icon.png', null::text
  union all select 2, 'legacy-image', 'Fixture legacy image', '${before.image_url.replaceAll("'", "''")}', null
  union all select 3, 'own-private-image', 'Fixture own image', null, a.private_image_path from public.asanas a where a.id=${before.id}
  union all select 4, 'foreign-image', 'Fixture foreign image', null, '${escapedForeign}'
  union all select 5, 'no-image', 'Fixture no image', null, null
) v(pos,key,title,url,path);
`, 'psql', '-X', '-v', 'ON_ERROR_STOP=1')
      await send('Page.navigate', { url: appOrigin + '/presets' })
      await waitFor(() => hasText('Synthetic preset'), 'preset loaded for import')
      await evaluate("window.alert = text => { window.fixtureAlert = text }")
      await click('アーサナのみ追加')
      await waitFor(() => evaluate("window.fixtureAlert?.includes('5件')"), '5 preset entries imported')
      const imported = (await rest(owner, '/asanas?title=like.Fixture*&preset_key=not.is.null&order=preset_key&select=preset_key,image_url,private_image_path')).data
      const references = Object.fromEntries(imported.map(({ preset_key, ...reference }) => [preset_key, reference]))
      assert.deepEqual(references, {
        'public-image': { image_url: '/icon.png', private_image_path: null },
        'legacy-image': { image_url: before.image_url, private_image_path: competing },
        'own-private-image': { image_url: null, private_image_path: competing },
        'foreign-image': { image_url: null, private_image_path: null },
        'no-image': { image_url: null, private_image_path: null },
      })
      for (const file of ['02-stop-legacy-uploads.sql', '03-close-legacy-public.sql']) {
        dbInput(readFileSync(join(__dirname, '../asana-image-privacy', file), 'utf8'), 'psql', '-X', '-v', 'ON_ERROR_STOP=1')
      }
      assert.notEqual((await fetch(before.image_url)).status, 200)
      // Keep this Storage-compatibility case independent of earlier rate-limit attempts.
      dbInput("update asana_image_private.attempts set attempted_at=least(attempted_at,now()-interval '61 seconds');",
        'psql', '-X', '-v', 'ON_ERROR_STOP=1')
      await edit()
      await click('変更を保存する')
      await waitFor(() => evaluate("location.pathname === '/asanas'"), 'browser upload after legacy uploads stop')
      assert.notEqual((await getPose()).private_image_path, competing)
      await send('Page.navigate', { url: appOrigin + '/asanas' })
      await openCategory()
      await verifyPrivateImage()
      for (const [title, expectedSrc] of [
        ['Fixture public image', '/icon.png'],
        ['Fixture legacy image', 'blob:'],
        ['Fixture own image', 'blob:'],
      ]) {
        const needle = JSON.stringify(title)
        await waitFor(() => evaluate(`[...document.images].some(i => i.alt === ${needle})`), 'imported preset image mounted')
        await evaluate(`[...document.images].find(i => i.alt === ${needle})?.scrollIntoView()`)
        await waitFor(() => evaluate(`[...document.images].some(i => i.alt === ${needle} && i.naturalWidth > 0 && i.src.includes(${JSON.stringify(expectedSrc)}))`), 'imported preset image rendered')
      }
      await delay(1100)
      await evaluate(`(() => {
        const image = [...document.images].find(i => i.alt === 'Synthetic pose')
        window.fixturePreviousSrc = image.src
        image.src = '/fixture-expired-image.webp'
      })()`)
      await waitFor(() => evaluate("[...document.images].some(i => i.alt === 'Synthetic pose' && i.naturalWidth && i.src.startsWith('blob:') && i.src !== window.fixturePreviousSrc)"), 'automatic private image refetch')
      await delay(1100)
      await evaluate(`(() => {
        window.printForcedImageFailure = false
        const observer = new MutationObserver(() => {
          const image = document.querySelector('[data-asana-print-content] img')
          if (!image?.src.startsWith('blob:')) return
          observer.disconnect()
          window.printForcedImageFailure = true
          image.src = '/fixture-expired-print-image.webp'
        })
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] })
        window.print = () => {
          window.printImageReady = Boolean(document.querySelector('[data-asana-print-content] img')?.naturalWidth)
          window.dispatchEvent(new Event('afterprint'))
        }
      })()`)
      await evaluate(`document.querySelector('img[alt="Synthetic pose"]')?.closest('[role=button]')?.click()`)
      await click('📄')
      await waitFor(() => evaluate('window.printImageReady === true'), 'print after image refetch and legacy closure')
      assert.equal(await evaluate('window.printForcedImageFailure'), true)
      console.log('PASS Browser preset import and private rendering after legacy bucket closure')
      if (imageRollbackDir) {
        const rollbackOrigin = 'http://127.0.0.1:35436'
        rollbackApp = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '-H', '127.0.0.1', '-p', '35436'],
          { env, cwd: imageRollbackDir, stdio: 'inherit', windowsHide: true })
        await waitFor(async () => (await fetch(rollbackOrigin + '/login')).ok, 'prior private-capable app')
        await send('Page.navigate', { url: rollbackOrigin + '/login' })
        await waitFor(() => evaluate("location.port === '35436'"), 'rollback browser origin')
        await evaluate(`localStorage.setItem('sb-127-auth-token', ${JSON.stringify(JSON.stringify(owner))})`)
        await send('Page.navigate', { url: rollbackOrigin + '/asanas' })
        await openCategory()
        await verifyPrivateImage()
        assert.notEqual((await fetch(before.image_url)).status, 200)
        console.log('PASS Previous private-capable app uses same DB and Storage after legacy public URL is closed')
      }

      await send('Page.navigate', { url: appOrigin + '/asanas/' + before.id + '/edit' })
      await waitFor(() => hasText('画像を外す'), 'private image detach control')
      const attached = await getPose()
      await click('画像を外す')
      await waitFor(() => hasText('保存すると画像が外れます。'), 'staged detach')
      assert.deepEqual(await getPose(), attached)
      await click('元に戻す')
      await waitFor(() => hasText('画像を外す'), 'undo staged detach')
      await click('画像を外す')
      await evaluate('window.alert = () => {}')
      await click('変更を保存する')
      await waitFor(() => evaluate("location.pathname === '/asanas'"), 'saved detach')
      assert.deepEqual(await getPose(), { ...attached, image_url: null, private_image_path: null })
      assert.equal(dbInput(`select count(*) from storage.objects o join asana_image_private.reservations r
        on r.object_path=o.name where o.bucket_id='asana-images-private' and r.unreferenced_since is not null;`,
      'psql', '-X', '-Atq').trim(), '2')

      await send('Page.navigate', { url: appOrigin + '/asana-create' })
      await waitFor(() => evaluate("!!document.querySelector('input[type=file]')"), 'private create form')
      await fill('input[placeholder="例：山のポーズ"]', 'Private upload fixture')
      await chooseImage()
      await click('登録する')
      await waitFor(() => evaluate("location.pathname === '/asanas'"), 'new private asana saved')
      const created = (await rest(owner, '/asanas?title=eq.Private%20upload%20fixture&select=image_url,private_image_path')).data[0]
      assert.equal(created.image_url, null)
      assert.ok(created.private_image_path?.startsWith(owner.user.id + '/'))
      console.log('PASS Browser staged detach, file retention and reservation-backed private creation')

      await send('Page.navigate', { url: appOrigin + '/login' })
      await waitFor(() => evaluate("location.port === '35430'"), 'current browser origin')
      await evaluate(`localStorage.setItem('sb-127-auth-token', ${JSON.stringify(JSON.stringify(sessions[1]))})`)
      await send('Page.navigate', { url: appOrigin + '/asanas' })
      await openCategory()
      await waitFor(() => hasText('Synthetic pose'), 'second account dictionary')
      assert.equal(await evaluate("[...document.images].some(i => i.src.startsWith('blob:'))"), false)
      console.log('PASS Dictionary private image at 390px in light and dark mode; account switch clears visible image')
      assert.equal(appLog.includes(imageFixture.serviceToken), false)
      assert.doesNotMatch(appLog, /\/object\/sign\/[^\s]*[?&]token=/)
      for (const session of sessions) assert.equal(appLog.includes(session.access_token), false)
      console.log('PASS Application logs contain no fixture JWTs, service credential or signed image URLs')
      const storageLog = execFileSync('docker', ['compose', '-p', 'crm-step1-acceptance',
        '-f', 'supabase/rollouts/crm-step-1/acceptance.compose.yml',
        '-f', 'supabase/rollouts/asana-image-privacy/storage.compose.yml',
        'logs', '--no-color', 'storage'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      assert.equal(/\/object\/(?:authenticated\/)?asana-images-private\//.test(storageLog), true)
      for (const session of sessions) assert.equal(storageLog.includes(session.access_token), false)
      assert.equal(storageLog.includes(imageFixture.serviceToken), false)
      console.log('PASS Local Storage download logs contain no fixture JWTs or service credential')
      if (imageBrowserOnly) return
    }
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
        if (withRecordContext) {
          await send('Page.navigate', { url: appOrigin + '/admin/customers/settings' })
          await waitFor(() => evaluate("location.pathname === '/admin/customers'"), 'retired settings redirects')
          assert.equal(await hasText('旧サービス情報を確認'), false)
          const contexts = [
            ['mglitter', ids[0], '合成サービス', 'overture'],
            ['lilly', ids[1], 'マットピラティス', null],
            ['nus', ids[2], '合成NUS活動', null],
          ]
          for (const [group, recordCustomer, label, brand] of contexts) {
            const scheme = group === 'lilly' ? 'dark' : 'light'
            await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }] })
            await send('Page.navigate', { url: appOrigin + '/admin/customers/' + recordCustomer })
            await waitFor(() => hasText('＋ 今日の記録'), 'open customer record')
            assert.ok(await hasText('最終記録日：記録なし'))
            await click('＋ 今日の記録')
            await waitFor(() => hasText('記録先の所属'), 'record context fields')
            await select('form select', group)
            if (brand) await select('form select[name=record_brand_code]', brand)
            if (group === 'lilly') await select('form select[name=service_label]', label)
            else await fill('form input[name=service_label]', label)
            if (group === 'nus') await fill('form input[name=location_label]', '合成活動先')
            await fill('textarea[name=observation_note]', 'Synthetic original note')
            assert.equal(await evaluate("getComputedStyle(document.querySelector('[role=dialog]')).colorScheme"), scheme)
            assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'))
            await click('保存')
            await waitFor(() => evaluate(`!document.querySelector('[role=dialog]') && document.body.innerText.includes(${JSON.stringify(label)})`), 'new record displayed')
            const recordPath = '/crm_records?customer_id=eq.' + recordCustomer + '&record_group_code=eq.' + group
            const saved = (await rest(owner, recordPath)).data[0]
            assert.equal(saved.service_label, label)
            assert.equal(saved.location_id, null)
            assert.equal(saved.service_id, null)
            if (group === 'lilly') {
              assert.equal(saved.location_label, 'yoga&pilates Lilly')
              assert.equal(await evaluate("[...document.querySelectorAll('main span')].filter(x => x.textContent === 'Lilly・マットピラティス').length"), 2)
            }
            if (group === 'nus') {
              assert.equal(await evaluate("[...document.querySelectorAll('main span')].filter(x => x.textContent === 'NUS・合成活動先・合成NUS活動').length"), 2)
            }
            const savedDate = new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
              .format(new Date(saved.record_date + 'T00:00:00Z'))
            assert.ok(await hasText('最終記録日：' + savedDate))
            await evaluate("[...document.querySelectorAll('article button')].find(button=>button.textContent.trim()==='編集').click()")
            await waitFor(() => hasText('記録を編集'), 'record editing')
            await fill('textarea[name=observation_note]', 'Synthetic updated note')
            await click('保存')
            await waitFor(() => hasText('Synthetic updated note'), 'record edit saved')
            const edited = (await rest(owner, recordPath)).data[0]
            assert.equal(edited.service_label, saved.service_label)
            assert.equal(edited.record_brand_code, saved.record_brand_code)
            assert.equal(edited.record_date, saved.record_date)
          }
          await send('Emulation.setEmulatedMedia', { features: [] })
          assert.deepEqual(await rest(owner, relationshipPath), oldRelations)
          assert.deepEqual(await rest(owner, businessPath), oldBusiness)
          assert.deepEqual(await rest(owner, consentPath), oldConsent)
          await send('Page.navigate', { url: appOrigin + '/admin/customers/1' })
          await waitFor(() => hasText('合成旧記録'), 'migrated record displayed')
          const historicalLabels = await evaluate("[...document.querySelectorAll('article span')].map(x=>x.textContent)")
          assert.equal(historicalLabels.filter(label => label === 'Lilly・ヨガ').length, 3)
          assert.equal(historicalLabels.filter(label => label === 'M.glitter・3rd place・ヨガ').length, 1)
          assert.equal(historicalLabels.some(label => label.includes('yoga&pilates Lilly')), false)
          await evaluate("[...document.querySelectorAll('article button')].find(button=>button.textContent.trim()==='編集').click()")
          await waitFor(() => hasText('記録を編集'), 'legacy record note editing')
          assert.equal(await evaluate("document.querySelector('[role=dialog] select')"), null)
          await fill('textarea[name=observation_note]', 'Synthetic historical note edit')
          await click('保存')
          await waitFor(() => hasText('Synthetic historical note edit'), 'old record edited without remapping')
          console.log('PASS Three-group records, last record date and legacy rendering')
          const lillyBusinessPath = '/crm_customer_businesses?customer_id=eq.' + lillyId + '&business_code=eq.third_place'
          assert.equal((await rest(owner, '/crm_customer_businesses', 'POST', {
            customer_id: Number(lillyId), business_code: 'third_place', source: 'service', stage: 'unconfirmed',
          })).status, 201)
          async function checkThirdPlace(customerId, visible) {
            await send('Page.navigate', { url: appOrigin + '/admin/customers/' + customerId })
            await waitFor(() => hasText('＋ 今日の記録'), 'business information loaded')
            assert.equal(await evaluate("document.querySelector('section[aria-label=\"顧客の事業情報\"]').innerText.includes('3rd place')"), visible)
            assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'))
          }
          for (const theme of ['light', 'dark']) {
            await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme }] })
            await checkThirdPlace(lillyId, false)
            assert.equal(await evaluate("getComputedStyle(document.querySelector('.crm-theme')).colorScheme"), theme)
          }
          const oldBusinessRow = await rest(owner, lillyBusinessPath)
          assert.equal(oldBusinessRow.data[0].source, 'service')
          assert.equal(oldBusinessRow.data[0].stage, 'unconfirmed')
          assert.equal((await rest(owner, lillyBusinessPath, 'PATCH', { business_note: 'Synthetic third place note' })).status, 200)
          await checkThirdPlace(lillyId, true)
          assert.ok(await hasText('Synthetic third place note'))
          assert.equal((await rest(owner, lillyBusinessPath, 'PATCH', { business_note: null, stage: 'customer' })).status, 200)
          await checkThirdPlace(lillyId, true)
          assert.equal((await rest(owner, lillyBusinessPath, 'PATCH', { stage: 'unconfirmed' })).status, 200)
          const setAffiliations = (groups, brands) => rest(owner, '/rpc/crm_save_customer_memberships', 'POST', {
            target_customer_id: Number(lillyId), customer: { nickname: '共通テスト名' }, relations: [], selected_groups: groups, selected_brands: brands,
          })
          const affiliationBlock = () => evaluate("Array.from(document.querySelectorAll('section[aria-label=\"現在の所属\"] p'),p=>p.textContent)")
          assert.equal((await setAffiliations(['mglitter', 'lilly', 'nus'], [])).status, 200)
          await checkThirdPlace(lillyId, false)
          assert.deepEqual(await affiliationBlock(), ['M.glitter', 'NUS・Lilly'])
          assert.equal((await setAffiliations(['mglitter', 'lilly', 'nus'], ['third_place'])).status, 200)
          await checkThirdPlace(lillyId, true)
          assert.deepEqual(await affiliationBlock(), ['M.glitter：3rd place', 'NUS・Lilly'])
          assert.equal((await setAffiliations(['mglitter', 'lilly', 'nus'], ['third_place', 'moments'])).status, 200)
          await checkThirdPlace(lillyId, true)
          assert.deepEqual(await affiliationBlock(), ['M.glitter：3rd place、moments', 'NUS・Lilly'])
          assert.ok(await hasText('Lilly専用情報'))
          assert.ok(await hasText('NUS情報'))
          assert.equal((await setAffiliations(['mglitter', 'lilly', 'nus'], ['third_place'])).status, 200)
          await checkThirdPlace(lillyId, true)
          assert.deepEqual(await affiliationBlock(), ['M.glitter：3rd place', 'NUS・Lilly'])
          assert.equal((await rest(owner, '/crm_records?customer_id=eq.' + lillyId + '&record_group_code=eq.lilly', 'PATCH', {
            record_date: '2020-02-01',
          })).status, 200)
          assert.equal((await rest(owner, '/crm_records', 'POST', {
            customer_id: Number(lillyId), record_date: '2020-02-02', record_group_code: 'mglitter',
            record_brand_code: 'third_place', service_label: 'ヨガ',
          })).status, 201)
          for (const recordDate of ['2020-02-03', '2020-01-31']) {
            assert.equal((await rest(owner, '/crm_records', 'POST', {
              customer_id: Number(lillyId), record_date: recordDate, record_group_code: 'nus', service_label: 'Synthetic activity',
            })).status, 201)
          }
          assert.equal((await setAffiliations(['lilly', 'nus'], [])).status, 200)
          await checkThirdPlace(lillyId, true)
          assert.deepEqual(await affiliationBlock(), ['NUS・Lilly'])
          assert.ok(await hasText('最終記録日：2020年2月3日'))
          await send('Page.navigate', { url: appOrigin + '/admin/customers' })
          await waitFor(() => evaluate(`[...document.querySelectorAll('article')].some(card =>
            [...card.querySelectorAll('a')].some(link => link.pathname === '/admin/customers/${lillyId}') &&
            card.textContent.includes('最終記録日：2020年2月3日'))`), 'list uses latest record date across groups')
          for (const [date, service] of [['2020-02-04', 'ヨガ'], ['2020-02-05', 'マシンピラティス']]) {
            assert.equal((await rest(owner, '/crm_records', 'POST', {
              customer_id: Number(lillyId), record_date: date, record_group_code: 'lilly',
              location_label: 'yoga&pilates Lilly', service_label: service,
            })).status, 201)
          }
          for (const theme of ['light','dark']) {
            await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme }] })
            await checkThirdPlace(lillyId, true)
            const savedLabels = await evaluate("[...document.querySelectorAll('main section > div span')].map(x=>x.textContent)")
            assert.ok(savedLabels.includes('Lilly・ヨガ'))
            assert.ok(savedLabels.includes('Lilly・マットピラティス'))
            assert.equal(savedLabels.filter(label => label === 'Lilly・マシンピラティス').length, 2)
            assert.equal(savedLabels.some(label => label.includes('yoga&pilates Lilly')), false)
          }
          console.log('PASS Shared record labels for migrated and new Lilly, M.glitter, and NUS records')
          assert.equal((await rest(owner, '/crm_customer_businesses', 'POST', {
            customer_id: Number(ids[0]), business_code: 'third_place', source: 'manual', stage: 'unconfirmed',
          })).status, 201)
          await checkThirdPlace(ids[0], true)
          const ownServiceFixture = Number(ids[2])
          assert.ok(Number.isSafeInteger(ownServiceFixture))
          await dbInput(`
            insert into public.crm_customer_groups(customer_id,group_code) values(${ownServiceFixture},'lilly');
            insert into public.crm_customer_services(customer_id,location_id,service_id) values(${ownServiceFixture},2,1);
          `, 'psql', '-X', '-v', 'ON_ERROR_STOP=1')
          await checkThirdPlace(ids[2], true)
          await send('Emulation.setEmulatedMedia', { features: [] })
          console.log('PASS Legacy Lilly display filter, explicit affiliation, notes, status, own attendance/service and 390px themes')
          console.log('PASS M.glitter summaries and last record date, including a subsequently created older NUS record')
        }
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
          await waitFor(() => evaluate("document.querySelector('section[aria-label=\"現在の所属\"]')?.innerText.includes('M.glitter：moments') && document.querySelector('section[aria-label=\"現在の所属\"]')?.innerText.includes('NUS・Lilly')"), 'save three groups and brand on same customer')
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
          assert.ok(await hasText('M.glitter：unite'))
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
    await send('Page.navigate', { url: appOrigin + '/contact' })
    await waitFor(() => evaluate("Boolean(document.querySelector('#contact-email'))"), 'contact form')
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
    await evaluate(`(() => {
      const originalFetch = window.fetch
      window.contactMockRequests = 0
      window.fetch = (url, options) => {
        if (url !== '/api/contact') return originalFetch(url, options)
        window.contactMockRequests += 1
        return Promise.resolve(window.contactMockRequests === 1
          ? new Response('Too Many Requests', { status: 429 })
          : Response.json({ ok: true }))
      }
    })()`)
    await fill('#contact-email', 'contact-fixture@example.com')
    await fill('#contact-message', '合成お問い合わせ')
    await click('送信する')
    await waitFor(() => hasText('最大5分'), 'contact 429 response')
    assert.equal(await evaluate("document.querySelector('#contact-message').value"), '合成お問い合わせ')
    assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'))
    await click('送信する')
    await waitFor(() => hasText('お問い合わせありがとうございます'), 'contact success response')
    assert.equal(await evaluate('window.contactMockRequests'), 2)
    console.log('PASS Contact form at 390px, mocked edge 429, retained input and successful retry')
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
    rollbackApp?.kill()
    gateway.close()
    try { rmSync(chromeProfile, { recursive: true, force: true }) } catch { /* Chrome can briefly hold its files */ }
  }
}

async function main() {
  await waitFor(async () => (await fetch(authOrigin + '/health')).ok, 'local GoTrue')
  await waitFor(async () => (await fetch(restOrigin)).ok, 'local PostgREST')
  if (withPrivateImages) {
    await waitFor(() => dbInput("select to_regclass('storage.buckets') is not null;",
      'psql', '-X', '-Atq').trim() === 't', 'local Storage database migrations')
  }
  if (process.argv.includes('--seed')) {
    for (const account of accounts) await auth('/signup', account)
    const fixtureScript = readFileSync(join(__dirname, 'acceptance-fixture.sh'), 'utf8').replaceAll('\r\n', '\n')
    dbInput(fixtureScript, 'bash')
    if (withPrivateImages) {
      const setup = readFileSync(join(__dirname, '../asana-image-privacy/fixture.sql'), 'utf8')
      const migration = readFileSync(join(__dirname, '../asana-image-privacy/01-private-images.sql'), 'utf8')
      const rollback = readFileSync(join(__dirname, '../asana-image-privacy/01-rollback-empty-foundation.sql'), 'utf8')
      const apply = sql => dbInput(sql, 'psql', '-X', '-v', 'ON_ERROR_STOP=1')
      apply(setup)
      assert.throws(() => apply(migration), /Expected an empty private WebP bucket/)
      const { serviceToken } = await import('../asana-image-privacy/acceptance.mjs')
      const storageOrigin = 'http://127.0.0.1:35435'
      const storageHeaders = { Authorization: 'Bearer ' + serviceToken, 'Content-Type': 'application/json' }
      const createBucket = () => fetch(storageOrigin + '/bucket', {
        method: 'POST',
        headers: storageHeaders,
        body: JSON.stringify({ id: 'asana-images-private', name: 'asana-images-private', public: false,
          file_size_limit: 5242880, allowed_mime_types: ['image/webp'] }),
      })
      assert.equal((await createBucket()).ok, true)
      apply(migration)
      assert.throws(() => apply(migration), /already exists/)
      apply(rollback)
      assert.equal(dbInput("select count(*) from storage.buckets where id='asana-images-private';", 'psql', '-X', '-Atq').trim(), '1')
      assert.equal(dbInput("select count(*) from pg_attribute where attrelid='public.asanas'::regclass and attname='private_image_path' and not attisdropped;", 'psql', '-X', '-Atq').trim(), '0')
      assert.equal((await fetch(storageOrigin + '/bucket/asana-images-private', {
        method: 'DELETE', headers: storageHeaders,
      })).ok, true)
      assert.equal((await createBucket()).ok, true)
      apply(migration + "\nnotify pgrst, 'reload schema';")
      if (process.argv.includes('--private-images-no-sign')) {
        apply(`alter policy asana_private_read on storage.objects using (
          bucket_id = 'asana-images-private'
          and (storage.foldername(name))[1] = (select auth.uid())::text
          and not coalesce((select auth.jwt())->>'is_anonymous' = 'true', false)
          and storage.allow_any_operation(array['object.get_authenticated',
            'object.get_authenticated_info', 'object.delete', 'object.delete_many'])
        );`)
      }
      if (!imageCompatibility) {
        for (const file of ['04-upload-reservations.sql', '05-upload-image-references.sql']) {
          apply(readFileSync(join(__dirname, '../asana-image-privacy', file), 'utf8'))
        }
        apply("notify pgrst, 'reload schema';")
      }
      console.log('PASS Storage API bucket, missing bucket guard, collision rollback and reapply after empty foundation rollback')
    }
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
      if (withRecordContext) migration += `
update public.crm_locations set name='yoga&pilates Lilly' where id=1;
insert into public.crm_locations(name) values('3rd place');
alter table public.crm_records add column customer_note text, add column observation_note text,
  add column updated_at timestamptz not null default now();
create function public.set_crm_updated_at() returns trigger language plpgsql as $fixture$
begin new.updated_at=now(); return new; end $fixture$;
create trigger set_crm_records_updated_at before update on public.crm_records
for each row execute function public.set_crm_updated_at();
update public.crm_records set location_id=1,service_id=1,customer_note='合成旧記録';
insert into public.crm_records(customer_id,location_id,service_id,customer_note)
values(1,1,1,'合成旧記録'),(1,1,1,'合成旧記録'),(1,2,1,'合成旧記録');
` + readFileSync(join(__dirname, '../crm-records/01-record-context.sql'), 'utf8')
      dbInput(fixture + migration + "\nnotify pgrst, 'reload schema';\n", 'psql', '-X', '-v', 'ON_ERROR_STOP=1')
      if (withRecordContext) verifyRecordMigration()
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
  if (withRecordContext) {
    const payload = { customer_id: 1, record_date: '2020-01-01', record_group_code: 'nus', service_label: 'Synthetic activity' }
    assert.equal((await rest(sessions[0], '/crm_records', 'POST', payload)).data.code, '23514')
    const denied = await rest(sessions[0], '/crm_customer_services?customer_id=eq.1', 'DELETE')
    assert.equal(denied.status, 403)
    for (const session of [null, sessions[1], sessions[2]]) {
      assert.ok([401, 403].includes((await rest(session, '/crm_records', 'POST', payload)).status))
    }
    console.log('PASS Direct record writes enforce active affiliation and owner RLS; legacy rows are read-only')
  }
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
