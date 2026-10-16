import { api } from './api.js'
import { getToken } from './firebase.js'

export const commentsApi = {
  /** Lấy danh sách bình luận (Q&A) của dịch vụ kèm các câu trả lời */
  list: (serviceId) =>
    api.get(`/api/comments?serviceId=${encodeURIComponent(serviceId)}`),

  /** Tạo câu hỏi / bình luận mới cho dịch vụ (cần đăng nhập) */
  create: async (serviceId, content) => {
    const token = await getToken()
    return api.post('/api/comments', { serviceId, content }, token)
  },

  /** Lấy danh sách câu trả lời của 1 bình luận */
  listReplies: (commentId) =>
    api.get(`/api/comments/${encodeURIComponent(commentId)}/replies`),

  /** Trả lời một bình luận (cần đăng nhập) */
  reply: async (commentId, content) => {
    const token = await getToken()
    return api.post(`/api/comments/${encodeURIComponent(commentId)}/replies`, { content }, token)
  },

  /** Xoá bình luận hoặc câu trả lời (chỉ admin hoặc tác giả) */
  remove: async (commentId) => {
    const token = await getToken()
    return api.delete(`/api/comments/${encodeURIComponent(commentId)}`, token)
  },
}
