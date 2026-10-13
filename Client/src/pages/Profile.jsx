import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import Field from '../components/Field.jsx'
import { api } from '../lib/api.js'
import { getToken } from '../lib/firebase.js'

export default function Profile() {
  const { user, updateUser, resendVerificationEmail, refreshEmailVerification } = useAuth()
  const [form, setForm] = useState({
    name: user?.displayName || user?.fullName || '',
    phone: user?.phone || '',
  })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [verifyBusy, setVerifyBusy] = useState(false)
  const [verifyNotice, setVerifyNotice] = useState('')

  const update = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSuccess('')
    setError('')

    const nextErrors = {}
    if (!form.name.trim()) nextErrors.name = 'Vui lòng nhập họ và tên.'
    if (!form.phone.trim()) {
      nextErrors.phone = 'Vui lòng nhập số điện thoại.'
    } else if (!/^(0[35789])[0-9]{8}$/.test(form.phone.trim())) {
      nextErrors.phone = 'Số điện thoại không hợp lệ.'
    }

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
      setSuccess('Cập nhật thông tin thành công!')
    } catch (err) {
      setError(err.message || 'Cập nhật thất bại. Vui lòng thử lại.')
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
      setVerifyNotice('Đã gửi lại email xác nhận. Vui lòng kiểm tra hộp thư (kể cả mục Spam).')
    } catch (err) {
      setVerifyNotice(err.message || 'Không gửi được email xác nhận.')
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
    } catch (err) {
      setVerifyNotice(err.message || 'Không kiểm tra được trạng thái xác nhận.')
    }
  }

  return (
    <div className="page">
      <header className="page__header">
        <h1>Cập nhật thông tin cá nhân</h1>
        <p>Thông tin này dùng để liên hệ khi giao hàng và lắp đặt thiết bị.</p>
      </header>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 className="card__title">Trạng thái email</h2>
        <p style={{ marginBottom: 10 }}>
          <strong>{user.email}</strong>{' '}
          {user.emailVerified ? (
            <span className="status status--done">Đã xác nhận</span>
          ) : (
            <span className="status status--pending">Chưa xác nhận</span>
          )}
        </p>

        {!user.emailVerified && (
          <>
            {verifyNotice && (
              <div className="alert alert--success" role="status" style={{ marginBottom: 10 }}>
                <span>{verifyNotice}</span>
              </div>
            )}
            <div className="admin-actions">
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
                Tôi đã xác nhận
              </button>
            </div>
          </>
        )}

        {user.emailVerified && verifyNotice && (
          <div className="alert alert--success" role="status">
            <span>{verifyNotice}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="alert alert--error" role="alert" style={{ marginBottom: 16 }}>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert--success" role="status" style={{ marginBottom: 16 }}>
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="form" noValidate>
        <Field
          id="profile-name"
          label="Họ và tên *"
          name="name"
          placeholder="VD: Nguyễn Văn A"
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          error={errors.name}
        />

        <Field
          id="profile-phone"
          label="Số điện thoại *"
          name="phone"
          type="tel"
          placeholder="VD: 0912 345 678"
          value={form.phone}
          onChange={(e) => update('phone', e.target.value)}
          error={errors.phone}
        />

        <div className="form__actions">
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? 'Đang cập nhật…' : 'Lưu thay đổi'}
          </button>
          <Link to="/customer" className="btn btn--outline">
            Quay lại
          </Link>
        </div>
      </form>
    </div>
  )
}
