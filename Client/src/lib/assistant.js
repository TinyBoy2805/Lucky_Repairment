import { api } from './api.js'
import { getToken } from './firebase.js'

async function post(path, body) {
  const token = await getToken()
  return api.post(path, body, token)
}

export const assistantApi = {
  chat: ({ question }) => post('/api/assistant/chat', { question }),

  serviceChat: (serviceId, question) =>
    post(`/api/assistant/service/${encodeURIComponent(serviceId)}`, { question }),

  adminQuery: ({ question }) => post('/api/assistant/admin/query', { question }),

  status: () => api.get('/api/assistant/status'),

  indexStatus: async () => {
    const token = await getToken()
    return api.get('/api/assistant/admin/index/status', token)
  },

  reindex: async () => {
    const token = await getToken()
    return api.post('/api/assistant/admin/reindex', {}, token)
  },
}
