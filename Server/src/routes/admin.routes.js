import { Router } from 'express'
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js'
import { stats, summary } from '../controllers/admin.controller.js'

const router = Router()

router.use(requireAuth, requireRole('admin'))

router.get('/stats', stats)
router.get('/summary', summary)

export default router
