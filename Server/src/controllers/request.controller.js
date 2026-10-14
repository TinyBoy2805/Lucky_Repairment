import { asyncHandler } from '../middlewares/error.middleware.js'
import {
  createRequest,
  getRequest,
  listRequests,
  updateRequest,
} from '../services/request.service.js'

/** GET /api/requests — khách xem đơn của mình, thợ/admin xem tất cả. */
export const index = asyncHandler(async (req, res) => {
  const { items, ...meta } = await listRequests(req.profile, req.query)
  res.json({ requests: items, ...meta })
})

/** GET /api/requests/:id — xem chi tiết 1 yêu cầu (chủ đơn, thợ phụ trách hoặc admin). */
export const show = asyncHandler(async (req, res) => {
  const request = await getRequest(req.params.id, req.profile)
  res.json({ request })
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