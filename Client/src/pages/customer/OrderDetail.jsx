import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import DashboardLayout from '../../layouts/DashboardLayout.jsx'
import { ordersApi, paymentsApi } from '../../lib/orders.js'
import { fmtMoney, fmtDate, fmtDateTime } from '../../lib/format.js'

const ORDER_STATUS = {
  pending: { label: 'Chờ xác nhận', cls: 'status--pending' },
  payment_verified: { label: 'Đã thanh toán', cls: 'status--assigned' },
  confirmed: { label: 'Đã xác nhận', cls: 'status--assigned' },
  delivering: { label: 'Đang giao & lắp đặt', cls: 'status--in_progress' },
  completed: { label: 'Đã hoàn thành', cls: 'status--done' },
  cancelled: { label: 'Đã hủy', cls: 'status--pending' },
}

const ORDER_STEPS = [
  'pending',
  'payment_verified',
  'confirmed',
  'delivering',
  'completed',
]

const PAYMENT_METHOD_LABEL = {
  cod: 'Thanh toán khi nhận / nghiệm thu (COD)',
  momo: 'Ví điện tử MoMo (QR)',
  zalopay: 'Ví ZaloPay (QR)',
  stripe: 'Thẻ quốc tế (Stripe)',
}

const ELECTRONIC_METHODS = ['momo', 'zalopay', 'stripe']

/** Lấy URL thanh toán từ phản hồi (hỗ trợ nhiều tên trường của các cổng khác nhau). */
const pickPaymentUrl = (result) =>
  result?.payUrl ||
  result?.deeplink ||
  result?.checkoutUrl ||
  result?.url ||
  result?.sessionUrl ||
  result?.momoUrl ||
  ''

export default function OrderDetail() {
  const { id } = useParams()
  const orderId = decodeURIComponent(id || '')

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)

  const [actionBusy, setActionBusy] = useState('')
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')

  const loadOrder = async () => {
    setLoading(true)
    setError('')
    setNotFound(false)
    try {
      const data = await ordersApi.get(orderId)
      setOrder(data?.order || null)
    } catch (loadError) {
      if (loadError?.status === 404) setNotFound(true)
      else setError(loadError?.message || 'Không thể tải đơn dịch vụ.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!orderId) {
      setLoading(false)
      setNotFound(true)
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    setNotFound(false)

    ordersApi
      .get(orderId)
      .then((data) => {
        if (!cancelled) setOrder(data?.order || null)
      })
      .catch((loadError) => {
        if (cancelled) return
        if (loadError?.status === 404) setNotFound(true)
        else setError(loadError?.message || 'Không thể tải đơn dịch vụ.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [orderId])

  const handleCancel = async () => {
    if (!order) return
    if (!window.confirm(`Bạn có chắc muốn hủy đơn hàng #${order.id}?`)) return

    setActionBusy('cancel')
    setNotice('')
    setActionError('')
    try {
      const res = await ordersApi.cancel(order.id)
      setNotice(res?.message || `Đơn hàng #${order.id} đã được hủy.`)
      await loadOrder()
    } catch (cancelError) {
      setActionError(cancelError?.message || 'Không thể hủy đơn hàng. Vui lòng thử lại.')
    } finally {
      setActionBusy('')
    }
  }

  const handlePay = async () => {
    if (!order) return
    setActionBusy('pay')
    setActionError('')
    setNotice('')
    try {
      const amount = order.finalAmount ?? order.totalAmount ?? 0
      const result =
        order.paymentMethod === 'stripe'
          ? await paymentsApi.createStripe(order.id, amount)
          : await paymentsApi.createMoMo(order.id, amount, `Đơn hàng #${order.id}`)

      const url = pickPaymentUrl(result)
      if (url) {
        window.location.href = url
      } else {
        setActionError('Không nhận được liên kết thanh toán. Vui lòng thử lại.')
      }
    } catch (payError) {
      setActionError(payError?.message || 'Không tạo được phiên thanh toán.')
    } finally {
      setActionBusy('')
    }
  }

  const statusInfo = order
    ? ORDER_STATUS[order.status] || { label: order.status || '—', cls: 'status--pending' }
    : null

  const currentStep = (() => {
    if (!order) return 0
    const index = ORDER_STEPS.indexOf(order.status)
    return index === -1 ? 0 : index
  })()

  const items = order?.items || []
  const totalAmount = Number(order?.totalAmount) || 0
  const discountAmount = Number(order?.discountAmount) || 0
  const finalAmount =
    order?.finalAmount ?? Math.max(0, totalAmount - discountAmount)
  const promoCode = order?.promoCode || order?.promo || ''
  const isCancelled = order?.status === 'cancelled'
  const canCancel = order?.status === 'pending'
  const canPay =
    order?.status === 'pending' && ELECTRONIC_METHODS.includes(order?.paymentMethod)

  return (
    <DashboardLayout roleLabel="Khách hàng">
      <div className="page">
        <Link to="/customer" className="detail-back">
          <span aria-hidden="true">←</span> Quay lại trang khách hàng
        </Link>

        {loading ? (
          <section className="card">
            <p className="card__empty">Đang tải đơn dịch vụ…</p>
          </section>
        ) : error ? (
          <section className="card">
            <div className="alert alert--error" role="alert">
              <span>{error}</span>
            </div>
            <div className="detail-back__actions">
              <Link to="/customer" className="btn btn--outline">
                Về trang khách hàng
              </Link>
            </div>
          </section>
        ) : notFound || !order ? (
          <section className="card request-detail__missing">
            <h1>Không tìm thấy đơn dịch vụ</h1>
            <p>Đơn hàng này không tồn tại hoặc không thuộc tài khoản của bạn.</p>
            <Link to="/customer" className="btn btn--primary">
              Về trang khách hàng
            </Link>
          </section>
        ) : (
          <div className="order-detail">
            <header className="order-detail__header">
              <div className="order-detail__heading">
                <span className="order-detail__eyebrow">Đơn dịch vụ</span>
                <h1>Đơn hàng #{order.id}</h1>
                <p className="order-detail__sub">
                  Đặt lúc {fmtDate(order.createdAt) || '—'}
                </p>
              </div>
              <span className={`status ${statusInfo.cls}`}>{statusInfo.label}</span>
            </header>

            {isCancelled ? (
              <div className="order-detail__cancelled">
                <strong>Đơn hàng đã bị hủy.</strong>
                {order.refundMessage && <span>{order.refundMessage}</span>}
              </div>
            ) : (
              <ol className="tracker tracker--order">
                {ORDER_STEPS.map((step, index) => {
                  const state =
                    index < currentStep
                      ? 'is-done'
                      : index === currentStep
                        ? 'is-active'
                        : ''
                  return (
                    <li key={step} className={`tracker__step ${state}`}>
                      <span className="tracker__dot" aria-hidden="true">
                        {index < currentStep ? '✓' : index + 1}
                      </span>
                      <span className="tracker__label">
                        {ORDER_STATUS[step]?.label ?? step}
                      </span>
                    </li>
                  )
                })}
              </ol>
            )}

            {notice && (
              <div className="alert alert--success" role="status">
                <span>{notice}</span>
              </div>
            )}
            {actionError && (
              <div className="alert alert--error" role="alert">
                <span>{actionError}</span>
              </div>
            )}

            <section className="info-card">
              <h2 className="info-card__title">Dịch vụ trong đơn ({items.length})</h2>
              {items.length === 0 ? (
                <p className="info-card__empty">Đơn hàng không có dịch vụ nào.</p>
              ) : (
                <ul className="order-items">
                  {items.map((item, index) => (
                    <li
                      key={item.productId || index}
                      className="order-item"
                    >
                      <div className="order-item__thumb">
                        {item.productImage ? (
                          <img src={item.productImage} alt={item.productName || 'Dịch vụ'} />
                        ) : (
                          <span>{(item.productName || '?').charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="order-item__info">
                        <div className="order-item__name">
                          {item.productName || 'Dịch vụ'}
                        </div>
                        <div className="order-item__meta">
                          {fmtMoney(item.price)} × {item.quantity ?? 1}
                          {item.includeInstallation && ' • kèm thợ lắp đặt'}
                        </div>
                      </div>
                      <div className="order-item__total">
                        {fmtMoney(
                          item.subtotal ??
                            (Number(item.price) || 0) * (Number(item.quantity) || 0),
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="detail-grid">
              <section className="info-card">
                <h2 className="info-card__title">Thanh toán</h2>
                <div className="order-summary">
                  <div className="order-summary__row">
                    <span>Tạm tính</span>
                    <span>{fmtMoney(totalAmount)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="order-summary__row order-summary__row--discount">
                      <span>Giảm giá{promoCode ? ` (${promoCode})` : ''}</span>
                      <span>-{fmtMoney(discountAmount)}</span>
                    </div>
                  )}
                  <div className="order-summary__row order-summary__row--total">
                    <span>Tổng thanh toán</span>
                    <strong>{fmtMoney(finalAmount)}</strong>
                  </div>
                </div>
                <dl className="info-list">
                  <div className="info-row">
                    <dt>Phương thức</dt>
                    <dd>
                      {PAYMENT_METHOD_LABEL[order.paymentMethod] ||
                        'Thanh toán khi nhận (COD)'}
                    </dd>
                  </div>
                  <div className="info-row">
                    <dt>Trạng thái</dt>
                    <dd>
                      <span className={`status ${statusInfo.cls}`}>
                        {statusInfo.label}
                      </span>
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="info-card">
                <h2 className="info-card__title">Người nhận</h2>
                <dl className="info-list">
                  <div className="info-row">
                    <dt>Họ tên</dt>
                    <dd>{order.receiverName || '—'}</dd>
                  </div>
                  <div className="info-row">
                    <dt>Số điện thoại</dt>
                    <dd>
                      {order.phone ? <a href={`tel:${order.phone}`}>{order.phone}</a> : '—'}
                    </dd>
                  </div>
                  <div className="info-row info-row--block">
                    <dt>Địa chỉ</dt>
                    <dd>{order.address || '—'}</dd>
                  </div>
                  <div className="info-row info-row--block">
                    <dt>Ghi chú</dt>
                    <dd>{order.note || 'Không có'}</dd>
                  </div>
                </dl>
              </section>
            </div>

            {(canCancel || canPay) && (
              <section className="order-detail__actions">
                {canPay && (
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={handlePay}
                    disabled={actionBusy === 'pay'}
                  >
                    {actionBusy === 'pay' ? 'Đang tạo phiên…' : 'Thanh toán ngay'}
                  </button>
                )}
                {canCancel && (
                  <button
                    type="button"
                    className="btn btn--outline"
                    onClick={handleCancel}
                    disabled={actionBusy === 'cancel'}
                  >
                    {actionBusy === 'cancel' ? 'Đang hủy…' : 'Hủy đơn'}
                  </button>
                )}
              </section>
            )}

            <section className="info-card order-detail__timeline">
              <h2 className="info-card__title">Thời gian</h2>
              <dl className="info-list">
                <div className="info-row">
                  <dt>Tạo lúc</dt>
                  <dd>{fmtDateTime(order.createdAt) || '—'}</dd>
                </div>
                <div className="info-row">
                  <dt>Cập nhật gần nhất</dt>
                  <dd>{fmtDateTime(order.updatedAt) || '—'}</dd>
                </div>
                {order.repairmanName && (
                  <div className="info-row">
                    <dt>Thợ phụ trách</dt>
                    <dd>{order.repairmanName}</dd>
                  </div>
                )}
              </dl>
            </section>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
