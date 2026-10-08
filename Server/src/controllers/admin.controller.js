import { asyncHandler } from '../middlewares/error.middleware.js'
import { getStats, getSummary } from '../services/admin.service.js'

export const stats = asyncHandler(async (req, res) => {
  const data = await getStats(req.query.range ?? 'all')
  res.json({ stats: data })
})

export const summary = asyncHandler(async (req, res) => {
  const data = await getSummary()
  res.json({ summary: data })
})
