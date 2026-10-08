import { asyncHandler } from '../middlewares/error.middleware.js'
import { getProduct, listProducts } from '../services/product.service.js'

/** GET /api/products — Lấy danh sách sản phẩm (hỗ trợ lọc ?category= & ?search=) */
export const index = asyncHandler(async (req, res) => {
  const { category, search } = req.query
  const products = await listProducts({ category, search })
  res.json({ products, total: products.length })
})

/** GET /api/products/:id — Xem chi tiết sản phẩm */
export const show = asyncHandler(async (req, res) => {
  const product = await getProduct(req.params.id)
  res.json({ product })
})
