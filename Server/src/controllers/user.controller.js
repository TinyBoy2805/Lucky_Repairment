import { getProfile, listUsers, updateRole } from '../services/user.service.js'
import { asyncHandler } from '../middlewares/error.middleware.js'

/** GET /api/users — admin */
export const index = asyncHandler(async (req, res) => {
  const { items, ...meta } = await listUsers(req.query)
  res.json({ users: items, ...meta })
})

/** GET /api/users/:uid — admin */
export const show = asyncHandler(async (req, res) => {
  const user = await getProfile(req.params.uid)

  if (!user) {
    return res.status(404).json({ error: 'Không tìm thấy người dùng.' })
  }

  res.json({ user })
})

/** PATCH /api/users/:uid/role — admin. Body: { role } */
export const changeRole = asyncHandler(async (req, res) => {
  const { role } = req.body ?? {}

  if (!role) {
    return res.status(400).json({ error: 'Thiếu trường role.' })
  }

  const user = await updateRole(req.params.uid, role)
  res.json({ user })
})
