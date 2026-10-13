import { useEffect, useState } from 'react'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import Field from '../components/Field.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { useAuth } from '../context/useAuth.js'
import { requestsApi } from '../lib/requests.js'
import { ordersApi, productsApi } from '../lib/products.js'
import { walletApi } from '../lib/wallet.js'
import { repairmanApi } from '../lib/repairman.js'
import { fmtDate, fmtMoney } from '../lib/format.js'

const TABS = [
  { key: 'requests', label: 'Việc sửa' },
  { key: 'orders', label: 'Đơn hàng' },
  { key: 'revenue', label: 'Doanh thu' },
  { key: 'products', label: 'Sản phẩm' },
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
  { value: 'electric', label: 'Thiết bị điện' },
  { value: 'water', label: 'Thiết bị nước' },
]

const emptyProduct = {
  name: '',
  category: 'electric',
  brand: '',
  price: '',
  originalPrice: '',
  image: '',
  shortDesc: '',
  description: '',
  installationFee: '',
  inStock: true,
  warranty: '',
  specifications: '',
  features: '',
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

  // Đơn hàng thiết bị
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

  // Sản phẩm
  const [products, setProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [productsError, setProductsError] = useState('')
  const [productForm, setProductForm] = useState(emptyProduct)
  const [editingId, setEditingId] = useState(null)
  const [productBusy, setProductBusy] = useState(false)
  const [busyProductId, setBusyProductId] = useState(null)
  const [productNotice, setProductNotice] = useState('')
  const [productFormError, setProductFormError] = useState('')

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

  const loadProducts = async () => {
    setProductsLoading(true)
    setProductsError('')
    try {
      const data = await productsApi.list({ ownerUid: 'mine' })
      setProducts(data.products || [])
    } catch (loadError) {
      setProductsError(loadError.message)
    } finally {
      setProductsLoading(false)
    }
  }

  useEffect(() => {
    loadAvailability()
    loadRequests()
    loadOrders()
    loadRevenue()
    loadProducts()
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

  const setProductField = (name, value) =>
    setProductForm((prev) => ({ ...prev, [name]: value }))

  const resetProductForm = () => {
    setProductForm(emptyProduct)
    setEditingId(null)
    setProductFormError('')
  }

  const submitProduct = async (event) => {
    event.preventDefault()

    if (!productForm.name.trim()) {
      setProductFormError('Vui lòng nhập tên sản phẩm.')
      return
    }
    if (!Number(productForm.price) || Number(productForm.price) <= 0) {
      setProductFormError('Vui lòng nhập giá bán hợp lệ (lớn hơn 0).')
      return
    }

    const payload = {
      name: productForm.name.trim(),
      category: productForm.category,
      brand: productForm.brand.trim() || 'Khác',
      price: Number(productForm.price),
      originalPrice: Number(productForm.originalPrice) || 0,
      image: productForm.image.trim(),
      shortDesc: productForm.shortDesc.trim(),
      description: productForm.description.trim(),
      installationFee: Number(productForm.installationFee) || 0,
      inStock: Boolean(productForm.inStock),
      warranty: productForm.warranty.trim(),
      specifications: textToLines(productForm.specifications),
      features: textToLines(productForm.features),
    }

    setProductBusy(true)
    setProductFormError('')
    setProductNotice('')
    try {
      if (editingId) {
        await productsApi.update(editingId, payload)
        setProductNotice('Đã cập nhật sản phẩm.')
      } else {
        await productsApi.create(payload)
        setProductNotice('Đã thêm sản phẩm mới.')
      }
      resetProductForm()
      await loadProducts()
    } catch (submitError) {
      setProductFormError(submitError.message)
    } finally {
      setProductBusy(false)
    }
  }

  const startEditProduct = (product) => {
    setEditingId(product.id)
    setProductForm({
      name: product.name || '',
      category: product.category || 'electric',
      brand: product.brand || '',
      price: String(product.price ?? ''),
      originalPrice: String(product.originalPrice ?? ''),
      image: product.image || '',
      shortDesc: product.shortDesc || '',
      description: product.description || '',
      installationFee: String(product.installationFee ?? ''),
      inStock: product.inStock !== false,
      warranty: product.warranty || '',
      specifications: Array.isArray(product.specifications)
        ? product.specifications
            .map((item) =>
              item && typeof item === 'object'
                ? `${item.key ?? ''}: ${item.value ?? ''}`.trim()
                : String(item),
            )
            .join('\n')
        : '',
      features: Array.isArray(product.features) ? product.features.join('\n') : '',
    })
    setProductFormError('')
    setProductNotice('')
  }

  const removeProduct = async (product) => {
    if (!window.confirm(`Bạn có chắc muốn xoá sản phẩm "${product.name}"?`)) return

    setBusyProductId(product.id)
    setProductFormError('')
    setProductNotice('')
    try {
      await productsApi.remove(product.id)
      if (editingId === product.id) resetProductForm()
      setProductNotice('Đã xoá sản phẩm.')
      await loadProducts()
    } catch (removeError) {
      setProductFormError(removeError.message)
    } finally {
      setBusyProductId(null)
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
            <p>Nhận việc sửa chữa, giao thiết bị và quản lý gian hàng.</p>
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
              <h2 className="card__title">Đơn thiết bị ({visibleOrders.length})</h2>
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
                        {itemCount} sản phẩm • Tổng: <strong>{fmtMoney(total)}</strong>
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

        {activeTab === 'products' && (
          <div className="admin-cols">
            <section className="card">
              <h2 className="card__title">{editingId ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h2>

              {productFormError && (
                <div className="alert alert--error" role="alert">
                  <span>{productFormError}</span>
                </div>
              )}
              {productNotice && (
                <div className="alert alert--success" role="status">
                  <span>{productNotice}</span>
                </div>
              )}

              <form className="form" onSubmit={submitProduct} noValidate>
                <Field
                  id="rm-product-name"
                  label="Tên sản phẩm *"
                  value={productForm.name}
                  onChange={(event) => setProductField('name', event.target.value)}
                  placeholder="VD: Aptomat chống giật Panasonic RCBO 32A"
                />

                <div className="field">
                  <label htmlFor="rm-product-category">Danh mục</label>
                  <div className="field__control">
                    <select
                      id="rm-product-category"
                      className="admin-select"
                      value={productForm.category}
                      onChange={(event) => setProductField('category', event.target.value)}
                    >
                      {CATEGORY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <Field
                  id="rm-product-brand"
                  label="Thương hiệu"
                  value={productForm.brand}
                  onChange={(event) => setProductField('brand', event.target.value)}
                  placeholder="VD: Panasonic"
                />

                <Field
                  id="rm-product-price"
                  label="Giá bán (đ) *"
                  type="number"
                  min="0"
                  value={productForm.price}
                  onChange={(event) => setProductField('price', event.target.value)}
                  placeholder="VD: 385000"
                />

                <Field
                  id="rm-product-original"
                  label="Giá gốc (đ)"
                  type="number"
                  min="0"
                  value={productForm.originalPrice}
                  onChange={(event) => setProductField('originalPrice', event.target.value)}
                  placeholder="VD: 450000"
                />

                <Field
                  id="rm-product-install"
                  label="Phí thợ lắp đặt (đ)"
                  type="number"
                  min="0"
                  value={productForm.installationFee}
                  onChange={(event) => setProductField('installationFee', event.target.value)}
                  placeholder="VD: 100000"
                />

                <Field
                  id="rm-product-image"
                  label="Ảnh (URL)"
                  value={productForm.image}
                  onChange={(event) => setProductField('image', event.target.value)}
                  placeholder="https://..."
                />

                <div className="field">
                  <label htmlFor="rm-product-short">Mô tả ngắn</label>
                  <div className="field__control">
                    <textarea
                      id="rm-product-short"
                      rows="2"
                      value={productForm.shortDesc}
                      onChange={(event) => setProductField('shortDesc', event.target.value)}
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="rm-product-desc">Mô tả chi tiết</label>
                  <div className="field__control">
                    <textarea
                      id="rm-product-desc"
                      rows="4"
                      value={productForm.description}
                      onChange={(event) => setProductField('description', event.target.value)}
                    />
                  </div>
                </div>

                <Field
                  id="rm-product-warranty"
                  label="Bảo hành"
                  value={productForm.warranty}
                  onChange={(event) => setProductField('warranty', event.target.value)}
                  placeholder="VD: 24 tháng chính hãng"
                />

                <div className="field">
                  <label htmlFor="rm-product-specs">Thông số kỹ thuật (mỗi dòng một mục)</label>
                  <div className="field__control">
                    <textarea
                      id="rm-product-specs"
                      rows="4"
                      value={productForm.specifications}
                      onChange={(event) => setProductField('specifications', event.target.value)}
                      placeholder={'Thương hiệu: Panasonic\nCông suất: 125W'}
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="rm-product-features">Đặc điểm nổi bật (mỗi dòng một mục)</label>
                  <div className="field__control">
                    <textarea
                      id="rm-product-features"
                      rows="3"
                      value={productForm.features}
                      onChange={(event) => setProductField('features', event.target.value)}
                      placeholder={'Tự động ngắt khi quá tải\nChống rò điện giật'}
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="form__check">
                    <input
                      type="checkbox"
                      checked={productForm.inStock}
                      onChange={(event) => setProductField('inStock', event.target.checked)}
                    />
                    Còn hàng
                  </label>
                </div>

                <div className="admin-actions">
                  <button className="btn btn--primary" type="submit" disabled={productBusy}>
                    {productBusy ? 'Đang lưu…' : editingId ? 'Lưu thay đổi' : 'Thêm sản phẩm'}
                  </button>
                  {editingId && (
                    <button
                      className="btn btn--outline"
                      type="button"
                      onClick={resetProductForm}
                      disabled={productBusy}
                    >
                      Hủy
                    </button>
                  )}
                </div>
              </form>
            </section>

            <section className="card">
              <div className="toolbar">
                <h2 className="card__title">Sản phẩm của tôi ({products.length})</h2>
              </div>

              {productsError && (
                <div className="alert alert--error" role="alert">
                  <span>{productsError}</span>
                </div>
              )}

              {productsLoading ? (
                <p className="card__empty">Đang tải danh sách…</p>
              ) : products.length === 0 ? (
                <p className="card__empty">Bạn chưa đăng bán sản phẩm nào.</p>
              ) : (
                <ul className="req-list">
                  {products.map((product) => (
                    <li key={product.id} className="req-item">
                      <div className="req-item__top">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          {product.image && (
                            <img
                              src={product.image}
                              alt={product.name}
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
                            {product.name}
                          </strong>
                        </div>
                        <span
                          className={product.inStock ? 'status status--done' : 'status status--failed'}
                        >
                          {product.inStock ? 'Còn hàng' : 'Hết hàng'}
                        </span>
                      </div>

                      <p className="req-item__meta">
                        {product.brand || 'Khác'} ·{' '}
                        {CATEGORY_OPTIONS.find((option) => option.value === product.category)?.label ||
                          'Khác'}{' '}
                        · <strong>{fmtMoney(product.price)}</strong>
                      </p>

                      <div className="req-item__foot">
                        <span className="req-item__date">Cập nhật: {fmtDate(product.updatedAt)}</span>
                        <span className="admin-actions">
                          <button
                            className="btn btn--outline btn--sm"
                            type="button"
                            onClick={() => startEditProduct(product)}
                          >
                            Sửa
                          </button>
                          <button
                            className="btn btn--outline btn--sm"
                            type="button"
                            onClick={() => removeProduct(product)}
                            disabled={busyProductId === product.id}
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
