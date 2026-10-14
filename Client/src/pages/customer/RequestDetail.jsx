import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import DashboardLayout from '../../layouts/DashboardLayout.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { requestsApi, STATUS_LABEL } from '../../lib/requests.js'
import { api } from '../../lib/api.js'
import { getToken } from '../../lib/firebase.js'
import { fmtDate, fmtDateTime } from '../../lib/format.js'

const STEPS = ['pending', 'assigned', 'in_progress', 'done']

/** Trả về giá trị đầu tiên "có dữ liệu" trong danh sách (bỏ qua undefined/null/''). */
const firstValue = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== '')

export default function RequestDetail() {
  const { id } = useParams()
  const requestId = decodeURIComponent(id || '')

  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)

  // Đánh giá dịch vụ
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [ratingBusy, setRatingBusy] = useState(false)
  const [ratingError, setRatingError] = useState('')
  const [ratingDone, setRatingDone] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setNotFound(false)

    // Không có API get(id) cho yêu cầu sửa chữa → tải danh sách rồi tìm theo id.
    requestsApi
      .list()
      .then((data) => {
        if (cancelled) return
        const list = data?.requests || []
        const found = list.find((item) => String(item.id) === String(requestId))
        if (found) setRequest(found)
        else setNotFound(true)
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError?.message || 'Không thể tải yêu cầu sửa chữa.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [requestId])

  // Kiểm tra xem đơn đã được đánh giá chưa (chỉ với đơn đã hoàn thành).
  useEffect(() => {
    if (!request || request.status !== 'done') return
    let cancelled = false

    getToken()
      .then((token) =>
        api.get(`/api/ratings?requestId=${encodeURIComponent(requestId)}`, token),
      )
      .then((data) => {
        if (cancelled) return
        const reviewed = (data?.ratings || []).some(
          (item) => String(item.requestId) === String(requestId),
        )
        if (reviewed) setRatingDone(true)
      })
      .catch(() => {
        // Không chặn giao diện nếu không kiểm tra được — người dùng vẫn có thể gửi.
      })

    return () => {
      cancelled = true
    }
  }, [request, requestId])

  const submitRating = async (event) => {
    event.preventDefault()
    if (ratingBusy || ratingDone) return

    const score = Number(rating)
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      setRatingError('Vui lòng chọn số sao từ 1 đến 5.')
      return
    }

    setRatingBusy(true)
    setRatingError('')
    try {
      const token = await getToken()
      // Máy chủ đọc trường `score`; gửi kèm `rating` để tương thích hai chiều.
      await api.post(
        '/api/ratings',
        { requestId, score, rating: score, comment: comment.trim() },
        token,
      )
      setRatingDone(true)
    } catch (submitError) {
      if (submitError?.status === 409) {
        // Đơn đã được đánh giá trước đó → coi như thành công.
        setRatingDone(true)
      } else {
        setRatingError(submitError?.message || 'Gửi đánh giá thất bại. Vui lòng thử lại.')
      }
    } finally {
      setRatingBusy(false)
    }
  }

  const currentStep = (() => {
    if (!request) return 0
    const index = STEPS.indexOf(request.status)
    return index === -1 ? 0 : index
  })()

  const serviceName = request
    ? firstValue(request.service, request.serviceName, request.device, 'Yêu cầu sửa chữa')
    : ''
  const scheduleDate = request
    ? firstValue(request.scheduledDate, request.appointmentDate)
    : ''
  const scheduleTime = request
    ? firstValue(request.scheduledTime, request.appointmentTime)
    : ''
  const note = request ? firstValue(request.note, request.notes) : ''

  return (
    <DashboardLayout roleLabel="Khách hàng">
      <div className="page">
        <Link to="/customer" className="detail-back">
          <span aria-hidden="true">←</span> Quay lại trang khách hàng
        </Link>

        {loading ? (
          <section className="card">
            <p className="card__empty">Đang tải yêu cầu sửa chữa…</p>
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
        ) : notFound || !request ? (
          <section className="card request-detail__missing">
            <h1>Không tìm thấy yêu cầu</h1>
            <p>
              Yêu cầu sửa chữa này không tồn tại hoặc không thuộc tài khoản của bạn.
            </p>
            <Link to="/customer" className="btn btn--primary">
              Về trang khách hàng
            </Link>
          </section>
        ) : (
          <div className="request-detail">
            <header className="request-detail__header">
              <div className="request-detail__heading">
                <span className="request-detail__eyebrow">Yêu cầu sửa chữa</span>
                <h1>{serviceName}</h1>
                <p className="request-detail__sub">
                  Mã yêu cầu #{request.id} · Gửi lúc {fmtDate(request.createdAt) || '—'}
                </p>
              </div>
              <StatusBadge status={request.status} />
            </header>

            {/* Tiến trình xử lý */}
            <ol className="tracker">
              {STEPS.map((step, index) => {
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
                      {STATUS_LABEL[step] ?? step}
                    </span>
                  </li>
                )
              })}
            </ol>

            <div className="detail-grid">
              <section className="info-card">
                <h2 className="info-card__title">Thông tin sự cố</h2>
                <dl className="info-list">
                  <div className="info-row">
                    <dt>Dịch vụ</dt>
                    <dd>{serviceName}</dd>
                  </div>
                  <div className="info-row">
                    <dt>Thiết bị</dt>
                    <dd>{request.device || '—'}</dd>
                  </div>
                  <div className="info-row info-row--block">
                    <dt>Mô tả</dt>
                    <dd>{request.issue || '—'}</dd>
                  </div>
                </dl>
              </section>

              <section className="info-card">
                <h2 className="info-card__title">Địa điểm &amp; liên hệ</h2>
                <dl className="info-list">
                  <div className="info-row info-row--block">
                    <dt>Địa chỉ</dt>
                    <dd>{request.address || '—'}</dd>
                  </div>
                  <div className="info-row">
                    <dt>Số điện thoại</dt>
                    <dd>
                      {request.phone ? (
                        <a href={`tel:${request.phone}`}>{request.phone}</a>
                      ) : (
                        '—'
                      )}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="info-card">
                <h2 className="info-card__title">Lịch hẹn</h2>
                <dl className="info-list">
                  <div className="info-row">
                    <dt>Ngày hẹn</dt>
                    <dd>{scheduleDate || 'Sớm nhất có thể'}</dd>
                  </div>
                  <div className="info-row">
                    <dt>Giờ hẹn</dt>
                    <dd>{scheduleTime || '—'}</dd>
                  </div>
                  <div className="info-row info-row--block">
                    <dt>Ghi chú</dt>
                    <dd>{note || 'Không có'}</dd>
                  </div>
                </dl>
              </section>

              <section className="info-card">
                <h2 className="info-card__title">Thợ phụ trách</h2>
                {request.repairmanName ? (
                  <div className="info-assignee">
                    <span className="info-assignee__avatar" aria-hidden="true">
                      {request.repairmanName.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <strong>{request.repairmanName}</strong>
                      <span>Kỹ thuật viên phụ trách</span>
                    </div>
                  </div>
                ) : (
                  <p className="info-card__empty">Chưa phân công</p>
                )}
              </section>
            </div>

            {request.status === 'done' && (
              <section className="rating-card">
                <h2 className="rating-card__title">Đánh giá dịch vụ</h2>

                {ratingDone ? (
                  <div className="alert alert--success" role="status">
                    <span>
                      Cảm ơn bạn đã đánh giá dịch vụ. Phản hồi của bạn giúp chúng tôi
                      phục vụ tốt hơn!
                    </span>
                  </div>
                ) : (
                  <form className="rating-form" onSubmit={submitRating} noValidate>
                    <p className="rating-form__hint">
                      Bạn thấy chất lượng sửa chữa thế nào?
                    </p>

                    <div
                      className="rating-stars"
                      role="radiogroup"
                      aria-label="Số sao đánh giá"
                    >
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          role="radio"
                          aria-checked={star === rating}
                          aria-label={`${star} sao`}
                          className={star <= rating ? 'rating-star is-active' : 'rating-star'}
                          onClick={() => {
                            setRating(star)
                            setRatingError('')
                          }}
                        >
                          ★
                        </button>
                      ))}
                    </div>

                    {ratingError && (
                      <span className="field__error" role="alert">
                        {ratingError}
                      </span>
                    )}

                    <div className="field">
                      <label htmlFor="rating-comment">Nhận xét</label>
                      <div className="field__control">
                        <textarea
                          id="rating-comment"
                          rows="3"
                          placeholder="Chia sẻ cảm nhận về chất lượng dịch vụ…"
                          value={comment}
                          onChange={(event) => setComment(event.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form__actions">
                      <button
                        className="btn btn--primary"
                        type="submit"
                        disabled={ratingBusy}
                      >
                        {ratingBusy ? 'Đang gửi…' : 'Gửi đánh giá'}
                      </button>
                    </div>
                  </form>
                )}
              </section>
            )}

            <section className="info-card request-detail__timeline">
              <h2 className="info-card__title">Thời gian</h2>
              <dl className="info-list">
                <div className="info-row">
                  <dt>Tạo lúc</dt>
                  <dd>{fmtDateTime(request.createdAt) || '—'}</dd>
                </div>
                <div className="info-row">
                  <dt>Cập nhật gần nhất</dt>
                  <dd>{fmtDateTime(request.updatedAt) || '—'}</dd>
                </div>
              </dl>
            </section>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
