import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ServiceBookingModal from '../components/ServiceBookingModal.jsx'
import { servicesApi } from '../lib/services.js'

export default function Services() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [category, setCategory] = useState('all') // 'all' | 'electric' | 'water'
  const [search, setSearch] = useState('')

  const [selectedService, setSelectedService] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const loadServices = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await servicesApi.list({ category, search })
      setServices(data.services || [])
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách dịch vụ.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadServices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    loadServices()
  }

  const handleQuickBook = (srv) => {
    setSelectedService(srv)
    setIsModalOpen(true)
  }

  return (
    <div className="services-catalog-page">
      {/* Banner */}
      <div className="products-hero-banner">
        <div className="home-container">
          <div className="products-hero-banner__content">
            <span className="home-badge">Thợ có mặt sau 15–30 phút • Báo giá minh bạch</span>
            <h1>Dịch Vụ Sửa Chữa Điện Nước Tại Nhà</h1>
            <p>
              Khắc phục triệt để mọi sự cố điện dân dụng, rò rỉ bục vỡ nước ngầm, máy bơm, bình nóng lạnh, cống nghẹt. Kỹ thuật viên tay nghề cao, phục vụ 24/7.
            </p>
          </div>
        </div>
      </div>

      <div className="home-container products-page-body">
        {/* Toolbar lọc & tìm kiếm */}
        <div className="products-toolbar">
          <div className="products-categories-tabs">
            <button
              type="button"
              className={`products-cat-btn ${category === 'all' ? 'products-cat-btn--active' : ''}`}
              onClick={() => setCategory('all')}
            >
              Tất cả dịch vụ
            </button>
            <button
              type="button"
              className={`products-cat-btn ${category === 'electric' ? 'products-cat-btn--active' : ''}`}
              onClick={() => setCategory('electric')}
            >
              ⚡ Sửa chữa điện ({services.filter((s) => s.category === 'electric').length || '…'})
            </button>
            <button
              type="button"
              className={`products-cat-btn ${category === 'water' ? 'products-cat-btn--active' : ''}`}
              onClick={() => setCategory('water')}
            >
              💧 Sửa chữa nước ({services.filter((s) => s.category === 'water').length || '…'})
            </button>
          </div>

          <form onSubmit={handleSearchSubmit} className="products-search-form">
            <input
              type="text"
              placeholder="Tìm theo sự cố (chập điện, máy bơm, rò rỉ...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="btn btn--primary btn--sm">
              Tìm kiếm
            </button>
          </form>
        </div>

        {error && (
          <div className="alert alert--error" style={{ marginBottom: 24 }}>
            <span>{error}</span>
          </div>
        )}

        {/* Danh sách dịch vụ */}
        {loading ? (
          <div className="page-loading" style={{ minHeight: '300px' }}>
            <div className="page-loading__spinner" />
            <p>Đang tải danh sách dịch vụ…</p>
          </div>
        ) : services.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ fontSize: 18, color: '#64748b', marginBottom: 16 }}>
              Không tìm thấy dịch vụ phù hợp với từ khóa của bạn.
            </p>
            <button
              type="button"
              className="btn btn--outline"
              onClick={() => {
                setCategory('all')
                setSearch('')
                loadServices()
              }}
            >
              Xem tất cả dịch vụ
            </button>
          </div>
        ) : (
          <div className="services-grid">
            {services.map((srv) => (
              <div key={srv.id} className="service-item-card">
                <div className="service-item-card__thumb">
                  <img src={srv.image} alt={srv.title} />
                  <span className="service-item-card__badge">
                    {srv.category === 'electric' ? 'Điện' : 'Nước'}
                  </span>
                  <span className="service-item-card__badge-time">
                    ⚡ 15–30 phút
                  </span>
                </div>

                <div className="service-item-card__body">
                  <span className="service-item-card__cat-label">{srv.categoryName}</span>
                  <h3 className="service-item-card__title">
                    <Link to={`/services/${srv.id}`}>{srv.title}</Link>
                  </h3>
                  <p className="service-item-card__desc">{srv.shortDesc}</p>
                  <div className="service-item-card__price">
                    <span>Giá tham khảo:</span>
                    <strong>{srv.priceDisplay}</strong>
                  </div>
                </div>

                <div className="service-item-card__foot">
                  <Link
                    to={`/services/${srv.id}`}
                    className="btn btn--outline btn--sm"
                  >
                    Xem chi tiết
                  </Link>
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={() => handleQuickBook(srv)}
                  >
                    Đặt lịch ngay
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {selectedService && (
        <ServiceBookingModal
          service={selectedService}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  )
}
