import { db } from '../config/firebase.js'
import { badRequest, conflict, forbidden, notFound } from '../utils/http-error.js'
import { matchesSearch, paginate, readListQuery, sortList } from '../utils/list-query.js'

// Đối tượng được đánh giá: yêu cầu sửa chữa (request) hoặc đơn dịch vụ (order).
export const RATING_TARGETS = ['request', 'order']

const ratingsRef = () => db.ref('ratings')
const ratingRef = (id) => ratingsRef().child(id)
const requestRef = (id) => db.ref(`requests/${id}`)
const orderRef = (id) => db.ref(`orders/${id}`)

const norm = (value) => String(value ?? '').trim()

const toList = (value) =>
  Object.entries(value ?? {})
    .filter(([id]) => id !== '_schema')
    .map(([id, data]) => ({ id, ...data }))

async function readAllRatings() {
  const snapshot = await ratingsRef().once('value')
  if (!snapshot.exists()) return []
  return toList(snapshot.val())
}

/**
 * Danh sách đánh giá:
 * - customer → đánh giá do mình tạo.
 * - repairman → đánh giá về mình.
 * - admin → tất cả (có thể lọc ?repairmanUid=).
 */
export async function listRatings(viewer, query = {}) {
  const options = readListQuery(query)
  let items = await readAllRatings()

  if (viewer.role === 'customer') {
    items = items.filter((item) => item.customerUid === viewer.uid)
  } else if (viewer.role === 'repairman') {
    items = items.filter((item) => item.repairmanUid === viewer.uid)
  }

  if (query.repairmanUid) {
    items = items.filter((item) => item.repairmanUid === query.repairmanUid)
  }
  if (query.requestId) {
    items = items.filter((item) => item.requestId === query.requestId)
  }
  if (query.orderId) {
    items = items.filter((item) => item.orderId === query.orderId)
  }
  if (query.targetType) {
    items = items.filter((item) => (item.targetType ?? 'request') === query.targetType)
  }
  if (query.score !== undefined && query.score !== '') {
    items = items.filter((item) => Number(item.score) === Number(query.score))
  }

  items = items.filter((item) =>
    matchesSearch(item, ['comment', 'repairmanName', 'customerName'], options.search),
  )
  items = sortList(items, options.sort, options.order, 'createdAt', 'desc')

  return paginate(items, options)
}

export async function getRating(id) {
  const snapshot = await ratingRef(id).once('value')
  if (!snapshot.exists()) throw notFound('Không tìm thấy đánh giá.')
  return { id, ...snapshot.val() }
}

/**
 * Khách đánh giá đơn đã hoàn thành (1 đối tượng chỉ đánh giá 1 lần).
 * Hỗ trợ 2 loại: `requestId` (yêu cầu sửa chữa đã `done`) và
 * `orderId` (đơn dịch vụ đã `completed`).
 */
export async function createRating(customer, input = {}) {
  const requestId = norm(input.requestId)
  const orderId = norm(input.orderId)
  const score = Number(input.score)
  const comment = norm(input.comment)

  const targetType = orderId ? 'order' : 'request'
  const targetId = orderId || requestId

  if (!targetId) throw badRequest('Thiếu mã đơn hàng.')
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    throw badRequest('Điểm đánh giá phải là số nguyên từ 1 đến 5.')
  }

  const existing = await readAllRatings()
  const now = Date.now()

  if (targetType === 'order') {
    const snapshot = await orderRef(orderId).once('value')
    if (!snapshot.exists()) throw notFound('Không tìm thấy đơn hàng.')

    const order = snapshot.val()
    if (order.customerUid !== customer.uid) {
      throw forbidden('Bạn chỉ đánh giá được đơn của mình.')
    }
    if (order.status !== 'completed') {
      throw conflict('Chỉ đánh giá được khi đơn đã hoàn thành.')
    }
    if (existing.some((item) => item.orderId === orderId)) {
      throw conflict('Đơn này đã được đánh giá.')
    }

    const items = Array.isArray(order.items) ? order.items : Object.values(order.items || {})
    const entry = {
      targetType: 'order',
      orderId,
      requestId: null,
      customerUid: customer.uid,
      customerName: customer.displayName || customer.email || 'Khách hàng',
      repairmanUid: order.repairmanUid ?? null,
      repairmanName: order.repairmanName ?? '',
      productName: items[0]?.productName ?? '',
      score,
      comment,
      createdAt: now,
      updatedAt: now,
    }

    const ref = await ratingsRef().push(entry)
    return { id: ref.key, ...entry }
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
  if (existing.some((item) => item.requestId === requestId)) {
    throw conflict('Đơn này đã được đánh giá.')
  }

  const entry = {
    targetType: 'request',
    requestId,
    orderId: null,
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
