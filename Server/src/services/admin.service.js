import { db } from '../config/firebase.js'

const ROLES = ['customer', 'repairman', 'admin']
const REQUEST_STATUSES = ['pending', 'assigned', 'in_progress', 'done']
const REPORT_STATUSES = ['open', 'resolved', 'rejected']
const PAYMENT_STATUSES = ['pending', 'confirmed', 'failed']

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

const rangeStart = (range) => {
  const now = Date.now()

  if (range === 'today') {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    return start.getTime()
  }
  if (range === '7d') return now - 7 * DAY
  if (range === '30d') return now - 30 * DAY
  return 0
}

export async function getStats(range = 'all') {
  const [users, requests, categories, ratings, reports, payments, wallets, transactions] =
    await Promise.all([
      readTable('users'),
      readTable('requests'),
      readTable('categories'),
      readTable('ratings'),
      readTable('reports'),
      readTable('payments'),
      readTable('wallets'),
      readTable('transactions'),
    ])

  const since = rangeStart(range)
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
    recentRequests,
    recentReports,
  }
}

export async function getSummary() {
  const [requests, reports] = await Promise.all([
    readTable('requests'),
    readTable('reports'),
  ])

  return {
    pendingOrders: requests.filter((item) => item.status === 'pending').length,
    openReports: reports.filter((item) => item.status === 'open').length,
  }
}
