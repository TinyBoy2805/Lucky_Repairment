import { api } from './api.js'
import { getToken } from './firebase.js'
import { requestsApi } from './requests.js'

export const servicesApi = {
  /**
   * Lấy danh sách dịch vụ sửa chữa.
   * ownerUid='mine' → chỉ lấy dịch vụ do tài khoản đang đăng nhập tạo (dành cho thợ).
   */
  list: ({ category, search, sort, ownerUid } = {}) => {
    const params = new URLSearchParams()
    if (category && category !== 'all') params.set('category', category)
    if (search) params.set('search', search)
    // Sort: price_asc, price_desc, sales (khớp giá trị backend)
    if (sort === 'price-asc') params.set('sort', 'price_asc')
    if (sort === 'price-desc') params.set('sort', 'price_desc')
    if (sort === 'sales') params.set('sort', 'sales')
    if (ownerUid) params.set('ownerUid', ownerUid)
    const qs = params.toString() ? `?${params.toString()}` : ''
    return api.get(`/api/services${qs}`)
  },

  /** 4 mục trang chủ: bán chạy / mới nhất / xem nhiều / gợi ý */
  home: async () => api.get('/api/services/home', await getToken()),

  /** Tăng lượt xem của 1 dịch vụ (không yêu cầu đăng nhập) */
  view: async (id) =>
    api.post(`/api/services/${encodeURIComponent(id)}/view`, {}, await getToken()),

  /** Xem chi tiết 1 dịch vụ */
  get: (id) => api.get(`/api/services/${encodeURIComponent(id)}`),

  /** Đặt lịch dịch vụ sửa chữa (tạo yêu cầu sửa chữa) */
  book: (bookingData) => requestsApi.create(bookingData),

  /** Tạo dịch vụ mới (admin hoặc thợ) */
  create: async (data) => api.post('/api/services', data, await getToken()),

  /** Cập nhật dịch vụ (admin hoặc chủ sở hữu) */
  update: async (id, data) =>
    api.put(`/api/services/${encodeURIComponent(id)}`, data, await getToken()),

  /** Xóa dịch vụ (admin hoặc chủ sở hữu) */
  remove: async (id) => api.delete(`/api/services/${encodeURIComponent(id)}`, await getToken()),
}
