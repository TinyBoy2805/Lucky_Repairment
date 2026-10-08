import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ServiceBookingModal from '../components/ServiceBookingModal.jsx'
import { servicesApi } from '../lib/services.js'

export default function Home() {
  const navigate = useNavigate()
  const [featuredServices, setFeaturedServices] = useState([])
  const [selectedService, setSelectedService] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    servicesApi
      .list()
      .then((data) => setFeaturedServices((data.services || []).slice(0, 4)))
      .catch((err) => console.warn('Không thể tải dịch vụ nổi bật:', err))
  }, [])

  const handleBookingClick = () => {
    const el = document.getElementById('services-featured')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    } else {
      navigate('/services')
    }
  }

  return (
    <>

      {/* ===== Hero Section ===== */}
      <section className="home-hero">
        <div className="home-container home-hero__inner">
          <div className="home-hero__content">
            <div className="home-badge">
              <span className="home-badge__dot" />
              Sửa chữa điện nước tại nhà 24/7
            </div>
            <h1 className="home-hero__title">
              Đặt Lịch Sửa Chữa <span>Điện & Nước</span> Nhanh Chóng
            </h1>
            <p className="home-hero__desc">
              Kỹ thuật viên có mặt sau 15–30 phút. Báo giá công khai trước khi sửa chữa, không phát sinh phụ phí và bảo hành dài hạn.
            </p>

            <div className="home-hero__cta">
              <button
                type="button"
                className="btn btn--primary home-hero__btn-main"
                onClick={handleBookingClick}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  width="20"
                  height="20"
                  aria-hidden="true"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Đặt lịch sửa ngay
              </button>

              <a href="tel:19006868" className="btn btn--outline home-hero__btn-call">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  width="18"
                  height="18"
                  aria-hidden="true"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                Hotline: 1900 6868
              </a>
            </div>
          </div>

          <div className="home-hero__card-box">
            <div className="home-hero-card">
              <div className="home-hero-card__header">
                <h3>Gọi Thợ Nhanh</h3>
              </div>
              <p className="home-hero-card__text">
                Chọn sự cố thường gặp để yêu cầu hỗ trợ:
              </p>

              <div className="home-quick-tags">
                <span className="home-quick-tag">Chập cháy điện</span>
                <span className="home-quick-tag">Bục vỡ ống nước</span>
                <span className="home-quick-tag">Tắc bồn cầu & cống</span>
                <span className="home-quick-tag">Sửa máy bơm nước</span>
                <span className="home-quick-tag">Thay aptomat & ổ cắm</span>
                <span className="home-quick-tag">Sửa bình nóng lạnh</span>
              </div>

              <div className="home-hero-card__footer">
                <button
                  type="button"
                  className="btn btn--primary btn--block"
                  onClick={handleBookingClick}
                >
                  Gửi yêu cầu ngay
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Services Section ===== */}
      <section id="services" className="home-section">
        <div id="services-featured" className="home-container">
          <div className="home-section__header">
            <h2 className="home-section__title">Dịch Vụ Sửa Chữa Tiêu Biểu</h2>
            <p className="home-section__desc">
              Kỹ thuật viên lành nghề có mặt sau 15–30 phút. Báo giá công khai trước khi làm, bảo hành dài hạn.
            </p>
          </div>

          {featuredServices.length > 0 && (
            <div className="services-grid" style={{ marginBottom: 36 }}>
              {featuredServices.map((srv) => (
                <div key={srv.id} className="service-item-card">
                  <div className="service-item-card__thumb">
                    <img src={srv.image} alt={srv.title} />
                    <span className="service-item-card__badge">
                      {srv.category === 'electric' ? 'Điện' : 'Nước'}
                    </span>
                    <span className="service-item-card__badge-time">
                      15–30 phút
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
                      onClick={() => {
                        setSelectedService(srv)
                        setIsModalOpen(true)
                      }}
                    >
                      Đặt lịch ngay
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ textAlign: 'center' }}>
            <Link to="/services" className="btn btn--outline btn--lg">
              Xem tất cả dịch vụ sửa chữa →
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Process Section ===== */}
      <section id="process" className="home-section home-section--gray">
        <div className="home-container">
          <div className="home-section__header">
            <h2 className="home-section__title">Quy Trình Làm Việc</h2>
            <p className="home-section__desc">
              4 bước đơn giản từ tiếp nhận đến bảo hành.
            </p>
          </div>

          <div className="home-process-grid">
            <div className="process-step">
              <div className="process-step__number">01</div>
              <h3 className="process-step__title">Gửi Yêu Cầu</h3>
              <p className="process-step__desc">
                Chọn dịch vụ và điền thông tin sự cố, địa chỉ cần sửa chữa.
              </p>
            </div>

            <div className="process-step">
              <div className="process-step__number">02</div>
              <h3 className="process-step__title">Tiếp Nhận Đơn</h3>
              <p className="process-step__desc">
                Kỹ thuật viên gọi xác nhận và có mặt sau 15–30 phút.
              </p>
            </div>

            <div className="process-step">
              <div className="process-step__number">03</div>
              <h3 className="process-step__title">Khảo Sát & Báo Giá</h3>
              <p className="process-step__desc">
                Kiểm tra thực tế và báo giá chi tiết, khách đồng ý mới làm.
              </p>
            </div>

            <div className="process-step">
              <div className="process-step__number">04</div>
              <h3 className="process-step__title">Nghiệm Thu & Bảo Hành</h3>
              <p className="process-step__desc">
                Vận hành thử thiết bị, dọn dẹp sạch sẽ và kích hoạt bảo hành.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Pricing Section ===== */}
      <section id="pricing" className="home-section">
        <div className="home-container">
          <div className="home-section__header">
            <h2 className="home-section__title">Bảng Giá Tham Khảo</h2>
            <p className="home-section__desc">
              Báo đúng giá theo hạng mục thực tế, kiểm tra kỹ lưỡng trước khi bắt đầu.
            </p>
          </div>

          <div className="pricing-table-card">
            <div className="pricing-table-wrap">
              <table className="pricing-table">
                <thead>
                  <tr>
                    <th>Hạng mục dịch vụ</th>
                    <th>Đơn vị tính</th>
                    <th>Giá tham khảo</th>
                    <th>Bảo hành</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Kiểm tra & khảo sát sự cố điện/nước</strong></td>
                    <td>Lần</td>
                    <td><span className="price-tag">50.000đ - 100.000đ</span> (Miễn phí nếu sửa)</td>
                    <td>—</td>
                  </tr>
                  <tr>
                    <td>Khắc phục sự cố chập điện, mất điện cục bộ</td>
                    <td>Điểm / Lần</td>
                    <td><span className="price-tag">từ 200.000đ</span></td>
                    <td>3 - 6 tháng</td>
                  </tr>
                  <tr>
                    <td>Thay lắp aptomat, cầu dao tự động (chống giật)</td>
                    <td>Cái</td>
                    <td><span className="price-tag">80.000đ - 150.000đ</span></td>
                    <td>6 tháng</td>
                  </tr>
                  <tr>
                    <td>Lắp đặt bóng đèn, công tắc, ổ cắm</td>
                    <td>Điểm</td>
                    <td><span className="price-tag">60.000đ - 120.000đ</span></td>
                    <td>6 tháng</td>
                  </tr>
                  <tr>
                    <td>Lắp đặt quạt trần, quạt hút thông gió</td>
                    <td>Chiếc</td>
                    <td><span className="price-tag">150.000đ - 250.000đ</span></td>
                    <td>6 tháng</td>
                  </tr>
                  <tr>
                    <td>Xử lý rò rỉ nước, bục vỡ đường ống lộ/ngầm</td>
                    <td>Điểm</td>
                    <td><span className="price-tag">từ 150.000đ</span></td>
                    <td>6 - 12 tháng</td>
                  </tr>
                  <tr>
                    <td>Thông tắc bồn cầu, chậu rửa bát, thoát sàn</td>
                    <td>Lần</td>
                    <td><span className="price-tag">250.000đ - 450.000đ</span></td>
                    <td>1 - 3 tháng</td>
                  </tr>
                  <tr>
                    <td>Lắp đặt hoặc sửa chữa máy bơm nước</td>
                    <td>Máy</td>
                    <td><span className="price-tag">200.000đ - 350.000đ</span></td>
                    <td>3 - 6 tháng</td>
                  </tr>
                  <tr>
                    <td>Lắp đặt bình nước nóng lạnh gia đình</td>
                    <td>Bộ</td>
                    <td><span className="price-tag">200.000đ - 300.000đ</span></td>
                    <td>6 tháng</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="pricing-note">
              * Giá trên là tiền công tham khảo, chưa bao gồm vật tư thay thế mới.
            </div>
          </div>
        </div>
      </section>

      {/* ===== Why Choose Us ===== */}
      <section id="why-us" className="home-section home-section--gray">
        <div className="home-container">
          <div className="home-section__header">
            <h2 className="home-section__title">Cam Kết Dịch Vụ</h2>
            <p className="home-section__desc">
              Tiêu chuẩn phục vụ chuyên nghiệp, an tâm cho mọi gia đình.
            </p>
          </div>

          <div className="why-grid">
            <div className="why-card">
              <div className="why-card__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h3 className="why-card__title">Có Mặt Nhanh</h3>
              <p className="why-card__desc">
                Thợ có mặt sau 15–30 phút kể từ khi xác nhận đơn.
              </p>
            </div>

            <div className="why-card">
              <div className="why-card__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
              </div>
              <h3 className="why-card__title">Thợ Lành Nghề</h3>
              <p className="why-card__desc">
                Kỹ thuật viên giàu kinh nghiệm, lịch sự và trung thực.
              </p>
            </div>

            <div className="why-card">
              <div className="why-card__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <h3 className="why-card__title">Báo Giá Trước</h3>
              <p className="why-card__desc">
                Khảo sát và báo giá công khai trước khi sửa chữa.
              </p>
            </div>

            <div className="why-card">
              <div className="why-card__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3 className="why-card__title">Bảo Hành Chu Đáo</h3>
              <p className="why-card__desc">
                Cam kết bảo hành từ 3 đến 12 tháng tùy hạng mục.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Call To Action Box ===== */}
      <section className="home-cta-section">
        <div className="home-container">
          <div className="home-cta-box">
            <h2 className="home-cta-box__title">
              Cần Thợ Sửa Chữa Điện Nước?
            </h2>
            <p className="home-cta-box__desc">
              Đặt lịch trực tuyến hoặc liên hệ hotline để được hỗ trợ nhanh chóng.
            </p>
            <div className="home-cta-box__actions">
              <button
                type="button"
                className="btn btn--primary btn--lg"
                onClick={handleBookingClick}
              >
                Đặt thợ ngay
              </button>
              <a href="tel:19006868" className="btn btn--outline btn--lg">
                Hotline: 1900 6868
              </a>
            </div>
          </div>
        </div>
      </section>

      {selectedService && (
        <ServiceBookingModal
          service={selectedService}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  )
}
