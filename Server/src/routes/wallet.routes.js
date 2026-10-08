import { Router } from 'express'
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js'
import {
  all,
  current,
  depositFunds,
  withdrawFunds,
} from '../controllers/wallet.controller.js'

const router = Router()

router.use(requireAuth)

router.get('/', current)
router.get('/all', requireRole('admin'), all)
router.post('/deposit', depositFunds)
router.post('/withdraw', withdrawFunds)

export default router
