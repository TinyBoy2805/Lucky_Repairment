import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import Field from '../components/Field.jsx'
import PasswordField from '../components/PasswordField.jsx'
import { useAuth } from '../context/useAuth.js'
import { authErrorMessage } from '../lib/authErrors.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^(0|\+84)[0-9]{8,10}$/

export default function Register() {
  const { user, register, resendVerificationEmail, refreshEmailVerification } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = location.state?.returnTo || location.state?.from || '/'

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'customer',
    agree: false,
  })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [pendingVerification, setPendingVerification] = useState(null)
  const [resendBusy, setResendBusy] = useState(false)
  const [resendNotice, setResendNotice] = useState('')
  const [verifyNotice, setVerifyNotice] = useState('')

  if (user && !pendingVerification) {
    return <Navigate to={returnTo} replace />
  }

  const update = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined, general: undefined }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const next = {}

    if (!form.fullName.trim()) {
      next.fullName = 'Vui lòng nhập họ và tên.'
    }

    if (!form.email.trim()) {
      next.email = 'Vui lòng nhập email.'
    } else if (!EMAIL_PATTERN.test(form.email.trim())) {
      next.email = 'Email không hợp lệ.'
    }

    if (!form.phone.trim()) {
      next.phone = 'Vui lòng nhập số điện thoại.'
    } else if (!PHONE_PATTERN.test(form.phone.trim())) {
      next.phone = 'Số điện thoại không hợp lệ.'
    }

    if (!form.password) {
      next.password = 'Vui lòng nhập mật khẩu.'
    } else if (form.password.length < 6) {
      next.password = 'Mật khẩu phải có ít nhất 6 ký tự.'
    }

    if (!form.confirmPassword) {
      next.confirmPassword = 'Vui lòng xác nhận mật khẩu.'
    } else if (form.confirmPassword !== form.password) {
      next.confirmPassword = 'Mật khẩu xác nhận không khớp.'
    }

    if (!form.agree) {
      next.agree = 'Bạn cần đồng ý với điều khoản sử dụng.'
    }

    setErrors(next)
    if (Object.keys(next).length > 0) return

    setBusy(true)
    try {
      const result = await register({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        role: form.role,
      })
      setPendingVerification(result ?? { email: form.email.trim() })
    } catch (error) {
      console.error('[register]', error)
      setErrors({ general: authErrorMessage(error) })
    } finally {
      setBusy(false)
    }
  }

  const handleResend = async () => {
    setResendBusy(true)
    setResendNotice('')
    setVerifyNotice('')
    try {
      await resendVerificationEmail()
      setResendNotice('Đã gửi lại email xác nhận. Vui lòng kiểm tra hộp thư (kể cả mục Spam).')
    } catch (error) {
      setVerifyNotice(authErrorMessage(error))
    } finally {
      setResendBusy(false)
    }
  }

  const handleCheckVerified = async () => {
    setVerifyNotice('')
    try {
      const verified = await refreshEmailVerification()
      if (verified) {
        navigate(returnTo, { replace: true })
      } else {
        setVerifyNotice(
          'Email chưa được xác nhận. Hãy mở hộp thư, bấm vào liên kết xác nhận rồi thử lại.',
        )
      }
    } catch (error) {
      setVerifyNotice(authErrorMessage(error))
    }
  }

  if (pendingVerification) {
    return (
      <div className="verify-block">
        <header className="auth__header">
          <h1>Xác nhận email</h1>
          <p>Tài khoản của bạn đã được tạo thành công.</p>
        </header>

        <div className="alert alert--success" role="status">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 4h16v16H4z" />
            <path d="m22 6-10 7L2 6" />
          </svg>
          <span>
            Chúng tôi đã gửi một email xác nhận tới{' '}
            <strong>{pendingVerification.email}</strong>. Vui lòng mở email và bấm vào liên kết
            xác nhận để kích hoạt tài khoản.
          </span>
        </div>

        {pendingVerification.verificationEmailSent === false && (
          <div className="alert alert--error" role="alert">
            <span>
              Chưa gửi được email xác nhận tự động. Hãy bấm nút “Gửi lại email xác nhận” bên dưới.
            </span>
          </div>
        )}

        {resendNotice && (
          <div className="alert alert--success" role="status">
            <span>{resendNotice}</span>
          </div>
        )}

        {verifyNotice && (
          <div className="alert alert--error" role="alert">
            <span>{verifyNotice}</span>
          </div>
        )}

        <div className="verify-block__actions">
          <button type="button" className="btn btn--outline btn--block" onClick={handleResend} disabled={resendBusy}>
            {resendBusy ? 'Đang gửi...' : 'Gửi lại email xác nhận'}
          </button>
          <button type="button" className="btn btn--primary btn--block" onClick={handleCheckVerified}>
            Tôi đã xác nhận email
          </button>
          <button type="button" className="btn btn--outline btn--block" onClick={() => navigate(returnTo, { replace: true })}>
            Bỏ qua, tiếp tục sử dụng
          </button>
        </div>

        <p className="auth__alt">
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
      </div>
    )
  }

  return (
    <>
      <header className="auth__header">
        <h1>Tạo tài khoản</h1>
        <p>Đăng ký miễn phí để bắt đầu sử dụng Lucky Repairment.</p>
      </header>

      <form className="form" onSubmit={handleSubmit} noValidate>
        {errors.general && (
          <div className="alert alert--error" role="alert">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            <span>{errors.general}</span>
          </div>
        )}

        <Field
          id="register-fullname"
          label="Họ và tên"
          type="text"
          name="fullName"
          placeholder="Nguyễn Văn A"
          autoComplete="name"
          value={form.fullName}
          onChange={(e) => update('fullName', e.target.value)}
          error={errors.fullName}
        />

        <Field
          id="register-email"
          label="Email"
          type="email"
          name="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
          error={errors.email}
        />

        <Field
          id="register-phone"
          label="Số điện thoại"
          type="tel"
          name="phone"
          placeholder="0912 345 678"
          autoComplete="tel"
          value={form.phone}
          onChange={(e) => update('phone', e.target.value)}
          error={errors.phone}
        />

        <div className="field">
          <label id="register-role-label">Tôi đăng ký với vai trò</label>
          <div
            className="role-picker"
            role="radiogroup"
            aria-labelledby="register-role-label"
          >
            <label
              className={`role-picker__option${
                form.role === 'customer' ? ' is-active' : ''
              }`}
            >
              <input
                type="radio"
                name="role"
                value="customer"
                checked={form.role === 'customer'}
                onChange={() => update('role', 'customer')}
              />
              Khách hàng
            </label>
            <label
              className={`role-picker__option${
                form.role === 'repairman' ? ' is-active' : ''
              }`}
            >
              <input
                type="radio"
                name="role"
                value="repairman"
                checked={form.role === 'repairman'}
                onChange={() => update('role', 'repairman')}
              />
              Thợ sửa chữa
            </label>
          </div>
        </div>

        <PasswordField
          id="register-password"
          label="Mật khẩu"
          name="password"
          placeholder="Tối thiểu 6 ký tự"
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => update('password', e.target.value)}
          error={errors.password}
        />

        <PasswordField
          id="register-confirm"
          label="Xác nhận mật khẩu"
          name="confirmPassword"
          placeholder="Nhập lại mật khẩu"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={(e) => update('confirmPassword', e.target.value)}
          error={errors.confirmPassword}
        />

        <div>
          <label
            className={`form__check${errors.agree ? ' form__check--error' : ''}`}
          >
            <input
              type="checkbox"
              checked={form.agree}
              onChange={(e) => update('agree', e.target.checked)}
            />
            Tôi đồng ý với{' '}
            <a className="form__link" href="#terms">
              Điều khoản sử dụng
            </a>{' '}
            và{' '}
            <a className="form__link" href="#privacy">
              Chính sách bảo mật
            </a>
          </label>
          {errors.agree && (
            <span className="field__error" role="alert">
              {errors.agree}
            </span>
          )}
        </div>

        <button
          className="btn btn--primary btn--block"
          type="submit"
          disabled={busy}
        >
          {busy ? 'Đang đăng ký...' : 'Đăng ký'}
        </button>
      </form>

      <p className="auth__alt">
        Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
      </p>
    </>
  )
}
