import { db } from '../config/firebase.js'
import { badRequest, notFound } from '../utils/http-error.js'

export const ORDER_STATUSES = ['pending', 'confirmed', 'delivering', 'completed', 'cancelled']

const ordersRef = () => db.ref('orders')
const orderRef = (id) => ordersRef().child(id)

const norm = (value) => String(value ?? '').trim()

/** Tạo đơn hàng mới */
export async function createOrder(customer, input = {}) {
  const receiverName = norm(input.receiverName || customer?.displayName || '')
  const phone = norm(input.phone || customer?.phone || '')
  const address = norm(input.address)
  const note = norm(input.note)
  const paymentMethod = norm(input.paymentMethod) || 'cod'

  if (!receiverName) throw badRequest('Vui lòng nhập họ tên người nhận.')
  if (!phone) throw badRequest('Vui lòng nhập số điện thoại người nhận.')
  if (!address) throw badRequest('Vui lòng nhập địa chỉ nhận hàng/lắp đặt.')

  const rawItems = Array.isArray(input.items) ? input.items : []
  if (rawItems.length === 0) throw badRequest('Đơn hàng không có sản phẩm nào.')

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
      price,
      quantity: qty,
      includeInstallation,
      installationFee,
      subtotal,
    }
  })

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
    paymentMethod,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  }

  const ref = await ordersRef().push(orderData)
  return { id: ref.key, ...orderData }
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

  // Admin hoặc Repairman xem được tất cả
  return all
}

/** Lấy chi tiết đơn hàng */
export async function getOrder(id) {
  if (!id) throw badRequest('Thiếu mã đơn hàng.')
  const snapshot = await orderRef(id).once('value')
  if (!snapshot.exists()) throw notFound('Không tìm thấy đơn hàng.')
  return { id, ...snapshot.val() }
}

/** Cập nhật trạng thái đơn hàng (admin hoặc thợ) */
export async function updateOrderStatus(id, status, actor) {
  if (!ORDER_STATUSES.includes(status)) {
    throw badRequest(`Trạng thái không hợp lệ. Chỉ chấp nhận: ${ORDER_STATUSES.join(', ')}`)
  }

  const existing = await getOrder(id)
  const patch = { status, updatedAt: Date.now() }

  if (status === 'delivering' && actor?.role === 'repairman') {
    patch.repairmanUid = actor.uid
    patch.repairmanName = actor.displayName || actor.email || 'Thợ kỹ thuật'
  }

  await orderRef(id).update(patch)
  return { ...existing, ...patch }
}
