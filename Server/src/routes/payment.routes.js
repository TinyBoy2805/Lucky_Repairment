import { Router } from 'express'
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js'
import { index, show, store, update } from '../controllers/payment.controller.js'

const router = Router()

router.use(requireAuth)

router.get('/', index)
router.get('/:id', show)
router.post('/', requireRole('customer'), store)
router.patch('/:id', update)

export default router
