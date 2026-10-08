import { useState } from 'react'
import Field from './Field.jsx'

const eyeIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const eyeOffIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 8 10 8a18.4 18.4 0 0 1-2.16 3.19M6.61 6.61A18.5 18.5 0 0 0 2 12s3.5 8 10 8a9.7 9.7 0 0 0 5.39-1.61" />
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    <path d="m2 2 20 20" />
  </svg>
)

export default function PasswordField({ id, label = 'Mật khẩu', ...props }) {
  const [visible, setVisible] = useState(false)

  return (
    <Field
      id={id}
      label={label}
      type={visible ? 'text' : 'password'}
      action={
        <button
          type="button"
          className="field__action"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          aria-pressed={visible}
          tabIndex={-1}
        >
          {visible ? eyeOffIcon : eyeIcon}
        </button>
      }
      {...props}
    />
  )
}
