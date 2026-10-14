import { asyncHandler } from '../middlewares/error.middleware.js'
import { getAvailability, setAvailability, getRepairmanStats } from '../services/repairman.service.js'

/** GET /api/repairman/availability — trạng thái sẵn sàng nhận đơn của thợ hiện tại */
export const showAvailability = asyncHandler(async (req, res) => {
  const availability = await getAvailability(req.uid)
  res.json({ availability })
})

/** PUT /api/repairman/availability — bật/tắt trạng thái sẵn sàng nhận đơn */
export const updateAvailability = asyncHandler(async (req, res) => {
  const { available } = req.body ?? {}

  if (typeof available !== 'boolean') {
    return res.status(400).json({ error: 'Trường "available" phải là kiểu boolean.' })
  }

  const availability = await setAvailability(req.uid, available)
  res.json({ availability })
})

/** GET /api/repairman/stats — thống kê đơn hàng/yêu cầu của thợ hiện tại */
export const stats = asyncHandler(async (req, res) => {
  const result = await getRepairmanStats(req.uid)
  res.json({ stats: result })
})
