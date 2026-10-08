import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AdminBadge from '../../components/AdminBadge.jsx'
import AdminPager from '../../components/AdminPager.jsx'
import { adminApi } from '../../lib/admin.js'
import { buildQuery, useDebounced } from '../../lib/query.js'
import { useAdminList } from '../../lib/useAdminList.js'
import { fmtDateTime, fmtMoney } from '../../lib/format.js'

const METHOD_LABEL = {
  cash: 'Tiền mặt',
  ewallet: 'Ví điện tử',
  bank: 'Ngân hàng',
}

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'failed', label: 'Thất bại' },
]

const METHOD_OPTIONS = [
  { value: '', label: 'Mọi phương thức' },
  { value: 'cash', label: 'Tiền mặt' },
  { value: 'ewallet', label: 'Ví điện tử' },
  { value: 'bank', label: 'Ngân hàng' },
]

const PAGE_SIZE = 10

export default function AdminPayments() {
  const [searchParams] = useSearchParams()
  const [keyword, setKeyword] = useState('')
  const search = useDebounced(keyword)
  const [status, setStatus] = useState(searchParams.get('status') ?? '')
  const [method, setMethod] = useState('')
  const [page, setPage] = useState(1)
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const params = { search, status, method, page, pageSize: PAGE_SIZE }
  const key = buildQuery(params)
  const { data, loading, error, reload } = useAdminList(
    () => adminApi.payments.list(params),
    key,
  )

  const payments = data?.payments ?? []

  const act = async (payment, action) => {
    setBusyId(payment.id)
    setActionError('')
    setNotice('')
    try {
      if (action === 'confirm') {
        await adminApi.payments.confirm(payment.id)
        setNotice('Đã xác nhận thanh toán.')
      } else {
        await adminApi.payments.fail(payment.id)
        setNotice('Đã đánh dấu thanh toán thất bại.')
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
        <h1>Thanh toán</h1>
        <p>Kiểm tra và xác nhận các giao dịch thanh toán của khách hàng.</p>
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
            placeholder="Tìm theo mã đơn, người dùng, ghi chú…"
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
            value={method}
            onChange={(event) => {
              setMethod(event.target.value)
              setPage(1)
            }}
          >
            {METHOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="toolbar__spacer" />
          <span className="toolbar__count">{data?.total ?? 0} giao dịch</span>
        </div>

        {loading ? (
          <p className="card__empty">Đang tải danh sách…</p>
        ) : payments.length === 0 ? (
          <p className="card__empty">Không có giao dịch nào khớp bộ lọc.</p>
        ) : (
          <ul className="req-list">
            {payments.map((payment) => (
              <li key={payment.id} className="req-item">
                <div className="req-item__top">
                  <strong>{fmtMoney(payment.amount)}</strong>
                  <AdminBadge status={payment.status} />
                </div>

                <p className="req-item__meta">
                  Phương thức: {METHOD_LABEL[payment.method] ?? payment.method} • Đơn:{' '}
                  {payment.requestId}
                </p>

                {payment.note && (
                  <p className="req-item__issue">{payment.note}</p>
                )}

                <div className="req-item__foot">
                  <span className="req-item__date">
                    {fmtDateTime(payment.createdAt)}
                  </span>
                  {payment.status === 'pending' && (
                    <span className="admin-actions">
                      <button
                        className="btn btn--primary btn--sm"
                        type="button"
                        onClick={() => act(payment, 'confirm')}
                        disabled={busyId === payment.id}
                      >
                        {busyId === payment.id ? 'Đang xử lý…' : 'Xác nhận'}
                      </button>
                      <button
                        className="btn btn--outline btn--sm"
                        type="button"
                        onClick={() => act(payment, 'fail')}
                        disabled={busyId === payment.id}
                      >
                        Thất bại
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
