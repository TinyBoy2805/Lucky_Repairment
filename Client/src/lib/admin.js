import { api } from './api.js'
import { getToken } from './firebase.js'
import { buildQuery } from './query.js'

export const adminApi = {
  stats: async (range = 'all') =>
    api.get(`/api/admin/stats${buildQuery({ range })}`, await getToken()),
  summary: async () => api.get('/api/admin/summary', await getToken()),

  users: async (params = {}) => api.get(`/api/users${buildQuery(params)}`, await getToken()),
  changeRole: async (uid, role) =>
    api.patch(`/api/users/${uid}/role`, { role }, await getToken()),

  orders: async (params = {}) =>
    api.get(`/api/requests${buildQuery(params)}`, await getToken()),

  categories: {
    list: async (params = {}) =>
      api.get(`/api/categories${buildQuery(params)}`, await getToken()),
    create: async (data) => api.post('/api/categories', data, await getToken()),
    update: async (id, data) => api.patch(`/api/categories/${id}`, data, await getToken()),
    remove: async (id) => api.delete(`/api/categories/${id}`, await getToken()),
  },

  reports: {
    list: async (params = {}) =>
      api.get(`/api/reports${buildQuery(params)}`, await getToken()),
    resolve: async (id) =>
      api.patch(`/api/reports/${id}`, { action: 'resolve' }, await getToken()),
    reject: async (id) =>
      api.patch(`/api/reports/${id}`, { action: 'reject' }, await getToken()),
  },

  ratings: {
    list: async (params = {}) =>
      api.get(`/api/ratings${buildQuery(params)}`, await getToken()),
    remove: async (id) => api.delete(`/api/ratings/${id}`, await getToken()),
  },

  payments: {
    list: async (params = {}) =>
      api.get(`/api/payments${buildQuery(params)}`, await getToken()),
    confirm: async (id) =>
      api.patch(`/api/payments/${id}`, { action: 'confirm' }, await getToken()),
    fail: async (id) =>
      api.patch(`/api/payments/${id}`, { action: 'fail' }, await getToken()),
  },

  wallet: {
    list: async (params = {}) =>
      api.get(`/api/wallet/all${buildQuery(params)}`, await getToken()),
  },

  transactions: async (params = {}) =>
    api.get(`/api/transactions${buildQuery(params)}`, await getToken()),

  schedules: {
    list: async (params = {}) =>
      api.get(`/api/schedules${buildQuery(params)}`, await getToken()),
    show: async (uid) => api.get(`/api/schedules/${uid}`, await getToken()),
    update: async (uid, data) => api.put(`/api/schedules/${uid}`, data, await getToken()),
    addTimeOff: async (uid, data) =>
      api.post(`/api/schedules/${uid}/timeoff`, data, await getToken()),
    removeTimeOff: async (uid, id) =>
      api.delete(`/api/schedules/${uid}/timeoff/${id}`, await getToken()),
  },

  pricing: {
    get: async () => api.get('/api/settings/pricing', await getToken()),
    update: async (data) => api.put('/api/settings/pricing', data, await getToken()),
  },
}
