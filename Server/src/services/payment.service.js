import crypto from 'node:crypto'
import { db } from '../config/firebase.js'
import { badRequest, conflict, forbidden, notFound } from '../utils/http-error.js'
import { matchesSearch, paginate, readListQuery, sortList } from '../utils/list-query.js'

export const PAYMENT_METHODS = ['cod', 'cash', 'momo', 'zalopay', 'stripe']
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
 * - { action: 'complete' } → confirmed → completed (cho COD)
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
  } else if (action === 'complete') {
    // Chuyển từ confirmed sang completed (cho COD)
    if (payment.status !== 'confirmed') {
      throw badRequest('Chỉ có thể hoàn tất thanh toán đã được xác nhận.')
    }
    patch.status = 'completed'
  } else {
    throw badRequest('Thiếu thao tác hợp lệ (confirm, fail, hoặc complete).')
  }

  await paymentRef(id).update(patch)
  return { id, ...payment, ...patch }
}

/**
 * Tạo URL thanh toán MoMo
 * - Trả về URL redirect cho client gọi MoMo pay
 */
export async function createMoMoPayment({ id, actor, orderId, amount, description }) {
  // MoMo production config
  const partnerCode = process.env.MOMO_PARTNER_CODE || 'TEST_PARTNER'
  const accessKey = process.env.MOMO_ACCESS_KEY || 'TEST_ACCESS_KEY'
  const secretKey = process.env.MOMO_SECRET_KEY || 'TEST_SECRET_KEY'
  const redirectUrl = process.env.MOMO_REDIRECT_URL || 'http://localhost:3000/payment/callback'
  const ipnUrl = process.env.MOMO_IPN_URL || 'http://localhost:3000/api/payment/momo-callback'

  // Tạo đơn hàng MoMo
  const requestId = `momo_${Date.now()}_${Math.floor(Math.random() * 10000)}`

  const rawSignature = `partnerCode=${partnerCode}&accessKey=${accessKey}&amount=${amount}&redirectUrl=${redirectUrl}&ipnUrl=${ipnUrl}&orderId=${orderId}&requestId=${requestId}`
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(rawSignature)
    .digest('hex')

  const momoUrl = `https://pay.momo.vn/v2/gateway/api/create?partnerCode=${partnerCode}&accessKey=${accessKey}&requestId=${requestId}&amount=${amount}&orderId=${orderId}&redirectUrl=${redirectUrl}&ipnUrl=${ipnUrl}&signature=${signature}`

  // Lưu payment record
  const now = Date.now()
  const paymentEntry = {
    requestId: `order_${orderId}`,
    customerUid: actor.uid,
    repairmanUid: null,
    amount: Math.round(amount),
    method: 'momo',
    note: description || 'Thanh toán MoMo',
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    confirmedAt: null,
  }

  const paymentRef = await paymentsRef().push(paymentEntry)

  return {
    paymentId: paymentRef.key,
    momoUrl,
    requestId,
    amount,
    orderId,
  }
}

/**
 * Tạo Stripe checkout session
 * - Nếu có STRIPE_SECRET_KEY và cài package "stripe": tạo session thật.
 * - Nếu chưa cấu hình: trả về URL mô phỏng để luồng thanh toán không bị vỡ.
 */
export async function createStripeCheckoutSession({ actor, orderId, amount }) {
  const secretKey = process.env.STRIPE_SECRET_KEY
  const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173'

  const now = Date.now()
  const paymentEntry = {
    requestId: `order_${orderId}`,
    customerUid: actor.uid,
    repairmanUid: null,
    amount: Math.round(amount),
    method: 'stripe',
    note: 'Thanh toán Stripe',
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    confirmedAt: null,
  }
  const paymentRef = await paymentsRef().push(paymentEntry)

  // Chưa cấu hình Stripe → dùng luồng mô phỏng
  if (!secretKey) {
    const sessionId = `sim_${paymentRef.key}`
    await paymentsRef().child(paymentRef.key).update({ sessionId, simulated: true })
    return {
      paymentId: paymentRef.key,
      sessionUrl: `${frontendUrl}/payment-success?orderId=${orderId}&session_id=${sessionId}&simulated=1`,
      sessionId,
      simulated: true,
      amount,
      orderId,
    }
  }

  let Stripe
  try {
    Stripe = (await import('stripe')).default
  } catch {
    throw badRequest(
      'Chưa cài đặt gói "stripe" trên server. Hãy chạy "npm install stripe" hoặc bỏ cấu hình STRIPE_SECRET_KEY.',
    )
  }

  const stripe = new Stripe(secretKey)
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'vnd',
          unit_amount: Math.round(amount),
          product_data: { name: `Đơn hàng #${orderId}` },
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${frontendUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontendUrl}/payment-cancelled`,
    metadata: { orderId, customerUid: actor.uid },
  })

  await paymentsRef().child(paymentRef.key).update({
    sessionId: session.id,
  })

  return {
    paymentId: paymentRef.key,
    sessionUrl: session.url,
    sessionId: session.id,
    amount,
    orderId,
  }
}

/**
 * Xử lý callback MoMo - endpoint này nhận được từ MoMo server sau khi thanh toán xong
 */
export async function momoCallback(req, res, next) {
  try {
    const {
      orderId,
      resultCode,
      amount,
      orderInfo,
      requestId,
      extraData,
    } = req.body

    if (resultCode === 0) {
      // Thanh toán thành công
      const paymentRef = await paymentsRef().child(`payment_${orderId}`).once('value')
      // Cập nhật trạng thái thanh toán thành confirmed
      await paymentsRef().child(`payment_${orderId}`).update({
        status: 'confirmed',
        confirmedAt: Date.now(),
        transactionId: requestId,
        gatewayResponse: req.body,
      })

      // Cập nhật trạng thái đơn hàng sang confirmed (tự động vì payment successful)
      const orderRef = db.ref(`orders/${orderId}`)
      await orderRef.update({
        status: 'confirmed',
        paymentMethod: 'momo',
        updatedAt: Date.now(),
      })

      return res.status(200).json({ status: 'success', message: 'Thanh MoMo thanh cong' })
    } else {
      // Thanh toán thất bại
      await paymentsRef().child(`payment_${orderId}`).update({
        status: 'failed',
        failedAt: Date.now(),
        gatewayResponse: req.body,
      })

      return res.status(200).json({ status: 'failed', message: 'Thanh toan that bai' })
    }
  } catch (error) {
    console.error('[MoMo Callback Error]', error)
    next(error)
  }
}