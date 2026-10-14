import { api } from './api.js'
import { getToken } from './firebase.js'

export const repairmanApi = {
  /** Trạng thái sẵn sàng nhận việc của thợ hiện tại. */
  availability: async () => api.get('/api/repairman/availability', await getToken()),

  /** Bật/tắt trạng thái sẵn sàng nhận việc. */
  setAvailability: async (available) =>
    api.put('/api/repairman/availability', { available }, await getToken()),

  /** Số liệu tổng hợp của thợ hiện tại. */
  stats: async () => api.get('/api/repairman/stats', await getToken()),
}
