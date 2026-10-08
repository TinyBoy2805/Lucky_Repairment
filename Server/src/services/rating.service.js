import { db } from '../config/firebase.js'
import { badRequest, conflict, forbidden, notFound } from '../utils/http-error.js'

const ratingsRef = () => db.ref('ratings')
const ratingRef = (id) => ratingsRef().child(id)
const requestRef = (id) => db.ref(`requests/${id}`)

const norm = (value) => String(value ?? '').trim()

const toList = (value) =>
  Object.entries(value ?? {})
    .filter(([id]) => id !== '_schema')
    .map(([id, data]) => ({ id, ...data }))

/**
 * Danh sách đánh giá:
 * - customer → đánh giá do mình tạo.
 * - repairman → đánh giá về mình.
 * - admin → tất cả (có thể lọc ?repairmanUid=).
 */
export async function listRatings(viewer, { repairmanUid } = {}) {
  const snapshot = await ratingsRef().once('value')
  if (!snapshot.exists()) return []

  let items = toList(snapshot.val())

  if (viewer.role === 'customer') {
    items = items.filter((item) => item.customerUid === viewer.uid)
  } else if (viewer.role === 'repairman') {
    items = items.filter((item) => item.repairmanUid === viewer.uid)
  }

  if (repairmanUid) {
    items = items.filter((item) => item.repairmanUid === repairmanUid)
  }

  return items.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
}

export async function getRating(id) {
  const snapshot = await ratingRef(id).once('value')
  if (!snapshot.exists()) throw notFound('Không tìm thấy đánh giá.')
  return { id, ...snapshot.val() }
}

/** Khách đánh giá đơn đã hoàn thành (1 đơn chỉ đánh giá 1 lần). */
export async function createRating(customer, input = {}) {
  const requestId = norm(input.requestId)
  const score = Number(input.score)
  const comment = norm(input.comment)

  if (!requestId) throw badRequest('Thiếu mã đơn hàng.')
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    throw badRequest('Điểm đánh giá phải là số nguyên từ 1 đến 5.')
  }

  const snapshot = await requestRef(requestId).once('value')
  if (!snapshot.exists()) throw notFound('Không tìm thấy đơn hàng.')

  const request = snapshot.val()
  if (request.customerUid !== customer.uid) {
    throw forbidden('Bạn chỉ đánh giá được đơn của mình.')
  }
  if (request.status !== 'done') {
    throw conflict('Chỉ đánh giá được khi đơn đã hoàn thành.')
  }

  const existing = await listRatings({ role: 'admin' })
  if (existing.some((item) => item.requestId === requestId)) {
    throw conflict('Đơn này đã được đánh giá.')
  }

  const now = Date.now()
  const entry = {
    requestId,
    customerUid: customer.uid,
    customerName: customer.displayName || customer.email || 'Khách hàng',
    repairmanUid: request.repairmanUid ?? null,
    repairmanName: request.repairmanName ?? '',
    score,
    comment,
    createdAt: now,
    updatedAt: now,
  }

  const ref = await ratingsRef().push(entry)
  return { id: ref.key, ...entry }
}

/** Xoá đánh giá (admin — Manage Ratings). */
export async function deleteRating(id) {
  await getRating(id)
  await ratingRef(id).remove()
  return true
}
