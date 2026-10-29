import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const CUSTOMER_UID = 'verifyAssistantCustomer'
const TOKEN = 'verify-assistant-token'

let passed = 0
let failed = 0
const failures = []

function check(name, condition, detail) {
  if (condition) {
    passed += 1
    console.log(`  ✔ ${name}`)
  } else {
    failed += 1
    failures.push(name)
    console.log(`  ✘ ${name}${detail === undefined ? '' : ` → ${JSON.stringify(detail)}`}`)
  }
}

function section(title) {
  console.log(`\n${title}`)
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
    })
    req.on('end', () => resolve(data))
  })
}

function startStub() {
  const stub = createServer(async (req, res) => {
    const headers = { 'Content-Type': 'application/json' }
    const authorized = req.headers['x-assistant-token'] === TOKEN

    try {
      if (!authorized) {
        res.writeHead(401, headers)
        res.end(JSON.stringify({ detail: 'Unauthorized' }))
        return
      }

      if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, headers)
        res.end(JSON.stringify({ status: 'ok', indexReady: true, cacheEntries: 1 }))
        return
      }

      if (req.method === 'GET' && req.url === '/index/status') {
        res.writeHead(200, headers)
        res.end(JSON.stringify({ indexing: {}, indexReady: true }))
        return
      }

      if (req.method === 'POST' && req.url === '/query') {
        const body = JSON.parse((await readBody(req)) || '{}')
        res.writeHead(200, headers)
        res.end(
          JSON.stringify({
            answer: `Kiểm thử: ${body.question}`,
            citations: [
              { label: 'Dịch vụ kiểm thử', url: '/services/test', type: 'service' },
            ],
            mode: 'local',
            source: 'graphrag',
            degraded: false,
            serviceId: body.service_id ?? null,
          }),
        )
        return
      }

      res.writeHead(404, headers)
      res.end(JSON.stringify({ detail: 'Not found' }))
    } catch (error) {
      console.error('  [stub] error:', error)
      res.writeHead(500, headers)
      res.end(JSON.stringify({ detail: 'Stub error' }))
    }
  })

  return new Promise((resolve) => {
    stub.listen(0, '127.0.0.1', () => resolve(stub))
  })
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options)
  const data = await response.json().catch(() => null)
  return { status: response.status, data }
}

function loadWebApiKey() {
  if (process.env.FIREBASE_WEB_API_KEY) return process.env.FIREBASE_WEB_API_KEY

  const file = path.resolve(process.cwd(), '../Client/src/lib/firebase.js')
  const content = readFileSync(file, 'utf8')
  const match = content.match(/apiKey:\s*'([^']+)'/)
  if (!match) throw new Error('Không tìm thấy apiKey trong Client/src/lib/firebase.js')
  return match[1]
}

async function signInCustomer(auth) {
  const apiKey = loadWebApiKey()
  const customToken = await auth.createCustomToken(CUSTOMER_UID)
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  )
  const data = await response.json()
  if (!response.ok) throw new Error(`signInWithCustomToken lỗi: ${JSON.stringify(data)}`)
  return data.idToken
}

async function main() {
  const stub = await startStub()
  const stubPort = stub.address().port
  process.env.ASSISTANT_URL = `http://127.0.0.1:${stubPort}`
  process.env.ASSISTANT_TOKEN = TOKEN
  process.env.ASSISTANT_ALLOW_REINDEX = 'false'

  const { auth, db } = await import('../src/config/firebase.js')
  const { createApp } = await import('../src/app.js')
  const app = createApp()
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance))
  })
  const base = `http://127.0.0.1:${server.address().port}`

  let customerUidCreated = false

  try {
    section('ASSISTANT — public chat')

    const chat = await fetchJson(`${base}/api/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'Sửa bình nóng lạnh giá bao nhiêu?' }),
    })
    check('POST /api/assistant/chat → 200', chat.status === 200, chat)
    check('có câu trả lời', Boolean(chat.data?.answer), chat.data)
    check('có trích dẫn', (chat.data?.citations ?? []).length > 0, chat.data)

    const service = await fetchJson(`${base}/api/assistant/service/lap-binh-nong-lanh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'Bảo hành bao lâu?' }),
    })
    check('POST /api/assistant/service/:id → 200', service.status === 200, service)
    check(
      'serviceId được chuyển sang sidecar',
      service.data?.serviceId === 'lap-binh-nong-lanh',
      service.data,
    )

    const empty = await fetchJson(`${base}/api/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: '   ' }),
    })
    check('câu hỏi rỗng → 400', empty.status === 400, empty)

    section('ASSISTANT — admin guard')

    const anonymous = await fetchJson(`${base}/api/assistant/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'Có bao nhiêu dịch vụ?' }),
    })
    check('admin query không token → 401', anonymous.status === 401, anonymous)

    try {
      const customerToken = await signInCustomer(auth)
      customerUidCreated = true
      const forbidden = await fetchJson(`${base}/api/assistant/admin/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ question: 'Có bao nhiêu dịch vụ?' }),
      })
      check('admin query với customer → 403', forbidden.status === 403, forbidden)
    } catch (error) {
      console.warn('  ! Bỏ qua kiểm tra 403:', error.message)
    }

    section('ASSISTANT — sidecar unavailable')

    await new Promise((resolve) => stub.close(resolve))

    const offline = await fetchJson(`${base}/api/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'Hủy đơn có mất phí không?' }),
    })
    check('sidecar down → 200 fallback', offline.status === 200, offline)
    check(
      'fallback trả lời từ demo cache',
      offline.data?.source === 'cache' && Boolean(offline.data?.answer),
      offline.data,
    )

    section('ASSISTANT — rate limit')

    let lastStatus = 200
    for (let index = 0; index < 35; index += 1) {
      const result = await fetchJson(`${base}/api/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'Bảo hành bao lâu?' }),
      })
      lastStatus = result.status
    }
    check('gửi quá giới hạn → 429', lastStatus === 429, lastStatus)
  } finally {
    await new Promise((resolve) => server.close(resolve))
    if (!stub.listening) {
      // already closed
    } else {
      await new Promise((resolve) => stub.close(resolve))
    }

    if (customerUidCreated) {
      await auth.deleteUser(CUSTOMER_UID).catch(() => {})
      await db.ref(`users/${CUSTOMER_UID}`).remove().catch(() => {})
    }
  }

  console.log(`\nKết quả: ${passed}/${passed + failed} PASS`)
  if (failed > 0) {
    console.log('Thất bại:')
    for (const name of failures) console.log('  -', name)
  }
  process.exit(failed ? 1 : 0)
}

main().catch((error) => {
  console.error('\n❌ Verify assistant lỗi:', error)
  process.exit(1)
})
