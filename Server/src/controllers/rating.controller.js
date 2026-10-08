import { asyncHandler } from '../middlewares/error.middleware.js'
import {
  createRating,
  deleteRating,
  getRating,
  listRatings,
} from '../services/rating.service.js'

/** GET /api/ratings — ?repairmanUid= */
export const index = asyncHandler(async (req, res) => {
  const { items, ...meta } = await listRatings(req.profile, req.query)
  res.json({ ratings: items, ...meta })
})

/** GET /api/ratings/:id */
export const show = asyncHandler(async (req, res) => {
  const rating = await getRating(req.params.id)
  res.json({ rating })
})

/** POST /api/ratings — customer */
export const store = asyncHandler(async (req, res) => {
  const rating = await createRating(req.profile, req.body ?? {})
  res.status(201).json({ rating })
})

/** DELETE /api/ratings/:id — admin */
export const destroy = asyncHandler(async (req, res) => {
  await deleteRating(req.params.id)
  res.json({ success: true })
})
