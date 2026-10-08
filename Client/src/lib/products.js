import { api } from './api.js'
import { getToken } from './firebase.js'

export const productsApi = {
  /** Lấy danh sách sản phẩm */
  list: ({ category, search } = {}) => {
    const params = new URLSearchParams()
    if (category && category !== 'all') params.set('category', category)
    if (search) params.set('search', search)
    const qs = params.toString() ? `?${params.toString()}` : ''
    return api.get(`/api/products${qs}`)
  },

  /** Xem chi tiết 1 sản phẩm */
  get: (id) => api.get(`/api/products/${encodeURIComponent(id)}`),
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
}
