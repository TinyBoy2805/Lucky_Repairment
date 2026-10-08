import { Router } from 'express'
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js'
import { destroy, index, show, store } from '../controllers/rating.controller.js'

const router = Router()

router.use(requireAuth)

router.get('/', index)
router.get('/:id', show)
router.post('/', requireRole('customer'), store)
router.delete('/:id', requireRole('admin'), destroy)

export default router
