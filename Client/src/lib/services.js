import { api } from './api.js'
import { requestsApi } from './requests.js'

export const servicesApi = {
  /** Lấy danh sách dịch vụ sửa chữa */
  list: ({ category, search, sort } = {}) => {
    const params = new URLSearchParams()
    if (category && category !== 'all') params.set('category', category)
    if (search) params.set('search', search)
    // Sort: price_asc, price_desc (khớp giá trị backend)
    if (sort === 'price-asc') params.set('sort', 'price_asc')
    if (sort === 'price-desc') params.set('sort', 'price_desc')
    const qs = params.toString() ? `?${params.toString()}` : ''
    return api.get(`/api/services${qs}`)
  },

  /** Xem chi tiết 1 dịch vụ */
  get: (id) => api.get(`/api/services/${encodeURIComponent(id)}`),

  /** Đặt lịch dịch vụ sửa chữa */
  book: (bookingData) => requestsApi.create(bookingData),
}
