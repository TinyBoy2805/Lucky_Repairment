import { db } from '../config/firebase.js'
import { badRequest, conflict } from '../utils/http-error.js'

// Tỉ lệ tích điểm: 1 điểm / 10.000 VNĐ
const POINTS_PER_VND = 10000
// Tỉ lệ quy đổi: 1 điểm = 1.000 VNĐ
const VND_PER_POINT = 1000
// Tối đa dùng điểm không vượt quá 30% giá trị đơn
const MAX_REDEEM_PERCENT = 0.3

const loyaltyRef = (uid) => db.ref(`loyalty/${uid}`)
const loyaltyLogsRef = () => db.ref('loyaltyLogs')

/**
 * Lấy điểm thưởng hiện tại của user.
 * Trả về { uid, points, updatedAt }
 */
export async function getLoyaltyPoints(uid) {
  const snapshot = await loyaltyRef(uid).once('value')
  if (!snapshot.exists()) {
    return { uid, points: 0, updatedAt: null }
  }
  const data = snapshot.val()
  return { uid, points: data.points ?? 0, updatedAt: data.updatedAt ?? null }
}

/**
 * Tích điểm khi đơn hàng hoàn thành (completed).
 * - 1 điểm cho mỗi 10.000 VNĐ (làm tròn xuống).
 * - Chống trùng: kiểm tra loyaltyLogs theo orderId trước khi tích.
 * - Dùng transaction() để cộng điểm an toàn (atomic).
 * Trả về { points: điểm vừa cộng, totalPoints: tổng điểm mới }
 */
export async function awardPoints(uid, orderId, finalAmount) {
  const points = Math.floor(Number(finalAmount) / POINTS_PER_VND)
  if (points <= 0) return { points: 0, totalPoints: (await getLoyaltyPoints(uid)).points }

  // Kiểm tra orderId đã được tích điểm chưa (chống double-award)
  const logsSnapshot = await loyaltyLogsRef()
    .orderByChild('orderId')
    .equalTo(orderId)
    .once('value')

  if (logsSnapshot.exists()) {
    // Kiểm tra có log type 'earn' cho orderId này chưa
    const logs = Object.values(logsSnapshot.val())
    const alreadyEarned = logs.some((l) => l.type === 'earn')
    if (alreadyEarned) {
      const current = await getLoyaltyPoints(uid)
      return { points: 0, totalPoints: current.points }
    }
  }

  // Cộng điểm atomically bằng transaction()
  let totalPoints = 0
  await loyaltyRef(uid).transaction((current) => {
    const prev = current ?? { points: 0 }
    totalPoints = (prev.points ?? 0) + points
    return { points: totalPoints, updatedAt: Date.now() }
  })

  // Ghi log giao dịch điểm
  await loyaltyLogsRef().push({
    uid,
    orderId,
    type: 'earn',
    points,
    finalAmount: Number(finalAmount),
    createdAt: Date.now(),
  })

  return { points, totalPoints }
}

/**
 * Dùng điểm khi đặt hàng.
 * - Validate pointsToUse là số nguyên dương.
 * - Kiểm tra số điểm hiện có >= pointsToUse.
 * - Không được vượt quá 30% giá trị đơn hàng (validate ở tầng gọi).
 * - Dùng transaction() để trừ điểm an toàn.
 * Trả về { pointsUsed, discountAmount, remainingPoints }
 */
export async function redeemPoints(uid, pointsToUse) {
  // Validate đầu vào
  const pts = Number(pointsToUse)
  if (!Number.isInteger(pts) || pts <= 0) {
    throw badRequest('Số điểm quy đổi phải là số nguyên dương.')
  }

  // Kiểm tra số dư điểm
  const current = await getLoyaltyPoints(uid)
  if (current.points < pts) {
    throw conflict(`Điểm thưởng không đủ. Hiện có ${current.points} điểm, cần ${pts} điểm.`)
  }

  // Trừ điểm atomically
  let remainingPoints = 0
  await loyaltyRef(uid).transaction((data) => {
    const prev = data ?? { points: 0 }
    remainingPoints = (prev.points ?? 0) - pts
    return { points: remainingPoints, updatedAt: Date.now() }
  })

  // Ghi log giao dịch điểm
  await loyaltyLogsRef().push({
    uid,
    orderId: null,
    type: 'redeem',
    points: -pts,
    createdAt: Date.now(),
  })

  return {
    pointsUsed: pts,
    discountAmount: pts * VND_PER_POINT,
    remainingPoints,
  }
}

/**
 * Hoàn điểm khi hủy đơn hàng.
 * - Tìm log 'earn' theo orderId.
 * - Nếu tìm thấy: hoàn lại số điểm đó bằng transaction(), ghi log type 'refund'.
 * Trả về { refunded: true/false, points }
 */
export async function refundPoints(uid, orderId) {
  // Tìm log earn của orderId này
  const logsSnapshot = await loyaltyLogsRef()
    .orderByChild('orderId')
    .equalTo(orderId)
    .once('value')

  if (!logsSnapshot.exists()) return { refunded: false, points: 0 }

  const logs = Object.values(logsSnapshot.val())
  const earnLog = logs.find((l) => l.type === 'earn' && l.uid === uid)
  if (!earnLog) return { refunded: false, points: 0 }

  const pointsToRefund = earnLog.points

  // Hoàn điểm atomically
  await loyaltyRef(uid).transaction((data) => {
    const prev = data ?? { points: 0 }
    return { points: (prev.points ?? 0) + pointsToRefund, updatedAt: Date.now() }
  })

  // Ghi log hoàn điểm
  await loyaltyLogsRef().push({
    uid,
    orderId,
    type: 'refund',
    points: pointsToRefund,
    createdAt: Date.now(),
  })

  return { refunded: true, points: pointsToRefund }
}

/**
 * Lịch sử giao dịch điểm của user, sort theo createdAt giảm dần.
 * Trả về mảng các log entry.
 */
export async function getLoyaltyLogs(uid) {
  const snapshot = await loyaltyLogsRef()
    .orderByChild('uid')
    .equalTo(uid)
    .once('value')

  if (!snapshot.exists()) return []

  const logs = Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...data }))

  // Sort theo createdAt giảm dần (mới nhất trước)
  logs.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))

  return logs
}

// Export hằng số để sử dụng ở tầng trên (validate % tối đa)
export { POINTS_PER_VND, VND_PER_POINT, MAX_REDEEM_PERCENT }
