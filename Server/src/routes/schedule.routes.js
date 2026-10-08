import { Router } from 'express'
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js'
import {
  addTimeOff,
  current,
  removeTimeOff,
  upsert,
} from '../controllers/schedule.controller.js'

const router = Router()

router.use(requireAuth)

router.get('/me', current)
router.put('/me', requireRole('repairman', 'admin'), upsert)
router.post('/me/timeoff', requireRole('repairman', 'admin'), addTimeOff)
router.delete('/me/timeoff/:id', requireRole('repairman', 'admin'), removeTimeOff)

export default router
