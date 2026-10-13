import { api } from './api.js'
import { getToken } from './firebase.js'

export const walletApi = {
  /** Ví của người dùng đang đăng nhập. */
  current: async () => api.get('/api/wallet', await getToken()),

  /** Rút tiền khỏi ví. */
  withdraw: async (amount) =>
    api.post('/api/wallet/withdraw', { amount }, await getToken()),

  /** Nạp tiền vào ví. */
  deposit: async (amount) =>
    api.post('/api/wallet/deposit', { amount }, await getToken()),
}
