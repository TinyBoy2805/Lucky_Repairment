import { db } from '../config/firebase.js'
import { badRequest, conflict, forbidden, notFound } from '../utils/http-error.js'
import { matchesSearch, paginate, readListQuery, sortList } from '../utils/list-query.js'

export const PAYMENT_METHODS = ['cash', 'ewallet', 'bank']
export const PAYMENT_STATUSES = ['pending', 'confirmed', 'failed']

const paymentsRef = () => db.ref('payments')
const paymentRef = (id) => paymentsRef().child(id)
const requestRef = (id) => db.ref(`requests/${id}`)

const norm = (value) => String(value ?? '').trim()

const toList = (value) =>
  Object.entries(value ?? {})
    .filter(([id]) => id !== '_schema')
    .map(([id, data]) => ({ id, ...data }))

async function readAllPayments() {
  const snapshot = await paymentsRef().once('value')
  if (!snapshot.exists()) return []
  return toList(snapshot.val())
}

/**
 * Danh sách thanh toán theo vai trò:
 * - customer → đơn của mình, repairman → đơn mình phụ trách, admin → tất cả.
 */
export async function listPayments(viewer, query = {}) {
  const options = readListQuery(query)
  let items = await readAllPayments()

  if (viewer.role === 'customer') {
    items = items.filter((item) => item.customerUid === viewer.uid)
  } else if (viewer.role === 'repairman') {
    items = items.filter((item) => item.repairmanUid === viewer.uid)
  }

  if (query.status) {
    items = items.filter((item) => item.status === query.status)
  }
  if (query.method) {
    items = items.filter((item) => item.method === query.method)
  }
  if (query.requestId) {
    items = items.filter((item) => item.requestId === query.requestId)
  }

  items = items.filter((item) =>
    matchesSearch(
      item,
      ['requestId', 'customerUid', 'repairmanUid', 'note', 'method'],
      options.search,
    ),
  )
  items = sortList(items, options.sort, options.order, 'createdAt', 'desc')

  return paginate(items, options)
}

export async function getPayment(id) {
  const snapshot = await paymentRef(id).once('value')
  if (!snapshot.exists()) throw notFound('Không tìm thấy thanh toán.')
  return { id, ...snapshot.val() }
}

/** Khách tạo thanh toán cho đơn của mình. */
export async function createPayment(customer, input = {}) {
  const requestId = norm(input.requestId)
  const method = norm(input.method)
  const amount = Number(input.amount)

  if (!requestId) throw badRequest('Thiếu mã đơn hàng.')
  if (!PAYMENT_METHODS.includes(method)) {
    throw badRequest(
      `Phương thức thanh toán không hợp lệ. Chỉ chấp nhận: ${PAYMENT_METHODS.join(', ')}.`,
    )
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw badRequest('Số tiền thanh toán không hợp lệ.')
  }

  const snapshot = await requestRef(requestId).once('value')
  if (!snapshot.exists()) throw notFound('Không tìm thấy đơn hàng.')

  const request = snapshot.val()
  if (request.customerUid !== customer.uid) {
    throw forbidden('Bạn chỉ thanh toán được đơn của mình.')
  }

  const now = Date.now()
  const entry = {
    requestId,
    customerUid: customer.uid,
    repairmanUid: request.repairmanUid ?? null,
    amount: Math.round(amount),
    method,
    note: norm(input.note),
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    confirmedAt: null,
  }

  const ref = await paymentsRef().push(entry)
  return { id: ref.key, ...entry }
}

/**
 * Xác nhận / đánh dấu thất bại:
 * - { action: 'confirm' } → pending → confirmed.
 * - { action: 'fail' }    → pending → failed.
 * Chỉ chủ đơn hoặc admin thao tác.
 */
export async function updatePayment({ id, actor, action }) {
  if (!id) throw badRequest('Thiếu mã thanh toán.')

  const snapshot = await paymentRef(id).once('value')
  if (!snapshot.exists()) throw notFound('Không tìm thấy thanh toán.')

  const payment = snapshot.val()
  if (actor.role !== 'admin' && payment.customerUid !== actor.uid) {
    throw forbidden('Bạn không có quyền với thanh toán này.')
  }

  const patch = { updatedAt: Date.now() }

  if (action === 'confirm') {
    if (payment.status === 'confirmed') {
      throw conflict('Thanh toán này đã được xác nhận.')
    }
    patch.status = 'confirmed'
    patch.confirmedAt = Date.now()
  } else if (action === 'fail') {
    patch.status = 'failed'
  } else {
    throw badRequest('Thiếu thao tác hợp lệ (confirm hoặc fail).')
  }

  await paymentRef(id).update(patch)
  return { id, ...payment, ...patch }
}
