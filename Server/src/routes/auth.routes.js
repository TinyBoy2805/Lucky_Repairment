import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { login, logout, me, profile, register } from '../controllers/auth.controller.js'
import { facebookLogin } from '../controllers/auth.facebook.controller.js'

const router = Router()

router.post('/register', requireAuth, register)
router.post('/login', requireAuth, login)
router.get('/me', requireAuth, me)
router.post('/logout', requireAuth, logout)
router.post('/profile', requireAuth, profile)
router.post('/facebook', facebookLogin)

export default router
