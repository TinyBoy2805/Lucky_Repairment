import { Router } from 'express'
import { destroy, index, show, store, update } from '../controllers/service.controller.js'
import { optionalAuth, requireAuth, requireRole } from '../middlewares/auth.middleware.js'

const router = Router()

// Public: ai cũng xem được danh sách và chi tiết dịch vụ lấy từ Firebase.
// optionalAuth cho phép lọc "?ownerUid=mine" khi có tài khoản.
router.get('/', optionalAuth, index)
router.get('/:id', show)

// Admin và thợ cùng quản lý thêm, sửa, xóa (thợ chỉ quản lý dịch vụ của mình).
router.post('/', requireAuth, requireRole('admin', 'repairman'), store)
router.put('/:id', requireAuth, requireRole('admin', 'repairman'), update)
router.delete('/:id', requireAuth, requireRole('admin', 'repairman'), destroy)

export default router
