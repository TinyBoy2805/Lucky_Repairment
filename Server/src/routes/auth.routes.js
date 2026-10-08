import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { login, logout, me, register } from '../controllers/auth.controller.js'

const router = Router()

router.post('/register', requireAuth, register)
router.post('/login', requireAuth, login)
router.get('/me', requireAuth, me)
router.post('/logout', requireAuth, logout)

export default router
