import { Router } from 'express'
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js'
import { showAvailability, updateAvailability, stats } from '../controllers/repairman.controller.js'

const router = Router()

// Chỉ thợ sửa chữa mới truy cập được các API này
router.use(requireAuth, requireRole('repairman'))

router.get('/availability', showAvailability)
router.put('/availability', updateAvailability)
router.get('/stats', stats)

export default router
