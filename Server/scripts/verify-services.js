/**
 * Kiểm thử luồng nghiệp vụ DỊCH VỤ (quyền sở hữu của thợ + admin).
 * Chạy: node scripts/verify-services.js
 * Tự khởi động app trên cổng ngẫu nhiên + tự dọn dữ liệu test.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { auth, db, firestore } from '../src/config/firebase.js'

let passed = 0
let failed = 0
const failures = []

function check(name, condition, detail) {
  if (condition) {
    passed++
    console.log(`  \u2714 ${name}`)
  } else {
    failed++
    failures.push(name)
    console.log(`  \u2718 ${name}${detail === undefined ? '' : ` \u2192 ${JSON.stringify(detail)}`}`)
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

function makeApi(base) {
  return async (method, url, { token, body } = {}) => {
    const res = await fetch(`${base}${url}`, {
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
    if (method !== 'GET' && res.status >= 400) {
      console.log(`    [debug ${method} ${url} -> ${res.status}]`, JSON.stringify(data))
    }
    return { status: res.status, data }
  }
}

const USERS = {
  admin: { uid: 'vsvcAdmin', email: 'verify.admin@fixmate.dev', role: 'admin', name: 'Verify Admin' },
  workerA: { uid: 'verifyWorkerA', email: 'verify.worker.a@fixmate.dev', role: 'repairman', name: 'Thợ A' },
  workerB: { uid: 'verifyWorkerB', email: 'verify.workerb.dev@fixmate.dev', role: 'repairman', name: 'Thợ B' },
  customer: { uid: 'verifyCustomer', email: 'verify.customer@fixmate.dev', role: 'customer', name: 'Khách' },
}

async function setupUser(user) {
  try {
    await auth.deleteUser(user.uid)
  } catch {
    // chưa tồn tại
  }
  await db.ref(`users/${user.uid}`).remove()
  await auth.createUser({ uid: user.uid, email: user.email, displayName: user.name, emailVerified: true })
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
  if (!data.idToken) throw new Error(`Không lấy được idToken: ${JSON.stringify(data)}`)
  return data.idToken
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

  const tokens = {}
  const createdServiceIds = []

  try {
    section('THIẾT LẬP')
    for (const user of Object.values(USERS)) await setupUser(user)
    tokens.admin = await idTokenFor(USERS.admin.uid, apiKey)
    tokens.workerA = await idTokenFor(USERS.workerA.uid, apiKey)
    tokens.workerB = await idTokenFor(USERS.workerB.uid, apiKey)
    tokens.customer = await idTokenFor(USERS.customer.uid, apiKey)
    check('tạo + đăng nhập admin/2 thợ/khách', Boolean(tokens.admin && tokens.workerA && tokens.workerB))

    section('PHÂN QUYỀN TẠO DỊCH VỤ')
    let res = await api('POST', '/api/services', {
      token: tokens.customer,
      body: { title: 'Khách tự tạo', category: 'electric', startingPrice: 100000 },
    })
    check('khách tạo dịch vụ → 403', res.status === 403, res.status)

    res = await api('POST', '/api/services', {
      token: tokens.admin,
      body: { title: 'Dịch vụ nền tảng', category: 'water', startingPrice: 200000, responseTime: '30 phút' },
    })
    const adminService = res.data?.service
    check('admin tạo dịch vụ → 201', res.status === 201 && Boolean(adminService?.id), res.status)
    check('admin tạo → không có chủ sở hữu (nền tảng)', !adminService?.ownerUid)
    check('admin tạo → categoryName suy diễn', adminService?.categoryName === 'Sửa chữa nước', adminService?.categoryName)
    check('admin tạo → priceDisplay suy diễn', /200\.000/.test(adminService?.priceDisplay || ''), adminService?.priceDisplay)
    if (adminService?.id) createdServiceIds.push(adminService.id)

    res = await api('POST', '/api/services', {
      token: tokens.workerA,
      body: {
        title: 'Dịch vụ của thợ A',
        category: 'electric',
        startingPrice: 150000,
        responseTime: '15-30 phút',
        shortDesc: 'Mô tả ban đầu',
      },
    })
    const aService = res.data?.service
    check('thợ A tạo dịch vụ → 201', res.status === 201 && Boolean(aService?.id), res.status)
    check('thợ A tạo → gán ownerUid = thợ A', aService?.ownerUid === USERS.workerA.uid, aService?.ownerUid)
    check('thợ A tạo → ownerName = tên thợ', aService?.ownerName === USERS.workerA.name, aService?.ownerName)
    check('thợ A tạo → categoryName = "Sửa chữa điện"', aService?.categoryName === 'Sửa chữa điện', aService?.categoryName)
    check('thợ A tạo → priceDisplay = "Từ 150.000 đ"', /150\.000/.test(aService?.priceDisplay || ''), aService?.priceDisplay)
    if (aService?.id) createdServiceIds.push(aService.id)

    res = await api('POST', '/api/services', {
      token: tokens.workerB,
      body: { title: 'Dịch vụ của thợ B', category: 'water', startingPrice: 120000 },
    })
    const bService = res.data?.service
    check('thợ B tạo dịch vụ → 201', res.status === 201 && Boolean(bService?.id), res.status)
    if (bService?.id) createdServiceIds.push(bService.id)

    res = await api('POST', '/api/services', {
      token: tokens.admin,
      body: { title: 'Sai danh mục', category: 'khong-hop-le', startingPrice: 1000 },
    })
    check('tạo dịch vụ sai danh mục → 400', res.status === 400, res.status)

    section('LỌC DỊCH VỤ THEO CHỦ SỞ HỮU (?ownerUid=mine)')
    res = await api('GET', '/api/services?ownerUid=mine', { token: tokens.workerA })
    const mineA = res.data?.services || []
    check('thợ A xem "mine" → 200', res.status === 200, res.status)
    check('"mine" của A chỉ chứa dịch vụ của A', mineA.length >= 1 && mineA.every((s) => s.ownerUid === USERS.workerA.uid))
    check('"mine" của A không chứa dịch vụ admin/B', !mineA.some((s) => s.id === adminService?.id || s.id === bService?.id))

    section('CẬP NHẬT — CHẶN THỢ KHÁC / CHO PHÉP CHỦ SỞ HỮU & ADMIN')
    res = await api('PUT', `/api/services/${aService?.id}`, {
      token: tokens.workerB,
      body: { startingPrice: 999999 },
    })
    check('thợ B sửa dịch vụ của thợ A → 403', res.status === 403, res.status)

    res = await api('PUT', `/api/services/${adminService?.id}`, {
      token: tokens.workerA,
      body: { startingPrice: 111111 },
    })
    check('thợ A sửa dịch vụ nền tảng → 403', res.status === 403, res.status)

    res = await api('PUT', `/api/services/${aService?.id}`, {
      token: tokens.workerA,
      body: { startingPrice: 180000 },
    })
    const updatedA = res.data?.service
    check('thợ A sửa dịch vụ của mình → 200', res.status === 200, res.status)
    check('sửa giá → priceDisplay cập nhật', /180\.000/.test(updatedA?.priceDisplay || ''), updatedA?.priceDisplay)
    check('sửa một phần → giữ nguyên shortDesc cũ', updatedA?.shortDesc === 'Mô tả ban đầu', updatedA?.shortDesc)
    check('sửa một phần → giữ nguyên responseTime cũ', updatedA?.responseTime === '15-30 phút', updatedA?.responseTime)
    check('sửa → không đổi chủ sở hữu', updatedA?.ownerUid === USERS.workerA.uid, updatedA?.ownerUid)

    res = await api('PUT', `/api/services/${adminService?.id}`, {
      token: tokens.admin,
      body: { title: 'Dịch vụ nền tảng (đã sửa)' },
    })
    check('admin sửa dịch vụ nền tảng → 200', res.status === 200 && res.data?.service?.title === 'Dịch vụ nền tảng (đã sửa)', res.status)

    res = await api('PUT', `/api/services/khong-ton-tai`, { token: tokens.admin, body: { title: 'x' } })
    check('sửa dịch vụ không tồn tại → 404', res.status === 404, res.status)

    section('XOÁ — CHẶN THỢ KHÁC / CHO PHÉP CHỦ SỞ HỮU & ADMIN')
    res = await api('DELETE', `/api/services/${aService?.id}`, { token: tokens.workerB })
    check('thợ B xoá dịch vụ của thợ A → 403', res.status === 403, res.status)

    res = await api('DELETE', `/api/services/${aService?.id}`, { token: tokens.workerA })
    check('thợ A xoá dịch vụ của mình → 200', res.status === 200, res.status)
    if (aService?.id) {
      const idx = createdServiceIds.indexOf(aService.id)
      if (idx >= 0) createdServiceIds.splice(idx, 1)
    }

    res = await api('DELETE', `/api/services/${adminService?.id}`, { token: tokens.admin })
    check('admin xoá dịch vụ nền tảng → 200', res.status === 200, res.status)
    if (adminService?.id) {
      const idx = createdServiceIds.indexOf(adminService.id)
      if (idx >= 0) createdServiceIds.splice(idx, 1)
    }
  } finally {
    section('DỌN DẸP')
    for (const id of createdServiceIds) {
      await firestore.collection('services').doc(id).delete()
    }
    for (const user of Object.values(USERS)) {
      await db.ref(`users/${user.uid}`).remove()
      try {
        await auth.deleteUser(user.uid)
      } catch {
        // bỏ qua
      }
    }
    server.closeAllConnections?.()
    server.close()
  }

  console.log(`\n===== KẾT QUẢ: ${passed} passed, ${failed} failed =====`)
  if (failed > 0) {
    console.log('Lỗi:', failures.join(' | '))
  }
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
