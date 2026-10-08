import { Router } from 'express'
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js'
import {
  addTimeOff,
  addTimeOffFor,
  current,
  index,
  removeTimeOff,
  removeTimeOffFor,
  show,
  upsert,
  upsertFor,
} from '../controllers/schedule.controller.js'

const router = Router()

router.use(requireAuth)

router.get('/me', current)
router.put('/me', requireRole('repairman', 'admin'), upsert)
router.post('/me/timeoff', requireRole('repairman', 'admin'), addTimeOff)
router.delete('/me/timeoff/:id', requireRole('repairman', 'admin'), removeTimeOff)

router.get('/', requireRole('admin'), index)
router.get('/:uid', requireRole('admin'), show)
router.put('/:uid', requireRole('admin'), upsertFor)
router.post('/:uid/timeoff', requireRole('admin'), addTimeOffFor)
router.delete('/:uid/timeoff/:id', requireRole('admin'), removeTimeOffFor)

export default router
