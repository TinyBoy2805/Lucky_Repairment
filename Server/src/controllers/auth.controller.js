import {
  ensureProfile,
  revokeRefreshTokens,
  SELF_ASSIGNABLE_ROLES,
} from '../services/user.service.js'
import { asyncHandler } from '../middlewares/error.middleware.js'

/**
 * POST /api/auth/register
 * Client đã tạo tài khoản bằng Firebase Auth, server chỉ tạo profile + gán role.
 * Body: { displayName?, phone?, role? }   role ∈ customer | repairman
 */
export const register = asyncHandler(async (req, res) => {
  const { displayName, phone, role } = req.body ?? {}

  if (role !== undefined && !SELF_ASSIGNABLE_ROLES.includes(role)) {
    return res.status(400).json({
      error: `Role không hợp lệ. Chỉ có thể chọn: ${SELF_ASSIGNABLE_ROLES.join(', ')}.`,
    })
  }

  const profile = await ensureProfile(req.decoded, { displayName, phone, role })

  res.status(201).json({ user: profile })
})

/**
 * POST /api/auth/login
 * Verify token + trả về profile (tự tạo nếu chưa có).
 */
export const login = asyncHandler(async (req, res) => {
  res.json({ user: req.profile })
})

/** GET /api/auth/me */
export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.profile })
})

/** POST /api/auth/logout — thu hồi refresh token ở mọi thiết bị. */
export const logout = asyncHandler(async (req, res) => {
  await revokeRefreshTokens(req.uid)
  res.json({ success: true })
})
