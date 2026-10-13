import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { ordersApi, paymentsApi } from '../lib/products.js'
import { computeDiscount, isValidPromoCode } from '../lib/promo.js'

const PAYMENT_METHOD_LABEL = {
  cod: 'Thanh toán khi nhận hàng / nghiệm thu (COD)',
  momo: 'Ví điện tử MoMo (QR)',
  zalopay: 'Ví ZaloPay (QR)',
  stripe: 'Thẻ quốc tế (Stripe)',
}

export default function OrderModal({ product, quantity = 1, includeInstallation = false, isOpen, onClose, onSuccess }) {
  const { user } = useAuth()

  const [form, setForm] = useState(() => ({
    receiverName: user?.displayName || '',
    phone: user?.phone || '',
    address: '',
    note: '',
    paymentMethod: 'cod',
    // New payment method tracking
    stripeToken: '',
    promoCode: '',
  }))
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [createdOrder, setCreatedOrder] = useState(null)
  const [submitError, setSubmitError] = useState('')
  const [paySession, setPaySession] = useState(null)
  const [payBusy, setPayBusy] = useState(false)
  const [payError, setPayError] = useState('')

  if (!isOpen || !product) return null

  const unitPrice = product.price || 0
  const installFee = includeInstallation ? (product.installationFee || 0) : 0
  const productSubtotal = unitPrice * quantity
  const installSubtotal = installFee * quantity
  const totalAmount = productSubtotal + installSubtotal
  const discountPreview = computeDiscount(form.promoCode, totalAmount)

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

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setBusy(true)
    setSubmitError('')

    try {
      // Kiểm tra & tính mã khuyến mãi
      const promoCode = form.promoCode.trim().toUpperCase()
      if (promoCode && !isValidPromoCode(promoCode)) {
        setErrors({ promoCode: 'Mã khuyến mãi không hợp lệ.' })
        setBusy(false)
        return
      }
      const discountAmount = computeDiscount(promoCode, totalAmount)

      const orderPayload = {
        receiverName: form.receiverName.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        note: form.note.trim(),
        paymentMethod: form.paymentMethod,
        items: [
          {
            productId: product.id,
            productName: product.name,
            productImage: product.image,
            category: product.category,
            brand: product.brand,
            price: unitPrice,
            quantity,
            includeInstallation,
            installationFee: installFee,
          },
        ],
        promoCode,
        discountAmount,
      }

      const res = await ordersApi.create(orderPayload)
      setCreatedOrder(res.order)
      if (onSuccess) onSuccess(res.order)
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
        <button
          type="button"
          className="order-modal__close"
          onClick={handleClose}
          aria-label="Đóng"
        >
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
              Cảm ơn quý khách đã đặt mua <strong>{product.name}</strong>. Kỹ thuật viên sẽ liên hệ qua số điện thoại <strong>{createdOrder.phone}</strong> trong vòng 15 phút để xác nhận thời gian giao và lắp đặt.
            </p>

            <div className="order-success__info">
              <div>
                <span>Mã đơn hàng:</span>
                <strong>#{createdOrder.id}</strong>
              </div>
              <div>
                <span>Tổng thanh toán:</span>
                <strong className="text-brand">{((createdOrder.finalAmount ?? createdOrder.totalAmount) || 0).toLocaleString('vi-VN')} đ</strong>
              </div>
              <div>
                <span>Hình thức:</span>
                <span>{PAYMENT_METHOD_LABEL[createdOrder.paymentMethod] || 'Thanh toán khi nhận hàng / nghiệm thu (COD)'}</span>
              </div>
              {createdOrder.discountAmount > 0 && (
                <div>
                  <span>Giảm giá:</span>
                  <strong>{-createdOrder.discountAmount.toLocaleString('vi-VN')} đ</strong>
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
                      Mở ứng dụng {createdOrder.paymentMethod === 'zalopay' ? 'ZaloPay' : 'MoMo'} và quét mã QR để hoàn tất thanh toán.
                    </p>
                  </div>
                )}

                {paySession && paySession.kind === 'stripe' && (
                  <div>
                    <p style={{ fontSize: 13, color: '#64748b' }}>
                      Trang thanh toán Stripe đã được mở ở tab mới. Nếu không thấy, hãy bấm nút bên dưới.
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
              <h3>Xác Nhận Đặt Hàng</h3>
              <p>Vui lòng điền thông tin để nhân viên liên hệ giao hàng & lắp đặt tận nơi.</p>
            </div>

            {submitError && (
              <div className="alert alert--error" role="alert" style={{ marginBottom: 16 }}>
                <span>{submitError}</span>
              </div>
            )}

            {/* Tóm tắt sản phẩm đặt mua */}
            <div className="order-summary-box">
              <img
                src={product.image}
                alt={product.name}
                className="order-summary-box__img"
              />
              <div className="order-summary-box__info">
                <h4 className="order-summary-box__name">{product.name}</h4>
                <div className="order-summary-box__meta">
                  <span>Số lượng: <strong>x{quantity}</strong></span>
                  <span>Đơn giá: <strong>{unitPrice.toLocaleString('vi-VN')} đ</strong></span>
                </div>
                {includeInstallation && (
                  <div className="order-summary-box__install">
                    ✓ Kèm dịch vụ thợ lắp đặt (+{installSubtotal.toLocaleString('vi-VN')} đ)
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="order-form">
              <div className="order-form__grid">
                <div className="field">
                  <label htmlFor="receiverName">Họ và tên người nhận *</label>
                  <div className="field__control">
                    <input
                      id="receiverName"
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
                  <label htmlFor="orderPhone">Số điện thoại liên hệ *</label>
                  <div className="field__control">
                    <input
                      id="orderPhone"
                      type="tel"
                      placeholder="VD: 0912 345 678"
                      value={form.phone}
                      onChange={(e) => update('phone', e.target.value)}
                    />
                  </div>
                  {errors.phone && <span className="field__error">{errors.phone}</span>}
                </div>

                <div className="field">
                  <label htmlFor="orderAddress">Địa chỉ giao hàng & lắp đặt *</label>
                  <div className="field__control">
                    <input
                      id="orderAddress"
                      type="text"
                      placeholder="Số nhà, ngõ/ngách, tên đường, phường/xã, quận/huyện..."
                      value={form.address}
                      onChange={(e) => update('address', e.target.value)}
                    />
                  </div>
                  {errors.address && <span className="field__error">{errors.address}</span>}
                </div>

                <div className="field">
                  <label htmlFor="orderNote">Ghi chú thêm (khung giờ thuận tiện, lưu ý khi lắp đặt...)</label>
                  <div className="field__control">
                    <textarea
                      id="orderNote"
                      rows="2"
                      placeholder="VD: Lắp đặt vào chiều nay sau 14h, gọi trước khi đến..."
                      value={form.note}
                      onChange={(e) => update('note', e.target.value)}
                    />
                  </div>
                </div>

                <div className="field">
                  <label>Phương thức thanh toán</label>
                  <div className="order-payment-options">
                    <label className="order-payment-option">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cod"
                        checked={form.paymentMethod === 'cod'}
                        onChange={(e) => update('paymentMethod', e.target.value)}
                      />
                      <div>
                        <strong>Thanh toán khi nhận hàng / nghiệm thu (COD)</strong>
                        <span>Kiểm tra hàng hoặc lắp đặt hoàn chỉnh mới thanh toán tiền mặt</span>
                      </div>
                    </label>
                    <label className="order-payment-option">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="momo"
                        checked={form.paymentMethod === 'momo'}
                        onChange={(e) => update('paymentMethod', e.target.value)}
                      />
                      <div>
                        <strong>MoMo / ZaloPay (Quét mã QR)</strong>
                        <span>Quét mã QR để thanh toán qua ví điện tử MoMo hoặc ZaloPay</span>
                      </div>
                    </label>
                    <label className="order-payment-option">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="zalopay"
                        checked={form.paymentMethod === 'zalopay'}
                        onChange={(e) => update('paymentMethod', e.target.value)}
                      />
                      <div>
                        <strong>ZaloPay (Quét mã QR)</strong>
                        <span>Thanh toán nhanh bằng ví ZaloPay</span>
                      </div>
                    </label>
                    <label className="order-payment-option">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="stripe"
                        checked={form.paymentMethod === 'stripe'}
                        onChange={(e) => update('paymentMethod', e.target.value)}
                      />
                      <div>
                        <strong>Thẻ credit/debit (Stripe)</strong>
                        <span>Thanh toán sécure qua cổng Stripe</span>
                      </div>
                    </label>
                  </div>
                  {/* Promo code input */}
                  <div className="field">
                    <label>Mã khuyến mãi</label>
                    <div className="field__control">
                      <input
                        type="text"
                        placeholder="Nhập mã giảm giá..."
                        value={form.promoCode || ''}
                        onChange={(e) => update('promoCode', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Stripe card form (conditionally shown when Stripe is selected) */}
                {form.paymentMethod === 'stripe' && (
                  <div className="stripe-card-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Họ và tên trên thẻ</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: Nguyễn Văn A"
                          value={form.stripeName || ''}
                          onChange={(e) => update('stripeName', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Số thẻ</label>
                        <input
                          type="text"
                          placeholder="1234 5678 9012 3456"
                          value={form.stripeCardNumber || ''}
                          onChange={(e) => update('stripeCardNumber', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Ngày hết hạn</label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          value={form.stripeExpiry || ''}
                          onChange={(e) => update('stripeExpiry', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Mã bảo mật (CVC)</label>
                        <input
                          type="text"
                          placeholder="123"
                          value={form.stripeCvv || ''}
                          onChange={(e) => update('stripeCvv', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bảng tính tổng tiền */}
              <div className="order-pricing-summary">
                <div className="order-pricing-row">
                  <span>Tiền sản phẩm:</span>
                  <span>{productSubtotal.toLocaleString('vi-VN')} đ</span>
                </div>
                {includeInstallation && (
                  <div className="order-pricing-row">
                    <span>Phí thợ lắp đặt tại nhà:</span>
                    <span>{installSubtotal.toLocaleString('vi-VN')} đ</span>
                  </div>
                )}
                {discountPreview > 0 && (
                  <div className="order-pricing-row">
                    <span>Giảm giá ({form.promoCode.trim().toUpperCase()}):</span>
                    <span>-{discountPreview.toLocaleString('vi-VN')} đ</span>
                  </div>
                )}
                <div className="order-pricing-row order-pricing-row--total">
                  <span>Tổng tiền thanh toán:</span>
                  <strong>{(totalAmount - discountPreview).toLocaleString('vi-VN')} đ</strong>
                </div>
              </div>

              <div className="order-form__actions">
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={handleClose}
                  disabled={busy}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={busy}
                >
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