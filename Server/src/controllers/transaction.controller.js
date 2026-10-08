import { asyncHandler } from '../middlewares/error.middleware.js'
import { listTransactions } from '../services/transaction.service.js'

/** GET /api/transactions — ?uid= &type= (admin) */
export const index = asyncHandler(async (req, res) => {
  const transactions = await listTransactions(req.profile, {
    uid: req.query.uid,
    type: req.query.type,
  })
  res.json({ transactions, total: transactions.length })
})
