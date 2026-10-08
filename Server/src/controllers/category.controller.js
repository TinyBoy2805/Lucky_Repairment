import { asyncHandler } from '../middlewares/error.middleware.js'
import {
  createCategory,
  deleteCategory,
  getCategory,
  listCategories,
  updateCategory,
} from '../services/category.service.js'

/** GET /api/categories */
export const index = asyncHandler(async (req, res) => {
  const categories = await listCategories()
  res.json({ categories, total: categories.length })
})

/** GET /api/categories/:id */
export const show = asyncHandler(async (req, res) => {
  const category = await getCategory(req.params.id)
  res.json({ category })
})

/** POST /api/categories — admin */
export const store = asyncHandler(async (req, res) => {
  const category = await createCategory(req.body ?? {})
  res.status(201).json({ category })
})

/** PATCH /api/categories/:id — admin */
export const update = asyncHandler(async (req, res) => {
  const category = await updateCategory(req.params.id, req.body ?? {})
  res.json({ category })
})

/** DELETE /api/categories/:id — admin */
export const destroy = asyncHandler(async (req, res) => {
  await deleteCategory(req.params.id)
  res.json({ success: true })
})
