import { Router } from 'express'
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js'
import { index, show, store, update } from '../controllers/report.controller.js'

const router = Router()

router.use(requireAuth)

router.get('/', index)
router.get('/:id', show)
router.post('/', store)
router.patch('/:id', requireRole('admin'), update)

export default router
