import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { servicesApi } from '../lib/services.js'

const TIME_SLOTS = [
  '08:00 - 10:00 (Sáng)',
  '10:00 - 12:00 (Trưa)',
  '14:00 - 16:00 (Chiều)',
  '16:00 - 18:00 (Chiều muộn)',
  '18:00 - 20:00 (Tối)',
]

export default function ServiceBookingModal({ service, isOpen, onClose, onSuccess }) {
  const { user } = useAuth()

  const [urgent, setUrgent] = useState(true)
  const [appointmentDate, setAppointmentDate] = useState('Hôm nay')
  const [appointmentTime, setAppointmentTime] = useState(TIME_SLOTS[0])

  const [form, setForm] = useState({
    customerName: user?.displayName || user?.fullName || '',
    phone: user?.phone || '',
    address: '',
    issue: '',
    notes: '',
  })

  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [createdRequest, setCreatedRequest] = useState(null)
  const [submitError, setSubmitError] = useState('')

  if (!isOpen || !service) return null

  const update = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!user) {
      setSubmitError('Vui lòng đăng nhập để gửi yêu cầu đặt lịch sửa chữa.')
      return
    }

    const nextErrors = {}
    if (!form.customerName.trim()) nextErrors.customerName = 'Vui lòng nhập họ và tên của bạn.'
    if (!form.phone.trim()) nextErrors.phone = 'Vui lòng nhập số điện thoại để thợ liên hệ.'
    if (!form.address.trim()) nextErrors.address = 'Vui lòng nhập địa chỉ cần sửa chữa.'
    if (!form.issue.trim()) nextErrors.issue = 'Vui lòng mô tả sơ lược tình trạng hư hỏng.'

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setBusy(true)
    setSubmitError('')

    try {
      const payload = {
        serviceId: service.id,
        serviceName: service.title,
        device: service.categoryName,
        customerName: form.customerName.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        issue: form.issue.trim(),
        notes: form.notes.trim(),
        estimatedPrice: service.startingPrice,
        appointmentDate: urgent ? 'Hôm nay (Cấp tốc)' : appointmentDate,
        appointmentTime: urgent ? 'Có mặt sau 15–30 phút' : appointmentTime,
      }

      const res = await servicesApi.book(payload)
      setCreatedRequest(res.request)
      if (onSuccess) onSuccess(res.request)
    } catch (err) {
      setSubmitError(err.message || 'Không thể gửi yêu cầu đặt lịch. Vui lòng thử lại.')
    } finally {
      setBusy(false)
    }
  }

  const handleClose = () => {
    setCreatedRequest(null)
    setSubmitError('')
    onClose()
  }

  return (
    <div className="order-modal-backdrop" onClick={handleClose}>
      <div className="order-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="order-modal__close"
          onClick={handleClose}
          aria-label="Đóng"
        >
          ✕
        </button>

        {!user ? (
          <div className="order-modal__body" style={{ textAlign: 'center', padding: '36px 24px' }}>
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: '50%',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 16px',
                border: '1px solid #bfdbfe',
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="32"
                height="32"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: 8, color: '#1e293b' }}>
              Yêu Cầu Đăng Nhập
            </h3>

            <p style={{ fontSize: '14.5px', color: '#64748b', maxWidth: 420, margin: '0 auto 20px', lineHeight: 1.5 }}>
              Quý khách vui lòng đăng nhập tài khoản để đặt lịch <strong>{service.title}</strong>, theo dõi thợ tới sửa chữa và lưu trữ bảo hành.
            </p>

            <div
              className="order-summary-box"
              style={{ maxWidth: 420, margin: '0 auto 24px', textAlign: 'left' }}
            >
              <img
                src={service.image}
                alt={service.title}
                className="order-summary-box__img"
              />
              <div className="order-summary-box__info">
                <h4 className="order-summary-box__name">{service.title}</h4>
                <div className="order-summary-box__meta">
                  <span>Giá từ: <strong className="text-brand">{service.priceDisplay}</strong></span>
                  <span>Bảo hành: <strong>{service.warranty}</strong></span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 320, margin: '0 auto' }}>
              <Link
                to="/login"
                state={{ returnTo: window.location.pathname }}
                className="btn btn--primary btn--block"
                onClick={handleClose}
              >
                Đăng nhập ngay
              </Link>
              <Link
                to="/register"
                state={{ returnTo: window.location.pathname }}
                className="btn btn--outline btn--block"
                onClick={handleClose}
              >
                Chưa có tài khoản? Đăng ký
              </Link>
            </div>
          </div>
        ) : createdRequest ? (
          <div className="order-success">
            <div className="order-success__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="order-success__title">Đặt Lịch Thành Công!</h3>
            <p className="order-success__desc">
              Yêu cầu <strong>{service.title}</strong> của quý khách đã được tiếp nhận. Kỹ thuật viên sẽ gọi tới số điện thoại <strong>{createdRequest.customerPhone || createdRequest.phone}</strong> trong vòng 5 phút để xác nhận và di chuyển tới nơi.
            </p>

            <div className="order-success__info">
              <div>
                <span>Mã yêu cầu:</span>
                <strong>#{createdRequest.id}</strong>
              </div>
              <div>
                <span>Thời gian hẹn:</span>
                <strong className="text-brand">
                  {createdRequest.appointmentDate} • {createdRequest.appointmentTime}
                </strong>
              </div>
              <div>
                <span>Địa chỉ:</span>
                <span>{createdRequest.address}</span>
              </div>
              <div>
                <span>Chi phí tham khảo:</span>
                <span>{service.priceDisplay} (Báo giá chuẩn sau khảo sát)</span>
              </div>
            </div>

            <div className="order-success__actions">
              <button type="button" className="btn btn--primary" onClick={handleClose}>
                Hoàn tất
              </button>
            </div>
          </div>
        ) : (
          <div className="order-modal__body">
            <div className="order-modal__header">
              <h3>Đặt Lịch Sửa Chữa</h3>
              <p>Thợ chuyên nghiệp có mặt đúng hẹn, báo giá minh bạch trước khi sửa.</p>
            </div>

            {submitError && (
              <div className="alert alert--error" role="alert" style={{ marginBottom: 16 }}>
                <span>{submitError}</span>
              </div>
            )}

            {/* Hộp tóm tắt dịch vụ */}
            <div className="order-summary-box">
              <img
                src={service.image}
                alt={service.title}
                className="order-summary-box__img"
              />
              <div className="order-summary-box__info">
                <h4 className="order-summary-box__name">{service.title}</h4>
                <div className="order-summary-box__meta">
                  <span>Giá từ: <strong className="text-brand">{service.priceDisplay}</strong></span>
                  <span>Bảo hành: <strong>{service.warranty}</strong></span>
                </div>
                <div className="order-summary-box__install" style={{ color: '#16a34a' }}>
                  Có mặt sau {service.responseTime}
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="order-form">
              <div className="order-form__grid">
                <div className="field">
                  <label htmlFor="customerName">Họ và tên của bạn *</label>
                  <div className="field__control">
                    <input
                      id="customerName"
                      type="text"
                      placeholder="VD: Nguyễn Văn A"
                      value={form.customerName}
                      onChange={(e) => update('customerName', e.target.value)}
                    />
                  </div>
                  {errors.customerName && (
                    <span className="field__error">{errors.customerName}</span>
                  )}
                </div>

                <div className="field">
                  <label htmlFor="servicePhone">Số điện thoại liên hệ *</label>
                  <div className="field__control">
                    <input
                      id="servicePhone"
                      type="tel"
                      placeholder="VD: 0912 345 678"
                      value={form.phone}
                      onChange={(e) => update('phone', e.target.value)}
                    />
                  </div>
                  {errors.phone && <span className="field__error">{errors.phone}</span>}
                </div>
              </div>

              <div className="field">
                <label htmlFor="serviceAddress">Địa chỉ thợ đến sửa chữa *</label>
                <div className="field__control">
                  <input
                    id="serviceAddress"
                    type="text"
                    placeholder="Số nhà, ngõ, tên đường, phường/xã, quận/huyện..."
                    value={form.address}
                    onChange={(e) => update('address', e.target.value)}
                  />
                </div>
                {errors.address && <span className="field__error">{errors.address}</span>}
              </div>

              {/* Lựa chọn thời gian */}
              <div className="field">
                <label>Thời gian thợ đến phục vụ</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
                  <button
                    type="button"
                    className={`btn ${urgent ? 'btn--primary' : 'btn--outline'}`}
                    onClick={() => setUrgent(true)}
                    style={{ fontSize: 13, padding: '10px 12px' }}
                  >
                    Cần thợ gấp (15–30 phút)
                  </button>
                  <button
                    type="button"
                    className={`btn ${!urgent ? 'btn--primary' : 'btn--outline'}`}
                    onClick={() => setUrgent(false)}
                    style={{ fontSize: 13, padding: '10px 12px' }}
                  >
                    Hẹn ngày & giờ khác
                  </button>
                </div>

                {!urgent && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, color: '#64748b', marginBottom: 4, display: 'block' }}>
                        Chọn ngày:
                      </label>
                      <select
                        value={appointmentDate}
                        onChange={(e) => setAppointmentDate(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}
                      >
                        <option value="Hôm nay">Hôm nay</option>
                        <option value="Ngày mai">Ngày mai</option>
                        <option value="Ngày kia">Ngày kia</option>
                        <option value="Cuối tuần này">Cuối tuần này</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: 12, color: '#64748b', marginBottom: 4, display: 'block' }}>
                        Khung giờ:
                      </label>
                      <select
                        value={appointmentTime}
                        onChange={(e) => setAppointmentTime(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}
                      >
                        {TIME_SLOTS.map((slot) => (
                          <option key={slot} value={slot}>{slot}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="field">
                <label htmlFor="serviceIssue">Mô tả sự cố hoặc yêu cầu sửa chữa *</label>
                <div className="field__control">
                  <textarea
                    id="serviceIssue"
                    rows="3"
                    placeholder="VD: Bị nhảy át liên tục khi bật bình nóng lạnh, nước máy bơm không lên bồn..."
                    value={form.issue}
                    onChange={(e) => update('issue', e.target.value)}
                  />
                </div>
                {errors.issue && <span className="field__error">{errors.issue}</span>}
              </div>

              <div className="field">
                <label htmlFor="serviceNotes">Ghi chú thêm cho thợ</label>
                <div className="field__control">
                  <input
                    id="serviceNotes"
                    type="text"
                    placeholder="VD: Cửa có chuông, gọi trước 10 phút, nhà ở tầng 3..."
                    value={form.notes}
                    onChange={(e) => update('notes', e.target.value)}
                  />
                </div>
              </div>

              <div className="order-form__actions">
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={handleClose}
                  disabled={busy}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={busy}
                >
                  {busy ? 'Đang gửi yêu cầu…' : 'Xác nhận đặt lịch ngay'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
