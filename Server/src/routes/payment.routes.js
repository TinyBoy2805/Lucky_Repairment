import { Router } from 'express'
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js'
import {
  index,
  show,
  store,
  update,
  moMoCreate,
  stripeCreate,
  moMoCallback,
} from '../controllers/payment.controller.js'

const router = Router()

// Callback công khai — cổng thanh toán gọi về không kèm token người dùng
router.post('/momo/callback', moMoCallback)
router.get('/momo/callback', moMoCallback)

router.use(requireAuth)

router.get('/', index)
router.get('/:id', show)
router.post('/', requireRole('customer'), store)
router.patch('/:id', update)

// Khởi tạo thanh toán điện tử (MoMo / ZaloPay / Stripe)
router.post('/momo/create', requireRole('customer'), moMoCreate)
router.post('/stripe/create', requireRole('customer'), stripeCreate)

export default router
