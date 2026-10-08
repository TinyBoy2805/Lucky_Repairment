import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AdminBadge from '../../components/AdminBadge.jsx'
import AdminPager from '../../components/AdminPager.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { adminApi } from '../../lib/admin.js'
import { buildQuery, useDebounced } from '../../lib/query.js'
import { useAdminList } from '../../lib/useAdminList.js'
import { dayEnd, dayStart, fmtDate, fmtMoney } from '../../lib/format.js'

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'pending', label: 'Chờ tiếp nhận' },
  { value: 'assigned', label: 'Đã nhận việc' },
  { value: 'in_progress', label: 'Đang sửa' },
  { value: 'done', label: 'Hoàn thành' },
]

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất trước' },
  { value: 'oldest', label: 'Cũ nhất trước' },
]

const STEPS = [
  { value: 'pending', label: 'Chờ tiếp nhận' },
  { value: 'assigned', label: 'Đã nhận việc' },
  { value: 'in_progress', label: 'Đang sửa' },
  { value: 'done', label: 'Hoàn thành' },
]

const PAGE_SIZE = 10

export default function AdminOrders() {
  const [searchParams] = useSearchParams()
  const [keyword, setKeyword] = useState('')
  const search = useDebounced(keyword)
  const [status, setStatus] = useState(searchParams.get('status') ?? '')
  const [repairmanUid, setRepairmanUid] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const [repairmen, setRepairmen] = useState([])
  const [openId, setOpenId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailError, setDetailError] = useState('')

  const order = sort === 'oldest' ? 'asc' : 'desc'
  const params = {
    search,
    status,
    repairmanUid,
    from: dayStart(from),
    to: dayEnd(to),
    sort: 'createdAt',
    order,
    page,
    pageSize: PAGE_SIZE,
  }
  const key = buildQuery(params)
  const { data, loading, error } = useAdminList(() => adminApi.orders(params), key)

  const orders = data?.requests ?? []

  useEffect(() => {
    adminApi
      .users({ role: 'repairman', pageSize: 100 })
      .then((result) => setRepairmen(result.users ?? []))
      .catch(() => setRepairmen([]))
  }, [])

  const resetFilters = () => {
    setKeyword('')
    setStatus('')
    setRepairmanUid('')
    setFrom('')
    setTo('')
    setSort('newest')
    setPage(1)
  }

  const toggleDetail = async (target) => {
    if (openId === target.id) {
      setOpenId(null)
      setDetail(null)
      return
    }

    setOpenId(target.id)
    setDetail({ loading: true, payments: [], rating: null })
    setDetailError('')

    try {
      const [paymentsResult, ratingsResult] = await Promise.all([
        adminApi.payments.list({ requestId: target.id }),
        adminApi.ratings.list({ requestId: target.id }),
      ])
      setDetail({
        loading: false,
        payments: paymentsResult.payments ?? [],
        rating: (ratingsResult.ratings ?? [])[0] ?? null,
      })
    } catch (detailLoadError) {
      setDetail({ loading: false, payments: [], rating: null })
      setDetailError(detailLoadError.message)
    }
  }

  const currentStep = (target) =>
    STEPS.findIndex((step) => step.value === target.status)

  return (
    <div className="page">
      <header className="page__header">
        <h1>Đơn hàng</h1>
        <p>Theo dõi toàn bộ yêu cầu sửa chữa trên hệ thống.</p>
      </header>

      {error && (
        <div className="alert alert--error" role="alert">
          <span>{error}</span>
        </div>
      )}

      <section className="card">
        <div className="toolbar">
          <input
            className="admin-input"
            type="search"
            placeholder="Tìm theo thiết bị, khách, địa chỉ…"
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value)
              setPage(1)
            }}
          />
          <select
            className="admin-select"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="admin-select"
            value={repairmanUid}
            onChange={(event) => {
              setRepairmanUid(event.target.value)
              setPage(1)
            }}
          >
            <option value="">Tất cả thợ</option>
            {repairmen.map((item) => (
              <option key={item.uid} value={item.uid}>
                {item.displayName || item.email}
              </option>
            ))}
          </select>
          <label className="toolbar__date">
            Từ
            <input
              className="admin-input"
              type="date"
              value={from}
              onChange={(event) => {
                setFrom(event.target.value)
                setPage(1)
              }}
            />
          </label>
          <label className="toolbar__date">
            Đến
            <input
              className="admin-input"
              type="date"
              value={to}
              onChange={(event) => {
                setTo(event.target.value)
                setPage(1)
              }}
            />
          </label>
          <select
            className="admin-select"
            value={sort}
            onChange={(event) => {
              setSort(event.target.value)
              setPage(1)
            }}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button className="btn btn--outline btn--sm" type="button" onClick={resetFilters}>
            Xoá bộ lọc
          </button>
          <span className="toolbar__spacer" />
          <span className="toolbar__count">{data?.total ?? 0} đơn</span>
        </div>

        {loading ? (
          <p className="card__empty">Đang tải danh sách…</p>
        ) : orders.length === 0 ? (
          <p className="card__empty">Không có đơn nào khớp bộ lọc.</p>
        ) : (
          <ul className="req-list">
            {orders.map((item) => (
              <li key={item.id} className="req-item">
                <div className="req-item__top">
                  <strong>{item.device}</strong>
                  <StatusBadge status={item.status} />
                </div>
                <p className="req-item__issue">{item.issue}</p>
                <p className="req-item__meta">
                  {item.customerName || 'Khách hàng'} •{' '}
                  {item.customerPhone || 'Chưa có SĐT'} • 📍 {item.address}
                </p>
                <div className="req-item__foot">
                  <span className="req-item__date">
                    Gửi lúc: {fmtDate(item.createdAt)}
                  </span>
                  <span className="admin-actions">
                    {item.repairmanName ? (
                      <span className="req-item__staff">
                        Phụ trách: {item.repairmanName}
                      </span>
                    ) : (
                      <span className="req-item__date">Chưa có thợ</span>
                    )}
                    <button
                      className="btn btn--outline btn--sm"
                      type="button"
                      onClick={() => toggleDetail(item)}
                    >
                      {openId === item.id ? 'Ẩn chi tiết' : 'Chi tiết'}
                    </button>
                  </span>
                </div>

                {openId === item.id && (
                  <div className="detail">
                    {detail?.loading ? (
                      <p className="card__empty">Đang tải chi tiết…</p>
                    ) : (
                      <>
                        {detailError && (
                          <div className="alert alert--error" role="alert">
                            <span>{detailError}</span>
                          </div>
                        )}

                        <div className="steps">
                          {STEPS.map((step, index) => (
                            <div
                              key={step.value}
                              className={
                                index <= currentStep(item)
                                  ? 'steps__item is-done'
                                  : 'steps__item'
                              }
                            >
                              <span className="steps__dot" />
                              <span className="steps__label">{step.label}</span>
                            </div>
                          ))}
                        </div>

                        <div className="detail__row">
                          <div className="detail__col">
                            <h3 className="detail__title">Thanh toán</h3>
                            {detail?.payments?.length ? (
                              <ul className="detail__list">
                                {detail.payments.map((payment) => (
                                  <li key={payment.id} className="detail__item">
                                    <span>
                                      {fmtMoney(payment.amount)} · {payment.method}
                                    </span>
                                    <AdminBadge status={payment.status} />
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="card__empty">Chưa có thanh toán.</p>
                            )}
                          </div>

                          <div className="detail__col">
                            <h3 className="detail__title">Đánh giá</h3>
                            {detail?.rating ? (
                              <div className="detail__rating">
                                <strong>{detail.rating.score}/5</strong>
                                {detail.rating.comment && (
                                  <p>{detail.rating.comment}</p>
                                )}
                              </div>
                            ) : (
                              <p className="card__empty">Chưa có đánh giá.</p>
                            )}
                          </div>
                        </div>

                        <p className="detail__meta">
                          Tạo: {fmtDate(item.createdAt)} · Cập nhật:{' '}
                          {fmtDate(item.updatedAt)}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <AdminPager
          page={data?.page ?? 1}
          totalPages={data?.totalPages ?? 1}
          total={data?.total ?? 0}
          onChange={setPage}
        />
      </section>
    </div>
  )
}
