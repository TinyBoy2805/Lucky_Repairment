import { asyncHandler } from '../middlewares/error.middleware.js'
import {
  getStats,
  getSummary,
  listRepairmen,
  getRepairmanOrders,
  updateRepairmanStatus,
} from '../services/admin.service.js'

export const stats = asyncHandler(async (req, res) => {
  // GET /api/admin/stats?range=all|today|7d|30d
  // GET /api/admin/stats?type=column&from=<ms>&to=<ms>
  // GET /api/admin/stats?type=pie&by=category|brand
  const { type, from, to, range = 'all', by } = req.query

  const statsData = await getStats(range, from, to)

  if (type === 'column') {
    return res.json({
      stats: statsData,
      labels: statsData.columnChart.labels,
      data: statsData.columnChart.data,
    })
  }

  if (type === 'pie') {
    const pie = by === 'brand' ? statsData.pieChartByBrand : statsData.pieChart
    return res.json({ stats: statsData, labels: pie.labels, data: pie.data })
  }

  // Mặc định trả về toàn bộ số liệu cho dashboard
  res.json({ stats: statsData })
})

export const summary = asyncHandler(async (req, res) => {
  const data = await getSummary()
  res.json({ summary: data })
})

/** GET /api/admin/repairmen - List all repairmen under admin */
export const listRepairmenCtrl = asyncHandler(async (req, res) => {
  const repairmen = await listRepairmen()
  res.json({ repairmen })
})

/** GET /api/admin/repairmen/:id/orders - Orders assigned to specific repairman */
export const repairmanOrders = asyncHandler(async (req, res) => {
  const orders = await getRepairmanOrders(req.params.id)
  res.json({ orders })
})

/** PATCH /api/admin/repairmen/:id - Update repairman status (active/busy/idle) */
export const repairmanStatusUpdate = asyncHandler(async (req, res) => {
  const { status } = req.body ?? {}
  const result = await updateRepairmanStatus(req.params.id, status)
  res.json(result)
})