import { asyncHandler } from '../middlewares/error.middleware.js'
import { getProduct, listProducts, createReview, listReviews, getProductAverageRating, getProductRatingStats, getBestSellingProducts, createProduct, updateProduct, deleteProduct } from '../services/product.service.js'

/** GET /api/products — Lấy danh sách sản phẩm (hỗ trợ lọc ?category= & ?search= & ?brand= & ?sort= & ?ownerUid=) */
export const index = asyncHandler(async (req, res) => {
  const { category, search, brand, sort, ownerUid } = req.query

  // "mine" = sản phẩm của chính người dùng hiện tại
  let resolvedOwner = ownerUid
  if (ownerUid === 'mine') {
    resolvedOwner = req.profile ? req.profile.uid : 'all'
  }

  const products = await listProducts({ category, search, brand, sort, ownerUid: resolvedOwner })
  res.json({ products, total: products.length })
})

/** GET /api/products/best-selling — Sản phẩm bán chạy (công khai) */
export const bestSelling = asyncHandler(async (req, res) => {
  const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 5))
  const sales = await getBestSellingProducts(limit)
  const products = sales.map((item) => item.product).filter(Boolean)
  res.json({ products, sales, total: products.length })
})

/** GET /api/products/:id — Xem chi tiết sản phẩm */
export const show = asyncHandler(async (req, res) => {
  const product = await getProduct(req.params.id)
  res.json({ product })
})

/** POST /api/products — Tạo sản phẩm (admin hoặc người bán - thợ) */
export const createCtrl = asyncHandler(async (req, res) => {
  const product = await createProduct(req.body ?? {}, req.profile)
  res.status(201).json({ product })
})

/** PATCH /api/products/:id — Cập nhật sản phẩm (admin hoặc chủ sở hữu) */
export const updateCtrl = asyncHandler(async (req, res) => {
  const product = await updateProduct(req.params.id, req.body ?? {}, req.profile)
  res.json({ product })
})

/** DELETE /api/products/:id — Xóa sản phẩm (admin hoặc chủ sở hữu) */
export const destroyCtrl = asyncHandler(async (req, res) => {
  const result = await deleteProduct(req.params.id, req.profile)
  res.json(result)
})

/** POST /api/products/:id/reviews — Thêm review cho sản phẩm (cần đăng nhập) */
export const createReviewCtrl = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body ?? {}
  const productId = req.params.id
  const customerUid = req.profile?.uid
  const customerName = req.profile?.displayName || req.profile?.email || 'Khách'

  if (!customerUid) {
    return res.status(401).json({ error: 'Cần đăng nhập để đưa review.' })
  }

  const review = await createReview(productId, customerUid, customerName, rating, comment)

  // Cập nhật lại rating trung bình cho sản phẩm
  const avgRating = await getProductAverageRating(productId)

  res.status(201).json({
    review,
    averageRating: avgRating,
    totalReviews: (await listReviews(productId)).length,
  })
})

/** GET /api/products/:id/reviews — Lấy danh sách review cho sản phẩm */
export const listReviewCtrl = asyncHandler(async (req, res) => {
  const productId = req.params.id
  const reviews = await listReviews(productId)
  const avgRating = await getProductAverageRating(productId)

  res.json({ reviews, averageRating: avgRating, total: reviews.length })
})

/** GET /api/products/:id/rating — Lấy thống kê rating cho sản phẩm */
export const ratingStatsCtrl = asyncHandler(async (req, res) => {
  const productId = req.params.id
  const stats = await getProductRatingStats(productId)
  res.json({ stats })
})