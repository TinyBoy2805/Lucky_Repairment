import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'
import ScrollToTopButton from '../components/ScrollToTopButton.jsx'

export default function MainLayout() {
  const { pathname, hash } = useLocation()

  // Cuộn trang khi chuyển route hoặc có hash
  useEffect(() => {
    if (hash) {
      const id = hash.replace('#', '')
      const scrollToAnchor = () => {
        const el = document.getElementById(id)
        if (el) {
          el.scrollIntoView({ behavior: 'instant' })
        } else {
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
        }
      }

      // Đợi DOM render sau khi chuyển trang
      const timer = setTimeout(scrollToAnchor, 50)
      return () => clearTimeout(timer)
    }

    // Chuyển route hoặc về trang chủ: cuộn tức thì lên đầu trang, không dùng smooth
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname, hash])

  const isAuthPage = ['/login', '/register', '/forgot-password'].includes(pathname)

  return (
    <div className="home">
      <Navbar />
      <main className="main-content">
        <Outlet />
      </main>
      {!isAuthPage && <Footer />}
      <ScrollToTopButton />
    </div>
  )
}
