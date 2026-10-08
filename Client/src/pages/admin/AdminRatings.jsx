import { useState } from 'react'
import AdminPager from '../../components/AdminPager.jsx'
import { adminApi } from '../../lib/admin.js'
import { buildQuery, useDebounced } from '../../lib/query.js'
import { useAdminList } from '../../lib/useAdminList.js'
import { fmtDateTime } from '../../lib/format.js'

const SCORE_OPTIONS = [
  { value: '', label: 'Mọi mức điểm' },
  { value: '5', label: '5 sao' },
  { value: '4', label: '4 sao' },
  { value: '3', label: '3 sao' },
  { value: '2', label: '2 sao' },
  { value: '1', label: '1 sao' },
]

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất trước' },
  { value: 'oldest', label: 'Cũ nhất trước' },
  { value: 'highest', label: 'Điểm cao trước' },
  { value: 'lowest', label: 'Điểm thấp trước' },
]

const SORT_PARAMS = {
  newest: { sort: 'createdAt', order: 'desc' },
  oldest: { sort: 'createdAt', order: 'asc' },
  highest: { sort: 'score', order: 'desc' },
  lowest: { sort: 'score', order: 'asc' },
}

const PAGE_SIZE = 10

export default function AdminRatings() {
  const [keyword, setKeyword] = useState('')
  const search = useDebounced(keyword)
  const [score, setScore] = useState('')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const params = { search, score, page, pageSize: PAGE_SIZE, ...SORT_PARAMS[sort] }
  const key = buildQuery(params)
  const { data, loading, error, reload } = useAdminList(
    () => adminApi.ratings.list(params),
    key,
  )

  const ratings = data?.ratings ?? []

  const remove = async (rating) => {
    if (!window.confirm('Bạn có chắc muốn xoá đánh giá này?')) return

    setBusyId(rating.id)
    setActionError('')
    setNotice('')
    try {
      await adminApi.ratings.remove(rating.id)
      setNotice('Đã xoá đánh giá.')
      reload()
    } catch (actionFailure) {
      setActionError(actionFailure.message)
    } finally {
      setBusyId(null)
    }
  }

  const shownError = actionError || error

  return (
    <div className="page">
      <header className="page__header">
        <h1>Đánh giá</h1>
        <p>Theo dõi và kiểm duyệt đánh giá của khách hàng dành cho thợ.</p>
      </header>

      {shownError && (
        <div className="alert alert--error" role="alert">
          <span>{shownError}</span>
        </div>
      )}

      {notice && (
        <div className="alert alert--success" role="status">
          <span>{notice}</span>
        </div>
      )}

      <section className="card">
        <div className="toolbar">
          <input
            className="admin-input"
            type="search"
            placeholder="Tìm theo nhận xét, tên thợ, khách…"
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value)
              setPage(1)
            }}
          />
          <select
            className="admin-select"
            value={score}
            onChange={(event) => {
              setScore(event.target.value)
              setPage(1)
            }}
          >
            {SCORE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
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
          <span className="toolbar__spacer" />
          <span className="toolbar__count">{data?.total ?? 0} đánh giá</span>
        </div>

        {loading ? (
          <p className="card__empty">Đang tải danh sách…</p>
        ) : ratings.length === 0 ? (
          <p className="card__empty">Không có đánh giá nào khớp bộ lọc.</p>
        ) : (
          <ul className="req-list">
            {ratings.map((rating) => (
              <li key={rating.id} className="req-item">
                <div className="req-item__top">
                  <strong>{rating.score}/5 sao</strong>
                  <span className="req-item__date">
                    {fmtDateTime(rating.createdAt)}
                  </span>
                </div>

                {rating.comment && (
                  <p className="req-item__issue">{rating.comment}</p>
                )}

                <p className="req-item__meta">
                  Khách: {rating.customerName || '—'} • Thợ:{' '}
                  {rating.repairmanName || '—'}
                </p>

                <div className="req-item__foot">
                  <span className="req-item__date">Đơn: {rating.requestId}</span>
                  <button
                    className="btn btn--outline btn--sm"
                    type="button"
                    onClick={() => remove(rating)}
                    disabled={busyId === rating.id}
                  >
                    {busyId === rating.id ? 'Đang xoá…' : 'Xoá'}
                  </button>
                </div>
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
