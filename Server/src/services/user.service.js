import { auth, db, env } from '../config/firebase.js'
import { matchesSearch, paginate, readListQuery, sortList } from '../utils/list-query.js'

export const ROLES = ['customer', 'repairman', 'admin']
export const SELF_ASSIGNABLE_ROLES = ['customer', 'repairman']

const userRef = (uid) => db.ref(`users/${uid}`)

// undefined/null được coi là rỗng khi so sánh
const norm = (value) => value ?? ''

export function isAdminEmail(email) {
  if (!email) return false
  return env.adminEmails.includes(String(email).trim().toLowerCase())
}

/** Đọc profile trong Realtime Database. Trả về null nếu chưa tồn tại. */
export async function getProfile(uid) {
  const snapshot = await userRef(uid).once('value')
  if (!snapshot.exists()) return null
  return { uid, ...snapshot.val() }
}

/**
 * Đảm bảo user luôn có profile.
 * - Email nằm trong ADMIN_EMAILS  → luôn là admin (bootstrap quyền admin).
 * - Còn lại                      → giữ role hiện có, không có thì mặc định customer.
 * Chỉ ghi DB khi thực sự có thay đổi.
 */
export async function ensureProfile(decoded, options = {}) {
  const uid = decoded.uid
  const existing = await getProfile(uid)
  const now = Date.now()

  const requestedRole = SELF_ASSIGNABLE_ROLES.includes(options.role)
    ? options.role
    : undefined

  let role
  if (isAdminEmail(decoded.email)) {
    role = 'admin'
  } else if (requestedRole) {
    role = requestedRole
  } else if (existing?.role && ROLES.includes(existing.role)) {
    role = existing.role
  } else {
    role = 'customer'
  }

  const profile = {
    uid,
    email: norm(decoded.email),
    displayName: norm(options.displayName ?? decoded.name ?? existing?.displayName),
    phone: norm(options.phone ?? decoded.phone_number ?? existing?.phone),
    photoURL: norm(decoded.picture ?? existing?.photoURL),
    role,
    createdAt: existing?.createdAt ?? now,
    updatedAt: existing?.updatedAt ?? now,
  }

  const changed =
    !existing ||
    ['email', 'displayName', 'phone', 'photoURL', 'role'].some(
      (key) => norm(existing[key]) !== norm(profile[key]),
    )

  if (!changed) return existing

  profile.updatedAt = now
  await userRef(uid).set(profile)
  return profile
}

/** Danh sách toàn bộ user (admin only). */
export async function listUsers(query = {}) {
  const options = readListQuery(query)
  const snapshot = await db.ref('users').once('value')

  let items = snapshot.exists()
    ? Object.entries(snapshot.val()).map(([uid, data]) => ({ uid, ...data }))
    : []

  if (query.role) {
    items = items.filter((item) => item.role === query.role)
  }

  items = items.filter((item) =>
    matchesSearch(item, ['displayName', 'email', 'phone'], options.search),
  )
  items = sortList(items, options.sort, options.order, 'createdAt', 'desc')

  return paginate(items, options)
}

/** Đổi vai trò của 1 user (admin only). */
export async function updateRole(uid, role) {
  if (!ROLES.includes(role)) {
    throw Object.assign(
      new Error(`Role không hợp lệ. Chỉ chấp nhận: ${ROLES.join(', ')}`),
      { status: 400 },
    )
  }

  const existing = await getProfile(uid)
  if (!existing) {
    throw Object.assign(new Error('Không tìm thấy người dùng.'), { status: 404 })
  }

  if (isAdminEmail(existing.email)) {
    throw Object.assign(
      new Error('Email này nằm trong ADMIN_EMAILS nên luôn là admin, không thể đổi.'),
      { status: 400 },
    )
  }

  await userRef(uid).update({ role, updatedAt: Date.now() })
  return { ...existing, role }
}

/** Thu hồi refresh token — user sẽ phải đăng nhập lại ở mọi thiết bị. */
export async function revokeRefreshTokens(uid) {
  try {
    await auth.revokeRefreshTokens(uid)
    return true
  } catch (error) {
    console.warn(`[auth] Không thể thu hồi refresh token của ${uid}:`, error.message)
    return false
  }
}
