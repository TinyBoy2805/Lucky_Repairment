import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { getLogs, getPoints } from '../controllers/loyalty.controller.js'

const router = Router()

// Tất cả route đều yêu cầu đăng nhập
router.use(requireAuth)

/** GET /api/loyalty/points — lấy điểm thưởng hiện tại */
router.get('/points', getPoints)

/** GET /api/loyalty/logs — lịch sử giao dịch điểm */
router.get('/logs', getLogs)

export default router
