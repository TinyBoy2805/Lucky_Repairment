import { asyncHandler } from '../middlewares/error.middleware.js'
import {
  createPayment,
  getPayment,
  listPayments,
  updatePayment,
  createMoMoPayment,
  createStripeCheckoutSession,
  momoCallback,
} from '../services/payment.service.js'

/** GET /api/payments */
export const index = asyncHandler(async (req, res) => {
  const { items, ...meta } = await listPayments(req.profile, req.query)
  res.json({ payments: items, ...meta })
})

/** GET /api/payments/:id */
export const show = asyncHandler(async (req, res) => {
  const payment = await getPayment(req.params.id)
  res.json({ payment })
})

/** POST /api/payments — customer */
export const store = asyncHandler(async (req, res) => {
  const payment = await createPayment(req.profile, req.body ?? {})
  res.status(201).json({ payment })
})

/** PATCH /api/payments/:id — { action: 'confirm' | 'fail' | 'complete' } */
export const update = asyncHandler(async (req, res) => {
  const { action } = req.body ?? {}
  const payment = await updatePayment({ id: req.params.id, actor: req.profile, action })
  res.json({ payment })
})

/** POST /api/payments/momo/create — Tạo URL thanh toán MoMo */
export const moMoCreate = asyncHandler(async (req, res) => {
  const { orderId, amount, description } = req.body ?? {}
  if (!orderId || !amount) {
    return res.status(400).json({ error: 'Thiếu orderId hoặc amount.' })
  }
  const result = await createMoMoPayment({ id: req.params.id, actor: req.profile, orderId, amount, description })
  res.json(result)
})

/** POST /api/payments/stripe/create — Tạo Stripe checkout session */
export const stripeCreate = asyncHandler(async (req, res) => {
  const { orderId, amount } = req.body ?? {}
  if (!orderId || !amount) {
    return res.status(400).json({ error: 'Thiếu orderId hoặc amount.' })
  }
  const result = await createStripeCheckoutSession({ id: req.params.id, actor: req.profile, orderId, amount })
  res.json(result)
})

/** GET /api/payments/momo/callback — Callback MoMo (từ server MoMo) */
export const moMoCallback = asyncHandler(async (req, res) => {
  await momoCallback(req, res, (error) => {
    throw error
  })
})