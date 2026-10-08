import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { index } from '../controllers/transaction.controller.js'

const router = Router()

router.use(requireAuth)

router.get('/', index)

export default router
