import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Logo from './Logo.jsx'
import MyBookingsModal from './MyBookingsModal.jsx'
import ProfileModal from './ProfileModal.jsx'
import { useAuth } from '../context/useAuth.js'

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [isBookingsOpen, setIsBookingsOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const dropdownRef = useRef(null)
  const closeTimerRef = useRef(null)

  const handleMouseEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setDropdownOpen(true)
  }

  const handleMouseLeave = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
    }
    closeTimerRef.current = setTimeout(() => {
      setDropdownOpen(false)
    }, 280) // 280ms grace period
  }

  const handleTriggerClick = (e) => {
    e.stopPropagation()
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setDropdownOpen((prev) => !prev)
  }

  // Dọn dẹp timer khi component unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current)
      }
    }
  }, [])

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const [prevPath, setPrevPath] = useState(location.pathname)
  if (prevPath !== location.pathname) {
    setPrevPath(location.pathname)
    setDropdownOpen(false)
  }

  const handleHomeClick = (e) => {
    if (location.pathname === '/') {
      if (window.location.hash || location.hash) {
        e.preventDefault()
        navigate('/', { replace: true })
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }
  }

  const handleAnchorClick = (e, hash) => {
    e.preventDefault()
    if (location.pathname === '/') {
      const el = document.getElementById(hash)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
        window.history.replaceState(null, '', `/#${hash}`)
      }
    } else {
      navigate(`/#${hash}`)
    }
  }

  const isHome = location.pathname === '/'
  const isServices = location.pathname.startsWith('/services')

  const displayName =
    user?.displayName ||
    user?.fullName ||
    (user?.email ? user.email.split('@')[0] : 'Tài khoản')
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <>
      <header className="home-header">
        <div className="home-container home-header__inner">
          <Link
            to="/"
            className="home-header__logo"
            onClick={handleHomeClick}
            aria-label="Trang chủ Lucky Repairment"
          >
            <Logo />
          </Link>

          {/* Danh sách link điều hướng cố định trên mọi trang */}
          <nav className="home-nav" aria-label="Điều hướng chính">
            <Link
              to="/"
              className={`home-nav__link ${isHome ? 'home-nav__link--active' : ''}`}
              onClick={handleHomeClick}
            >
              Trang chủ
            </Link>

            <Link
              to="/services"
              className={`home-nav__link ${isServices ? 'home-nav__link--active' : ''}`}
            >
              Dịch vụ sửa chữa
            </Link>

            <a
              href="/#process"
              className="home-nav__link"
              onClick={(e) => handleAnchorClick(e, 'process')}
            >
              Quy trình
            </a>

            <a
              href="/#pricing"
              className="home-nav__link"
              onClick={(e) => handleAnchorClick(e, 'pricing')}
            >
              Bảng giá
            </a>

            <a
              href="/#why-us"
              className="home-nav__link"
              onClick={(e) => handleAnchorClick(e, 'why-us')}
            >
              Cam kết
            </a>

            <a
              href="/#contact"
              className="home-nav__link"
              onClick={(e) => handleAnchorClick(e, 'contact')}
            >
              Liên hệ
            </a>
          </nav>

          {/* Khu vực hành động & tài khoản */}
          <div className="home-header__actions">
            {user ? (
              <div
                className="home-user-dropdown-wrapper"
                ref={dropdownRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  type="button"
                  className="home-user-trigger"
                  onClick={handleTriggerClick}
                  aria-expanded={dropdownOpen}
                  aria-haspopup="true"
                >
                  <span className="home-user-avatar" aria-hidden="true">
                    {initial}
                  </span>
                  <span className="home-user-name">{displayName}</span>
                  <svg
                    className={`home-user-chevron ${dropdownOpen ? 'home-user-chevron--open' : ''}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    width="14"
                    height="14"
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div
                    className="home-user-dropdown"
                    role="menu"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div className="home-user-dropdown__inner">
                      <div className="home-user-dropdown__header">
                        <span className="home-user-dropdown__avatar">{initial}</span>
                        <div className="home-user-dropdown__meta">
                          <strong className="home-user-dropdown__name">{displayName}</strong>
                          <span className="home-user-dropdown__email">{user.email || 'Khách hàng'}</span>
                        </div>
                      </div>

                      <div className="home-user-dropdown__menu">
                        <button
                          type="button"
                          className="home-user-dropdown__item"
                          onClick={() => {
                            setDropdownOpen(false)
                            setIsBookingsOpen(true)
                          }}
                          role="menuitem"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                          <span>Đơn sửa chữa của tôi</span>
                        </button>

                        <button
                          type="button"
                          className="home-user-dropdown__item"
                          onClick={() => {
                            setDropdownOpen(false)
                            setIsProfileOpen(true)
                          }}
                          role="menuitem"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                          <span>Thông tin tài khoản</span>
                        </button>

                        {user.role === 'admin' && (
                          <Link
                            to="/admin"
                            className="home-user-dropdown__item"
                            onClick={() => setDropdownOpen(false)}
                            role="menuitem"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                              <rect x="3" y="3" width="7" height="7" />
                              <rect x="14" y="3" width="7" height="7" />
                              <rect x="14" y="14" width="7" height="7" />
                              <rect x="3" y="14" width="7" height="7" />
                            </svg>
                            <span>Quản trị hệ thống (Admin)</span>
                          </Link>
                        )}

                        {user.role === 'repairman' && (
                          <Link
                            to="/repairman"
                            className="home-user-dropdown__item"
                            onClick={() => setDropdownOpen(false)}
                            role="menuitem"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                            </svg>
                            <span>Bàn làm việc thợ sửa</span>
                          </Link>
                        )}

                        <div className="home-user-dropdown__divider" />

                        <button
                          type="button"
                          className="home-user-dropdown__item home-user-dropdown__item--danger"
                          onClick={() => {
                            setDropdownOpen(false)
                            logout()
                          }}
                          role="menuitem"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                          </svg>
                          <span>Đăng xuất</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="home-auth-btns">
                <Link
                  to="/login"
                  className={`btn btn--sm ${location.pathname === '/login' ? 'btn--primary' : 'btn--outline'}`}
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className={`btn btn--sm ${location.pathname === '/register' ? 'btn--primary' : 'btn--outline'}`}
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {isBookingsOpen && (
        <MyBookingsModal
          isOpen={isBookingsOpen}
          onClose={() => setIsBookingsOpen(false)}
        />
      )}

      {isProfileOpen && (
        <ProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          user={user}
        />
      )}
    </>
  )
}
