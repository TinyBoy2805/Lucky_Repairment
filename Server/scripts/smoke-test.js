import { readFileSync } from 'node:fs'
import path from 'node:path'
import { auth, db } from '../src/config/firebase.js'

// Smoke test end-to-end trên Realtime Database thật (có dọn dẹp sau khi chạy).
// Chạy: npm run smoke-test
// Có thể override web API key bằng biến môi trường FIREBASE_WEB_API_KEY.

const TEST_USERS = {
  customer: { uid: 'smokeCustomer', email: 'smoke.customer@example.com', name: 'Smoke Customer', role: 'customer' },
  repairman: { uid: 'smokeRepairman', email: 'smoke.repairman@example.com', name: 'Smoke Repairman', role: 'repairman' },
  admin: { uid: 'smokeAdmin', email: 'smoke.admin@example.com', name: 'Smoke Admin', role: 'admin' },
  stranger: { uid: 'smokeStranger', email: 'smoke.stranger@example.com', name: 'Smoke Stranger', role: 'customer' },
}

let passed = 0
let failed = 0
const failures = []

function check(name, condition, detail) {
  if (condition) {
    passed++
    console.log(`  ✔ ${name}`)
  } else {
    failed++
    failures.push(name)
    console.log(`  ✘ ${name}${detail === undefined ? '' : ` → ${JSON.stringify(detail)}`}`)
  }
}

function section(title) {
  console.log(`\n${title}`)
}

function loadWebApiKey() {
  if (process.env.FIREBASE_WEB_API_KEY) return process.env.FIREBASE_WEB_API_KEY
  const file = path.resolve(process.cwd(), '../Client/src/lib/firebase.js')
  const content = readFileSync(file, 'utf8')
  const match = content.match(/apiKey:\s*'([^']+)'/)
  if (!match) throw new Error('Không tìm thấy apiKey trong Client/src/lib/firebase.js')
  return match[1]
}

async function idTokenFor(uid, apiKey) {
  const customToken = await auth.createCustomToken(uid)
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  )
  const data = await res.json()
  if (!res.ok) throw new Error(`signInWithCustomToken lỗi: ${JSON.stringify(data)}`)
  return data.idToken
}

function makeApi(base) {
  return async function api(method, route, { token, body } = {}) {
    const res = await fetch(base + route, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    const text = await res.text()
    let data = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = text
    }
    return { status: res.status, data }
  }
}

async function setupUser(user) {
  try {
    await auth.deleteUser(user.uid)
  } catch {
    // chưa tồn tại
  }
  await db.ref(`users/${user.uid}`).remove()
  await auth.createUser({
    uid: user.uid,
    email: user.email,
    displayName: user.name,
    emailVerified: true,
  })
  const now = Date.now()
  await db.ref(`users/${user.uid}`).set({
    uid: user.uid,
    email: user.email,
    displayName: user.name,
    phone: '',
    photoURL: '',
    role: user.role,
    createdAt: now,
    updatedAt: now,
  })
}

async function cleanup(created) {
  for (const id of created.requestIds) await db.ref(`requests/${id}`).remove()
  for (const id of created.categoryIds) await db.ref(`categories/${id}`).remove()
  for (const id of created.ratingIds) await db.ref(`ratings/${id}`).remove()
  for (const id of created.paymentIds) await db.ref(`payments/${id}`).remove()
  for (const id of created.reportIds) await db.ref(`reports/${id}`).remove()
  for (const requestId of created.chatRequestIds) await db.ref(`chats/${requestId}`).remove()

  await db.ref(`schedules/${TEST_USERS.repairman.uid}`).remove()
  await db.ref(`wallets/${TEST_USERS.customer.uid}`).remove()

  const txSnap = await db.ref('transactions').once('value')
  const tx = txSnap.val() ?? {}
  for (const [id, value] of Object.entries(tx)) {
    if (id !== '_schema' && value && value.uid === TEST_USERS.customer.uid) {
      await db.ref(`transactions/${id}`).remove()
    }
  }

  for (const user of Object.values(TEST_USERS)) {
    await db.ref(`users/${user.uid}`).remove()
    try {
      await auth.deleteUser(user.uid)
    } catch {
      // bỏ qua
    }
  }
}

async function main() {
  const apiKey = loadWebApiKey()
  const { createApp } = await import('../src/app.js')
  const app = createApp()
  const server = await new Promise((resolve) => {
    const srv = app.listen(0, () => resolve(srv))
  })
  const base = `http://localhost:${server.address().port}`
  const api = makeApi(base)
  console.log(`Server test: ${base}`)

  const created = {
    requestIds: [],
    categoryIds: [],
    ratingIds: [],
    paymentIds: [],
    reportIds: [],
    chatRequestIds: [],
  }

  const tokens = {}

  try {
    // ===== Chuẩn bị user + token =====
    section('Thiết lập tài khoản test')
    for (const user of Object.values(TEST_USERS)) {
      await setupUser(user)
    }
    tokens.customer = await idTokenFor(TEST_USERS.customer.uid, apiKey)
    tokens.repairman = await idTokenFor(TEST_USERS.repairman.uid, apiKey)
    tokens.admin = await idTokenFor(TEST_USERS.admin.uid, apiKey)
    tokens.stranger = await idTokenFor(TEST_USERS.stranger.uid, apiKey)
    check('tạo + đăng nhập 4 user test (customer/repairman/admin/stranger)', Boolean(tokens.customer && tokens.repairman && tokens.admin && tokens.stranger))

    // Dọn dữ liệu cũ của ví/schedule để test tất định
    await db.ref(`wallets/${TEST_USERS.customer.uid}`).remove()
    await db.ref(`schedules/${TEST_USERS.repairman.uid}`).remove()

    // ===== Auth guard =====
    section('AUTH — chặn request thiếu token')
    let res = await api('GET', '/api/health')
    check('GET /api/health → 200', res.status === 200, res)
    res = await api('GET', '/api/categories')
    check('GET /api/categories không token → 401', res.status === 401, res.status)

    // ===== Categories =====
    section('CATEGORIES')
    res = await api('GET', '/api/categories', { token: tokens.customer })
    check('customer xem danh sách → 200', res.status === 200 && Array.isArray(res.data.categories), res.status)

    res = await api('POST', '/api/categories', { token: tokens.customer, body: { name: 'Smoke Điện nước' } })
    check('customer tạo danh mục → 403', res.status === 403, res.status)

    res = await api('POST', '/api/categories', { token: tokens.admin, body: { name: 'Smoke Điện nước', description: 'danh mục test' } })
    check('admin tạo danh mục → 201', res.status === 201 && res.data.category?.id, res.status)
    const categoryId = res.data.category?.id
    if (categoryId) created.categoryIds.push(categoryId)

    res = await api('POST', '/api/categories', { token: tokens.admin, body: { name: 'smoke điện nước' } })
    check('tạo trùng tên → 409', res.status === 409, res.status)

    res = await api('PATCH', `/api/categories/${categoryId}`, { token: tokens.admin, body: { description: 'đã sửa' } })
    check('admin cập nhật danh mục → 200', res.status === 200 && res.data.category?.description === 'đã sửa', res.data)

    res = await api('GET', `/api/categories/${categoryId}`, { token: tokens.customer })
    check('xem chi tiết danh mục → 200', res.status === 200 && res.data.category?.id === categoryId, res.status)

    res = await api('GET', '/api/categories/khong-ton-tai', { token: tokens.customer })
    check('danh mục không tồn tại → 404', res.status === 404, res.status)

    res = await api('DELETE', `/api/categories/${categoryId}`, { token: tokens.admin })
    check('admin xoá danh mục → 200', res.status === 200, res.status)
    if (categoryId) created.categoryIds = created.categoryIds.filter((id) => id !== categoryId)

    // ===== Requests (tạo dữ liệu nền) =====
    section('REQUESTS — tạo & chuyển trạng thái')
    res = await api('POST', '/api/requests', { token: tokens.customer, body: { device: 'Máy giặt', issue: 'Không vắt', address: '1 Test', phone: '0900000000' } })
    check('customer tạo đơn → 201', res.status === 201 && res.data.request?.id, res.status)
    const requestId = res.data.request?.id
    if (requestId) created.requestIds.push(requestId)

    res = await api('PATCH', `/api/requests/${requestId}`, { token: tokens.repairman, body: { action: 'accept' } })
    check('repairman nhận đơn → assigned', res.status === 200 && res.data.request?.status === 'assigned', res.data?.request?.status)

    res = await api('PATCH', `/api/requests/${requestId}`, { token: tokens.repairman, body: { action: 'status', status: 'in_progress' } })
    check('chuyển sang in_progress → 200', res.status === 200 && res.data.request?.status === 'in_progress', res.data?.request?.status)

    res = await api('PATCH', `/api/requests/${requestId}`, { token: tokens.repairman, body: { action: 'status', status: 'done' } })
    check('chuyển sang done → 200', res.status === 200 && res.data.request?.status === 'done', res.data?.request?.status)

    // Đơn pending thứ 2 để test chat-before-assign + rating-not-done
    res = await api('POST', '/api/requests', { token: tokens.customer, body: { device: 'Tủ lạnh', issue: 'Không lạnh', address: '2 Test' } })
    const pendingId = res.data.request?.id
    if (pendingId) created.requestIds.push(pendingId)
    check('tạo đơn pending thứ 2 → 201', res.status === 201 && Boolean(pendingId), res.status)

    // ===== Ratings =====
    section('RATINGS')
    res = await api('POST', '/api/ratings', { token: tokens.repairman, body: { requestId, score: 5 } })
    check('repairman đánh giá → 403', res.status === 403, res.status)

    res = await api('POST', '/api/ratings', { token: tokens.customer, body: { requestId: pendingId, score: 5 } })
    check('đánh giá đơn chưa done → 409', res.status === 409, res.status)

    res = await api('POST', '/api/ratings', { token: tokens.customer, body: { requestId, score: 4, comment: 'tốt' } })
    check('customer đánh giá đơn done → 201', res.status === 201 && res.data.rating?.id, res.status)
    const ratingId = res.data.rating?.id
    if (ratingId) created.ratingIds.push(ratingId)

    res = await api('POST', '/api/ratings', { token: tokens.customer, body: { requestId, score: 3 } })
    check('đánh giá trùng đơn → 409', res.status === 409, res.status)

    res = await api('POST', '/api/ratings', { token: tokens.customer, body: { requestId, score: 9 } })
    check('điểm không hợp lệ → 400', res.status === 400, res.status)

    res = await api('GET', '/api/ratings', { token: tokens.customer })
    check('customer xem ratings của mình → 200', res.status === 200 && res.data.ratings.some((r) => r.id === ratingId), res.status)

    res = await api('GET', '/api/ratings', { token: tokens.admin })
    check('admin xem tất cả ratings → 200', res.status === 200 && res.data.ratings.some((r) => r.id === ratingId), res.status)

    res = await api('GET', `/api/ratings/${ratingId}`, { token: tokens.admin })
    check('xem chi tiết rating → 200', res.status === 200 && res.data.rating?.id === ratingId, res.status)

    res = await api('DELETE', `/api/ratings/${ratingId}`, { token: tokens.customer })
    check('customer xoá rating → 403', res.status === 403, res.status)

    res = await api('DELETE', `/api/ratings/${ratingId}`, { token: tokens.admin })
    check('admin xoá rating → 200', res.status === 200, res.status)
    if (ratingId) created.ratingIds = created.ratingIds.filter((id) => id !== ratingId)

    // ===== Wallet + Transactions =====
    section('WALLET + TRANSACTIONS')
    res = await api('GET', '/api/wallet', { token: tokens.customer })
    check('xem ví → 200, số dư 0', res.status === 200 && res.data.wallet?.balance === 0, res.data)

    res = await api('POST', '/api/wallet/deposit', { token: tokens.customer, body: { amount: 100000 } })
    check('nạp 100000 → 201, số dư 100000', res.status === 201 && res.data.wallet?.balance === 100000, res.data?.wallet)

    res = await api('POST', '/api/wallet/deposit', { token: tokens.customer, body: { amount: -5 } })
    check('nạp số âm → 400', res.status === 400, res.status)

    res = await api('POST', '/api/wallet/withdraw', { token: tokens.customer, body: { amount: 999999999 } })
    check('rút quá số dư → 409', res.status === 409, res.status)

    res = await api('POST', '/api/wallet/withdraw', { token: tokens.customer, body: { amount: 40000 } })
    check('rút 40000 → 201, số dư 60000', res.status === 201 && res.data.wallet?.balance === 60000, res.data?.wallet)

    res = await api('GET', '/api/wallet/all', { token: tokens.customer })
    check('user thường xem all wallets → 403', res.status === 403, res.status)

    res = await api('GET', '/api/wallet/all', { token: tokens.admin })
    check('admin xem all wallets → 200', res.status === 200 && Array.isArray(res.data.wallets), res.status)

    res = await api('GET', '/api/transactions', { token: tokens.customer })
    check('customer xem lịch sử giao dịch → 200 (deposit + withdraw)', res.status === 200 && res.data.transactions.length >= 2, res.data?.total)

    res = await api('GET', '/api/transactions?type=withdraw', { token: tokens.customer })
    check('lọc giao dịch theo type → 200', res.status === 200 && res.data.transactions.every((t) => t.type === 'withdraw'), res.status)

    // ===== Payments =====
    section('PAYMENTS')
    res = await api('POST', '/api/payments', { token: tokens.repairman, body: { requestId, method: 'cash', amount: 200000 } })
    check('repairman tạo payment → 403', res.status === 403, res.status)

    res = await api('POST', '/api/payments', { token: tokens.customer, body: { requestId, method: 'sai', amount: 200000 } })
    check('phương thức không hợp lệ → 400', res.status === 400, res.status)

    res = await api('POST', '/api/payments', { token: tokens.customer, body: { requestId, method: 'cash', amount: 200000 } })
    check('customer tạo payment → 201 pending', res.status === 201 && res.data.payment?.status === 'pending', res.status)
    const paymentId = res.data.payment?.id
    if (paymentId) created.paymentIds.push(paymentId)

    res = await api('PATCH', `/api/payments/${paymentId}`, { token: tokens.customer, body: { action: 'confirm' } })
    check('xác nhận payment → confirmed', res.status === 200 && res.data.payment?.status === 'confirmed', res.data?.payment?.status)

    res = await api('PATCH', `/api/payments/${paymentId}`, { token: tokens.customer, body: { action: 'confirm' } })
    check('xác nhận lần 2 → 409', res.status === 409, res.status)

    res = await api('PATCH', `/api/payments/${paymentId}`, { token: tokens.stranger, body: { action: 'confirm' } })
    check('người khác xác nhận payment → 403', res.status === 403, res.status)

    // ===== Chats =====
    section('CHATS')
    res = await api('POST', `/api/chats/${pendingId}/messages`, { token: tokens.customer, body: { text: 'chưa nhận đơn' } })
    check('nhắn khi đơn chưa nhận → 403', res.status === 403, res.status)

    res = await api('POST', `/api/chats/${requestId}/messages`, { token: tokens.customer, body: { text: 'Xin chào' } })
    check('customer gửi tin nhắn → 201', res.status === 201 && res.data.message?.id, res.status)
    if (res.status === 201) created.chatRequestIds.push(requestId)

    res = await api('POST', `/api/chats/${requestId}/messages`, { token: tokens.repairman, body: { text: 'Đã tới' } })
    check('repairman gửi tin nhắn → 201', res.status === 201, res.status)

    res = await api('POST', `/api/chats/${requestId}/messages`, { token: tokens.customer, body: { text: '   ' } })
    check('tin nhắn rỗng → 400', res.status === 400, res.status)

    res = await api('GET', `/api/chats/${requestId}/messages`, { token: tokens.admin })
    check('admin xem tin nhắn → 200 (>=2)', res.status === 200 && res.data.messages.length >= 2, res.data?.total)

    res = await api('POST', `/api/chats/${requestId}/messages`, { token: tokens.stranger, body: { text: 'tôi là ai' } })
    check('người ngoài gửi tin nhắn → 403', res.status === 403, res.status)

    res = await api('GET', `/api/chats/${requestId}/messages`, { token: tokens.stranger })
    check('người ngoài đọc tin nhắn → 403', res.status === 403, res.status)

    res = await api('GET', '/api/chats', { token: tokens.customer })
    check('customer xem danh sách chat → 200', res.status === 200 && res.data.chats.some((c) => c.requestId === requestId), res.status)

    // ===== Schedules =====
    section('SCHEDULES')
    res = await api('GET', '/api/schedules/me', { token: tokens.customer })
    check('customer xem lịch (mặc định) → 200', res.status === 200 && res.data.schedule?.defaultStart === '08:00', res.data?.schedule?.defaultStart)

    res = await api('PUT', '/api/schedules/me', { token: tokens.customer, body: { online: true } })
    check('customer sửa lịch → 403', res.status === 403, res.status)

    res = await api('PUT', '/api/schedules/me', { token: tokens.repairman, body: { online: true, defaultStart: '09:00', defaultEnd: '18:00', workDays: [1, 2, 3] } })
    check('repairman cập nhật lịch → 200', res.status === 200 && res.data.schedule?.online === true && res.data.schedule?.defaultStart === '09:00', res.data?.schedule)

    res = await api('POST', '/api/schedules/me/timeoff', { token: tokens.repairman, body: { start: '2026-01-01 09:00', end: '2026-01-01 12:00', reason: 'test' } })
    check('thêm time-off → 201', res.status === 201 && res.data.timeOff?.id, res.status)
    const timeOffId = res.data.timeOff?.id

    res = await api('DELETE', `/api/schedules/me/timeoff/${timeOffId}`, { token: tokens.repairman })
    check('xoá time-off → 200', res.status === 200, res.status)

    res = await api('DELETE', '/api/schedules/me/timeoff/khong-ton-tai', { token: tokens.repairman })
    check('xoá time-off không tồn tại → 404', res.status === 404, res.status)

    // ===== Reports =====
    section('REPORTS')
    res = await api('POST', '/api/reports', { token: tokens.customer, body: { targetType: 'sai', targetId: requestId, reason: 'test' } })
    check('targetType không hợp lệ → 400', res.status === 400, res.status)

    res = await api('POST', '/api/reports', { token: tokens.customer, body: { targetType: 'request', targetId: requestId, reason: 'thợ tới trễ' } })
    check('customer gửi báo cáo → 201 open', res.status === 201 && res.data.report?.status === 'open', res.status)
    const reportId = res.data.report?.id
    if (reportId) created.reportIds.push(reportId)

    res = await api('PATCH', `/api/reports/${reportId}`, { token: tokens.customer, body: { action: 'resolve' } })
    check('customer xử lý báo cáo → 403', res.status === 403, res.status)

    res = await api('PATCH', `/api/reports/${reportId}`, { token: tokens.admin, body: { action: 'resolve' } })
    check('admin resolve báo cáo → resolved', res.status === 200 && res.data.report?.status === 'resolved', res.data?.report?.status)

    res = await api('PATCH', `/api/reports/${reportId}`, { token: tokens.admin, body: { action: 'resolve' } })
    check('xử lý lần 2 → 409', res.status === 409, res.status)

    res = await api('GET', '/api/reports', { token: tokens.customer })
    check('customer xem báo cáo của mình → 200', res.status === 200 && res.data.reports.some((r) => r.id === reportId), res.status)

    res = await api('GET', '/api/reports', { token: tokens.admin })
    check('admin xem tất cả báo cáo → 200', res.status === 200, res.status)

    res = await api('GET', '/api/reports/khong-ton-tai', { token: tokens.admin })
    check('báo cáo không tồn tại → 404', res.status === 404, res.status)
  } finally {
    section('DỌN DẸP')
    await cleanup(created)
    console.log('  ✔ đã xoá dữ liệu test + tài khoản test')
    server.close()
  }

  console.log(`\n===== KẾT QUẢ: ${passed} passed, ${failed} failed =====`)
  if (failures.length) {
    console.log('Thất bại:')
    for (const name of failures) console.log('  -', name)
  }
  process.exit(failed ? 1 : 0)
}

main().catch((error) => {
  console.error('\n❌ Smoke test lỗi:', error.message, '\n')
  process.exit(1)
})
