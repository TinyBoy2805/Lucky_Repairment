import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import { useAuth } from '../context/useAuth.js'
import { homeFor, ROLE_LABEL } from '../lib/roles.js'

export default function DashboardLayout({ roleLabel, children, sidebar }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  const role = user?.role
  const label = roleLabel ?? ROLE_LABEL[role] ?? 'Người dùng'

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
    <div className="dashboard">
      <header className="dashboard__topbar">
        <Link to={homeFor(role)} aria-label="Về trang chính của bạn">
          <Logo />
        </Link>

        <span className="dashboard__role">{label}</span>

        <Link
          to="/"
          className="btn btn--outline btn--sm"
          style={{ textDecoration: 'none', marginLeft: 12 }}
        >
          Trang chủ
        </Link>

        <div className="dashboard__spacer" />

        <div className="dashboard__user">
          <strong>{user?.displayName || user?.email || '—'}</strong>
          <span>{user?.displayName ? user?.email : label}</span>
        </div>

        <button
          className="btn btn--outline btn--sm"
          type="button"
          onClick={handleLogout}
          disabled={busy}
        >
          {busy ? 'Đang đăng xuất...' : 'Đăng xuất'}
        </button>

        <span className="dashboard__avatar" title={user?.email ?? 'Tài khoản'}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </span>
      </header>

      {sidebar ? (
        <div className="dashboard__body">
          <aside className="dashboard__sidebar">{sidebar}</aside>
          <main className="dashboard__content">{children}</main>
        </div>
      ) : (
        <main className="dashboard__content">{children}</main>
      )}
    </div>
  )
}
