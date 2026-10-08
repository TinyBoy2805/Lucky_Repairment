import { useState } from 'react'
import { Link } from 'react-router-dom'
import Field from '../components/Field.jsx'
import { useAuth } from '../context/useAuth.js'
import { authErrorMessage } from '../lib/authErrors.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const successIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <path d="m9 11 3 3L22 4" />
  </svg>
)

const backIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m12 19-7-7 7-7M19 12H5" />
  </svg>
)

export default function ForgotPassword() {
  const { resetPassword } = useAuth()

  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    const value = email.trim()

    if (!value) {
      setError('Vui lòng nhập email.')
      return
    }
    if (!EMAIL_PATTERN.test(value)) {
      setError('Email không hợp lệ.')
      return
    }

    setBusy(true)
    try {
      await resetPassword(value)
      setError('')
      setSent(true)
    } catch (err) {
      console.error('[forgot-password]', err)
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Link className="auth__back" to="/login">
        {backIcon}
        Quay lại đăng nhập
      </Link>

      <header className="auth__header">
        <h1>Quên mật khẩu?</h1>
        <p>
          Nhập email đã đăng ký, chúng tôi sẽ gửi cho bạn đường dẫn để đặt lại
          mật khẩu.
        </p>
      </header>

      {sent ? (
        <>
          <div className="alert alert--success" role="status">
            {successIcon}
            <span>
              Đã gửi hướng dẫn đặt lại mật khẩu tới <strong>{email}</strong>.
              Vui lòng kiểm tra hộp thư của bạn.
            </span>
          </div>

          <p className="auth__alt">
            Không nhận được email?{' '}
            <a
              className="form__link"
              href="#resend"
              onClick={(e) => {
                e.preventDefault()
                setSent(false)
              }}
            >
              Gửi lại
            </a>
          </p>
        </>
      ) : (
        <>
          <form className="form" onSubmit={handleSubmit} noValidate>
            <Field
              id="forgot-email"
              label="Email"
              type="email"
              name="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError('')
              }}
              error={error}
            />

            <button
              className="btn btn--primary btn--block"
              type="submit"
              disabled={busy}
            >
              {busy ? 'Đang gửi...' : 'Gửi link đặt lại mật khẩu'}
            </button>
          </form>

          <p className="auth__alt">
            Đã nhớ mật khẩu? <Link to="/login">Đăng nhập</Link>
          </p>
        </>
      )}
    </>
  )
}
