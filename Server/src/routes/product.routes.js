import { Router } from 'express'
import { optionalAuth, requireAuth, requireRole } from '../middlewares/auth.middleware.js'
import {
  index,
  show,
  bestSelling,
  createCtrl,
  updateCtrl,
  destroyCtrl,
  createReviewCtrl,
  listReviewCtrl,
  ratingStatsCtrl,
} from '../controllers/product.controller.js'

const router = Router()

// Khách vãng lai và người dùng đều xem được danh mục & chi tiết sản phẩm.
// optionalAuth cho phép lọc "?ownerUid=mine" khi có tài khoản.
router.get('/', optionalAuth, index)
router.get('/best-selling', bestSelling)
router.get('/:id', show)

// Quản lý sản phẩm: admin quản lý tất cả, thợ quản lý sản phẩm của mình
router.post('/', requireAuth, requireRole('admin', 'repairman'), createCtrl)
router.patch('/:id', requireAuth, requireRole('admin', 'repairman'), updateCtrl)
router.delete('/:id', requireAuth, requireRole('admin', 'repairman'), destroyCtrl)

// Review cho sản phẩm (cần đăng nhập)
router.post('/:id/reviews', requireAuth, createReviewCtrl)
router.get('/:id/reviews', listReviewCtrl)
router.get('/:id/rating', ratingStatsCtrl)

export default router