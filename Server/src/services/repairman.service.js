import { db } from '../config/firebase.js'
import { badRequest } from '../utils/http-error.js'

// Trạng thái "sẵn sàng nhận đơn" của thợ, lưu trong Realtime Database.
const availabilityRef = (uid) => db.ref(`availability/${uid}`)

/**
 * Lấy trạng thái sẵn sàng nhận đơn của thợ.
 * Mặc định là `false` khi thợ chưa từng bật.
 */
export async function getAvailability(uid) {
  if (!uid) throw badRequest('Thiếu mã người dùng.')

  const snapshot = await availabilityRef(uid).once('value')
  if (!snapshot.exists()) return { available: false, updatedAt: null }

  const data = snapshot.val() ?? {}
  return { available: data.available === true, updatedAt: data.updatedAt ?? null }
}

/** Bật/tắt trạng thái sẵn sàng nhận đơn và trả về trạng thái mới. */
export async function setAvailability(uid, available) {
  if (!uid) throw badRequest('Thiếu mã người dùng.')

  const next = Boolean(available)
  const updatedAt = Date.now()

  await availabilityRef(uid).set({ available: next, updatedAt })

  return { available: next, updatedAt }
}

/**
 * Thống kê hoạt động của thợ, tính từ RTDB `orders` và RTDB `requests`
 * (bản mirror do request.service ghi sang Realtime Database).
 */
export async function getRepairmanStats(uid) {
  if (!uid) throw badRequest('Thiếu mã người dùng.')

  const [ordersSnapshot, requestsSnapshot] = await Promise.all([
    db.ref('orders').once('value'),
    db.ref('requests').once('value'),
  ])

  const orders = ordersSnapshot.exists() ? Object.values(ordersSnapshot.val()) : []
  const requests = requestsSnapshot.exists() ? Object.values(requestsSnapshot.val()) : []

  let completedOrders = 0
  let inProgressOrders = 0
  let totalOrders = 0
  let revenue = 0

  for (const order of orders) {
    if (!order || order.repairmanUid !== uid) continue

    totalOrders += 1

    if (order.status === 'completed') {
      completedOrders += 1
      revenue += Number(order.finalAmount ?? order.totalAmount) || 0
    } else if (order.status === 'delivering') {
      inProgressOrders += 1
    }
  }

  let completedRequests = 0
  let inProgressRequests = 0

  for (const request of requests) {
    if (!request || request.repairmanUid !== uid) continue

    if (request.status === 'done') {
      completedRequests += 1
    } else if (request.status === 'in_progress') {
      inProgressRequests += 1
    }
  }

  return {
    completedOrders,
    inProgressOrders,
    totalOrders,
    revenue,
    completedRequests,
    inProgressRequests,
  }
}
