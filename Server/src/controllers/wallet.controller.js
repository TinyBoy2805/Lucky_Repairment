import { asyncHandler } from '../middlewares/error.middleware.js'
import { deposit, getWallet, listWallets, withdraw } from '../services/wallet.service.js'

/** GET /api/wallet — ví của user hiện tại */
export const current = asyncHandler(async (req, res) => {
  const wallet = await getWallet(req.uid)
  res.json({ wallet })
})

/** GET /api/wallet/all — admin */
export const all = asyncHandler(async (req, res) => {
  const { items, ...meta } = await listWallets(req.query)
  res.json({ wallets: items, ...meta })
})

/** POST /api/wallet/deposit */
export const depositFunds = asyncHandler(async (req, res) => {
  const result = await deposit(req.uid, req.body ?? {})
  res.status(201).json(result)
})

/** POST /api/wallet/withdraw */
export const withdrawFunds = asyncHandler(async (req, res) => {
  const result = await withdraw(req.uid, req.body ?? {})
  res.status(201).json(result)
})
