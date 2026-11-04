import { Router } from 'express'
import { classify, health, retryLabel } from '../controllers/ml.controller.js'
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js'

const router = Router()

router.get('/health', health)
router.post('/classify', requireAuth, classify)
router.post(
  '/label/:id',
  requireAuth,
  requireRole('admin', 'repairman'),
  retryLabel,
)

export default router
