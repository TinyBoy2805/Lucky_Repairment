import { Link, useLocation, useSearchParams } from 'react-router-dom'

/**
 * Trang kết quả thanh toán điện tử (Stripe / MoMo / ZaloPay).
 * `status` = 'success' | 'cancelled'
 */
export default function PaymentResult({ status = 'success' }) {
  const [params] = useSearchParams()
  const location = useLocation()
  const orderId =
    params.get('orderId') ||
    new URLSearchParams(location.search).get('orderId') ||
    ''
  const success = status === 'success'

  return (
    <div className="page">
      <header className="page__header">
        <h1>{success ? 'Thanh toán thành công' : 'Thanh toán đã hủy'}</h1>
        <p>
          {success
            ? 'Cảm ơn bạn! Giao dịch đã được ghi nhận. Kỹ thuật viên sẽ liên hệ xác nhận thời gian giao & lắp đặt.'
            : 'Giao dịch chưa hoàn tất. Bạn có thể thanh toán lại hoặc chọn hình thức thanh toán khác.'}
        </p>
      </header>

      <div
        className={`alert ${success ? 'alert--success' : 'alert--error'}`}
        role="status"
        style={{ marginBottom: 16 }}
      >
        <span>
          {success ? 'Thanh toán đã hoàn tất.' : 'Bạn đã hủy phiên thanh toán.'}
          {orderId ? ` Mã đơn hàng: #${orderId}` : ''}
        </span>
      </div>

      <div className="form__actions">
        <Link to="/customer" className="btn btn--primary">
          Xem đơn hàng của tôi
        </Link>
        <Link to="/products" className="btn btn--outline">
          Tiếp tục mua sắm
        </Link>
      </div>
    </div>
  )
}
