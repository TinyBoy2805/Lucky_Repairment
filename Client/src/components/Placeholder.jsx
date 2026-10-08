import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'

export default function Placeholder({ icon, title, description }) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  const handleLogout = async () => {
    setBusy(true)
    try {
      await logout()
      navigate('/login', { replace: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="placeholder">
      <div className="placeholder__icon">{icon}</div>
      <h1>{title}</h1>
      <p>{description}</p>

      <div className="placeholder__actions">
        <button
          className="btn btn--primary"
          type="button"
          onClick={handleLogout}
          disabled={busy}
        >
          {busy ? 'Đang đăng xuất...' : 'Đăng xuất'}
        </button>
      </div>
    </div>
  )
}