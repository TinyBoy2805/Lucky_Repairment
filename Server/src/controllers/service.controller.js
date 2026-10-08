import { asyncHandler } from '../middlewares/error.middleware.js'
import {
  createRepairService,
  deleteRepairService,
  getRepairService,
  listRepairServices,
  updateRepairService,
} from '../services/repair-service.service.js'

/** GET /api/services — Danh sách các dịch vụ sửa chữa từ Firebase */
export const index = asyncHandler(async (req, res) => {
  const { category, search } = req.query
  const services = await listRepairServices({ category, search })
  res.json({ services, total: services.length })
})

/** GET /api/services/:id — Chi tiết dịch vụ sửa chữa từ Firebase */
export const show = asyncHandler(async (req, res) => {
  const service = await getRepairService(req.params.id)
  res.json({ service })
})

/** POST /api/services — Thêm dịch vụ mới lên Firebase (Admin) */
export const store = asyncHandler(async (req, res) => {
  const service = await createRepairService(req.body)
  res.status(201).json({ service })
})

/** PUT /api/services/:id — Cập nhật dịch vụ trên Firebase (Admin) */
export const update = asyncHandler(async (req, res) => {
  const service = await updateRepairService(req.params.id, req.body)
  res.json({ service })
})

/** DELETE /api/services/:id — Xóa dịch vụ khỏi Firebase (Admin) */
export const destroy = asyncHandler(async (req, res) => {
  const result = await deleteRepairService(req.params.id)
  res.json(result)
})
