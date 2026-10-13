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

/** PATCH /api/users/:uid/profile — admin hoặc user themselves. Body: { displayName, phone } */
export const updateProfile = asyncHandler(async (req, res) => {
  const { displayName, phone } = req.body ?? {}
  const uid = req.profile?.uid || req.params.uid

  if (!uid) {
    return res.status(400).json({ error: 'Thiếu uid người dùng.' })
  }

  // User có thể update profile của mình, hoặc admin update cho user khác
  const existing = await getProfile(uid)
  if (!existing) {
    return res.status(404).json({ error: 'Không tìm thấy người dùng.' })
  }

  const updated = {
    ...existing,
    displayName: displayName !== undefined ? displayName : existing.displayName,
    phone: phone !== undefined ? phone : existing.phone,
    updatedAt: Date.now(),
  }

  const userRef = db => `users/${uid}`
  // Sử dụng db ref thông qua service
  const { db } = await import('../config/firebase.js')
  await db.ref(`users/${uid}`).update({
    displayName: updated.displayName,
    phone: updated.phone,
    updatedAt: updated.updatedAt,
  })

  res.json({ user: updated })
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
