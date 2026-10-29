import { Router } from 'express'
import {
  adminQuery,
  chat,
  indexStatus,
  reindex,
  serviceChat,
  status,
} from '../controllers/assistant.controller.js'
import { optionalAuth, requireAuth, requireRole } from '../middlewares/auth.middleware.js'
import { rateLimit } from '../utils/rate-limit.js'

const router = Router()

const publicLimit = rateLimit({ windowMs: 10 * 60 * 1000, max: 30 })
const adminLimit = rateLimit({ windowMs: 10 * 60 * 1000, max: 60 })

router.get('/status', status)

router.post('/chat', publicLimit, optionalAuth, chat)
router.post('/service/:id', publicLimit, optionalAuth, serviceChat)

router.post('/admin/query', requireAuth, adminLimit, requireRole('admin'), adminQuery)
router.get(
  '/admin/index/status',
  requireAuth,
  requireRole('admin'),
  indexStatus,
)
router.post('/admin/reindex', requireAuth, requireRole('admin'), reindex)

export default router
