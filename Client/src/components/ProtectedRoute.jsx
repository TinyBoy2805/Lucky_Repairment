import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import LoadingScreen from './LoadingScreen.jsx'
import { homeFor } from '../lib/roles.js'

/**
 * Chặn trang theo vai trò.
 * <ProtectedRoute allow={['admin']}>...</ProtectedRoute>
 */
export default function ProtectedRoute({ allow, children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingScreen label="Đang kiểm tra phiên đăng nhập..." />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allow && !allow.includes(user.role)) {
    // Không có quyền → đẩy về trang của chính vai trò đó
    return <Navigate to={homeFor(user.role)} replace />
  }

  return children
}
