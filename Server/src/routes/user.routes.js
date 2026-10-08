import { Router } from 'express'
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js'
import { changeRole, index, show } from '../controllers/user.controller.js'

const router = Router()

// Tất cả route người dùng đều yêu cầu role admin
router.use(requireAuth, requireRole('admin'))

router.get('/', index)
router.get('/:uid', show)
router.patch('/:uid/role', changeRole)

export default router
