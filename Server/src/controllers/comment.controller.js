import { asyncHandler } from '../middlewares/error.middleware.js'
import {
  createComment,
  createReply,
  deleteComment,
  listComments,
  listReplies,
} from '../services/comment.service.js'

/** GET /api/comments?serviceId=xxx — Lấy danh sách comment cha kèm replies */
export const index = asyncHandler(async (req, res) => {
  const { comments } = await listComments(req.query.serviceId, req.query)
  res.json({ comments })
})

/** POST /api/comments — Tạo comment mới (cần đăng nhập) */
export const store = asyncHandler(async (req, res) => {
  const comment = await createComment(req.profile, req.body ?? {})
  res.status(201).json({ comment })
})

/** POST /api/comments/:id/replies — Trả lời một comment (cần đăng nhập) */
export const storeReply = asyncHandler(async (req, res) => {
  // Gắn parentId từ URL param vào body để service xử lý
  const reply = await createReply(req.profile, { ...req.body, parentId: req.params.id })
  res.status(201).json({ reply })
})

/** GET /api/comments/:id/replies — Lấy danh sách reply của một comment cha */
export const replies = asyncHandler(async (req, res) => {
  const { replies: replyList } = await listReplies(req.params.id)
  res.json({ replies: replyList })
})

/** DELETE /api/comments/:id — Xoá comment (admin hoặc tác giả) */
export const destroy = asyncHandler(async (req, res) => {
  await deleteComment(req.profile, req.params.id)
  res.json({ success: true })
})
