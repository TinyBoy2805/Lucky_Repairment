import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import Field from '../components/Field.jsx'
import { api } from '../lib/api.js'
import { getToken } from '../lib/firebase.js'
import { loyaltyApi } from '../lib/loyalty.js'
import { fmtDate, fmtMoney } from '../lib/format.js'
import { homeFor, ROLE_LABEL } from '../lib/roles.js'

export default function Profile() {
  const { user, updateUser, resendVerificationEmail, refreshEmailVerification } =
    useAuth()

  const [form, setForm] = useState({
    name: user?.displayName || user?.fullName || '',
    phone: user?.phone || '',
  })
  const [loyaltyPoints, setLoyaltyPoints] = useState(0)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [verifyBusy, setVerifyBusy] = useState(false)
  const [verifyNotice, setVerifyNotice] = useState('')

  useEffect(() => {
    if (!user) return
    loyaltyApi
      .getPoints()
      .then((res) => {
        const pts = Number(res?.points ?? res?.loyalty?.points ?? res?.data?.points ?? 0)
        setLoyaltyPoints(pts)
      })
      .catch(() => {})
  }, [user])

  const update = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSuccess('')
    setError('')

    const nextErrors = {}
    if (!form.name.trim()) nextErrors.name = 'Vui lòng nhập họ và tên.'
    if (!form.phone.trim()) nextErrors.phone = 'Vui lòng nhập số điện thoại.'

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setBusy(true)
    try {
      const token = await getToken()
      const { user: updated } = await api.post(
        '/api/auth/profile',
        { name: form.name.trim(), phone: form.phone.trim() },
        token,
      )
      updateUser(updated)
      setSuccess('Đã lưu thay đổi thông tin cá nhân.')
    } catch (submitError) {
      setError(submitError.message || 'Cập nhật thất bại. Vui lòng thử lại.')
    } finally {
      setBusy(false)
    }
  }

  if (!user) return null

  const handleResend = async () => {
    setVerifyBusy(true)
    setVerifyNotice('')
    try {
      await resendVerificationEmail()
      setVerifyNotice(
        'Đã gửi lại email xác nhận. Vui lòng kiểm tra hộp thư (kể cả mục Spam).',
      )
    } catch (resentError) {
      setVerifyNotice(resentError?.message || 'Không gửi được email xác nhận.')
    } finally {
      setVerifyBusy(false)
    }
  }

  const handleRefreshVerification = async () => {
    setVerifyNotice('')
    try {
      const verified = await refreshEmailVerification()
      setVerifyNotice(
        verified
          ? 'Email đã được xác nhận. Cảm ơn bạn!'
          : 'Email chưa được xác nhận. Hãy bấm liên kết trong email rồi thử lại.',
      )
    } catch (refreshError) {
      setVerifyNotice(
        refreshError?.message || 'Không kiểm tra được trạng thái xác nhận.',
      )
    }
  }

  const displayName =
    user.displayName ||
    user.fullName ||
    (user.email ? user.email.split('@')[0] : 'Người dùng')
  const initial = displayName.charAt(0).toUpperCase()
  const roleLabel = ROLE_LABEL[user.role] || 'Khách hàng'

  return (
    <div className="page">
      <Link to={homeFor(user.role)} className="detail-back">
        <span aria-hidden="true">←</span> Về trang chủ
      </Link>

      <div className="profile-page">
        <header className="profile-page__hero">
          <span className="profile-page__avatar" aria-hidden="true">
            {initial}
          </span>
          <div className="profile-page__identity">
            <h1>{displayName}</h1>
            <p>{user.email || 'Chưa cập nhật email'}</p>
            <div className="profile-page__tags">
              <span className="profile-page__role">{roleLabel}</span>
              {user.emailVerified ? (
                <span className="status status--done">Email đã xác nhận</span>
              ) : (
                <span className="status status--pending">Email chưa xác nhận</span>
              )}
            </div>
          </div>
        </header>

        {error && (
          <div className="alert alert--error" role="alert">
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="alert alert--success" role="status">
            <span>{success}</span>
          </div>
        )}

        <div className="profile-page__grid">
          {/* Thẻ Điểm Thưởng Tích Luỹ */}
          <section className="card loyalty-card" style={{ gridColumn: '1 / -1' }}>
            <div className="loyalty-card__header">
              <div className="loyalty-card__icon">⭐</div>
              <div>
                <h2 className="loyalty-card__title">Điểm Thưởng Tích Lũy (Loyalty Points)</h2>
                <p className="loyalty-card__desc">
                  Tích lũy 1 điểm cho mỗi 10.000 VNĐ khi hoàn tất dịch vụ. 1 điểm = 1.000 VNĐ giảm giá!
                </p>
              </div>
            </div>

            <div className="loyalty-card__points">
              <span className="loyalty-card__number">{loyaltyPoints}</span>
              <span className="loyalty-card__unit">điểm</span>
              <span className="loyalty-card__equiv">
                ≈ {fmtMoney(loyaltyPoints * 1000)}
              </span>
              <Link
                to="/customer"
                className="btn btn--outline btn--sm"
                style={{
                  marginLeft: 'auto',
                  background: 'rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  borderColor: 'rgba(255, 255, 255, 0.35)',
                }}
              >
                Xem chi tiết lịch sử điểm →
              </Link>
            </div>
          </section>

          <section className="card">
            <h2 className="card__title">Thông tin cá nhân</h2>
            <p className="form__hint" style={{ marginBottom: 16 }}>
              Thông tin này dùng để liên hệ khi giao hàng và lắp đặt dịch vụ.
            </p>

            <form onSubmit={handleSubmit} className="form" noValidate>
              <Field
                id="profile-name"
                label="Họ và tên *"
                name="name"
                placeholder="VD: Nguyễn Văn A"
                value={form.name}
                onChange={(event) => update('name', event.target.value)}
                error={errors.name}
              />

              <Field
                id="profile-phone"
                label="Số điện thoại *"
                name="phone"
                type="tel"
                placeholder="VD: 0912 345 678"
                value={form.phone}
                onChange={(event) => update('phone', event.target.value)}
                error={errors.phone}
              />

              <div className="form__actions">
                <button type="submit" className="btn btn--primary" disabled={busy}>
                  {busy ? 'Đang cập nhật…' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </section>

          <section className="card">
            <h2 className="card__title">Xác nhận email</h2>

            <p className="profile-page__email">
              <strong>{user.email || '—'}</strong>
              {user.emailVerified ? (
                <span className="status status--done">Đã xác nhận</span>
              ) : (
                <span className="status status--pending">Chưa xác nhận</span>
              )}
            </p>

            {verifyNotice && (
              <div className="alert alert--success" role="status">
                <span>{verifyNotice}</span>
              </div>
            )}

            {!user.emailVerified ? (
              <div className="profile-page__actions">
                <button
                  type="button"
                  className="btn btn--outline btn--sm"
                  onClick={handleResend}
                  disabled={verifyBusy}
                >
                  {verifyBusy ? 'Đang gửi…' : 'Gửi lại email xác nhận'}
                </button>
                <button
                  type="button"
                  className="btn btn--outline btn--sm"
                  onClick={handleRefreshVerification}
                >
                  Kiểm tra lại
                </button>
              </div>
            ) : (
              <p className="form__hint">
                Email của bạn đã được xác nhận. Cảm ơn bạn!
              </p>
            )}
          </section>

          <section className="info-card profile-page__meta">
            <h2 className="info-card__title">Thông tin tài khoản</h2>
            <dl className="info-list">
              <div className="info-row">
                <dt>Mã tài khoản</dt>
                <dd className="info-mono">{user.uid || '—'}</dd>
              </div>
              <div className="info-row">
                <dt>Vai trò</dt>
                <dd>{roleLabel}</dd>
              </div>
              <div className="info-row">
                <dt>Email</dt>
                <dd>{user.email || '—'}</dd>
              </div>
              <div className="info-row">
                <dt>Trạng thái email</dt>
                <dd>{user.emailVerified ? 'Đã xác nhận' : 'Chưa xác nhận'}</dd>
              </div>
              <div className="info-row">
                <dt>Ngày tạo tài khoản</dt>
                <dd>{fmtDate(user.createdAt) || '—'}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </div>
  )
}
