import { asyncHandler } from '../middlewares/error.middleware.js'
import { createReport, getReport, listReports, updateReport } from '../services/report.service.js'

/** GET /api/reports */
export const index = asyncHandler(async (req, res) => {
  const reports = await listReports(req.profile)
  res.json({ reports, total: reports.length })
})

/** GET /api/reports/:id */
export const show = asyncHandler(async (req, res) => {
  const report = await getReport(req.params.id)
  res.json({ report })
})

/** POST /api/reports */
export const store = asyncHandler(async (req, res) => {
  const report = await createReport(req.profile, req.body ?? {})
  res.status(201).json({ report })
})

/** PATCH /api/reports/:id — admin. { action: 'resolve' | 'reject' } */
export const update = asyncHandler(async (req, res) => {
  const { action } = req.body ?? {}
  const report = await updateReport({ id: req.params.id, actor: req.profile, action })
  res.json({ report })
})
