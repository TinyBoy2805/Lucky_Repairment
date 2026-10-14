import { asyncHandler } from '../middlewares/error.middleware.js'
import {
  createRepairService,
  deleteRepairService,
  getRepairService,
  listRepairServices,
  updateRepairService,
} from '../services/repair-service.service.js'

/** GET /api/services — Danh sách dịch vụ sửa chữa (hỗ trợ ?category= & ?search= & ?sort= & ?ownerUid=) */
export const index = asyncHandler(async (req, res) => {
  const { category, search, sort, ownerUid } = req.query
  // req.profile chỉ có khi optionalAuth nhận được token hợp lệ ("?ownerUid=mine")
  const services = await listRepairServices({ category, search, sort, ownerUid, actor: req.profile })
  res.json({ services, total: services.length })
})

/** GET /api/services/:id — Chi tiết dịch vụ sửa chữa từ Firebase */
export const show = asyncHandler(async (req, res) => {
  const service = await getRepairService(req.params.id)
  res.json({ service })
})

/** POST /api/services — Thêm dịch vụ mới (admin hoặc thợ bán dịch vụ) */
export const store = asyncHandler(async (req, res) => {
  const service = await createRepairService(req.body ?? {}, req.profile)
  res.status(201).json({ service })
})

/** PUT /api/services/:id — Cập nhật dịch vụ (admin hoặc chủ sở hữu) */
export const update = asyncHandler(async (req, res) => {
  const service = await updateRepairService(req.params.id, req.body ?? {}, req.profile)
  res.json({ service })
})

/** DELETE /api/services/:id — Xóa dịch vụ (admin hoặc chủ sở hữu) */
export const destroy = asyncHandler(async (req, res) => {
  const result = await deleteRepairService(req.params.id, req.profile)
  res.json(result)
})
