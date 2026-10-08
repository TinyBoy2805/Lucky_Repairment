import { api } from './api.js'
import { requestsApi } from './requests.js'

export const servicesApi = {
  /** Lấy danh sách dịch vụ sửa chữa */
  list: ({ category, search } = {}) => {
    const params = new URLSearchParams()
    if (category && category !== 'all') params.set('category', category)
    if (search) params.set('search', search)
    const qs = params.toString() ? `?${params.toString()}` : ''
    return api.get(`/api/services${qs}`)
  },

  /** Xem chi tiết 1 dịch vụ */
  get: (id) => api.get(`/api/services/${encodeURIComponent(id)}`),

  /** Đặt lịch dịch vụ sửa chữa */
  book: (bookingData) => requestsApi.create(bookingData),
}
