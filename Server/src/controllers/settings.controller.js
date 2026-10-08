import { asyncHandler } from '../middlewares/error.middleware.js'
import { getPricing, updatePricing } from '../services/settings.service.js'

export const showPricing = asyncHandler(async (req, res) => {
  const pricing = await getPricing()
  res.json({ pricing })
})

export const updatePricingSettings = asyncHandler(async (req, res) => {
  const pricing = await updatePricing(req.body ?? {})
  res.json({ pricing })
})
