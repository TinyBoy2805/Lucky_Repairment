import { api } from './api.js'
import { getToken } from './firebase.js'
import { buildQuery } from './query.js'

/**
 * Đánh giá dịch vụ / đơn hàng.
 * - requestId → đánh giá yêu cầu sửa chữa đã hoàn thành.
 * - orderId   → đánh giá đơn dịch vụ đã hoàn thành.
 */
export const ratingsApi = {
  list: async (params = {}) =>
    api.get(`/api/ratings${buildQuery(params)}`, await getToken()),

  create: async (data) => api.post('/api/ratings', data, await getToken()),
}
