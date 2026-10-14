import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { api } from '../lib/api.js'
import { getToken } from '../lib/firebase.js'

export default function Report() {
  const { user } = useAuth()
  const [form, setForm] = useState({
    targetType: 'user',
    targetId: '',
    reason: '',
    description: '',
  })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const update = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSuccess('')
    setError('')

    const nextErrors = {}
    if (!form.targetId.trim()) nextErrors.targetId = 'Vui lòng nhập mã đối tượng bị báo cáo.'
    if (!form.reason.trim()) nextErrors.reason = 'Vui lòng nhập lý do báo cáo.'

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setBusy(true)
    try {
      const token = await getToken()
      await api.post(
        '/api/reports',
        {
          targetType: form.targetType,
          targetId: form.targetId.trim(),
          reason: form.reason.trim(),
          description: form.description.trim(),
        },
        token,
      )
      setForm({ targetType: 'user', targetId: '', reason: '', description: '' })
      setSuccess('Báo cáo của bạn đã được gửi. Ban quản trị sẽ xem xét sớm nhất.')
    } catch (err) {
      setError(err.message || 'Báo cáo thất bại. Vui lòng thử lại.')
    } finally {
      setBusy(false)
    }
  }

  if (!user) return null

  return (
    <div className="page">
      <header className="page__header">
        <h1>Báo cáo</h1>
        <p>Gửi báo cáo về shop, khách hàng hoặc đơn hàng có dấu hiệu vi phạm.</p>
      </header>

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
        <div className="field">
          <label htmlFor="report-target">Đối tượng báo cáo</label>
          <div className="field__control">
            <select
              id="report-target"
              value={form.targetType}
              onChange={(e) => update('targetType', e.target.value)}
            >
              <option value="user">Người dùng / Shop</option>
              <option value="request">Đơn hàng</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="report-target-id">
            {form.targetType === 'request' ? 'Mã đơn hàng *' : 'Mã người dùng *'}
          </label>
          <div className="field__control">
            <input
              id="report-target-id"
              type="text"
              placeholder={form.targetType === 'request' ? 'VD: -Nxyz123' : 'VD: uid khách hàng'}
              value={form.targetId}
              onChange={(e) => update('targetId', e.target.value)}
            />
          </div>
          {errors.targetId && <span className="field__error">{errors.targetId}</span>}
        </div>

        <div className="field">
          <label htmlFor="report-reason">Lý do *</label>
          <div className="field__control">
            <input
              id="report-reason"
              type="text"
              placeholder="Ví dụ: Kém chất lượng, thái độ tệ…"
              value={form.reason}
              onChange={(e) => update('reason', e.target.value)}
            />
          </div>
          {errors.reason && <span className="field__error">{errors.reason}</span>}
        </div>

        <div className="field">
          <label htmlFor="report-desc">Mô tả chi tiết (tùy chọn)</label>
          <div className="field__control">
            <textarea
              id="report-desc"
              rows="3"
              placeholder="Chi tiết thêm về vụ việc…"
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
            />
          </div>
        </div>

        <div className="form__actions">
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? 'Đang gửi…' : 'Gửi báo cáo'}
          </button>
          <Link to="/customer" className="btn btn--outline">
            Quay lại
          </Link>
        </div>
      </form>
    </div>
  )
}
