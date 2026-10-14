import { Router } from 'express'
import { destroy, home, index, show, store, update, view } from '../controllers/service.controller.js'
import { optionalAuth, requireAuth, requireRole } from '../middlewares/auth.middleware.js'

const router = Router()

// Public: ai cũng xem được danh sách và chi tiết dịch vụ lấy từ Firebase.
// optionalAuth cho phép lọc "?ownerUid=mine" khi có tài khoản.
router.get('/', optionalAuth, index)
// Phải đứng trước '/:id' để không bị bắt nhầm thành mã dịch vụ.
router.get('/home', optionalAuth, home)
router.post('/:id/view', view)
router.get('/:id', show)

// Admin và thợ cùng quản lý thêm, sửa, xóa (thợ chỉ quản lý dịch vụ của mình).
router.post('/', requireAuth, requireRole('admin', 'repairman'), store)
router.put('/:id', requireAuth, requireRole('admin', 'repairman'), update)
router.delete('/:id', requireAuth, requireRole('admin', 'repairman'), destroy)

export default router
