import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { ordersApi } from '../lib/products.js'

export default function OrderModal({
  product,
  quantity = 1,
  includeInstallation = false,
  isOpen,
  onClose,
  onSuccess,
}) {
  const { user } = useAuth()

  const [form, setForm] = useState(() => ({
    receiverName: user?.displayName || '',
    phone: user?.phone || '',
    address: '',
    note: '',
    paymentMethod: 'cod',
  }))
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [createdOrder, setCreatedOrder] = useState(null)
  const [submitError, setSubmitError] = useState('')

  if (!isOpen || !product) return null

  const unitPrice = product.price || 0
  const installFee = includeInstallation ? (product.installationFee || 0) : 0
  const productSubtotal = unitPrice * quantity
  const installSubtotal = installFee * quantity
  const totalAmount = productSubtotal + installSubtotal

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
            price: unitPrice,
            quantity,
            includeInstallation,
            installationFee: installFee,
          },
        ],
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
    onClose()
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
                <strong className="text-brand">{createdOrder.totalAmount?.toLocaleString('vi-VN')} đ</strong>
              </div>
              <div>
                <span>Hình thức:</span>
                <span>{createdOrder.paymentMethod === 'cod' ? 'Thanh toán khi nhận hàng / nghiệm thu (COD)' : 'Chuyển khoản'}</span>
              </div>
            </div>

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
                      value="banking"
                      checked={form.paymentMethod === 'banking'}
                      onChange={(e) => update('paymentMethod', e.target.value)}
                    />
                    <div>
                      <strong>Chuyển khoản qua ngân hàng / Quét mã VietQR</strong>
                      <span>Nhân viên sẽ gửi mã QR chuyển khoản khi xác nhận đơn</span>
                    </div>
                  </label>
                </div>
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
                <div className="order-pricing-row order-pricing-row--total">
                  <span>Tổng tiền thanh toán:</span>
                  <strong>{totalAmount.toLocaleString('vi-VN')} đ</strong>
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
