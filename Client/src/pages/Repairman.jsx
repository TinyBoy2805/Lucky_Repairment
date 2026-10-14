import { useEffect, useState } from 'react'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import Field from '../components/Field.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { useAuth } from '../context/useAuth.js'
import { requestsApi } from '../lib/requests.js'
import { ordersApi } from '../lib/orders.js'
import { servicesApi } from '../lib/services.js'
import { walletApi } from '../lib/wallet.js'
import { repairmanApi } from '../lib/repairman.js'
import { fmtDate, fmtMoney } from '../lib/format.js'

const TABS = [
  { key: 'requests', label: 'Việc sửa' },
  { key: 'orders', label: 'Đơn hàng' },
  { key: 'revenue', label: 'Doanh thu' },
  { key: 'services', label: 'Dịch vụ' },
]

const ORDER_STATUS = {
  pending: { label: 'Chờ xử lý', cls: 'status--pending' },
  payment_verified: { label: 'Đã thanh toán', cls: 'status--assigned' },
  confirmed: { label: 'Đã xác nhận', cls: 'status--assigned' },
  delivering: { label: 'Đang giao & lắp đặt', cls: 'status--in_progress' },
  completed: { label: 'Đã hoàn thành', cls: 'status--done' },
  cancelled: { label: 'Đã hủy', cls: 'status--failed' },
}

const CATEGORY_OPTIONS = [
  { value: 'electric', label: 'Sửa chữa điện' },
  { value: 'water', label: 'Sửa chữa nước' },
]

const categoryLabel = (value) =>
  CATEGORY_OPTIONS.find((option) => option.value === value)?.label || 'Sửa chữa điện'

const emptyService = {
  title: '',
  category: 'electric',
  startingPrice: '',
  priceDisplay: '',
  responseTime: '',
  warranty: '',
  image: '',
  shortDesc: '',
  description: '',
  signs: '',
}

/** Tách textarea (mỗi dòng một mục) thành mảng chuỗi. */
const textToLines = (value) =>
  String(value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

/** Bước hành động tiếp theo theo trạng thái của đơn (thợ phụ trách). */
const nextAction = (request, uid) => {
  if (request.status === 'pending') {
    return { label: 'Nhận việc', busy: 'Đang nhận…', body: { action: 'accept' } }
  }
  if (request.repairmanUid !== uid) return null
  if (request.status === 'assigned') {
    return {
      label: 'Bắt đầu sửa',
      busy: 'Đang xử lý…',
      body: { action: 'status', status: 'in_progress' },
    }
  }
  if (request.status === 'in_progress') {
    return {
      label: 'Hoàn thành',
      busy: 'Đang xử lý…',
      body: { action: 'status', status: 'done' },
    }
  }
  return null
}

export default function Repairman() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('requests')

  // Trạng thái sẵn sàng nhận việc
  const [available, setAvailable] = useState(false)
  const [availabilityBusy, setAvailabilityBusy] = useState(false)
  const [availabilityError, setAvailabilityError] = useState('')

  // Việc sửa chữa
  const [requests, setRequests] = useState([])
  const [requestsLoading, setRequestsLoading] = useState(true)
  const [requestsError, setRequestsError] = useState('')
  const [busyRequestId, setBusyRequestId] = useState(null)

  // Đơn dịch vụ
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [ordersError, setOrdersError] = useState('')
  const [busyOrderId, setBusyOrderId] = useState(null)

  // Doanh thu
  const [stats, setStats] = useState(null)
  const [statsError, setStatsError] = useState('')
  const [wallet, setWallet] = useState(null)
  const [walletError, setWalletError] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawBusy, setWithdrawBusy] = useState(false)
  const [withdrawNotice, setWithdrawNotice] = useState('')
  const [withdrawError, setWithdrawError] = useState('')

  // Dịch vụ của thợ
  const [services, setServices] = useState([])
  const [servicesLoading, setServicesLoading] = useState(true)
  const [servicesError, setServicesError] = useState('')
  const [serviceForm, setServiceForm] = useState(emptyService)
  const [editingId, setEditingId] = useState(null)
  const [serviceBusy, setServiceBusy] = useState(false)
  const [busyServiceId, setBusyServiceId] = useState(null)
  const [serviceNotice, setServiceNotice] = useState('')
  const [serviceFormError, setServiceFormError] = useState('')

  const loadAvailability = async () => {
    try {
      const data = await repairmanApi.availability()
      const value = data?.availability?.available ?? data?.available
      setAvailable(Boolean(value))
      setAvailabilityError('')
    } catch {
      // Endpoint có thể chưa khả dụng — giữ trạng thái mặc định, không crash.
      setAvailabilityError('Chưa tải được trạng thái sẵn sàng.')
    }
  }

  const loadRequests = async () => {
    setRequestsLoading(true)
    setRequestsError('')
    try {
      const data = await requestsApi.list()
      setRequests(data.requests || [])
    } catch (loadError) {
      setRequestsError(loadError.message)
    } finally {
      setRequestsLoading(false)
    }
  }

  const loadOrders = async () => {
    setOrdersLoading(true)
    setOrdersError('')
    try {
      const data = await ordersApi.list()
      setOrders(data.orders || [])
    } catch (loadError) {
      setOrdersError(loadError.message)
    } finally {
      setOrdersLoading(false)
    }
  }

  const loadRevenue = async () => {
    const [statsResult, walletResult] = await Promise.allSettled([
      repairmanApi.stats(),
      walletApi.current(),
    ])

    if (statsResult.status === 'fulfilled') {
      setStats(statsResult.value?.stats ?? statsResult.value ?? null)
      setStatsError('')
    } else {
      setStats(null)
      setStatsError('Chưa có số liệu doanh thu.')
    }

    if (walletResult.status === 'fulfilled') {
      setWallet(walletResult.value?.wallet ?? null)
      setWalletError('')
    } else {
      setWallet(null)
      setWalletError(walletResult.reason?.message || 'Chưa tải được ví.')
    }
  }

  const loadServices = async () => {
    setServicesLoading(true)
    setServicesError('')
    try {
      const data = await servicesApi.list({ ownerUid: 'mine' })
      setServices(data.services || [])
    } catch (loadError) {
      setServicesError(loadError.message)
    } finally {
      setServicesLoading(false)
    }
  }

  useEffect(() => {
    loadAvailability()
    loadRequests()
    loadOrders()
    loadRevenue()
    loadServices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleAvailability = async () => {
    const next = !available
    setAvailabilityBusy(true)
    setAvailabilityError('')
    try {
      await repairmanApi.setAvailability(next)
      setAvailable(next)
    } catch (toggleError) {
      setAvailabilityError(toggleError.message || 'Không cập nhật được trạng thái.')
    } finally {
      setAvailabilityBusy(false)
    }
  }

  const doRequestAction = async (id, body) => {
    setBusyRequestId(id)
    setRequestsError('')
    try {
      await requestsApi.update(id, body)
      await loadRequests()
    } catch (actionError) {
      setRequestsError(actionError.message)
    } finally {
      setBusyRequestId(null)
    }
  }

  const doOrderAction = async (id, action) => {
    setBusyOrderId(id)
    setOrdersError('')
    try {
      if (action === 'cancel') {
        await ordersApi.cancel(id)
      } else {
        await ordersApi.updateStatus(id, action)
      }
      await loadOrders()
    } catch (actionError) {
      setOrdersError(actionError.message)
    } finally {
      setBusyOrderId(null)
    }
  }

  const submitWithdraw = async (event) => {
    event.preventDefault()
    const amount = Number(withdrawAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setWithdrawError('Vui lòng nhập số tiền hợp lệ.')
      return
    }

    setWithdrawBusy(true)
    setWithdrawError('')
    setWithdrawNotice('')
    try {
      const result = await walletApi.withdraw(amount)
      setWallet(result?.wallet ?? wallet)
      setWithdrawAmount('')
      setWithdrawNotice('Đã gửi yêu cầu rút tiền.')
    } catch (withdrawFailure) {
      setWithdrawError(withdrawFailure.message)
    } finally {
      setWithdrawBusy(false)
    }
  }

  const setServiceField = (name, value) =>
    setServiceForm((prev) => ({ ...prev, [name]: value }))

  const resetServiceForm = () => {
    setServiceForm(emptyService)
    setEditingId(null)
    setServiceFormError('')
  }

  const submitService = async (event) => {
    event.preventDefault()

    if (!serviceForm.title.trim()) {
      setServiceFormError('Vui lòng nhập tên dịch vụ.')
      return
    }
    if (!Number(serviceForm.startingPrice) || Number(serviceForm.startingPrice) <= 0) {
      setServiceFormError('Vui lòng nhập giá khởi điểm hợp lệ (lớn hơn 0).')
      return
    }

    const price = Number(serviceForm.startingPrice)
    const payload = {
      title: serviceForm.title.trim(),
      category: serviceForm.category,
      categoryName: categoryLabel(serviceForm.category),
      startingPrice: price,
      priceDisplay: serviceForm.priceDisplay.trim() || `Từ ${fmtMoney(price)}`,
      responseTime: serviceForm.responseTime.trim(),
      warranty: serviceForm.warranty.trim(),
      image: serviceForm.image.trim(),
      shortDesc: serviceForm.shortDesc.trim(),
      description: serviceForm.description.trim(),
      signs: textToLines(serviceForm.signs),
    }

    setServiceBusy(true)
    setServiceFormError('')
    setServiceNotice('')
    try {
      if (editingId) {
        await servicesApi.update(editingId, payload)
        setServiceNotice('Đã cập nhật dịch vụ.')
      } else {
        await servicesApi.create(payload)
        setServiceNotice('Đã thêm dịch vụ mới.')
      }
      resetServiceForm()
      await loadServices()
    } catch (submitError) {
      setServiceFormError(submitError.message)
    } finally {
      setServiceBusy(false)
    }
  }

  const startEditService = (service) => {
    setEditingId(service.id)
    setServiceForm({
      title: service.title || '',
      category: service.category || 'electric',
      startingPrice: String(service.startingPrice ?? ''),
      priceDisplay: service.priceDisplay || '',
      responseTime: service.responseTime || '',
      warranty: service.warranty || '',
      image: service.image || '',
      shortDesc: service.shortDesc || '',
      description: service.description || '',
      signs: Array.isArray(service.signs)
        ? service.signs
            .map((sign) =>
              sign && typeof sign === 'object' ? sign.text ?? sign.label ?? '' : String(sign),
            )
            .filter(Boolean)
            .join('\n')
        : '',
    })
    setServiceFormError('')
    setServiceNotice('')
  }

  const removeService = async (service) => {
    if (!window.confirm(`Bạn có chắc muốn xoá dịch vụ "${service.title}"?`)) return

    setBusyServiceId(service.id)
    setServiceFormError('')
    setServiceNotice('')
    try {
      await servicesApi.remove(service.id)
      if (editingId === service.id) resetServiceForm()
      setServiceNotice('Đã xoá dịch vụ.')
      await loadServices()
    } catch (removeError) {
      setServiceFormError(removeError.message)
    } finally {
      setBusyServiceId(null)
    }
  }

  const uid = user?.uid
  const visibleRequests = requests.filter(
    (request) => request.repairmanUid === uid || (!request.repairmanUid && request.status === 'pending'),
  )
  const openRequests = visibleRequests.filter((request) => request.status === 'pending')
  const myRequests = visibleRequests.filter((request) => request.status !== 'pending')

  const visibleOrders = orders.filter(
    (order) =>
      order.repairmanUid === uid ||
      (!order.repairmanUid &&
        ['pending', 'payment_verified', 'confirmed'].includes(order.status)),
  )
  const completedOrders = visibleOrders.filter((order) => order.status === 'completed')

  return (
    <DashboardLayout roleLabel="Thợ sửa chữa">
      <div className="page">
        <header className="page__header page__header--row">
          <div>
            <h1>
              Xin chào
              {user?.displayName
                ? `, ${user.displayName.trim().split(' ').slice(-1)[0]}`
                : ''}
            </h1>
            <p>Nhận việc sửa chữa, xử lý đơn dịch vụ và quản lý dịch vụ của bạn.</p>
          </div>

          <div className="admin-actions">
            <button
              type="button"
              className={`btn btn--sm ${available ? 'btn--primary' : 'btn--outline'}`}
              onClick={toggleAvailability}
              disabled={availabilityBusy}
            >
              {availabilityBusy
                ? 'Đang lưu…'
                : available
                  ? 'Đang sẵn sàng nhận việc'
                  : 'Tạm nghỉ'}
            </button>
          </div>
        </header>

        {availabilityError && (
          <div className="alert alert--error" role="alert">
            <span>{availabilityError}</span>
          </div>
        )}

        <div className="dash-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={activeTab === tab.key ? 'dash-tabs__item is-active' : 'dash-tabs__item'}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'requests' && (
          <>
            {requestsError && (
              <div className="alert alert--error" role="alert">
                <span>{requestsError}</span>
              </div>
            )}

            <section className="card">
              <h2 className="card__title">Việc mới — chờ tiếp nhận ({openRequests.length})</h2>

              {requestsLoading ? (
                <p className="card__empty">Đang tải danh sách…</p>
              ) : openRequests.length === 0 ? (
                <p className="card__empty">Hiện không có yêu cầu mới nào.</p>
              ) : (
                <ul className="req-list">
                  {openRequests.map((request) => {
                    const action = nextAction(request, uid)
                    return (
                      <li key={request.id} className="req-item">
                        <div className="req-item__top">
                          <div>
                            <strong>{request.device || request.serviceName}</strong>
                            {request.appointmentTime && (
                              <div style={{ fontSize: 13, color: '#16a34a', fontWeight: 600, marginTop: 2 }}>
                                Hẹn khách: {request.appointmentDate} ({request.appointmentTime})
                              </div>
                            )}
                          </div>
                          <StatusBadge status={request.status} />
                        </div>
                        <p className="req-item__issue">{request.issue}</p>
                        <p className="req-item__meta">
                          Khách: {request.customerName || '—'} • SĐT:{' '}
                          {request.phone || request.customerPhone || 'Chưa có SĐT'} • Địa chỉ:{' '}
                          {request.address}
                        </p>
                        <div className="req-item__foot">
                          <span className="req-item__date">Gửi lúc: {fmtDate(request.createdAt)}</span>
                          {action && (
                            <button
                              className="btn btn--primary btn--sm"
                              type="button"
                              onClick={() => doRequestAction(request.id, action.body)}
                              disabled={busyRequestId === request.id}
                            >
                              {busyRequestId === request.id ? action.busy : action.label}
                            </button>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            <section className="card">
              <h2 className="card__title">Việc của tôi ({myRequests.length})</h2>

              {requestsLoading ? (
                <p className="card__empty">Đang tải danh sách…</p>
              ) : myRequests.length === 0 ? (
                <p className="card__empty">Bạn chưa nhận việc nào.</p>
              ) : (
                <ul className="req-list">
                  {myRequests.map((request) => {
                    const action = nextAction(request, uid)
                    return (
                      <li key={request.id} className="req-item">
                        <div className="req-item__top">
                          <div>
                            <strong>{request.device || request.serviceName}</strong>
                            {request.appointmentTime && (
                              <div style={{ fontSize: 13, color: '#16a34a', fontWeight: 600, marginTop: 2 }}>
                                Hẹn khách: {request.appointmentDate} ({request.appointmentTime})
                              </div>
                            )}
                          </div>
                          <StatusBadge status={request.status} />
                        </div>
                        <p className="req-item__issue">{request.issue}</p>
                        <p className="req-item__meta">
                          Khách: {request.customerName || '—'} • SĐT:{' '}
                          {request.phone || request.customerPhone || '—'} • Địa chỉ: {request.address}
                        </p>
                        <div className="req-item__foot">
                          <span className="req-item__date">{fmtDate(request.createdAt)}</span>
                          {action && (
                            <button
                              className="btn btn--primary btn--sm"
                              type="button"
                              onClick={() => doRequestAction(request.id, action.body)}
                              disabled={busyRequestId === request.id}
                            >
                              {busyRequestId === request.id ? action.busy : action.label}
                            </button>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </>
        )}

        {activeTab === 'orders' && (
          <section className="card">
            <div className="toolbar">
              <h2 className="card__title">Đơn dịch vụ ({visibleOrders.length})</h2>
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={loadOrders}
                disabled={ordersLoading}
              >
                {ordersLoading ? 'Đang tải…' : 'Làm mới'}
              </button>
            </div>

            {ordersError && (
              <div className="alert alert--error" role="alert">
                <span>{ordersError}</span>
              </div>
            )}

            {ordersLoading ? (
              <p className="card__empty">Đang tải danh sách đơn hàng…</p>
            ) : visibleOrders.length === 0 ? (
              <p className="card__empty">Chưa có đơn hàng nào cần xử lý.</p>
            ) : (
              <ul className="req-list">
                {visibleOrders.map((order) => {
                  const statusInfo = ORDER_STATUS[order.status] || {
                    label: order.status,
                    cls: 'status--pending',
                  }
                  const mine = order.repairmanUid === uid
                  const claimable =
                    !order.repairmanUid &&
                    ['pending', 'payment_verified', 'confirmed'].includes(order.status)
                  const canStart =
                    mine && ['pending', 'payment_verified', 'confirmed'].includes(order.status)
                  const canFinish = mine && order.status === 'delivering'
                  const canCancel =
                    mine && !['completed', 'cancelled'].includes(order.status)
                  const total = order.finalAmount ?? order.totalAmount ?? 0
                  const itemCount = order.items?.length ?? 0
                  const busy = busyOrderId === order.id

                  return (
                    <li key={order.id} className="req-item">
                      <div className="req-item__top">
                        <div>
                          <strong>Đơn #{order.id}</strong>
                          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                            Đặt lúc: {fmtDate(order.createdAt)}
                          </div>
                        </div>
                        <span className={`status ${statusInfo.cls}`}>{statusInfo.label}</span>
                      </div>

                      <p className="req-item__meta">
                        Người nhận: {order.receiverName || '—'} • SĐT: {order.phone || '—'}
                      </p>
                      <p className="req-item__meta">Địa chỉ: {order.address || '—'}</p>
                      <p className="req-item__meta">
                        {itemCount} dịch vụ • Tổng: <strong>{fmtMoney(total)}</strong>
                      </p>

                      <div className="req-item__foot">
                        <span className="req-item__date">
                          {order.repairmanName ? `Phụ trách: ${order.repairmanName}` : 'Chưa có thợ nhận'}
                        </span>
                        <span className="admin-actions">
                          {claimable && (
                            <button
                              className="btn btn--primary btn--sm"
                              type="button"
                              onClick={() => doOrderAction(order.id, 'delivering')}
                              disabled={busy}
                            >
                              {busy ? 'Đang xử lý…' : 'Nhận đơn & giao hàng'}
                            </button>
                          )}
                          {canStart && (
                            <button
                              className="btn btn--primary btn--sm"
                              type="button"
                              onClick={() => doOrderAction(order.id, 'delivering')}
                              disabled={busy}
                            >
                              {busy ? 'Đang xử lý…' : 'Bắt đầu giao'}
                            </button>
                          )}
                          {canFinish && (
                            <button
                              className="btn btn--primary btn--sm"
                              type="button"
                              onClick={() => doOrderAction(order.id, 'completed')}
                              disabled={busy}
                            >
                              {busy ? 'Đang xử lý…' : 'Hoàn thành'}
                            </button>
                          )}
                          {canCancel && (
                            <button
                              className="btn btn--outline btn--sm"
                              type="button"
                              onClick={() => doOrderAction(order.id, 'cancel')}
                              disabled={busy}
                            >
                              Hủy đơn
                            </button>
                          )}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )}

        {activeTab === 'revenue' && (
          <>
            <section className="card">
              <h2 className="card__title">Doanh thu</h2>

              {statsError && (
                <div className="alert alert--error" role="alert">
                  <span>{statsError}</span>
                </div>
              )}

              <div className="stat-grid">
                <div className="stat">
                  <span className="stat__label">Doanh thu đã hoàn thành</span>
                  <strong className="stat__value stat__value--money">
                    {fmtMoney(stats?.revenue ?? 0)}
                  </strong>
                </div>
                <div className="stat">
                  <span className="stat__label">Đơn đang xử lý</span>
                  <strong className="stat__value">{stats?.inProgressOrders ?? 0}</strong>
                </div>
                <div className="stat">
                  <span className="stat__label">Tổng đơn</span>
                  <strong className="stat__value">{stats?.totalOrders ?? 0}</strong>
                </div>
                <div className="stat">
                  <span className="stat__label">Việc sửa đã xong</span>
                  <strong className="stat__value">{stats?.completedRequests ?? 0}</strong>
                </div>
              </div>
            </section>

            <section className="card">
              <h2 className="card__title">Ví của tôi</h2>

              {walletError && (
                <div className="alert alert--error" role="alert">
                  <span>{walletError}</span>
                </div>
              )}

              <p className="page__hint">
                Số dư hiện tại: <strong>{fmtMoney(wallet?.balance ?? 0)}</strong>
              </p>

              {withdrawNotice && (
                <div className="alert alert--success" role="status">
                  <span>{withdrawNotice}</span>
                </div>
              )}
              {withdrawError && (
                <div className="alert alert--error" role="alert">
                  <span>{withdrawError}</span>
                </div>
              )}

              <form className="form" onSubmit={submitWithdraw} noValidate>
                <Field
                  id="withdraw-amount"
                  label="Số tiền rút (đ)"
                  type="number"
                  min="0"
                  value={withdrawAmount}
                  onChange={(event) => setWithdrawAmount(event.target.value)}
                  placeholder="VD: 200000"
                />
                <div className="admin-actions">
                  <button className="btn btn--primary" type="submit" disabled={withdrawBusy}>
                    {withdrawBusy ? 'Đang xử lý…' : 'Rút tiền'}
                  </button>
                </div>
              </form>
            </section>

            <section className="card">
              <h2 className="card__title">Đơn đã hoàn thành ({completedOrders.length})</h2>

              {ordersLoading ? (
                <p className="card__empty">Đang tải danh sách…</p>
              ) : completedOrders.length === 0 ? (
                <p className="card__empty">Chưa có đơn nào hoàn thành.</p>
              ) : (
                <ul className="req-list">
                  {completedOrders.map((order) => (
                    <li key={order.id} className="req-item">
                      <div className="req-item__top">
                        <strong>Đơn #{order.id}</strong>
                        <strong>{fmtMoney(order.finalAmount ?? order.totalAmount ?? 0)}</strong>
                      </div>
                      <p className="req-item__meta">
                        Người nhận: {order.receiverName || '—'} • {order.phone || '—'}
                      </p>
                      <p className="req-item__meta">Địa chỉ: {order.address || '—'}</p>
                      <div className="req-item__foot">
                        <span className="req-item__date">Hoàn thành: {fmtDate(order.createdAt)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}

        {activeTab === 'services' && (
          <div className="admin-cols">
            <section className="card">
              <h2 className="card__title">{editingId ? 'Sửa dịch vụ' : 'Thêm dịch vụ'}</h2>

              {serviceFormError && (
                <div className="alert alert--error" role="alert">
                  <span>{serviceFormError}</span>
                </div>
              )}
              {serviceNotice && (
                <div className="alert alert--success" role="status">
                  <span>{serviceNotice}</span>
                </div>
              )}

              <form className="form" onSubmit={submitService} noValidate>
                <Field
                  id="rm-service-title"
                  label="Tên dịch vụ *"
                  value={serviceForm.title}
                  onChange={(event) => setServiceField('title', event.target.value)}
                  placeholder="VD: Sửa chữa điện chập, mất điện cục bộ"
                />

                <div className="field">
                  <label htmlFor="rm-service-category">Danh mục</label>
                  <div className="field__control">
                    <select
                      id="rm-service-category"
                      className="admin-select"
                      value={serviceForm.category}
                      onChange={(event) => setServiceField('category', event.target.value)}
                    >
                      {CATEGORY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form__grid">
                  <Field
                    id="rm-service-price"
                    label="Giá khởi điểm (đ) *"
                    type="number"
                    min="0"
                    value={serviceForm.startingPrice}
                    onChange={(event) => setServiceField('startingPrice', event.target.value)}
                    placeholder="VD: 200000"
                  />
                  <Field
                    id="rm-service-price-display"
                    label="Hiển thị giá"
                    value={serviceForm.priceDisplay}
                    onChange={(event) => setServiceField('priceDisplay', event.target.value)}
                    placeholder="Để trống để tự tạo"
                  />
                </div>

                <div className="form__grid">
                  <Field
                    id="rm-service-response"
                    label="Thời gian có mặt"
                    value={serviceForm.responseTime}
                    onChange={(event) => setServiceField('responseTime', event.target.value)}
                    placeholder="VD: 15 - 30 phút"
                  />
                  <Field
                    id="rm-service-warranty"
                    label="Bảo hành"
                    value={serviceForm.warranty}
                    onChange={(event) => setServiceField('warranty', event.target.value)}
                    placeholder="VD: 6 tháng"
                  />
                </div>

                <Field
                  id="rm-service-image"
                  label="Ảnh (URL)"
                  value={serviceForm.image}
                  onChange={(event) => setServiceField('image', event.target.value)}
                  placeholder="https://..."
                />

                <div className="field">
                  <label htmlFor="rm-service-short">Mô tả ngắn</label>
                  <div className="field__control">
                    <textarea
                      id="rm-service-short"
                      rows="2"
                      value={serviceForm.shortDesc}
                      onChange={(event) => setServiceField('shortDesc', event.target.value)}
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="rm-service-desc">Mô tả chi tiết</label>
                  <div className="field__control">
                    <textarea
                      id="rm-service-desc"
                      rows="4"
                      value={serviceForm.description}
                      onChange={(event) => setServiceField('description', event.target.value)}
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="rm-service-signs">Dấu hiệu sự cố (mỗi dòng một mục)</label>
                  <div className="field__control">
                    <textarea
                      id="rm-service-signs"
                      rows="4"
                      value={serviceForm.signs}
                      onChange={(event) => setServiceField('signs', event.target.value)}
                      placeholder={'Aptomat nhảy liên tục\nỔ cắm bị đen, nóng chảy'}
                    />
                  </div>
                </div>

                <div className="admin-actions">
                  <button className="btn btn--primary" type="submit" disabled={serviceBusy}>
                    {serviceBusy ? 'Đang lưu…' : editingId ? 'Lưu thay đổi' : 'Thêm dịch vụ'}
                  </button>
                  {editingId && (
                    <button
                      className="btn btn--outline"
                      type="button"
                      onClick={resetServiceForm}
                      disabled={serviceBusy}
                    >
                      Huỷ
                    </button>
                  )}
                </div>
              </form>
            </section>

            <section className="card">
              <div className="toolbar">
                <h2 className="card__title">Dịch vụ của tôi ({services.length})</h2>
              </div>

              {servicesError && (
                <div className="alert alert--error" role="alert">
                  <span>{servicesError}</span>
                </div>
              )}

              {servicesLoading ? (
                <p className="card__empty">Đang tải danh sách…</p>
              ) : services.length === 0 ? (
                <p className="card__empty">Bạn chưa tạo dịch vụ nào.</p>
              ) : (
                <ul className="req-list">
                  {services.map((service) => (
                    <li key={service.id} className="req-item">
                      <div className="req-item__top">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          {service.image && (
                            <img
                              src={service.image}
                              alt={service.title}
                              style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }}
                            />
                          )}
                          <strong
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {service.title}
                          </strong>
                        </div>
                        <span className="chip">
                          {service.categoryName || categoryLabel(service.category)}
                        </span>
                      </div>

                      <p className="req-item__meta">
                        <strong>{service.priceDisplay || fmtMoney(service.startingPrice)}</strong>
                        {service.responseTime ? ` · Có mặt sau ${service.responseTime}` : ''}
                        {service.warranty ? ` · Bảo hành ${service.warranty}` : ''}
                      </p>

                      <div className="req-item__foot">
                        <span className="req-item__date">Cập nhật: {fmtDate(service.updatedAt)}</span>
                        <span className="admin-actions">
                          <button
                            className="btn btn--outline btn--sm"
                            type="button"
                            onClick={() => startEditService(service)}
                          >
                            Sửa
                          </button>
                          <button
                            className="btn btn--outline btn--sm"
                            type="button"
                            onClick={() => removeService(service)}
                            disabled={busyServiceId === service.id}
                          >
                            Xoá
                          </button>
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
