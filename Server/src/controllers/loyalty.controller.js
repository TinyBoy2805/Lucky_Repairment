import { asyncHandler } from '../middlewares/error.middleware.js'
import { getLoyaltyLogs, getLoyaltyPoints } from '../services/loyalty.service.js'

/** GET /api/loyalty/points — điểm thưởng hiện tại của user đang đăng nhập */
export const getPoints = asyncHandler(async (req, res) => {
  const result = await getLoyaltyPoints(req.uid)
  res.json({
    loyalty: result,
    points: result.points,
    data: result,
  })
})

/** GET /api/loyalty/logs — lịch sử giao dịch điểm của user đang đăng nhập */
export const getLogs = asyncHandler(async (req, res) => {
  const logs = await getLoyaltyLogs(req.uid)
  res.json({
    logs,
    data: logs,
  })
})
