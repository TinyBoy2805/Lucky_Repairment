import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { adminApi } from '../lib/admin.js'

const LINKS = [
  { to: '/admin', label: 'Tổng quan', end: true },
  { to: '/admin/accounts', label: 'Tài khoản' },
  { to: '/admin/orders', label: 'Đơn hàng', badge: 'pendingOrders' },
  { to: '/admin/categories', label: 'Danh mục' },
  { to: '/admin/ratings', label: 'Đánh giá' },
  { to: '/admin/payments', label: 'Thanh toán' },
  { to: '/admin/wallet', label: 'Ví & giao dịch' },
  { to: '/admin/reports', label: 'Báo cáo', badge: 'openReports' },
  { to: '/admin/availability', label: 'Lịch làm việc' },
  { to: '/admin/pricing', label: 'Cấu hình giá' },
]

export default function AdminNav() {
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    adminApi
      .summary()
      .then((data) => setSummary(data.summary))
      .catch(() => setSummary(null))
  }, [])

  return (
    <nav className="admin-nav">
      {LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) =>
            isActive ? 'admin-nav__link is-active' : 'admin-nav__link'
          }
        >
          <span>{link.label}</span>
          {link.badge && summary?.[link.badge] > 0 && (
            <span className="admin-nav__badge">{summary[link.badge]}</span>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
