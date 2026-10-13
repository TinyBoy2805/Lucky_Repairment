import { db } from '../config/firebase.js'

const ROLES = ['customer', 'repairman', 'admin']
const REQUEST_STATUSES = ['pending', 'assigned', 'in_progress', 'done']
const REPORT_STATUSES = ['open', 'resolved', 'rejected']
const PAYMENT_STATUSES = ['pending', 'confirmed', 'failed']
const ORDER_STATUSES = ['pending', 'payment_verified', 'confirmed', 'delivering', 'completed', 'cancelled']

const DAY = 24 * 60 * 60 * 1000

const readTable = async (name) => {
  const snapshot = await db.ref(name).once('value')
  if (!snapshot.exists()) return []
  const value = snapshot.val()
  return Object.entries(value)
    .filter(([id]) => id !== '_schema')
    .map(([id, data]) => ({ id, ...data }))
}

const countBy = (items, key, defaults = []) => {
  const counts = defaults.reduce((acc, value) => ({ ...acc, [value]: 0 }), {})

  for (const item of items) {
    const value = String(item[key] ?? '')
    if (!value) continue
    counts[value] = (counts[value] ?? 0) + 1
  }

  return counts
}

const sumBy = (items, key) =>
  items.reduce((sum, item) => sum + (Number(item[key]) || 0), 0)

const rangeStart = (range, from, to) => {
  const now = Date.now()

  if (range === 'today') {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    return start.getTime()
  }
  if (range === '7d') return now - 7 * DAY
  if (range === '30d') return now - 30 * DAY
  if (range === '90d') return now - 90 * DAY
  // Custom range: parse from/to timestamps
  if (from !== undefined && to !== undefined) {
    return Number(from)
  }
  return 0
}

export async function getStats(range = 'all', from, to) {
  const hasCustomRange = from !== undefined && from !== '' && to !== undefined && to !== ''
  const [
    users,
    requests,
    categories,
    ratings,
    reports,
    payments,
    wallets,
    transactions,
    orders,
    products,
  ] = await Promise.all([
    readTable('users'),
    readTable('requests'),
    readTable('categories'),
    readTable('ratings'),
    readTable('reports'),
    readTable('payments'),
    readTable('wallets'),
    readTable('transactions'),
    readTable('orders'),
    readTable('products'),
  ])

  const now = Date.now()
  const since = rangeStart(range, from, to)
  const inRange = (item) => (Number(item.createdAt) || 0) >= since

  const confirmedPayments = payments.filter((item) => item.status === 'confirmed')

  const averageScore =
    ratings.length === 0
      ? 0
      : Math.round((sumBy(ratings, 'score') / ratings.length) * 10) / 10

  const recentRequests = [...requests]
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      device: item.device,
      status: item.status,
      customerName: item.customerName,
      repairmanName: item.repairmanName,
      createdAt: item.createdAt,
    }))

  const recentReports = [...reports]
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      reason: item.reason,
      status: item.status,
      targetType: item.targetType,
      reporterName: item.reporterName,
      createdAt: item.createdAt,
    }))

  // Chỉ tính doanh thu từ đơn chưa hủy
  const validOrders = orders.filter((order) => order.status !== 'cancelled')

  // Lọc đơn theo mốc thời gian đang chọn
  const rangedOrders = validOrders.filter((order) => {
    const ts = Number(order.createdAt) || 0
    if (hasCustomRange) return ts >= Number(from) && ts <= Number(to)
    if (range === 'all') return true
    return ts >= since && ts <= now
  })

  // ---- Biểu đồ cột: doanh thu theo ngày (hoặc theo tháng khi chọn "Tất cả") ----
  const monthly = range === 'all' && !hasCustomRange
  const bucketKey = (ts) =>
    monthly ? new Date(ts).toISOString().slice(0, 7) : new Date(ts).toISOString().slice(0, 10)

  const columnBuckets = {}
  if (hasCustomRange) {
    for (let t = Number(from); t <= Number(to); t += DAY) {
      columnBuckets[bucketKey(t)] = 0
    }
  }
  for (const order of rangedOrders) {
    const key = bucketKey(Number(order.createdAt) || 0)
    columnBuckets[key] = (columnBuckets[key] || 0) + (Number(order.totalAmount) || 0)
  }
  const columnLabels = Object.keys(columnBuckets).sort()
  const columnData = columnLabels.map((label) => columnBuckets[label])

  // ---- Biểu đồ tròn: doanh thu theo danh mục / thương hiệu (từ đơn hàng) ----
  const productMap = {}
  for (const product of products) productMap[product.id] = product

  const CATEGORY_LABEL = { electric: 'Sửa chữa điện', water: 'Sửa chữa nước' }
  const categoryTotals = {}
  const brandTotals = {}

  for (const order of rangedOrders) {
    const items = Array.isArray(order.items)
      ? order.items
      : Object.values(order.items || {})
    for (const item of items) {
      const product = productMap[item.productId] || {}
      const amount = Number(item.subtotal) || (Number(item.price) || 0) * (Number(item.quantity) || 1)
      const category = item.category || product.category || 'other'
      const brand = item.brand || product.brand || 'Khác'
      const categoryName = CATEGORY_LABEL[category] || 'Khác'
      categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + amount
      brandTotals[brand] = (brandTotals[brand] || 0) + amount
    }
  }

  const toPie = (obj) => ({
    labels: Object.keys(obj),
    data: Object.keys(obj).map((key) => obj[key]),
  })

  // ---- Quản lý thợ: đơn được giao & doanh thu của từng thợ ----
  const repairmen = users
    .filter((user) => user.role === 'repairman')
    .map((user) => {
      const assigned = orders.filter((order) => order.repairmanUid === user.uid)
      const completed = assigned.filter((order) => order.status === 'completed')
      return {
        uid: user.uid,
        displayName: user.displayName || user.email || 'Thợ kỹ thuật',
        email: user.email || '',
        status: user.status || 'active',
        assignedOrders: assigned.length,
        completedOrders: completed.length,
        totalRevenue: sumBy(completed, 'totalAmount'),
      }
    })

  const repairmanOrders = orders
    .filter((order) => order.repairmanUid)
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
    .slice(0, 20)
    .map((order) => ({
      id: order.id,
      customerUid: order.customerUid,
      receiverName: order.receiverName,
      totalAmount: order.totalAmount,
      status: order.status,
      repairmanUid: order.repairmanUid,
      repairmanName: order.repairmanName,
      createdAt: order.createdAt,
    }))

  return {
    range,
    users: {
      total: users.length,
      byRole: countBy(users, 'role', ROLES),
      inRange: users.filter(inRange).length,
    },
    requests: {
      total: requests.length,
      byStatus: countBy(requests, 'status', REQUEST_STATUSES),
      inRange: requests.filter(inRange).length,
    },
    categories: { total: categories.length },
    ratings: {
      total: ratings.length,
      averageScore,
      inRange: ratings.filter(inRange).length,
    },
    reports: {
      total: reports.length,
      byStatus: countBy(reports, 'status', REPORT_STATUSES),
      inRange: reports.filter(inRange).length,
    },
    payments: {
      total: payments.length,
      byStatus: countBy(payments, 'status', PAYMENT_STATUSES),
      confirmedAmount: sumBy(confirmedPayments, 'amount'),
      confirmedAmountInRange: sumBy(confirmedPayments.filter(inRange), 'amount'),
    },
    wallets: { total: wallets.length, totalBalance: sumBy(wallets, 'balance') },
    transactions: { total: transactions.length, inRange: transactions.filter(inRange).length },
    orders: {
      total: orders.length,
      byStatus: countBy(orders, 'status', ORDER_STATUSES),
      revenue: sumBy(validOrders, 'totalAmount'),
      revenueInRange: sumBy(rangedOrders, 'totalAmount'),
      inRange: orders.filter(inRange).length,
    },
    repairmen,
    repairmenRevenue: repairmen.map((item) => ({
      uid: item.uid,
      displayName: item.displayName,
      email: item.email,
      revenue: item.totalRevenue,
      ordersCount: item.completedOrders,
    })),
    repairmanOrders,
    recentRequests,
    recentReports,
    columnChart: {
      labels: columnLabels,
      data: columnData,
    },
    pieChart: {
      type: 'category',
      ...toPie(categoryTotals),
    },
    pieChartByBrand: toPie(brandTotals),
  }
}

export async function getSummary() {
  const [requests, reports, payments, orders] = await Promise.all([
    readTable('requests'),
    readTable('reports'),
    readTable('payments'),
    readTable('orders'),
  ])

  const confirmedPayments = payments.filter((item) => item.status === 'confirmed')
  const completedOrders = orders.filter((item) => item.status === 'completed')
  const cancelledOrders = orders.filter((item) => item.status === 'cancelled')

  // Count active repairmen (those with orders in delivering or in_progress status)
  const repairmenWithOrders = new Set()
  for (const order of orders) {
    if (order.repairmanUid) {
      repairmenWithOrders.add(order.repairmanUid)
    }
  }

  // Total revenue from completed orders
  const totalRevenue = sumBy(completedOrders, 'totalAmount')

  // Total refunds from cancelled orders
  const totalRefunds = sumBy(cancelledOrders, 'refundAmount') || 0

  return {
    totalOrders: orders.length,
    totalRevenue,
    totalRefunds,
    activeRepairmen: repairmenWithOrders.size,
    pendingOrders: requests.filter((item) => item.status === 'pending').length,
    openReports: reports.filter((item) => item.status === 'open').length,
    confirmedPayments: confirmedPayments.length,
    confirmedAmount: sumBy(confirmedPayments, 'amount'),
  }
}

/** Lấy danh sách tất cả repairmen */
export async function listRepairmen() {
  const users = await readTable('users')
  const repairmen = users.filter((user) => user.role === 'repairman')
  return repairmen
}

/** Lấy orders của repairman cụ thể */
export async function getRepairmanOrders(repairmanId) {
  const orders = await readTable('orders')
  return orders.filter((order) => order.repairmanUid === repairmanId)
}

/** Cập nhật trạng thái repairman (active/busy/idle) */
export async function updateRepairmanStatus(repairmanId, status) {
  const validStatuses = ['active', 'busy', 'idle']
  if (!validStatuses.includes(status)) {
    throw new Error('Trạng thái không hợp lệ. Chỉ chấp nhận: ' + validStatuses.join(', '))
  }

  const users = await readTable('users')
  const repairman = users.find((u) => u.uid === repairmanId)
  if (!repairman) {
    throw new Error('Không tìm thấy repairman.')
  }

  await db.ref(`users/${repairmanId}`).update({
    status,
    updatedAt: Date.now(),
  })

  return { uid: repairmanId, status }
}