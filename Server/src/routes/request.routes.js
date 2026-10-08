import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { index, store, update } from '../controllers/request.controller.js'

const router = Router()

// Tất cả thao tác với yêu cầu sửa chữa (tạo đơn, xem đơn, nhận việc) đều bắt buộc đăng nhập
router.use(requireAuth)

router.get('/', index)
router.post('/', store)
router.patch('/:id', update)

export default router