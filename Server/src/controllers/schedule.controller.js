import { asyncHandler } from '../middlewares/error.middleware.js'
import {
  addTimeOff as addTimeOffService,
  getSchedule,
  removeTimeOff as removeTimeOffService,
  upsertSchedule,
} from '../services/schedule.service.js'

/** GET /api/schedules/me */
export const current = asyncHandler(async (req, res) => {
  const schedule = await getSchedule(req.uid)
  res.json({ schedule })
})

/** PUT /api/schedules/me — repairman/admin */
export const upsert = asyncHandler(async (req, res) => {
  const schedule = await upsertSchedule(req.uid, req.body ?? {})
  res.json({ schedule })
})

/** POST /api/schedules/me/timeoff — repairman/admin */
export const addTimeOff = asyncHandler(async (req, res) => {
  const timeOff = await addTimeOffService(req.uid, req.body ?? {})
  res.status(201).json({ timeOff })
})

/** DELETE /api/schedules/me/timeoff/:id — repairman/admin */
export const removeTimeOff = asyncHandler(async (req, res) => {
  await removeTimeOffService(req.uid, req.params.id)
  res.json({ success: true })
})
