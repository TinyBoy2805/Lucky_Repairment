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
              Dịch vụ sửa chữa điện nước tại nhà 24/7
            </div>
            <h1 className="home-hero__title">
              Đặt Lịch Sửa Chữa <span>Điện & Nước</span> Nhanh Chóng, Tận Nơi
            </h1>
            <p className="home-hero__desc">
              Đội ngũ kỹ thuật viên lành nghề, có mặt chỉ sau 15–30 phút. Báo giá công khai,
              minh bạch trước khi sửa chữa, không phát sinh phụ phí và bảo hành dài hạn.
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

            <div className="home-hero__stats">
              <div className="home-stat">
                <strong>15–30p</strong>
                <span>Có mặt tại nhà</span>
              </div>
              <div className="home-stat__divider" />
              <div className="home-stat">
                <strong>10.000+</strong>
                <span>Đơn hoàn thành</span>
              </div>
              <div className="home-stat__divider" />
              <div className="home-stat">
                <strong>100%</strong>
                <span>Báo giá trước</span>
              </div>
              <div className="home-stat__divider" />
              <div className="home-stat">
                <strong>12 tháng</strong>
                <span>Bảo hành chu đáo</span>
              </div>
            </div>
          </div>

          <div className="home-hero__card-box">
            <div className="home-hero-card">
              <div className="home-hero-card__header">
                <h3>⚡ Bảng Gọi Thợ Cấp Tốc</h3>
                <span className="home-hero-card__badge">Trực tuyến</span>
              </div>
              <p className="home-hero-card__text">
                Gặp sự cố chập điện, vỡ ống nước, máy bơm hỏng? Nhấn gửi yêu cầu, thợ gần nhất sẽ tiếp nhận đơn ngay.
              </p>

              <div className="home-quick-tags">
                <span className="home-quick-tag">🔥 Chập cháy điện</span>
                <span className="home-quick-tag">💧 Vỡ đường ống nước</span>
                <span className="home-quick-tag">🚽 Tắc cống / Bồn cầu</span>
                <span className="home-quick-tag">⚙️ Lắp đặt máy bơm</span>
                <span className="home-quick-tag">💡 Thay bóng & ổ cắm</span>
                <span className="home-quick-tag">🚿 Lắp bình nóng lạnh</span>
              </div>

              <div className="home-hero-card__footer">
                <button
                  type="button"
                  className="btn btn--primary btn--block"
                  onClick={handleBookingClick}
                >
                  Gửi yêu cầu ngay →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Services Section ===== */}
      <section id="services" className="home-section">
        <div className="home-container">
          <div className="home-section__header">
            <span className="home-section__subtitle">Dịch vụ chúng tôi cung cấp</span>
            <h2 className="home-section__title">Chuyên Sâu Điện & Nước Dân Dụng</h2>
            <p className="home-section__desc">
              Đầy đủ các giải pháp xử lý sự cố khẩn cấp cũng như thi công, bảo trì và lắp đặt thiết bị gia đình.
            </p>
          </div>

          <div className="home-services-grid">
            {/* Service 1: Điện */}
            <div className="service-card">
              <div className="service-card__icon service-card__icon--electric">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <h3 className="service-card__title">Sửa Chữa Hệ Thống Điện</h3>
              <p className="service-card__desc">
                Xử lý an toàn các rủi ro nguy hiểm về nguồn điện sinh hoạt, đảm bảo thẩm mỹ và tiêu chuẩn kỹ thuật.
              </p>
              <ul className="service-card__items">
                <li>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Xử lý chập điện, nhảy aptomat liên tục, mất điện từng phòng
                </li>
                <li>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Thay thế, lắp đặt bóng đèn led, đèn chùm, công tắc, ổ cắm
                </li>
                <li>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Lắp quạt trần, quạt hút mùi, đi dây điện âm tường / nổi
                </li>
                <li>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Lắp tủ điện, cầu dao chống rò giật RCBO an toàn cho trẻ nhỏ
                </li>
              </ul>
              <div className="service-card__foot">
                <button
                  type="button"
                  className="btn btn--outline btn--sm btn--block"
                  onClick={handleBookingClick}
                >
                  Đặt thợ sửa điện →
                </button>
              </div>
            </div>

            {/* Service 2: Nước */}
            <div className="service-card">
              <div className="service-card__icon service-card__icon--water">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                </svg>
              </div>
              <h3 className="service-card__title">Sửa Chữa Hệ Thống Nước</h3>
              <p className="service-card__desc">
                Khắc phục triệt để tình trạng rò rỉ, thất thoát nước, mất nước hoặc tắc nghẽn đường ống sinh hoạt.
              </p>
              <ul className="service-card__items">
                <li>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Dò tìm và sửa rò rỉ, bục vỡ đường ống cấp & thoát nước ngầm
                </li>
                <li>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Thông tắc bồn cầu, chậu rửa bát, thoát sàn, đường cống nghẹt
                </li>
                <li>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Sửa chữa máy bơm nước (cháy máy, kêu to, không lên nước)
                </li>
                <li>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Lắp vòi sen tắm, lavabo, bồn rửa chén, bình nước nóng lạnh
                </li>
              </ul>
              <div className="service-card__foot">
                <button
                  type="button"
                  className="btn btn--outline btn--sm btn--block"
                  onClick={handleBookingClick}
                >
                  Đặt thợ sửa nước →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Featured Services Section ===== */}
      <section id="services-featured" className="home-section">
        <div className="home-container">
          <div className="home-section__header">
            <span className="home-section__subtitle">Giải pháp chuyên nghiệp</span>
            <h2 className="home-section__title">Các Gói Dịch Vụ Sửa Chữa Tiêu Biểu</h2>
            <p className="home-section__desc">
              Kỹ thuật viên lành nghề có mặt sau 15–30 phút. Báo giá công khai trước khi làm, kiểm tra miễn phí và bảo hành dài hạn.
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
              Xem tất cả dịch vụ sửa chữa điện nước →
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Process Section ===== */}
      <section id="process" className="home-section home-section--gray">
        <div className="home-container">
          <div className="home-section__header">
            <span className="home-section__subtitle">Các bước thực hiện</span>
            <h2 className="home-section__title">Quy Trình Đặt Lịch & Tiếp Nhận</h2>
            <p className="home-section__desc">
              Đơn giản, nhanh gọn và theo dõi tiến độ trực tiếp ngay trên website.
            </p>
          </div>

          <div className="home-process-grid">
            <div className="process-step">
              <div className="process-step__number">01</div>
              <h3 className="process-step__title">Gửi Yêu Cầu</h3>
              <p className="process-step__desc">
                Điền thông tin sự cố, thiết bị hỏng, địa chỉ và số điện thoại liên hệ qua form đặt lịch.
              </p>
            </div>

            <div className="process-step">
              <div className="process-step__number">02</div>
              <h3 className="process-step__title">Thợ Tiếp Nhận</h3>
              <p className="process-step__desc">
                Kỹ thuật viên gần nhất tiếp nhận đơn, gọi điện xác nhận tình trạng và di chuyển tới nơi.
              </p>
            </div>

            <div className="process-step">
              <div className="process-step__number">03</div>
              <h3 className="process-step__title">Khảo Sát & Báo Giá</h3>
              <p className="process-step__desc">
                Kiểm tra thực tế, đưa ra giải pháp và mức chi phí chi tiết. Khách hàng đồng ý mới tiến hành.
              </p>
            </div>

            <div className="process-step">
              <div className="process-step__number">04</div>
              <h3 className="process-step__title">Nghiệm Thu & Bảo Hành</h3>
              <p className="process-step__desc">
                Chạy thử thiết bị, dọn dẹp hiện trường sạch sẽ, thanh toán và nhận bảo hành chu đáo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Pricing Section ===== */}
      <section id="pricing" className="home-section">
        <div className="home-container">
          <div className="home-section__header">
            <span className="home-section__subtitle">Minh bạch & Rõ ràng</span>
            <h2 className="home-section__title">Bảng Giá Tham Khảo</h2>
            <p className="home-section__desc">
              Cam kết báo đúng giá theo hạng mục thực tế, kiểm tra kỹ càng trước khi bắt đầu.
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
              * Giá trên là tiền công tham khảo, chưa bao gồm vật tư thay thế mới. Bảng giá thực tế có thể thay đổi tùy độ phức tạp của vị trí lắp đặt.
            </div>
          </div>
        </div>
      </section>

      {/* ===== Why Choose Us ===== */}
      <section id="why-us" className="home-section home-section--gray">
        <div className="home-container">
          <div className="home-section__header">
            <span className="home-section__subtitle">An tâm trao gửi</span>
            <h2 className="home-section__title">Vì Sao Chọn Lucky Repairment?</h2>
            <p className="home-section__desc">
              Chúng tôi xây dựng tiêu chuẩn dịch vụ tin cậy để khách hàng luôn yên tâm trong chính ngôi nhà của mình.
            </p>
          </div>

          <div className="why-grid">
            <div className="why-card">
              <div className="why-card__icon">⏱️</div>
              <h3 className="why-card__title">Nhanh Chóng & Kịp Thời</h3>
              <p className="why-card__desc">
                Hệ thống điều phối thợ lân cận giúp kỹ thuật viên có mặt ngay sau 15–30 phút khi nhận được yêu cầu.
              </p>
            </div>

            <div className="why-card">
              <div className="why-card__icon">👨‍🔧</div>
              <h3 className="why-card__title">Thợ Lành Nghề, Thật Thà</h3>
              <p className="why-card__desc">
                Kỹ thuật viên có bằng cấp chuyên môn, kinh nghiệm thực chiến trên 3 năm, lịch sự và trung thực.
              </p>
            </div>

            <div className="why-card">
              <div className="why-card__icon">💰</div>
              <h3 className="why-card__title">Minh Bạch Chi Phí</h3>
              <p className="why-card__desc">
                Kiểm tra lỗi, tư vấn phương án tối ưu và báo giá chi tiết trước. Tuyệt đối không vẽ việc, ép giá.
              </p>
            </div>

            <div className="why-card">
              <div className="why-card__icon">🛡️</div>
              <h3 className="why-card__title">Bảo Hành Dài Hạn</h3>
              <p className="why-card__desc">
                Mọi công việc sửa chữa đều đi kèm chế độ bảo hành chu đáo. Hỗ trợ xử lý lại miễn phí nếu phát sinh lỗi cũ.
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
              Ngôi Nhà Bạn Đang Gặp Vấn Đề Điện Nước?
            </h2>
            <p className="home-cta-box__desc">
              Đừng để chập điện hay rò rỉ nước làm ảnh hưởng đến an toàn và sinh hoạt của gia đình. Đặt lịch ngay hôm nay để được hỗ trợ tốt nhất!
            </p>
            <div className="home-cta-box__actions">
              <button
                type="button"
                className="btn btn--primary btn--lg"
                onClick={handleBookingClick}
              >
                Đặt thợ ngay bây giờ
              </button>
              <a href="tel:19006868" className="btn btn--outline btn--lg">
                Gọi tổng đài: 1900 6868
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
