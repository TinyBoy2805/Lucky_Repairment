import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import Field from '../components/Field.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { useAuth } from '../context/useAuth.js'
import { requestsApi } from '../lib/requests.js'
import { ordersApi } from '../lib/orders.js'
import { loyaltyApi } from '../lib/loyalty.js'
import { fmtDate, fmtDateTime, fmtMoney } from '../lib/format.js'

const ORDER_STATUS_LABELS = {
  pending: { label: 'Chờ xác nhận', cls: 'status--pending' },
  payment_verified: { label: 'Đã thanh toán', cls: 'status--assigned' },
  confirmed: { label: 'Đã xác nhận', cls: 'status--assigned' },
  delivering: { label: 'Đang giao & lắp đặt', cls: 'status--in_progress' },
  completed: { label: 'Đã hoàn thành', cls: 'status--done' },
  cancelled: { label: 'Đã hủy', cls: 'status--pending' },
}

const PAYMENT_METHOD_LABEL = {
  cod: 'Thanh toán khi nhận / lắp đặt (COD)',
  momo: 'Ví MoMo (QR)',
  zalopay: 'Ví ZaloPay (QR)',
  stripe: 'Thẻ quốc tế (Stripe)',
}

const emptyForm = (phone = '') => ({ device: '', issue: '', address: '', phone })

const firstValue = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== '')

export default function Customer() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('requests') // 'requests' | 'orders' | 'loyalty'
  const [form, setForm] = useState(() => emptyForm(user?.phone ?? ''))
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [requests, setRequests] = useState([])
  const [orders, setOrders] = useState([])
  const [loyaltyPoints, setLoyaltyPoints] = useState(0)
  const [loyaltyLogs, setLoyaltyLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [loyaltyLoading, setLoyaltyLoading] = useState(false)
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
      console.warn('Không thể tải đơn dịch vụ:', loadError)
    } finally {
      setOrdersLoading(false)
    }
  }

  const loadLoyalty = async () => {
    setLoyaltyLoading(true)
    try {
      const [pointsRes, logsRes] = await Promise.all([
        loyaltyApi.getPoints(),
        loyaltyApi.getLogs(),
      ])
      const pts = Number(pointsRes?.points ?? pointsRes?.loyalty?.points ?? pointsRes?.data?.points ?? 0)
      const logs = logsRes?.logs ?? logsRes?.data ?? []
      setLoyaltyPoints(pts)
      setLoyaltyLogs(logs)
    } catch (loadError) {
      console.warn('Không thể tải điểm thưởng:', loadError)
    } finally {
      setLoyaltyLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
    loadOrders()
    loadLoyalty()
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
          <p>Quản lý yêu cầu sửa chữa và các đơn dịch vụ điện nước tại đây.</p>
        </header>

        {/* Thanh chuyển tab + lối tắt */}
        <div className="customer-toolbar">
          <div className="dash-tabs">
            <button
              type="button"
              className={
                activeTab === 'requests'
                  ? 'dash-tabs__item is-active'
                  : 'dash-tabs__item'
              }
              onClick={() => setActiveTab('requests')}
            >
              Yêu cầu sửa chữa
              <span className="dash-tabs__count">{requests.length}</span>
            </button>
            <button
              type="button"
              className={
                activeTab === 'orders' ? 'dash-tabs__item is-active' : 'dash-tabs__item'
              }
              onClick={() => setActiveTab('orders')}
            >
              Đơn dịch vụ
              <span className="dash-tabs__count">{orders.length}</span>
            </button>
            <button
              type="button"
              className={
                activeTab === 'loyalty' ? 'dash-tabs__item is-active' : 'dash-tabs__item'
              }
              onClick={() => setActiveTab('loyalty')}
            >
              Điểm thưởng
              <span className="dash-tabs__count loyalty-points-badge">{loyaltyPoints}</span>
            </button>
          </div>

          <div className="customer-toolbar__actions">
            <Link to="/profile" className="btn btn--outline btn--sm">
              Thông tin cá nhân
            </Link>
            <Link to="/report" className="btn btn--outline btn--sm">
              Báo cáo
            </Link>
            <Link to="/services" className="btn btn--primary btn--sm">
              + Đặt lịch dịch vụ mới
            </Link>
          </div>
        </div>

        {error && (
          <div className="alert alert--error" role="alert">
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

                <div className={fieldErrors.issue ? 'field field--error' : 'field'}>
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
                <ul className="req-list customer-list">
                  {requests.map((request) => {
                    const scheduleDate = firstValue(
                      request.scheduledDate,
                      request.appointmentDate,
                    )
                    const scheduleTime = firstValue(
                      request.scheduledTime,
                      request.appointmentTime,
                    )

                    return (
                      <li key={request.id}>
                        <Link
                          to={`/customer/requests/${encodeURIComponent(request.id)}`}
                          className="req-item req-item--link"
                        >
                          <div className="req-item__top">
                            <div>
                              <strong>
                                {firstValue(
                                  request.service,
                                  request.serviceName,
                                  request.device,
                                  'Yêu cầu sửa chữa',
                                )}
                              </strong>
                              {scheduleDate && (
                                <div className="req-item__schedule">
                                  Hẹn: {scheduleDate}
                                  {scheduleTime ? ` (${scheduleTime})` : ''}
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
                            <span className="req-item__cta">
                              Xem chi tiết <span aria-hidden="true">→</span>
                            </span>
                          </div>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </div>
        ) : activeTab === 'orders' ? (
          /* Tab Đơn dịch vụ */
          <section className="card">
            <div className="toolbar">
              <h2 className="card__title">Đơn dịch vụ của tôi ({orders.length})</h2>
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={loadOrders}
                disabled={ordersLoading}
              >
                {ordersLoading ? 'Đang tải lại…' : 'Làm mới'}
              </button>
            </div>

            {success && (
              <div className="alert alert--success" role="status">
                <span>{success}</span>
              </div>
            )}

            {ordersLoading ? (
              <p className="card__empty">Đang tải danh sách đơn dịch vụ…</p>
            ) : orders.length === 0 ? (
              <div className="empty-block">
                <p className="card__empty">
                  Bạn chưa có đơn dịch vụ nào.
                </p>
                <Link to="/services" className="btn btn--primary">
                  Khám phá dịch vụ sửa chữa
                </Link>
              </div>
            ) : (
              <ul className="req-list customer-list">
                {orders.map((ord) => {
                  const statusInfo = ORDER_STATUS_LABELS[ord.status] || {
                    label: ord.status,
                    cls: 'status--pending',
                  }
                  const total = ord.finalAmount ?? ord.totalAmount ?? 0

                  return (
                    <li key={ord.id}>
                      <Link
                        to={`/customer/orders/${encodeURIComponent(ord.id)}`}
                        className="req-item req-item--link"
                      >
                        <div className="req-item__top">
                          <div>
                            <strong>Đơn hàng #{ord.id}</strong>
                            <div className="req-item__schedule">
                              Đặt lúc: {fmtDate(ord.createdAt)}
                            </div>
                          </div>
                          <span className={`status ${statusInfo.cls}`}>
                            {statusInfo.label}
                          </span>
                        </div>

                        <p className="req-item__meta">
                          {(ord.items?.length ?? 0)} dịch vụ ·{' '}
                          {PAYMENT_METHOD_LABEL[ord.paymentMethod] ||
                            'Thanh toán khi nhận (COD)'}
                        </p>

                        <div className="req-item__foot">
                          <span className="req-item__date">
                            Người nhận: {ord.receiverName || '—'}
                          </span>
                          <span className="req-item__right">
                            <strong className="req-item__amount">
                              {fmtMoney(total)}
                            </strong>
                            <span className="req-item__cta">
                              Xem chi tiết <span aria-hidden="true">→</span>
                            </span>
                          </span>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        ) : (
          /* Tab Điểm thưởng tích luỹ */
          <div className="loyalty-container">
            <section className="card loyalty-card">
              <div className="loyalty-card__header">
                <div className="loyalty-card__icon">⭐</div>
                <div>
                  <h2 className="loyalty-card__title">Điểm Thưởng Tích Lũy</h2>
                  <p className="loyalty-card__desc">
                    Tích lũy điểm khi hoàn tất đơn hàng và quy đổi thành tiền giảm giá trực tiếp!
                  </p>
                </div>
              </div>

              <div className="loyalty-card__points">
                <span className="loyalty-card__number">{loyaltyPoints}</span>
                <span className="loyalty-card__unit">điểm</span>
                <span className="loyalty-card__equiv">
                  ≈ {fmtMoney(loyaltyPoints * 1000)}
                </span>
              </div>

              <div className="loyalty-card__rules">
                <div className="loyalty-rule-item">
                  <span className="loyalty-rule-item__icon">🎯</span>
                  <div>
                    <strong>Tích điểm tự động</strong>
                    <p>Nhận 1 điểm cho mỗi 10.000 VNĐ khi đơn dịch vụ hoàn thành.</p>
                  </div>
                </div>
                <div className="loyalty-rule-item">
                  <span className="loyalty-rule-item__icon">💰</span>
                  <div>
                    <strong>Quy đổi giá trị</strong>
                    <p>1 điểm = 1.000 VNĐ giảm giá khi đặt dịch vụ.</p>
                  </div>
                </div>
                <div className="loyalty-rule-item">
                  <span className="loyalty-rule-item__icon">🏷️</span>
                  <div>
                    <strong>Sử dụng linh hoạt</strong>
                    <p>Dùng tối đa tới 30% giá trị đơn hàng, kết hợp cùng khuyến mãi.</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="card">
              <div className="toolbar">
                <h2 className="card__title">Lịch Sử Biến Động Điểm</h2>
                <button
                  type="button"
                  className="btn btn--outline btn--sm"
                  onClick={loadLoyalty}
                  disabled={loyaltyLoading}
                >
                  {loyaltyLoading ? 'Đang tải…' : 'Làm mới'}
                </button>
              </div>

              {loyaltyLoading ? (
                <p className="card__empty">Đang tải lịch sử điểm thưởng…</p>
              ) : loyaltyLogs.length === 0 ? (
                <div className="empty-block">
                  <p className="card__empty">Chưa có giao dịch điểm nào.</p>
                  <Link to="/services" className="btn btn--primary">
                    Đặt dịch vụ để bắt đầu tích điểm
                  </Link>
                </div>
              ) : (
                <ul className="loyalty-logs-list">
                  {loyaltyLogs.map((log) => {
                    const isEarn = log.type === 'earn'
                    const isRedeem = log.type === 'redeem'
                    const pts = log.points ?? 0

                    return (
                      <li key={log.id} className="loyalty-log-item">
                        <div className={`loyalty-log-item__icon loyalty-log-item__icon--${log.type}`}>
                          {isEarn ? '📈' : isRedeem ? '🎁' : '↩️'}
                        </div>
                        <div className="loyalty-log-item__info">
                          <strong className="loyalty-log-item__title">
                            {isEarn
                              ? 'Tích điểm đơn dịch vụ'
                              : isRedeem
                                ? 'Quy đổi giảm giá đặt hàng'
                                : 'Hoàn điểm thưởng'}
                          </strong>
                          <div className="loyalty-log-item__meta">
                            {log.orderId && (
                              <Link to={`/customer/orders/${encodeURIComponent(log.orderId)}`}>
                                Đơn hàng #{log.orderId}
                              </Link>
                            )}
                            <span>{fmtDateTime(log.createdAt)}</span>
                          </div>
                        </div>
                        <div className={`loyalty-log-item__points ${pts > 0 ? 'text-success' : 'text-danger'}`}>
                          {pts > 0 ? `+${pts}` : pts} điểm
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
