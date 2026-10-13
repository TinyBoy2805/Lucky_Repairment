import { Router } from 'express'
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js'
import {
  stats,
  summary,
  listRepairmenCtrl,
  repairmanOrders,
  repairmanStatusUpdate,
} from '../controllers/admin.controller.js'

const router = Router()

router.use(requireAuth, requireRole('admin'))

router.get('/stats', stats)
router.get('/summary', summary)
router.get('/repairmen', listRepairmenCtrl)
router.get('/repairmen/:id/orders', repairmanOrders)
router.patch('/repairmen/:id', repairmanStatusUpdate)

export default router