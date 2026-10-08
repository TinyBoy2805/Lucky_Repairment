import { asyncHandler } from '../middlewares/error.middleware.js'
import { createOrder, getOrder, listOrders, updateOrderStatus } from '../services/order.service.js'

/** POST /api/orders — Đặt hàng mới */
export const store = asyncHandler(async (req, res) => {
  const order = await createOrder(req.profile, req.body ?? {})
  res.status(201).json({ order })
})

/** GET /api/orders — Danh sách đơn hàng (cần đăng nhập) */
export const index = asyncHandler(async (req, res) => {
  const orders = await listOrders(req.profile)
  res.json({ orders, total: orders.length })
})

/** GET /api/orders/:id — Xem chi tiết đơn hàng */
export const show = asyncHandler(async (req, res) => {
  const order = await getOrder(req.params.id)
  res.json({ order })
})

/** PATCH /api/orders/:id — Cập nhật trạng thái đơn hàng (admin / thợ) */
export const update = asyncHandler(async (req, res) => {
  const { status } = req.body ?? {}
  const order = await updateOrderStatus(req.params.id, status, req.profile)
  res.json({ order })
})
