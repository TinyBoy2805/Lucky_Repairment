import { api } from './api.js'
import { getToken } from './firebase.js'

/**
 * Đơn dịch vụ sửa chữa (đặt dịch vụ / thanh toán / lịch sử).
 * Mặt hàng trong đơn giữ tên trường trung tính (productId/productName/productImage)
 * để tương thích với API đơn hàng hiện có.
 */
export const ordersApi = {
  /** Tạo đơn dịch vụ mới */
  create: async (orderData) => {
    const token = await getToken()
    return api.post('/api/orders', orderData, token)
  },

  /** Danh sách đơn dịch vụ của người dùng hiện tại */
  list: async () => {
    const token = await getToken()
    return api.get('/api/orders', token)
  },

  /** Xem chi tiết đơn dịch vụ */
  get: async (id) => {
    const token = await getToken()
    return api.get(`/api/orders/${encodeURIComponent(id)}`, token)
  },

  /** Cập nhật trạng thái đơn (thợ / admin) */
  updateStatus: async (id, status) => {
    const token = await getToken()
    return api.patch(`/api/orders/${encodeURIComponent(id)}`, { status }, token)
  },

  /** Hủy đơn dịch vụ (khách hàng / admin) */
  cancel: async (id) => {
    const token = await getToken()
    return api.patch(`/api/orders/${encodeURIComponent(id)}/cancel`, {}, token)
  },
}

export const paymentsApi = {
  /** Tạo phiên thanh toán MoMo (trả về URL/quét QR) */
  createMoMo: async (orderId, amount, description) => {
    const token = await getToken()
    return api.post('/api/payments/momo/create', { orderId, amount, description }, token)
  },

  /** Tạo phiên thanh toán Stripe (checkout) */
  createStripe: async (orderId, amount) => {
    const token = await getToken()
    return api.post('/api/payments/stripe/create', { orderId, amount }, token)
  },
}
