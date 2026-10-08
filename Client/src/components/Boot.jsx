import { useAuth } from '../context/useAuth.js'
import App from '../App.jsx'
import LoadingScreen from './LoadingScreen.jsx'

// Chờ Firebase khôi phục phiên đăng nhập xong rồi mới render routes
export default function Boot() {
  const { loading } = useAuth()

  if (loading) {
    return <LoadingScreen label="Đang kiểm tra phiên đăng nhập..." />
  }

  return <App />
}
