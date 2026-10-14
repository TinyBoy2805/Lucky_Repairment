import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import Field from '../components/Field.jsx'
import PasswordField from '../components/PasswordField.jsx'
import { useAuth } from '../context/useAuth.js'
import { authErrorMessage } from '../lib/authErrors.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <path fill="#1877F2" d="M20 0c11.05 0 20 8.95 20 20s-8.95 20-20 20S0 31.05 0 20 8.95 0 20 0zm3.14 5.53h3.57v2.24h-3.57v-2.24zm14.63-5.36h2.37v5.08h-2.37v-5.08zm-9.23 11.03h2.75v2.34h-2.75v-2.34zm16.73-6.08h2.98v1.88h-2.98v-1.88zm-11.31 7.33h1.62v2.01h-1.62v-2.01zm-5.38 3.75h2.82v1.56h-2.82v-1.56zm7.57-7.72h1.98v1.08h-1.98v-1.08zm-7.19 3.23h1.75v1.91h-1.75v-1.91zm2.91-5.28h1.84v1.16h-1.84v-1.16z" />
    </svg>
  )
}

export default function Login() {
  const { user, login, loginWithGoogle, loginWithFacebook } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = location.state?.returnTo || location.state?.from || '/'

  const [form, setForm] = useState({
    email: '',
    password: '',
    remember: true,
  })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  if (user) {
    return <Navigate to={returnTo} replace />
  }

  const update = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined, general: undefined }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const next = {}
    const email = form.email.trim()

    if (!email) {
      next.email = 'Vui lòng nhập email.'
    } else if (!EMAIL_PATTERN.test(email)) {
      next.email = 'Email không hợp lệ.'
    }

    if (!form.password) {
      next.password = 'Vui lòng nhập mật khẩu.'
    }

    setErrors(next)
    if (Object.keys(next).length > 0) return

    setBusy(true)
    try {
      await login(email, form.password, form.remember)
      navigate(returnTo, { replace: true })
    } catch (error) {
      console.error('[login]', error)
      setErrors({ general: authErrorMessage(error) })
    } finally {
      setBusy(false)
    }
  }

  const handleGoogle = async () => {
    setBusy(true)
    try {
      await loginWithGoogle()
      navigate(returnTo, { replace: true })
    } catch (error) {
      console.error('[login-google]', error)
      setErrors({ general: authErrorMessage(error) })
    } finally {
      setBusy(false)
    }
  }

  const handleFacebook = async () => {
    setBusy(true)
    try {
      await loginWithFacebook()
      navigate(returnTo, { replace: true })
    } catch (error) {
      console.error('[login-facebook]', error)
      setErrors({ general: authErrorMessage(error) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <header className="auth__header">
        <h1>Đăng nhập</h1>
        <p>Chào mừng trở lại! Vui lòng nhập thông tin tài khoản của bạn.</p>
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
          id="login-email"
          label="Email"
          type="email"
          name="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
          error={errors.email}
        />

        <PasswordField
          id="login-password"
          label="Mật khẩu"
          name="password"
          placeholder="••••••••"
          autoComplete="current-password"
          value={form.password}
          onChange={(e) => update('password', e.target.value)}
          error={errors.password}
        />

        <div className="form__meta">
          <label className="form__check">
            <input
              type="checkbox"
              checked={form.remember}
              onChange={(e) => update('remember', e.target.checked)}
            />
            Duy trì đăng nhập
          </label>
          <Link className="form__link" to="/forgot-password">
            Quên mật khẩu?
          </Link>
        </div>

        <button
          className="btn btn--primary btn--block"
          type="submit"
          disabled={busy}
        >
          {busy ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>

        <div className="auth__divider">
          <span>hoặc</span>
        </div>

        <button
          className="btn btn--social btn--block"
          type="button"
          onClick={handleGoogle}
          disabled={busy}
        >
          <GoogleIcon />
          Đăng nhập bằng Google
        </button>

        <button
          className="btn btn--social btn--block"
          type="button"
          onClick={handleFacebook}
          disabled={busy}
        >
          <FacebookIcon />
          Đăng nhập bằng Facebook
        </button>
      </form>

      <p className="auth__alt">
        Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
      </p>
    </>
  )
}
