import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/useCart.js'
import { useAuth } from '../context/useAuth.js'
import CartCheckoutModal from '../components/CartCheckoutModal.jsx'
import { fmtMoney } from '../lib/format.js'

export default function Cart() {
  const { items, totalAmount, totalItems, removeItem, updateQuantity, setInstallation } =
    useCart()
  const { user } = useAuth()
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  if (items.length === 0) {
    return (
      <div className="page">
        <div className="home-container" style={{ maxWidth: 720, margin: '0 auto' }}>
          <header className="page__header">
            <h1>Giỏ hàng</h1>
            <p>Các thiết bị bạn đã chọn sẽ hiển thị tại đây.</p>
          </header>
          <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div className="cart-empty-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            </div>
            <p className="card__empty" style={{ marginBottom: 16 }}>
              Giỏ hàng của bạn đang trống.
            </p>
            <Link to="/products" className="btn btn--primary">
              Khám phá thiết bị điện nước
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="home-container" style={{ maxWidth: 1000, margin: '0 auto' }}>
        <header className="page__header">
          <h1>Giỏ hàng ({totalItems} sản phẩm)</h1>
          <p>Kiểm tra lại danh sách và tiến hành đặt mua.</p>
        </header>

        <section className="card">
          <ul className="cart-list">
            {items.map((item) => {
              const lineTotal =
                item.quantity * (item.price + (item.includeInstallation ? item.installationFee : 0))

              return (
                <li key={item.key} className="cart-item">
                  <Link to={`/products/${item.productId}`} className="cart-item__thumb">
                    {item.productImage ? (
                      <img src={item.productImage} alt={item.productName} />
                    ) : (
                      <span>{item.productName?.charAt(0)}</span>
                    )}
                  </Link>

                  <div className="cart-item__info">
                    <Link to={`/products/${item.productId}`} className="cart-item__name">
                      {item.productName}
                    </Link>
                    <div className="cart-item__meta">
                      Đơn giá: <strong>{fmtMoney(item.price)}</strong>
                      {item.installationFee > 0 && (
                        <label className="cart-item__install">
                          <input
                            type="checkbox"
                            checked={item.includeInstallation}
                            onChange={(e) => setInstallation(item.key, e.target.checked)}
                          />
                          Thợ lắp đặt (+{item.installationFee.toLocaleString('vi-VN')} đ)
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="cart-item__qty">
                    <button
                      type="button"
                      className="product-qty-btn"
                      onClick={() => updateQuantity(item.key, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      −
                    </button>
                    <span className="product-qty-val">{item.quantity}</span>
                    <button
                      type="button"
                      className="product-qty-btn"
                      onClick={() => updateQuantity(item.key, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>

                  <div className="cart-item__total">{fmtMoney(lineTotal)}</div>

                  <button
                    type="button"
                    className="cart-item__remove"
                    onClick={() => removeItem(item.key)}
                    aria-label={`Xoá ${item.productName} khỏi giỏ`}
                  >
                    ✕
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="cart-summary">
            <div className="cart-summary__row">
              <span>Tổng cộng:</span>
              <strong>{fmtMoney(totalAmount)}</strong>
            </div>
            <button
              type="button"
              className="btn btn--primary btn--lg btn--block"
              onClick={() => setIsCheckoutOpen(true)}
            >
              Tiến hành đặt hàng
            </button>
            <p className="cart-summary__note">
              Phương thức thanh toán: COD, MoMo/ZaloPay (QR) hoặc thẻ qua Stripe.
            </p>
          </div>
        </section>

        <div style={{ marginTop: 12 }}>
          <Link to="/products" className="form__link">
            ← Tiếp tục mua sắm
          </Link>
        </div>
      </div>

      {isCheckoutOpen && (
        <CartCheckoutModal
          isOpen={isCheckoutOpen}
          items={items}
          user={user}
          onClose={() => setIsCheckoutOpen(false)}
        />
      )}
    </div>
  )
}