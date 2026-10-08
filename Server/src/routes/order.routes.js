import { Router } from 'express'
import { optionalAuth, requireAuth, requireRole } from '../middlewares/auth.middleware.js'
import { index, show, store, update } from '../controllers/order.controller.js'

const router = Router()

// Tạo đơn hàng: có thể là user đã đăng nhập hoặc khách vãng lai
router.post('/', optionalAuth, store)

// Xem danh sách đơn hàng: người dùng đăng nhập
router.get('/', requireAuth, index)

// Xem chi tiết đơn hàng: người dùng đăng nhập
router.get('/:id', requireAuth, show)

// Cập nhật trạng thái đơn: admin hoặc thợ phụ trách
router.patch('/:id', requireAuth, requireRole('admin', 'repairman'), update)

export default router
