import { asyncHandler } from '../middlewares/error.middleware.js'
import {
  createPayment,
  getPayment,
  listPayments,
  updatePayment,
} from '../services/payment.service.js'

/** GET /api/payments */
export const index = asyncHandler(async (req, res) => {
  const payments = await listPayments(req.profile)
  res.json({ payments, total: payments.length })
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

/** PATCH /api/payments/:id — { action: 'confirm' | 'fail' } */
export const update = asyncHandler(async (req, res) => {
  const { action } = req.body ?? {}
  const payment = await updatePayment({ id: req.params.id, actor: req.profile, action })
  res.json({ payment })
})
