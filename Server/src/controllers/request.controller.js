import { asyncHandler } from '../middlewares/error.middleware.js'
import {
  createRequest,
  listRequests,
  updateRequest,
} from '../services/request.service.js'

/** GET /api/requests — khách xem đơn của mình, thợ/admin xem tất cả. */
export const index = asyncHandler(async (req, res) => {
  const requests = await listRequests(req.profile)
  res.json({ requests, total: requests.length })
})

/** POST /api/requests — tạo yêu cầu sửa chữa mới. */
export const store = asyncHandler(async (req, res) => {
  const request = await createRequest(req.profile, req.body ?? {})
  res.status(201).json({ request })
})

/** PATCH /api/requests/:id — accept (thợ nhận việc) hoặc đổi trạng thái. */
export const update = asyncHandler(async (req, res) => {
  const { action, status } = req.body ?? {}
  const request = await updateRequest({
    id: req.params.id,
    actor: req.profile,
    action,
    status,
  })
  res.json({ request })
})