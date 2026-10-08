import { Router } from 'express'
import { index, show } from '../controllers/product.controller.js'

const router = Router()

// Khách vãng lai và người dùng đều xem được danh mục & chi tiết sản phẩm
router.get('/', index)
router.get('/:id', show)

export default router
