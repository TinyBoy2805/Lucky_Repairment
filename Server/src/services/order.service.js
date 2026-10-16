import { db } from '../config/firebase.js'
import { badRequest, conflict, forbidden, notFound } from '../utils/http-error.js'

// Phí kiểm tra giữ lại khi hủy đơn sau khi thợ đã đến (VNĐ)
export const INSPECTION_FEE = 60000
// Các trạng thái trước khi thợ đến nhận việc → được hoàn 100%
const BEFORE_TECHNICIAN_ARRIVES = ['pending', 'payment_verified', 'confirmed']

export const ORDER_STATUSES = ['pending', 'payment_verified', 'confirmed', 'delivering', 'completed', 'cancelled']

const ordersRef = () => db.ref('orders')
const orderRef = (id) => ordersRef().child(id)

const norm = (value) => String(value ?? '').trim()

const validateDiscount = (discount) => {
  const d = Number(discount)
  if (!Number.isFinite(d)) return false
  return d >= 0 && d <= 100 // Phần trăm giảm giá từ 0-100%
}

// Mã khuyến mãi hợp lệ (đồng bộ với Client/src/lib/promo.js)
export const PROMO_CODES = {
  PROMO10: { percent: 10 },
  SAVE10: { percent: 10 },
  WELCOME5: { amount: 50000 },
}

/** Tính số tiền giảm từ mã khuyến mãi (null nếu mã không hợp lệ). */
const computePromoDiscount = (code, totalAmount) => {
  const promo = PROMO_CODES[norm(code).toUpperCase()]
  if (!promo) return null
  const raw = promo.percent
    ? Math.round((totalAmount * promo.percent) / 100)
    : promo.amount || 0
  return Math.min(totalAmount, Math.max(0, raw))
}

/** Tạo đơn hàng mới */
export async function createOrder(customer, input = {}) {
  const receiverName = norm(input.receiverName || customer?.displayName || '')
  const phone = norm(input.phone || customer?.phone || '')
  const address = norm(input.address)
  const note = norm(input.note)
  const paymentMethod = norm(input.paymentMethod) || 'cod'

  const validMethods = ['cod', 'momo', 'zalopay', 'stripe']
  if (!validMethods.includes(paymentMethod)) {
    throw badRequest(`Phương thức thanh toán không hợp lệ. Chỉ chấp nhận: ${validMethods.join(', ')}.`)
  }

  if (!receiverName) throw badRequest('Vui lòng nhập họ tên người nhận.')
  if (!phone) throw badRequest('Vui lòng nhập số điện thoại người nhận.')
  if (!address) throw badRequest('Vui lòng nhập địa chỉ nhận hàng/lắp đặt.')

  const rawItems = Array.isArray(input.items) ? input.items : []
  if (rawItems.length === 0) throw badRequest('Đơn hàng không có sản phẩm nào.')

  // 1. Tính tổng tiền trước (tránh dùng biến trước khi khởi tạo)
  let totalAmount = 0
  const items = rawItems.map((item) => {
    const qty = Math.max(1, Number(item.quantity) || 1)
    const price = Number(item.price) || 0
    const includeInstallation = Boolean(item.includeInstallation)
    const installationFee = includeInstallation ? (Number(item.installationFee) || 0) : 0
    const subtotal = (price * qty) + (installationFee * qty)
    totalAmount += subtotal

    return {
      productId: norm(item.productId),
      productName: norm(item.productName),
      productImage: norm(item.productImage),
      category: norm(item.category),
      brand: norm(item.brand),
      price,
      quantity: qty,
      includeInstallation,
      installationFee,
      subtotal,
    }
  })

  // 2. Áp mã khuyến mãi (hỗ trợ cả % và số tiền cố định).
  // Mã hợp lệ được máy chủ tự tính (nguồn xác thực) để không phụ thuộc số tiền client gửi.
  const promo = norm(input.promo || input.promoCode).toUpperCase()
  let discountAmount = 0

  if (promo) {
    const promoDiscount = computePromoDiscount(promo, totalAmount)
    if (promoDiscount !== null) {
      discountAmount = promoDiscount
    } else if (
      input.discountAmount !== undefined &&
      input.discountAmount !== null &&
      input.discountAmount !== ''
    ) {
      discountAmount = Math.max(0, Number(input.discountAmount) || 0)
    } else if (validateDiscount(input.discount)) {
      discountAmount = Math.round((totalAmount * Number(input.discount)) / 100)
    }
    if (discountAmount > totalAmount) discountAmount = totalAmount
  }

  // 3. Quy đổi điểm thưởng nếu khách hàng chọn dùng điểm
  let pointsDiscount = 0
  let pointsRedeemed = 0
  const requestedPoints = Number(input.pointsToRedeem) || 0
  if (requestedPoints > 0 && customer?.uid && customer.uid !== 'guest') {
    try {
      const { redeemPoints, MAX_REDEEM_PERCENT, VND_PER_POINT } = await import('./loyalty.service.js')
      const maxAllowedPoints = Math.floor((totalAmount * (MAX_REDEEM_PERCENT || 0.3)) / (VND_PER_POINT || 1000))
      const pointsToUse = Math.min(requestedPoints, maxAllowedPoints)
      if (pointsToUse > 0) {
        const redeemRes = await redeemPoints(customer.uid, pointsToUse)
        pointsRedeemed = redeemRes.pointsUsed
        pointsDiscount = redeemRes.discountAmount
      }
    } catch (e) {
      console.warn('[loyalty] Lỗi trừ điểm thưởng khi tạo đơn:', e.message)
    }
  }

  const finalAmount = Math.max(0, totalAmount - discountAmount - pointsDiscount)

  const now = Date.now()
  const orderData = {
    customerUid: customer?.uid || 'guest',
    customerEmail: customer?.email || '',
    receiverName,
    phone,
    address,
    note,
    items,
    totalAmount,
    discountAmount,
    pointsRedeemed,
    pointsDiscount,
    finalAmount,
    paymentMethod,
    promo,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  }

  const ref = await ordersRef().push(orderData)

  // Tính điểm thưởng dự kiến nhận được sau khi đơn hoàn thành
  const pointsToEarn = Math.floor(finalAmount / 10000)
  return { id: ref.key, ...orderData, pointsToEarn }
}

/** Lấy danh sách đơn hàng theo quyền xem */
export async function listOrders(viewer) {
  const snapshot = await ordersRef().once('value')
  if (!snapshot.exists()) return []

  const all = Object.entries(snapshot.val())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))

  if (viewer?.role === 'customer') {
    return all.filter((o) => o.customerUid === viewer.uid)
  }

  // Thợ chỉ quản lý đơn của riêng mình, kèm các đơn chưa có ai nhận để có thể nhận việc
  if (viewer?.role === 'repairman') {
    const claimable = ['pending', 'payment_verified', 'confirmed']
    return all.filter(
      (o) => o.repairmanUid === viewer.uid || (!o.repairmanUid && claimable.includes(o.status)),
    )
  }

  // Admin xem được tất cả
  return all
}

/** Lấy chi tiết đơn hàng */
export async function getOrder(id) {
  if (!id) throw badRequest('Thiếu mã đơn hàng.')
  const snapshot = await orderRef(id).once('value')
  if (!snapshot.exists()) throw notFound('Không tìm thấy đơn hàng.')
  return { id, ...snapshot.val() }
}

/** Kiểm tra quyền truy cập 1 đơn hàng theo vai trò người xem */
export function assertCanAccessOrder(order, viewer) {
  if (!viewer) return
  if (viewer.role === 'admin') return
  if (viewer.role === 'customer' && order.customerUid === viewer.uid) return
  if (viewer.role === 'repairman') {
    const claimable = ['pending', 'payment_verified', 'confirmed']
    if (order.repairmanUid === viewer.uid) return
    if (!order.repairmanUid && claimable.includes(order.status)) return
  }
  throw forbidden('Bạn không có quyền truy cập đơn hàng này.')
}

/** Lấy chi tiết đơn hàng kèm kiểm tra quyền */
export async function getOrderForViewer(id, viewer) {
  const order = await getOrder(id)
  assertCanAccessOrder(order, viewer)
  return order
}

/**
 * Cập nhật trạng thái đơn hàng (admin hoặc thợ)
 * Flow: pending → payment_verified → confirmed → delivering → completed
 *        pending (COD chưa trả) → cancelled
 */
export async function updateOrderStatus(id, status, actor) {
  if (!ORDER_STATUSES.includes(status)) {
    throw badRequest(`Trạng thái không hợp lệ. Chỉ chấp nhận: ${ORDER_STATUSES.join(', ')}`)
  }

  const existing = await getOrder(id)

  // Thợ chỉ được cập nhật đơn của mình hoặc đơn chưa có ai nhận
  if (actor?.role === 'repairman') {
    assertCanAccessOrder(existing, actor)
  }

  const patch = { status, updatedAt: Date.now() }

  // Khi chuyển sang delivering, gán repairmanUid
  if (status === 'delivering' && actor?.role === 'repairman') {
    patch.repairmanUid = actor.uid
    patch.repairmanName = actor.displayName || actor.email || 'Thợ kỹ thuật'
  }

  // Nếu thanh toán thành công (MoMo/Stripe) và status đang ở pending,
  // tự động chuyển sang payment_verified rồi confirmed
  if (status === 'payment_verified' && existing.paymentMethod !== 'cod') {
    // Đã có payment rồi, chuyển sang confirmed
    patch.status = 'confirmed'
  }

  await orderRef(id).update(patch)

  // Tích điểm cho khách hàng khi đơn hoàn thành
  if (status === 'completed') {
    try {
      const { awardPoints } = await import('./loyalty.service.js')
      await awardPoints(existing.customerUid, id, existing.finalAmount ?? existing.totalAmount)
    } catch (e) {
      console.warn('[loyalty] Lỗi tích điểm:', e.message)
    }
  }

  return { ...existing, ...patch }
}

/**
 * Hủy đơn hàng (Rule A):
 * - Trước khi thợ đến (pending / payment_verified / confirmed): hoàn 100%.
 * - Sau khi thợ đã đến (delivering): giữ phí kiểm tra, hoàn phần còn lại.
 * - completed: không thể hủy. cancelled: đã hủy rồi.
 */
export async function cancelOrder(id, actor) {
  const existing = await getOrder(id)
  // Kiểm tra quyền hủy: admin hủy được, thợ chỉ hủy đơn của mình, khách chỉ hủy đơn của mình
  assertCanAccessOrder(existing, actor)

  if (existing.status === 'cancelled') {
    throw conflict('Đơn hàng đã được hủy trước đó.')
  }
  if (existing.status === 'completed') {
    throw conflict('Đơn hàng đã hoàn thành, không thể hủy.')
  }

  const now = Date.now()
  const paidAmount = Number(existing.finalAmount ?? existing.totalAmount) || 0

  let refundAmount = 0
  let inspectionFee = 0
  let message = ''

  if (BEFORE_TECHNICIAN_ARRIVES.includes(existing.status)) {
    // Thợ chưa đến → hoàn 100%
    refundAmount = paidAmount
    message = `Đơn hàng đã được hủy trước khi thợ đến. Hoàn trả 100%: ${refundAmount.toLocaleString('vi-VN')} VNĐ.`
  } else {
    // Thợ đã đến → giữ phí kiểm tra
    inspectionFee = Math.min(INSPECTION_FEE, paidAmount)
    refundAmount = Math.max(0, paidAmount - inspectionFee)
    message = `Đơn hàng đã bị hủy sau khi thợ đến. Giữ lại phí kiểm tra ${inspectionFee.toLocaleString('vi-VN')} VNĐ. Hoàn trả: ${refundAmount.toLocaleString('vi-VN')} VNĐ.`
  }

  await orderRef(id).update({
    status: 'cancelled',
    updatedAt: now,
    cancelledAt: now,
    cancelledBy: actor?.uid || 'system',
    refundAmount,
    inspectionFee,
    refundMessage: message,
  })

  // Hoàn điểm nếu đơn đã được tích điểm
  try {
    const { refundPoints } = await import('./loyalty.service.js')
    await refundPoints(existing.customerUid, id)
  } catch (e) {
    console.warn('[loyalty] Lỗi hoàn điểm:', e.message)
  }

  // Hoàn lại điểm thưởng nếu khách hàng đã dùng điểm khi đặt đơn này
  if (existing.pointsRedeemed > 0) {
    try {
      const dbRef = db.ref(`loyalty/${existing.customerUid}`)
      await dbRef.transaction((data) => {
        const prev = data ?? { points: 0 }
        return { points: (prev.points ?? 0) + existing.pointsRedeemed, updatedAt: Date.now() }
      })
      await db.ref('loyaltyLogs').push({
        uid: existing.customerUid,
        orderId: id,
        type: 'refund_redeem',
        points: existing.pointsRedeemed,
        createdAt: Date.now(),
      })
    } catch (e) {
      console.warn('[loyalty] Lỗi hoàn lại điểm đã dùng:', e.message)
    }
  }

  return {
    success: true,
    refundAmount,
    inspectionFee,
    message,
  }
}