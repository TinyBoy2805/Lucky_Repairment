import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/useCart.js'
import { ordersApi, paymentsApi } from '../lib/products.js'
import { computeDiscount, isValidPromoCode, normalizePromoCode } from '../lib/promo.js'
import { fmtMoney } from '../lib/format.js'

const PAYMENT_METHOD_LABEL = {
  cod: 'Thanh toán khi nhận hàng / nghiệm thu (COD)',
  momo: 'Ví điện tử MoMo (QR)',
  zalopay: 'Ví ZaloPay (QR)',
  stripe: 'Thẻ quốc tế (Stripe)',
}

export default function CartCheckoutModal({ isOpen, items, user, onClose, onOrderCreated }) {
  const { clearCart } = useCart()

  const [form, setForm] = useState(() => ({
    receiverName: user?.displayName || '',
    phone: user?.phone || '',
    address: '',
    note: '',
    paymentMethod: 'cod',
    promoCode: '',
  }))
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [createdOrder, setCreatedOrder] = useState(null)
  const [submitError, setSubmitError] = useState('')
  const [paySession, setPaySession] = useState(null)
  const [payBusy, setPayBusy] = useState(false)
  const [payError, setPayError] = useState('')

  if (!isOpen) return null

  const totalAmount = items.reduce((sum, item) => {
    const install = item.includeInstallation ? item.installationFee : 0
    return sum + (item.price + install) * item.quantity
  }, 0)

  const discountPreview = computeDiscount(form.promoCode, totalAmount)
  const promoCode = normalizePromoCode(form.promoCode)

  const update = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const nextErrors = {}
    if (!form.receiverName.trim()) nextErrors.receiverName = 'Vui lòng nhập họ tên người nhận.'
    if (!form.phone.trim()) nextErrors.phone = 'Vui lòng nhập số điện thoại.'
    if (!form.address.trim()) nextErrors.address = 'Vui lòng nhập địa chỉ nhận hàng / lắp đặt.'
    if (promoCode && !isValidPromoCode(promoCode)) {
      nextErrors.promoCode = 'Mã khuyến mãi không hợp lệ.'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setBusy(true)
    setSubmitError('')

    try {
      const discountAmount = computeDiscount(promoCode, totalAmount)
      const orderPayload = {
        receiverName: form.receiverName.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        note: form.note.trim(),
        paymentMethod: form.paymentMethod,
        items: items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          productImage: item.productImage,
          category: item.category,
          brand: item.brand,
          price: item.price,
          quantity: item.quantity,
          includeInstallation: item.includeInstallation,
          installationFee: item.includeInstallation ? item.installationFee : 0,
        })),
        promoCode,
        discountAmount,
      }

      const res = await ordersApi.create(orderPayload)
      setCreatedOrder(res.order)
      if (onOrderCreated) onOrderCreated()
      clearCart()
    } catch (err) {
      setSubmitError(err.message || 'Đặt hàng thất bại. Vui lòng thử lại.')
    } finally {
      setBusy(false)
    }
  }

  const handleClose = () => {
    setCreatedOrder(null)
    setSubmitError('')
    setPaySession(null)
    setPayError('')
    onClose()
  }

  // Tạo phiên thanh toán điện tử (MoMo/ZaloPay QR hoặc Stripe checkout)
  const startElectronicPayment = async () => {
    if (!createdOrder) return
    setPayBusy(true)
    setPayError('')
    try {
      const amount = createdOrder.finalAmount ?? createdOrder.totalAmount
      if (createdOrder.paymentMethod === 'stripe') {
        const { sessionUrl } = await paymentsApi.createStripe(createdOrder.id, amount)
        setPaySession({ kind: 'stripe', url: sessionUrl })
        if (sessionUrl) window.open(sessionUrl, '_blank', 'noopener')
      } else {
        const { momoUrl } = await paymentsApi.createMoMo(
          createdOrder.id,
          amount,
          `Đơn hàng #${createdOrder.id}`,
        )
        setPaySession({ kind: createdOrder.paymentMethod, url: momoUrl })
      }
    } catch (err) {
      setPayError(err.message || 'Không tạo được phiên thanh toán. Vui lòng thử lại.')
    } finally {
      setPayBusy(false)
    }
  }

  return (
    <div className="order-modal-backdrop" onClick={handleClose}>
      <div className="order-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="order-modal__close" onClick={handleClose} aria-label="Đóng">
          ✕
        </button>

        {createdOrder ? (
          <div className="order-success">
            <div className="order-success__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="order-success__title">Đặt Hàng Thành Công!</h3>
            <p className="order-success__desc">
              Cảm ơn quý khách. Kỹ thuật viên sẽ liên hệ qua số điện thoại{' '}
              <strong>{createdOrder.phone}</strong> trong vòng 15 phút để xác nhận thời gian giao và
              lắp đặt.
            </p>

            <div className="order-success__info">
              <div>
                <span>Mã đơn hàng:</span>
                <strong>#{createdOrder.id}</strong>
              </div>
              <div>
                <span>Tổng thanh toán:</span>
                <strong className="text-brand">
                  {fmtMoney(createdOrder.finalAmount ?? createdOrder.totalAmount)}
                </strong>
              </div>
              <div>
                <span>Hình thức:</span>
                <span>{PAYMENT_METHOD_LABEL[createdOrder.paymentMethod] || 'Thanh toán khi nhận hàng / nghiệm thu (COD)'}</span>
              </div>
              {createdOrder.discountAmount > 0 && (
                <div>
                  <span>Giảm giá:</span>
                  <strong>-{fmtMoney(createdOrder.discountAmount)}</strong>
                </div>
              )}
            </div>

            {createdOrder.paymentMethod && createdOrder.paymentMethod !== 'cod' && (
              <div className="order-payment-box" style={{ marginTop: 16, padding: 16, border: '1px solid #e2e8f0', borderRadius: 10, textAlign: 'center' }}>
                <p style={{ fontWeight: 600, marginBottom: 8 }}>
                  {createdOrder.paymentMethod === 'stripe'
                    ? 'Thanh toán bằng thẻ quốc tế (Stripe)'
                    : `Thanh toán qua ${createdOrder.paymentMethod === 'zalopay' ? 'ZaloPay' : 'MoMo'}`}
                </p>

                {payError && <p className="alert alert--error">{payError}</p>}

                {!paySession && (
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={startElectronicPayment}
                    disabled={payBusy}
                  >
                    {payBusy ? 'Đang tạo mã thanh toán…' : 'Tạo mã thanh toán ngay'}
                  </button>
                )}

                {paySession && paySession.kind !== 'stripe' && paySession.url && (
                  <div>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(paySession.url)}`}
                      alt="Mã QR thanh toán"
                      style={{ width: 220, height: 220, margin: '0 auto', display: 'block' }}
                    />
                    <p style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>
                      Mở ứng dụng {createdOrder.paymentMethod === 'zalopay' ? 'ZaloPay' : 'MoMo'} và
                      quét mã QR để hoàn tất thanh toán.
                    </p>
                  </div>
                )}

                {paySession && paySession.kind === 'stripe' && (
                  <div>
                    <p style={{ fontSize: 13, color: '#64748b' }}>
                      Trang thanh toán Stripe đã được mở ở tab mới. Nếu không thấy, hãy bấm nút bên
                      dưới.
                    </p>
                    <a
                      href={paySession.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn--primary"
                    >
                      Mở trang thanh toán Stripe
                    </a>
                  </div>
                )}
              </div>
            )}

            <div className="order-success__actions">
              {user ? (
                <Link to="/customer" className="btn btn--primary" onClick={handleClose}>
                  Xem đơn hàng trong tài khoản
                </Link>
              ) : (
                <button type="button" className="btn btn--primary" onClick={handleClose}>
                  Tiếp tục xem sản phẩm
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="order-modal__body">
            <div className="order-modal__header">
              <h3>Xác Nhận Đặt Hàng ({items.length} sản phẩm)</h3>
              <p>Vui lòng điền thông tin để nhân viên liên hệ giao hàng & lắp đặt tận nơi.</p>
            </div>

            {submitError && (
              <div className="alert alert--error" role="alert" style={{ marginBottom: 16 }}>
                <span>{submitError}</span>
              </div>
            )}

            {/* Danh sách sản phẩm trong đơn */}
            <div className="order-summary-box">
              <ul className="cart-list cart-list--compact">
                {items.map((item) => (
                  <li key={item.key} className="cart-item">
                    <div className="cart-item__thumb">
                      {item.productImage ? (
                        <img src={item.productImage} alt={item.productName} />
                      ) : (
                        <span>{item.productName?.charAt(0)}</span>
                      )}
                    </div>
                    <div className="cart-item__info">
                      <div className="cart-item__name">{item.productName}</div>
                      <div className="cart-item__meta">
                        Số lượng: <strong>x{item.quantity}</strong>
                        {item.includeInstallation && ' • kèm thợ lắp đặt'}
                      </div>
                    </div>
                    <div className="cart-item__total">
                      {fmtMoney(
                        item.quantity *
                          (item.price + (item.includeInstallation ? item.installationFee : 0)),
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <form onSubmit={handleSubmit} className="order-form">
              <div className="order-form__grid">
                <div className="field">
                  <label htmlFor="cartReceiver">Họ và tên người nhận *</label>
                  <div className="field__control">
                    <input
                      id="cartReceiver"
                      type="text"
                      placeholder="VD: Nguyễn Văn A"
                      value={form.receiverName}
                      onChange={(e) => update('receiverName', e.target.value)}
                    />
                  </div>
                  {errors.receiverName && (
                    <span className="field__error">{errors.receiverName}</span>
                  )}
                </div>

                <div className="field">
                  <label htmlFor="cartPhone">Số điện thoại liên hệ *</label>
                  <div className="field__control">
                    <input
                      id="cartPhone"
                      type="tel"
                      placeholder="VD: 0912 345 678"
                      value={form.phone}
                      onChange={(e) => update('phone', e.target.value)}
                    />
                  </div>
                  {errors.phone && <span className="field__error">{errors.phone}</span>}
                </div>

                <div className="field">
                  <label htmlFor="cartAddress">Địa chỉ giao hàng & lắp đặt *</label>
                  <div className="field__control">
                    <input
                      id="cartAddress"
                      type="text"
                      placeholder="Số nhà, ngõ/ngách, tên đường, phường/xã, quận/huyện..."
                      value={form.address}
                      onChange={(e) => update('address', e.target.value)}
                    />
                  </div>
                  {errors.address && <span className="field__error">{errors.address}</span>}
                </div>

                <div className="field">
                  <label htmlFor="cartNote">Ghi chú thêm</label>
                  <div className="field__control">
                    <textarea
                      id="cartNote"
                      rows="2"
                      placeholder="VD: Lắp đặt sau 14h, gọi trước khi đến..."
                      value={form.note}
                      onChange={(e) => update('note', e.target.value)}
                    />
                  </div>
                </div>

                <div className="field">
                  <label>Phương thức thanh toán</label>
                  <div className="order-payment-options">
                    {[
                      ['cod', 'Thanh toán khi nhận hàng / nghiệm thu (COD)', 'Kiểm tra hàng hoặc lắp đặt hoàn chỉnh mới thanh toán tiền mặt'],
                      ['momo', 'MoMo / ZaloPay (Quét mã QR)', 'Quét mã QR để thanh toán qua ví điện tử MoMo hoặc ZaloPay'],
                      ['zalopay', 'ZaloPay (Quét mã QR)', 'Thanh toán nhanh bằng ví ZaloPay'],
                      ['stripe', 'Thẻ credit/debit (Stripe)', 'Thanh toán sécure qua cổng Stripe'],
                    ].map(([value, label, desc]) => (
                      <label key={value} className="order-payment-option">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={value}
                          checked={form.paymentMethod === value}
                          onChange={(e) => update('paymentMethod', e.target.value)}
                        />
                        <div>
                          <strong>{label}</strong>
                          <span>{desc}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="cartPromo">Mã khuyến mãi</label>
                  <div className="field__control">
                    <input
                      id="cartPromo"
                      type="text"
                      placeholder="Nhập mã giảm giá (VD: PROMO10)..."
                      value={form.promoCode || ''}
                      onChange={(e) => update('promoCode', e.target.value)}
                    />
                  </div>
                  {errors.promoCode && (
                    <span className="field__error">{errors.promoCode}</span>
                  )}
                </div>
              </div>

              {/* Bảng tính tổng tiền */}
              <div className="order-pricing-summary">
                <div className="order-pricing-row">
                  <span>Tạm tính ({items.length} sản phẩm):</span>
                  <span>{fmtMoney(totalAmount)}</span>
                </div>
                {discountPreview > 0 && (
                  <div className="order-pricing-row">
                    <span>Giảm giá ({promoCode}):</span>
                    <span>-{fmtMoney(discountPreview)}</span>
                  </div>
                )}
                <div className="order-pricing-row order-pricing-row--total">
                  <span>Tổng tiền thanh toán:</span>
                  <strong>{fmtMoney(totalAmount - discountPreview)}</strong>
                </div>
              </div>

              <div className="order-form__actions">
                <button type="button" className="btn btn--outline" onClick={handleClose} disabled={busy}>
                  Hủy bỏ
                </button>
                <button type="submit" className="btn btn--primary" disabled={busy}>
                  {busy ? 'Đang xử lý đặt hàng…' : 'Xác nhận đặt hàng ngay'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}