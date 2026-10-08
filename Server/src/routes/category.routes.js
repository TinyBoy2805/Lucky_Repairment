import { Router } from 'express'
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js'
import { destroy, index, show, store, update } from '../controllers/category.controller.js'

const router = Router()

router.use(requireAuth)

router.get('/', index)
router.get('/:id', show)
router.post('/', requireRole('admin'), store)
router.patch('/:id', requireRole('admin'), update)
router.delete('/:id', requireRole('admin'), destroy)

export default router
