import { asyncHandler } from '../middlewares/error.middleware.js'
import {
  addTimeOff as addTimeOffService,
  getSchedule,
  getScheduleDetail,
  listSchedules,
  removeTimeOff as removeTimeOffService,
  upsertSchedule,
} from '../services/schedule.service.js'

export const current = asyncHandler(async (req, res) => {
  const schedule = await getSchedule(req.uid)
  res.json({ schedule })
})

export const upsert = asyncHandler(async (req, res) => {
  const schedule = await upsertSchedule(req.uid, req.body ?? {})
  res.json({ schedule })
})

export const addTimeOff = asyncHandler(async (req, res) => {
  const timeOff = await addTimeOffService(req.uid, req.body ?? {})
  res.status(201).json({ timeOff })
})

export const removeTimeOff = asyncHandler(async (req, res) => {
  await removeTimeOffService(req.uid, req.params.id)
  res.json({ success: true })
})

export const index = asyncHandler(async (req, res) => {
  const { items, ...meta } = await listSchedules(req.query)
  res.json({ schedules: items, ...meta })
})

export const show = asyncHandler(async (req, res) => {
  const schedule = await getScheduleDetail(req.params.uid)
  res.json({ schedule })
})

export const upsertFor = asyncHandler(async (req, res) => {
  const schedule = await upsertSchedule(req.params.uid, req.body ?? {})
  res.json({ schedule })
})

export const addTimeOffFor = asyncHandler(async (req, res) => {
  const timeOff = await addTimeOffService(req.params.uid, req.body ?? {})
  res.status(201).json({ timeOff })
})

export const removeTimeOffFor = asyncHandler(async (req, res) => {
  await removeTimeOffService(req.params.uid, req.params.id)
  res.json({ success: true })
})
