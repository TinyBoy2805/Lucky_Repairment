import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AdminBadge from '../../components/AdminBadge.jsx'
import AdminPager from '../../components/AdminPager.jsx'
import { adminApi } from '../../lib/admin.js'
import { buildQuery, useDebounced } from '../../lib/query.js'
import { useAdminList } from '../../lib/useAdminList.js'
import { dayEnd, dayStart, fmtDateTime } from '../../lib/format.js'

const TARGET_LABEL = {
  user: 'Người dùng',
  request: 'Đơn hàng',
}

const TARGET_OPTIONS = [
  { value: '', label: 'Mọi đối tượng' },
  { value: 'user', label: 'Người dùng' },
  { value: 'request', label: 'Đơn hàng' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'open', label: 'Đang mở' },
  { value: 'resolved', label: 'Đã xử lý' },
  { value: 'rejected', label: 'Đã từ chối' },
]

const PAGE_SIZE = 10

export default function AdminReports() {
  const [searchParams] = useSearchParams()
  const [keyword, setKeyword] = useState('')
  const search = useDebounced(keyword)
  const [status, setStatus] = useState(searchParams.get('status') ?? '')
  const [targetType, setTargetType] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const params = {
    search,
    status,
    targetType,
    from: dayStart(from),
    to: dayEnd(to),
    page,
    pageSize: PAGE_SIZE,
  }
  const key = buildQuery(params)
  const { data, loading, error, reload } = useAdminList(
    () => adminApi.reports.list(params),
    key,
  )

  const reports = data?.reports ?? []

  const resetFilters = () => {
    setKeyword('')
    setStatus('')
    setTargetType('')
    setFrom('')
    setTo('')
    setPage(1)
  }

  const act = async (report, action) => {
    setBusyId(report.id)
    setActionError('')
    setNotice('')
    try {
      if (action === 'resolve') {
        await adminApi.reports.resolve(report.id)
        setNotice('Đã đánh dấu báo cáo là đã xử lý.')
      } else {
        await adminApi.reports.reject(report.id)
        setNotice('Đã từ chối báo cáo.')
      }
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
        <h1>Báo cáo</h1>
        <p>Xem các báo cáo từ người dùng và xử lý hoặc từ chối chúng.</p>
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
            placeholder="Tìm theo lý do, người gửi, đối tượng…"
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
            value={targetType}
            onChange={(event) => {
              setTargetType(event.target.value)
              setPage(1)
            }}
          >
            {TARGET_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
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
          <button className="btn btn--outline btn--sm" type="button" onClick={resetFilters}>
            Xoá bộ lọc
          </button>
          <span className="toolbar__spacer" />
          <span className="toolbar__count">{data?.total ?? 0} báo cáo</span>
        </div>

        {loading ? (
          <p className="card__empty">Đang tải danh sách…</p>
        ) : reports.length === 0 ? (
          <p className="card__empty">Không có báo cáo nào khớp bộ lọc.</p>
        ) : (
          <ul className="req-list">
            {reports.map((report) => (
              <li key={report.id} className="req-item">
                <div className="req-item__top">
                  <strong>{report.reason}</strong>
                  <AdminBadge status={report.status} />
                </div>

                {report.description && (
                  <p className="req-item__issue">{report.description}</p>
                )}

                <p className="req-item__meta">
                  {TARGET_LABEL[report.targetType] ?? report.targetType}:{' '}
                  {report.targetId} • Người gửi: {report.reporterName || '—'}
                </p>

                <div className="req-item__foot">
                  <span className="req-item__date">
                    {fmtDateTime(report.createdAt)}
                  </span>
                  {report.status === 'open' && (
                    <span className="admin-actions">
                      <button
                        className="btn btn--primary btn--sm"
                        type="button"
                        onClick={() => act(report, 'resolve')}
                        disabled={busyId === report.id}
                      >
                        {busyId === report.id ? 'Đang xử lý…' : 'Đã xử lý'}
                      </button>
                      <button
                        className="btn btn--outline btn--sm"
                        type="button"
                        onClick={() => act(report, 'reject')}
                        disabled={busyId === report.id}
                      >
                        Từ chối
                      </button>
                    </span>
                  )}
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
