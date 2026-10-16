import { api } from './api.js'
import { getToken } from './firebase.js'

export const loyaltyApi = {
  /** Lấy số điểm thưởng hiện tại của khách hàng */
  getPoints: async () => {
    const token = await getToken()
    return api.get('/api/loyalty/points', token)
  },

  /** Lấy lịch sử biến động điểm thưởng (tích điểm, dùng điểm, hoàn điểm) */
  getLogs: async () => {
    const token = await getToken()
    return api.get('/api/loyalty/logs', token)
  },
}
