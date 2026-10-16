import { Router } from 'express'
import { optionalAuth, requireAuth } from '../middlewares/auth.middleware.js'
import { destroy, index, replies, store, storeReply } from '../controllers/comment.controller.js'

const router = Router()

// GET  /api/comments?serviceId=xxx  — Công khai, optionalAuth để nhận thông tin user nếu có
router.get('/', optionalAuth, index)

// POST /api/comments                — Cần đăng nhập để tạo comment
router.post('/', requireAuth, store)

// GET  /api/comments/:id/replies    — Lấy replies, không cần đăng nhập
router.get('/:id/replies', replies)

// POST /api/comments/:id/replies    — Cần đăng nhập để trả lời
router.post('/:id/replies', requireAuth, storeReply)

// DELETE /api/comments/:id          — Cần đăng nhập, service tự kiểm tra quyền
router.delete('/:id', requireAuth, destroy)

export default router
