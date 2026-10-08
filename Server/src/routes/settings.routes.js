import { Router } from 'express'
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js'
import { showPricing, updatePricingSettings } from '../controllers/settings.controller.js'

const router = Router()

router.use(requireAuth, requireRole('admin'))

router.get('/pricing', showPricing)
router.put('/pricing', updatePricingSettings)

export default router
