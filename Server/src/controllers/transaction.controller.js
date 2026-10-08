import { asyncHandler } from '../middlewares/error.middleware.js'
import { listTransactions } from '../services/transaction.service.js'

/** GET /api/transactions — ?uid= &type= (admin) */
export const index = asyncHandler(async (req, res) => {
  const { items, ...meta } = await listTransactions(req.profile, req.query)
  res.json({ transactions: items, ...meta })
})
