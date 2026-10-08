import { Link, Outlet } from 'react-router-dom'
import Logo from '../components/Logo.jsx'

const FEATURES = [
  {
    title: 'Quản lý yêu cầu dịch vụ',
    desc: 'Tiếp nhận, phân công và theo dõi từng đơn sửa chữa.',
  },
  {
    title: 'Đội ngũ thợ chuyên nghiệp',
    desc: 'Kết nối khách hàng với thợ phù hợp nhất theo khu vực.',
  },
  {
    title: 'Báo cáo theo thời gian thực',
    desc: 'Doanh thu, hiệu suất và đánh giá luôn được cập nhật.',
  },
]

export default function AuthLayout() {
  return (
    <div className="auth">
      <aside className="auth__brand">
        <div className="auth__brand-body">
          <Link to="/" className="auth__brand-logo" aria-label="Về trang chủ Lucky Repairment">
            <Logo light />
          </Link>
          <h2 className="auth__headline">
            Trung tâm quản lý dịch vụ sửa chữa
          </h2>
          <p className="auth__desc">
            Một nền tảng duy nhất để kết nối khách hàng, thợ sửa chữa và đội
            ngũ quản trị — minh bạch, nhanh chóng và dễ theo dõi.
          </p>

          <ul className="auth__features">
            {FEATURES.map((item) => (
              <li key={item.title}>
                <span className="tick">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m5 13 4 4L19 7" />
                  </svg>
                </span>
                <span>
                  <strong>{item.title}</strong>
                  <span>{item.desc}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="auth__brand-footer">© 2026 Lucky Repairment · Hỗ trợ 24/7</p>
      </aside>

      <main className="auth__panel">
        <div className="auth__card">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
