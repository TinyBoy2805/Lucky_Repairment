import { Router } from 'express'
import { destroy, index, show, store, update } from '../controllers/service.controller.js'
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js'

const router = Router()

// Public: ai cũng xem được danh sách và chi tiết dịch vụ lấy từ Firebase
router.get('/', index)
router.get('/:id', show)

// Admin: quản lý thêm, sửa, xóa dịch vụ trên Firebase
router.post('/', requireAuth, requireRole('admin'), store)
router.put('/:id', requireAuth, requireRole('admin'), update)
router.delete('/:id', requireAuth, requireRole('admin'), destroy)

export default router
