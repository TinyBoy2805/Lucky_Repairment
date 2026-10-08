import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import Field from '../components/Field.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { useAuth } from '../context/useAuth.js'
import { requestsApi } from '../lib/requests.js'
import { ordersApi } from '../lib/products.js'
import { fmtDate } from '../lib/format.js'

const ORDER_STATUS_LABELS = {
  pending: { label: 'Chờ xác nhận', cls: 'badge--pending' },
  confirmed: { label: 'Đã xác nhận', cls: 'badge--assigned' },
  delivering: { label: 'Đang giao & lắp đặt', cls: 'badge--in-progress' },
  completed: { label: 'Đã hoàn thành', cls: 'badge--done' },
  cancelled: { label: 'Đã hủy', cls: 'badge--pending' },
}

const emptyForm = (phone = '') => ({ device: '', issue: '', address: '', phone })

export default function Customer() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('requests') // 'requests' | 'orders'
  const [form, setForm] = useState(() => emptyForm(user?.phone ?? ''))
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [requests, setRequests] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [ordersLoading, setOrdersLoading] = useState(false)
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

  const loadOrders = async () => {
    setOrdersLoading(true)
    try {
      const data = await ordersApi.list()
      setOrders(data.orders || [])
    } catch (loadError) {
      console.warn('Không thể tải đơn hàng:', loadError)
    } finally {
      setOrdersLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
    loadOrders()
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
              : ''}
          </h1>
          <p>Quản lý yêu cầu sửa chữa và các đơn mua thiết bị điện nước tại đây.</p>
        </header>

        {/* Tab chuyển đổi */}
        <div className="customer-tabs" style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <button
            type="button"
            className={`btn ${activeTab === 'requests' ? 'btn--primary' : 'btn--outline'}`}
            onClick={() => setActiveTab('requests')}
          >
            Yêu cầu sửa chữa ({requests.length})
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'orders' ? 'btn--primary' : 'btn--outline'}`}
            onClick={() => setActiveTab('orders')}
          >
            Đơn mua thiết bị ({orders.length})
          </button>
          <Link
            to="/services"
            className="btn btn--outline"
            style={{ marginLeft: 'auto' }}
          >
            + Đặt lịch dịch vụ mới
          </Link>
        </div>

        {error && (
          <div className="alert alert--error" role="alert" style={{ marginBottom: 20 }}>
            <span>{error}</span>
          </div>
        )}

        {activeTab === 'requests' ? (
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
                  placeholder="VD: Máy giặt, Bơm nước, Aptomat, Ống nước…"
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
                      placeholder="VD: Rò rỉ nước ngầm, chập điện nhảy át liên tục…"
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
                        <div>
                          <strong>{request.serviceName || request.device}</strong>
                          {request.appointmentTime && (
                            <div style={{ fontSize: 13, color: '#16a34a', fontWeight: 600, marginTop: 2 }}>
                              Hẹn: {request.appointmentDate} ({request.appointmentTime})
                            </div>
                          )}
                        </div>
                        <StatusBadge status={request.status} />
                      </div>
                      <p className="req-item__issue">{request.issue}</p>
                      <p className="req-item__meta">Địa chỉ: {request.address}</p>
                      <div className="req-item__foot">
                        <span className="req-item__date">
                          Gửi lúc: {fmtDate(request.createdAt)}
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
        ) : (
          /* Tab Đơn mua thiết bị */
          <section className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 className="card__title" style={{ margin: 0 }}>
                Đơn hàng mua thiết bị ({orders.length})
              </h2>
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={loadOrders}
                disabled={ordersLoading}
              >
                {ordersLoading ? 'Đang tải lại…' : 'Làm mới'}
              </button>
            </div>

            {ordersLoading ? (
              <p className="card__empty">Đang tải danh sách đơn hàng…</p>
            ) : orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <p className="card__empty" style={{ marginBottom: 16 }}>
                  Bạn chưa có đơn đặt mua thiết bị hoặc vật tư nào.
                </p>
                <Link to="/products" className="btn btn--primary">
                  Khám phá danh mục thiết bị điện nước
                </Link>
              </div>
            ) : (
              <ul className="req-list">
                {orders.map((ord) => {
                  const statusInfo = ORDER_STATUS_LABELS[ord.status] || {
                    label: ord.status,
                    cls: 'badge--pending',
                  }
                  return (
                    <li key={ord.id} className="req-item" style={{ padding: 20 }}>
                      <div className="req-item__top" style={{ marginBottom: 12 }}>
                        <div>
                          <strong>Đơn hàng #{ord.id}</strong>
                          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                            Đặt lúc: {fmtDate(ord.createdAt)}
                          </div>
                        </div>
                        <span className={`status-badge ${statusInfo.cls}`}>
                          {statusInfo.label}
                        </span>
                      </div>

                      {/* Chi tiết sản phẩm trong đơn */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '14px 0', borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
                        {ord.items?.map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {item.productImage && (
                              <img
                                src={item.productImage}
                                alt={item.productName}
                                style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover' }}
                              />
                            )}
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: 14 }}>
                                {item.productName}
                              </div>
                              <div style={{ fontSize: 13, color: '#64748b' }}>
                                Số lượng: x{item.quantity} • Giá: {item.price?.toLocaleString('vi-VN')} đ
                                {item.includeInstallation && ' (kèm thợ lắp đặt)'}
                              </div>
                            </div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>
                              {item.subtotal?.toLocaleString('vi-VN')} đ
                            </div>
                          </div>
                        ))}
                      </div>

                      <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 8, fontSize: 13, color: '#334155', marginBottom: 12 }}>
                        <div><strong>Người nhận:</strong> {ord.receiverName} • {ord.phone}</div>
                        <div><strong>Địa chỉ:</strong> {ord.address}</div>
                        {ord.note && <div><strong>Ghi chú:</strong> {ord.note}</div>}
                      </div>

                      <div className="req-item__foot" style={{ alignItems: 'baseline' }}>
                        <span>
                          Phương thức: {ord.paymentMethod === 'cod' ? 'Thanh toán khi nhận / lắp đặt (COD)' : 'Chuyển khoản'}
                        </span>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: 13, color: '#64748b' }}>Tổng thanh toán: </span>
                          <strong style={{ fontSize: 18, color: '#e11d48' }}>
                            {ord.totalAmount?.toLocaleString('vi-VN')} đ
                          </strong>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )}
      </div>
    </DashboardLayout>
  )
}