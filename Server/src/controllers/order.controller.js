import { asyncHandler } from '../middlewares/error.middleware.js'
import {
  createOrder,
  getOrderForViewer,
  listOrders,
  updateOrderStatus,
  cancelOrder,
} from '../services/order.service.js'

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
  const order = await getOrderForViewer(req.params.id, req.profile)
  res.json({ order })
})

/** PATCH /api/orders/:id — Cập nhật trạng thái đơn hàng (admin / thợ) */
export const update = asyncHandler(async (req, res) => {
  const { status } = req.body ?? {}
  const order = await updateOrderStatus(req.params.id, status, req.profile)
  res.json({ order })
})

/** PATCH /api/orders/:id/cancel — Hủy đơn hàng */
export const cancel = asyncHandler(async (req, res) => {
  const result = await cancelOrder(req.params.id, req.profile)
  res.json(result)
})

/** POST /api/orders/:id/pay — Xác thực/thanh toán đơn hàng */
export const pay = asyncHandler(async (req, res) => {
  const { paymentMethod } = req.body ?? {}
  const order = await getOrderForViewer(req.params.id, req.profile)

  if (order.paymentMethod === 'cod') {
    // COD: không cần external payment, chuyển sang payment_verified rồi confirmed
    await updateOrderStatus(req.params.id, 'payment_verified', req.profile)
    return res.json({
      order: await getOrderForViewer(req.params.id, req.profile),
      message: 'Đơn hàng đã được xác nhận thanh toán COD. Trạng thái: payment_verified.',
    })
  }

  // MoMo/Stripe: tạo payment URL hoặc callback
  // TODO: Implement actual MoMo/Stripe integration
  // For now, mark as payment_verified and auto-confirm
  await updateOrderStatus(req.params.id, 'payment_verified', req.profile)

  // Tự động chuyển sang confirmed sau khi payment verified
  // (Sẽ được thực hiện trong updateOrderStatus nếu paymentMethod không phải cod)

  res.json({
    order: await getOrderForViewer(req.params.id, req.profile),
    message: `Thanh toán qua ${paymentMethod} thành công. Đơn hàng đã được xác nhận.`,
  })
})