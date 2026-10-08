import { auth } from '../config/firebase.js'
import { ensureProfile } from '../services/user.service.js'

function extractToken(req) {
  const header = req.headers.authorization
  if (!header) return null

  const [scheme, token] = header.split(' ')
  return scheme === 'Bearer' && token ? token.trim() : null
}

/**
 * Xác thực ID token do Firebase cấp.
 * Thành công → gắn req.uid / req.decoded / req.profile cho các handler sau.
 */
export async function requireAuth(req, res, next) {
  try {
    const token = extractToken(req)
    if (!token) {
      return res.status(401).json({ error: 'Thiếu access token. Vui lòng đăng nhập.' })
    }

    const decoded = await auth.verifyIdToken(token)

    req.uid = decoded.uid
    req.decoded = decoded
    req.profile = await ensureProfile(decoded)

    next()
  } catch (error) {
    const message =
      error?.code === 'auth/id-token-expired'
        ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
        : 'Access token không hợp lệ.'

    return res.status(401).json({ error: message })
  }
}

/**
 * Phân quyền theo role. Dùng sau requireAuth.
 * requireRole('admin')  |  requireRole('admin', 'repairman')
 */
export function requireRole(...allowed) {
  return (req, res, next) => {
    const role = req.profile?.role

    if (!role) {
      return res.status(401).json({ error: 'Không xác định được vai trò người dùng.' })
    }

    if (!allowed.includes(role)) {
      return res.status(403).json({
        error: `Bạn không có quyền truy cập tài nguyên này. Yêu cầu vai trò: ${allowed.join(' hoặc ')}.`,
        role,
        required: allowed,
      })
    }

    next()
  }
}
