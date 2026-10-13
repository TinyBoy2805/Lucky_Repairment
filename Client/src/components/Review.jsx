import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import Field from '../components/Field.jsx'
import { productsApi } from '../lib/products.js'
import { fmtDate } from '../lib/format.js'

const SCORE_OPTIONS = [1, 2, 3, 4, 5]

export default function Review() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [product, setProduct] = useState(null)
  const [reviews, setReviews] = useState([])
  const [form, setForm] = useState({ rating: 5, comment: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!productId) return
    productsApi
      .get(productId)
      .then((data) => setProduct(data.product))
      .catch(() => setProduct(null))
    productsApi
      .reviews(productId)
      .then((data) => setReviews(data.reviews || []))
      .catch(() => setReviews([]))
  }, [productId])

  const update = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSuccess('')
    setError('')

    if (!form.rating || form.rating < 1 || form.rating > 5) {
      setErrors({ rating: 'Vui lòng chọn số sao từ 1 đến 5.' })
      return
    }

    setBusy(true)
    try {
      const data = await productsApi.createReview(productId, {
        rating: form.rating,
        comment: form.comment.trim(),
      })
      setReviews((prev) => [data.review, ...prev])
      setForm({ rating: 5, comment: '' })
      setSuccess('Cảm ơn bạn đã đánh giá sản phẩm!')
    } catch (err) {
      setError(err.message || 'Đánh giá thất bại. Vui lòng thử lại.')
    } finally {
      setBusy(false)
    }
  }

  if (!user) return null

  return (
    <div className="page">
      <header className="page__header">
        <h1>Đánh giá sản phẩm</h1>
        <p>{product ? product.name : 'Chia sẻ trải nghiệm của bạn về sản phẩm đã mua.'}</p>
      </header>

      {error && (
        <div className="alert alert--error" role="alert" style={{ marginBottom: 16 }}>
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="alert alert--success" role="status" style={{ marginBottom: 16 }}>
          <span>{success}</span>
        </div>
      )}

      <div className="admin-cols">
        <section className="card">
          <h2 className="card__title">Gửi đánh giá của bạn</h2>

          {product && (
            <div className="order-summary-box" style={{ marginBottom: 16 }}>
              <img src={product.image} alt={product.name} className="order-summary-box__img" />
              <div className="order-summary-box__info">
                <h4 className="order-summary-box__name">{product.name}</h4>
                <div className="order-summary-box__meta">
                  <span>{product.brand}</span>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="form" noValidate>
            <div className="field">
              <label>Số sao *</label>
              <div style={{ display: 'flex', gap: 6, fontSize: 28, lineHeight: 1 }}>
                {SCORE_OPTIONS.map((score) => (
                  <button
                    key={score}
                    type="button"
                    aria-label={`${score} sao`}
                    onClick={() => update('rating', score)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: score <= form.rating ? '#f59e0b' : '#cbd5e1',
                      fontSize: 28,
                      padding: 0,
                    }}
                  >
                    ★
                  </button>
                ))}
              </div>
              {errors.rating && <span className="field__error">{errors.rating}</span>}
            </div>

            <Field
              id="review-comment"
              label="Nhận xét"
              name="comment"
              placeholder="Chia sẻ cảm nhận về chất lượng sản phẩm…"
              value={form.comment}
              onChange={(e) => update('comment', e.target.value)}
            />

            <div className="form__actions">
              <button type="submit" className="btn btn--primary" disabled={busy}>
                {busy ? 'Đang gửi…' : 'Gửi đánh giá'}
              </button>
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => navigate(-1)}
                disabled={busy}
              >
                Quay lại
              </button>
            </div>
          </form>
        </section>

        <section className="card">
          <h2 className="card__title">Đánh giá gần đây ({reviews.length})</h2>
          {reviews.length === 0 ? (
            <p className="card__empty">Chưa có đánh giá nào cho sản phẩm này.</p>
          ) : (
            <ul className="req-list">
              {reviews.slice(0, 8).map((review) => (
                <li key={review.id} className="req-item">
                  <div className="req-item__top">
                    <strong>{review.customerName || 'Khách hàng'}</strong>
                    <span style={{ color: '#f59e0b' }}>
                      {'★'.repeat(review.rating)}
                      <span style={{ color: '#cbd5e1' }}>{'★'.repeat(5 - review.rating)}</span>
                    </span>
                  </div>
                  {review.comment && <p className="req-item__meta">{review.comment}</p>}
                  <p className="req-item__meta">{fmtDate(review.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div style={{ marginTop: 16 }}>
        <Link to="/customer" className="btn btn--outline">
          Về trang đơn hàng của tôi
        </Link>
      </div>
    </div>
  )
}
