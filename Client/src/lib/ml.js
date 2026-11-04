import { api } from './api.js'
import { getToken } from './firebase.js'

export const mlApi = {
  health: async () => api.get('/api/ml/health'),
  classify: async (payload) =>
    api.post('/api/ml/classify', payload, await getToken()),
  retryLabel: async (id) =>
    api.post(`/api/ml/label/${encodeURIComponent(id)}`, {}, await getToken()),
}
