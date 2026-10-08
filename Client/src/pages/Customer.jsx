import { useEffect, useState } from 'react'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import Field from '../components/Field.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { useAuth } from '../context/useAuth.js'
import { requestsApi } from '../lib/requests.js'
import { fmtDate } from '../lib/format.js'

const emptyForm = (phone = '') => ({ device: '', issue: '', address: '', phone })

export default function Customer() {
  const { user } = useAuth()
  const [form, setForm] = useState(() => emptyForm(user?.phone ?? ''))
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const loadRequests = async () => {
    try {
      const data = await requestsApi.list()
      setRequests(data.requests)
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const update = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) =>
      prev[name] ? { ...prev, [name]: undefined } : prev,
    )
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const next = {}
    if (!form.device.trim()) next.device = 'Vui lòng nhập loại thiết bị.'
    if (!form.issue.trim()) next.issue = 'Vui lòng mô tả lỗi cần sửa.'
    if (!form.address.trim()) next.address = 'Vui lòng nhập địa chỉ.'
    setFieldErrors(next)
    if (Object.keys(next).length > 0) return

    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const { request } = await requestsApi.create({
        device: form.device.trim(),
        issue: form.issue.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
      })
      setRequests((prev) => [request, ...prev])
      setForm(emptyForm(form.phone))
      setSuccess('Yêu cầu của bạn đã được gửi. Kỹ thuật viên sẽ liên hệ sớm!')
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <DashboardLayout roleLabel="Khách hàng">
      <div className="page">
        <header className="page__header">
          <h1>
            Xin chào
            {user?.displayName
              ? `, ${user.displayName.trim().split(' ').slice(-1)[0]}`
              : ''}{' '}
            👋
          </h1>
          <p>Gửi yêu cầu sửa chữa và theo dõi tiến độ ngay tại đây.</p>
        </header>

        {error && (
          <div className="alert alert--error" role="alert">
            <span>{error}</span>
          </div>
        )}

        <div className="req-grid">
          <section className="card">
            <h2 className="card__title">Gửi yêu cầu sửa chữa</h2>

            {success && (
              <div className="alert alert--success" role="status">
                <span>{success}</span>
              </div>
            )}

            <form className="form" onSubmit={handleSubmit} noValidate>
              <Field
                id="req-device"
                label="Loại thiết bị"
                name="device"
                placeholder="VD: Máy giặt, Tivi, Điều hòa…"
                value={form.device}
                onChange={(event) => update('device', event.target.value)}
                error={fieldErrors.device}
              />

              <div
                className={
                  fieldErrors.issue ? 'field field--error' : 'field'
                }
              >
                <label htmlFor="req-issue">Mô tả lỗi</label>
                <div className="field__control">
                  <textarea
                    id="req-issue"
                    name="issue"
                    rows="4"
                    placeholder="VD: Máy giặt kêu to, không vắt được nước…"
                    value={form.issue}
                    onChange={(event) => update('issue', event.target.value)}
                    aria-invalid={fieldErrors.issue ? 'true' : undefined}
                  />
                </div>
                {fieldErrors.issue && (
                  <span className="field__error" role="alert">
                    {fieldErrors.issue}
                  </span>
                )}
              </div>

              <Field
                id="req-address"
                label="Địa chỉ"
                name="address"
                placeholder="Số nhà, đường, phường/xã…"
                value={form.address}
                onChange={(event) => update('address', event.target.value)}
                error={fieldErrors.address}
              />

              <Field
                id="req-phone"
                label="Số điện thoại liên hệ"
                name="phone"
                type="tel"
                placeholder="VD: 0912 345 678"
                value={form.phone}
                onChange={(event) => update('phone', event.target.value)}
                error={fieldErrors.phone}
              />

              <button className="btn btn--primary" type="submit" disabled={busy}>
                {busy ? 'Đang gửi…' : 'Gửi yêu cầu'}
              </button>
            </form>
          </section>

          <section className="card">
            <h2 className="card__title">
              Yêu cầu của tôi ({requests.length})
            </h2>

            {loading ? (
              <p className="card__empty">Đang tải danh sách…</p>
            ) : requests.length === 0 ? (
              <p className="card__empty">
                Bạn chưa có yêu cầu nào. Hãy gửi yêu cầu đầu tiên ở bên cạnh!
              </p>
            ) : (
              <ul className="req-list">
                {requests.map((request) => (
                  <li key={request.id} className="req-item">
                    <div className="req-item__top">
                      <strong>{request.device}</strong>
                      <StatusBadge status={request.status} />
                    </div>
                    <p className="req-item__issue">{request.issue}</p>
                    <p className="req-item__meta">📍 {request.address}</p>
                    <div className="req-item__foot">
                      <span className="req-item__date">
                        {fmtDate(request.createdAt)}
                      </span>
                      {request.status !== 'pending' && request.repairmanName && (
                        <span className="req-item__staff">
                          Phụ trách: {request.repairmanName}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </DashboardLayout>
  )
}