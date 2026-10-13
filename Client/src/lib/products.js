import { api } from './api.js'
import { getToken } from './firebase.js'

export const productsApi = {
  /** Lấy danh sách sản phẩm (khách dùng; admin/quản lý dùng thêm ownerUid='mine') */
  list: ({ category, search, brand, sort, ownerUid } = {}) => {
    const params = new URLSearchParams()
    if (category && category !== 'all') params.set('category', category)
    if (search) params.set('search', search)
    if (brand && brand !== 'all') params.set('brand', brand)
    // Sort: newest, price-asc, price-desc (khớp giá trị backend)
    if (sort === 'price-asc') params.set('sort', 'price_asc')
    if (sort === 'price-desc') params.set('sort', 'price_desc')
    // Lọc theo chủ sở hữu: "mine" = sản phẩm của tài khoản đang đăng nhập
    if (ownerUid) params.set('ownerUid', ownerUid)
    const qs = params.toString() ? `?${params.toString()}` : ''
    return api.get(`/api/products${qs}`)
  },

  /** Xem chi tiết 1 sản phẩm */
  get: (id) => api.get(`/api/products/${encodeURIComponent(id)}`),

  /** Sản phẩm bán chạy */
  bestSelling: (limit = 5) => api.get(`/api/products/best-selling?limit=${limit}`),

  /** Tạo sản phẩm (admin hoặc người bán - thợ) */
  create: async (data) => api.post('/api/products', data, await getToken()),

  /** Cập nhật sản phẩm (admin hoặc chủ sở hữu) */
  update: async (id, data) => api.patch(`/api/products/${encodeURIComponent(id)}`, data, await getToken()),

  /** Xóa sản phẩm (admin hoặc chủ sở hữu) */
  remove: async (id) => api.delete(`/api/products/${encodeURIComponent(id)}`, await getToken()),

  /** Đánh giá sản phẩm */
  reviews: (id) => api.get(`/api/products/${encodeURIComponent(id)}/reviews`),
  createReview: async (id, { rating, comment }) => {
    const token = await getToken()
    return api.post(`/api/products/${encodeURIComponent(id)}/reviews`, { rating, comment }, token)
  },
}

export const ordersApi = {
  /** Tạo đơn hàng mới */
  create: async (orderData) => {
    const token = await getToken()
    return api.post('/api/orders', orderData, token)
  },

  /** Danh sách đơn hàng */
  list: async () => {
    const token = await getToken()
    return api.get('/api/orders', token)
  },

  /** Xem chi tiết đơn hàng */
  get: async (id) => {
    const token = await getToken()
    return api.get(`/api/orders/${encodeURIComponent(id)}`, token)
  },

  /** Cập nhật trạng thái đơn (thợ / admin) */
  updateStatus: async (id, status) => {
    const token = await getToken()
    return api.patch(`/api/orders/${encodeURIComponent(id)}`, { status }, token)
  },

  /** Hủy đơn hàng (khách hàng / admin) */
  cancel: async (id) => {
    const token = await getToken()
    return api.patch(`/api/orders/${encodeURIComponent(id)}/cancel`, {}, token)
  },
}

export const paymentsApi = {
  /** Tạo phiên thanh toán MoMo / ZaloPay (trả về URL/quét QR) */
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
