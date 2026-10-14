import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/useCart.js'
import { useAuth } from '../context/useAuth.js'
import CartCheckoutModal from '../components/CartCheckoutModal.jsx'
import { fmtMoney } from '../lib/format.js'

export default function Cart() {
  const { items, totalAmount, totalItems, removeItem } = useCart()
  const { user } = useAuth()
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  if (items.length === 0) {
    return (
      <div className="page">
        <div className="home-container" style={{ maxWidth: 720, margin: '0 auto' }}>
          <header className="page__header">
            <h1>Giỏ dịch vụ</h1>
            <p>Các dịch vụ sửa chữa bạn đã chọn sẽ hiển thị tại đây.</p>
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
              Giỏ dịch vụ của bạn đang trống.
            </p>
            <Link to="/services" className="btn btn--primary">
              Khám phá dịch vụ sửa chữa
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
          <h1>Giỏ dịch vụ ({totalItems} dịch vụ)</h1>
          <p>Kiểm tra lại danh sách dịch vụ và tiến hành đặt lịch.</p>
        </header>

        <section className="card">
          <ul className="cart-list">
            {items.map((item) => (
              <li key={item.key} className="cart-item">
                <Link to={`/services/${item.productId}`} className="cart-item__thumb">
                  {item.productImage ? (
                    <img src={item.productImage} alt={item.productName} />
                  ) : (
                    <span>{item.productName?.charAt(0)}</span>
                  )}
                </Link>

                <div className="cart-item__info">
                  <Link to={`/services/${item.productId}`} className="cart-item__name">
                    {item.productName}
                  </Link>
                  <div className="cart-item__meta">
                    Giá tham khảo: <strong>{fmtMoney(item.price)}</strong>
                  </div>
                </div>

                <div className="cart-item__total">{fmtMoney(item.price)}</div>

                <button
                  type="button"
                  className="cart-item__remove"
                  onClick={() => removeItem(item.key)}
                  aria-label={`Xoá ${item.productName} khỏi giỏ`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>

          <div className="cart-summary">
            <div className="cart-summary__row">
              <span>Tạm tính:</span>
              <strong>{fmtMoney(totalAmount)}</strong>
            </div>
            <p className="cart-summary__hint">
              Giá hiển thị là giá tham khảo. Thợ sẽ khảo sát và báo giá chính xác trước khi
              tiến hành sửa chữa.
            </p>
            <button
              type="button"
              className="btn btn--primary btn--lg btn--block"
              onClick={() => setIsCheckoutOpen(true)}
            >
              Tiến hành đặt dịch vụ
            </button>
          </div>
        </section>

        <div style={{ marginTop: 16 }}>
          <Link to="/services" className="btn btn--outline btn--sm">
            ← Chọn thêm dịch vụ
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
