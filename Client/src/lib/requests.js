import { api } from './api.js'
import { getToken } from './firebase.js'

export const STATUS_LABEL = {
  pending: 'Chờ tiếp nhận',
  assigned: 'Đã nhận việc',
  in_progress: 'Đang sửa',
  done: 'Hoàn thành',
}

export const requestsApi = {
  list: async () => api.get('/api/requests', await getToken()),
  create: async (data) => api.post('/api/requests', data, await getToken()),
  update: async (id, body) => api.patch(`/api/requests/${id}`, body, await getToken()),
}