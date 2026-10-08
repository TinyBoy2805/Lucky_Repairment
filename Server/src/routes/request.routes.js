import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { index, store, update } from '../controllers/request.controller.js'

const router = Router()

// Mọi thao tác với yêu cầu sửa chữa đều cần đăng nhập
router.use(requireAuth)

router.get('/', index)
router.post('/', store)
router.patch('/:id', update)

export default router