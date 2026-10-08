import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ServiceBookingModal from '../components/ServiceBookingModal.jsx'
import { servicesApi } from '../lib/services.js'

export default function ServiceDetail() {
  const { id } = useParams()

  const [service, setService] = useState(null)
  const [relatedServices, setRelatedServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    let isMounted = true
    window.scrollTo({ top: 0, behavior: 'smooth' })

    const loadData = async () => {
      try {
        const { service: srv } = await servicesApi.get(id)
        if (!isMounted) return
        setService(srv)
        setError('')

        // Tải các dịch vụ liên quan
        const { services: all } = await servicesApi.list({ category: srv.category })
        if (!isMounted) return
        setRelatedServices(all.filter((item) => item.id !== srv.id).slice(0, 3))
      } catch (err) {
        if (!isMounted) return
        setError(err.message || 'Không thể tải thông tin dịch vụ.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadData()
    return () => {
      isMounted = false
    }
  }, [id])

  if (loading) {
    return (
      <div className="page-loading">
        <div className="page-loading__spinner" />
        <p>Đang tải thông tin dịch vụ sửa chữa…</p>
      </div>
    )
  }

  if (error || !service) {
    return (
      <div className="service-detail-page">
        <div className="home-container" style={{ padding: '80px 20px', textAlign: 'center' }}>
          <div className="alert alert--error" style={{ maxWidth: 500, margin: '0 auto 24px' }}>
            {error || 'Dịch vụ không tồn tại.'}
          </div>
          <Link to="/services" className="btn btn--primary">
            ← Quay lại danh mục dịch vụ
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="service-detail-page">
      {/* Main Content */}

      {/* Main Content */}
      <main className="service-detail-main">
        <div className="home-container">
          {/* Breadcrumb */}
          <nav className="breadcrumb" aria-label="Đường dẫn trang">
            <Link to="/">Trang chủ</Link>
            <span>/</span>
            <Link to="/services">Dịch vụ sửa chữa</Link>
            <span>/</span>
            <span className="breadcrumb__current">{service.title}</span>
          </nav>

          {/* Hero View của Dịch vụ */}
          <div className="service-hero-card">
            <div className="service-hero-card__grid">
              <div className="service-hero-card__media">
                <img
                  src={service.image}
                  alt={service.title}
                  className="service-hero-card__img"
                />
                <div className="service-hero-card__badge-time">
                  ⚡ Có mặt sau: <strong>{service.responseTime}</strong>
                </div>
              </div>

              <div className="service-hero-card__content">
                <div className="service-hero-card__tag">
                  {service.category === 'electric' ? '⚡ Sửa chữa điện dân dụng' : '💧 Sửa chữa hệ thống nước'}
                </div>

                <h1 className="service-hero-card__title">{service.title}</h1>

                <div className="service-hero-card__meta">
                  <div className="product-stars">★★★★★</div>
                  <span>5.0 (hơn 500+ khách hàng hài lòng)</span>
                  <span className="service-warranty-tag">🛡️ Bảo hành {service.warranty}</span>
                </div>

                <div className="service-hero-price-box">
                  <div>
                    <span className="service-hero-price-label">Chi phí tham khảo:</span>
                    <strong className="service-hero-price-val">{service.priceDisplay}</strong>
                  </div>
                  <span className="service-hero-price-sub">
                    * Thợ khảo sát trực tiếp, giải thích nguyên nhân và báo giá rõ ràng. Khách đồng ý mới làm.
                  </span>
                </div>

                <p className="service-hero-card__desc">{service.description}</p>

                <div className="service-hero-actions">
                  <button
                    type="button"
                    className="btn btn--primary btn--lg service-btn-book"
                    onClick={() => setIsModalOpen(true)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    Đặt lịch sửa dịch vụ này ngay
                  </button>

                  <a href="tel:19006868" className="btn btn--outline btn--lg">
                    📞 Gọi thợ khẩn cấp: 1900 6868
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Ưu điểm dịch vụ */}
          <div className="service-perks-grid">
            <div className="service-perk-card">
              <span className="service-perk-card__icon">⏱️</span>
              <h4>Nhanh Chóng Tận Nơi</h4>
              <p>Thợ tại khu vực gần nhất có mặt sau 15–30 phút.</p>
            </div>
            <div className="service-perk-card">
              <span className="service-perk-card__icon">💰</span>
              <h4>Báo Giá Công Khai</h4>
              <p>Khảo sát miễn phí, báo giá trước, không vẽ thêm việc.</p>
            </div>
            <div className="service-perk-card">
              <span className="service-perk-card__icon">👨‍🔧</span>
              <h4>Kỹ Thuật Lành Nghề</h4>
              <p>Được đào tạo bài bản, trung thực, lý lịch rõ ràng.</p>
            </div>
            <div className="service-perk-card">
              <span className="service-perk-card__icon">🛡️</span>
              <h4>Bảo Hành Chu Đáo</h4>
              <p>Bảo hành {service.warranty}, hỗ trợ sửa lại miễn phí.</p>
            </div>
          </div>

          {/* Dấu hiệu sự cố cần gọi thợ */}
          <div className="service-section-box">
            <div className="service-section-box__header">
              <span className="home-section__subtitle">Dấu hiệu nhận biết</span>
              <h2>Các Sự Cố Cần Gọi Thợ Ngay</h2>
              <p>Nếu bạn gặp một trong các tình huống dưới đây, hãy liên hệ ngay để tránh nguy hiểm:</p>
            </div>

            <div className="service-signs-list">
              {service.signs?.map((sign, idx) => (
                <div key={idx} className="service-sign-item">
                  <span className="service-sign-item__icon">⚠️</span>
                  <p>{sign}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bảng giá chi tiết dịch vụ */}
          <div className="service-section-box">
            <div className="service-section-box__header">
              <span className="home-section__subtitle">Minh bạch chi phí</span>
              <h2>Bảng Giá Chi Tiết Hạng Mục</h2>
              <p>Bảng giá tiền công sửa chữa tham khảo cho dịch vụ này:</p>
            </div>

            <div className="pricing-table-card">
              <div className="pricing-table-wrap">
                <table className="pricing-table">
                  <thead>
                    <tr>
                      <th>Hạng mục công việc</th>
                      <th>Đơn vị tính</th>
                      <th>Giá tham khảo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {service.priceList?.map((p, idx) => (
                      <tr key={idx}>
                        <td><strong>{p.item}</strong></td>
                        <td>{p.unit}</td>
                        <td><span className="price-tag">{p.price}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Quy trình thực hiện */}
          <div className="service-section-box">
            <div className="service-section-box__header">
              <span className="home-section__subtitle">Quy chuẩn chuyên nghiệp</span>
              <h2>Quy Trình Xử Lý 4 Bước Của Thợ</h2>
            </div>

            <div className="home-process-grid">
              {service.process?.map((step) => (
                <div key={step.step} className="process-step">
                  <div className="process-step__number">0{step.step}</div>
                  <h3 className="process-step__title">{step.title}</h3>
                  <p className="process-step__desc">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Banner cuối trang */}
          <div className="home-cta-box" style={{ margin: '48px 0' }}>
            <h2 className="home-cta-box__title">
              Cần Thợ Sửa {service.categoryName} Ngay Hôm Nay?
            </h2>
            <p className="home-cta-box__desc">
              Đừng để sự cố làm gián đoạn sinh hoạt của gia đình. Đặt lịch ngay để kỹ thuật viên tới kiểm tra và khắc phục kịp thời!
            </p>
            <div className="home-cta-box__actions">
              <button
                type="button"
                className="btn btn--primary btn--lg"
                onClick={() => setIsModalOpen(true)}
              >
                Đặt thợ ngay bây giờ
              </button>
              <a href="tel:19006868" className="btn btn--outline btn--lg">
                Gọi tổng đài: 1900 6868
              </a>
            </div>
          </div>

          {/* Dịch vụ liên quan */}
          {relatedServices.length > 0 && (
            <div className="related-services-section">
              <h2 className="related-products-title">Dịch Vụ Sửa Chữa Khác Bạn Có Thể Cần</h2>
              <div className="services-grid">
                {relatedServices.map((srv) => (
                  <div key={srv.id} className="service-item-card">
                    <img src={srv.image} alt={srv.title} className="service-item-card__img" />
                    <div className="service-item-card__body">
                      <span className="service-item-card__badge">
                        {srv.category === 'electric' ? '⚡ Điện' : '💧 Nước'}
                      </span>
                      <h3 className="service-item-card__title">
                        <Link to={`/services/${srv.id}`}>{srv.title}</Link>
                      </h3>
                      <p className="service-item-card__desc">{srv.shortDesc}</p>
                      <div className="service-item-card__price">
                        <span>Giá từ:</span>
                        <strong>{srv.priceDisplay}</strong>
                      </div>
                    </div>
                    <div className="service-item-card__foot">
                      <Link to={`/services/${srv.id}`} className="btn btn--outline btn--sm btn--block">
                        Xem chi tiết dịch vụ →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Booking Modal */}
      <ServiceBookingModal
        service={service}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}
