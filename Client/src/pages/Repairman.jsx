import { useEffect, useState } from 'react'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { useAuth } from '../context/useAuth.js'
import { requestsApi } from '../lib/requests.js'
import { fmtDate } from '../lib/format.js'

/** Bước hành động tiếp theo theo trạng thái của đơn (thợ phụ trách). */
const nextAction = (request) => {
  if (request.status === 'assigned') {
    return { label: 'Bắt đầu sửa', body: { action: 'status', status: 'in_progress' } }
  }
  if (request.status === 'in_progress') {
    return { label: 'Hoàn thành', body: { action: 'status', status: 'done' } }
  }
  return null
}

export default function Repairman() {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = async () => {
    try {
      const data = await requestsApi.list()
      setRequests(data.requests)
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const doAction = async (id, body) => {
    setBusyId(id)
    setError('')
    try {
      await requestsApi.update(id, body)
      await load()
    } catch (actionError) {
      setError(actionError.message)
    } finally {
      setBusyId(null)
    }
  }

  const openRequests = requests.filter((request) => request.status === 'pending')
  const myRequests = requests.filter(
    (request) =>
      request.status !== 'pending' && request.repairmanUid === user?.uid,
  )

  return (
    <DashboardLayout roleLabel="Thợ sửa chữa">
      <div className="page">
        <header className="page__header">
          <h1>
            Xin chào
            {user?.displayName
              ? `, ${user.displayName.trim().split(' ').slice(-1)[0]}`
              : ''}{' '}
            🔧
          </h1>
          <p>Nhận việc mới và theo dõi các đơn đang sửa.</p>
        </header>

        {error && (
          <div className="alert alert--error" role="alert">
            <span>{error}</span>
          </div>
        )}

        <section className="card">
          <h2 className="card__title">
            Việc mới — chờ tiếp nhận ({openRequests.length})
          </h2>

          {loading ? (
            <p className="card__empty">Đang tải danh sách…</p>
          ) : openRequests.length === 0 ? (
            <p className="card__empty">Hiện không có yêu cầu mới nào.</p>
          ) : (
            <ul className="req-list">
              {openRequests.map((request) => (
                <li key={request.id} className="req-item">
                  <div className="req-item__top">
                    <strong>{request.device}</strong>
                    <StatusBadge status={request.status} />
                  </div>
                  <p className="req-item__issue">{request.issue}</p>
                  <p className="req-item__meta">
                    {request.customerName} •{' '}
                    {request.customerPhone || 'Chưa có SĐT'} • 📍{' '}
                    {request.address}
                  </p>
                  <div className="req-item__foot">
                    <span className="req-item__date">
                      Gửi lúc: {fmtDate(request.createdAt)}
                    </span>
                    <button
                      className="btn btn--primary btn--sm"
                      type="button"
                      onClick={() => doAction(request.id, { action: 'accept' })}
                      disabled={busyId === request.id}
                    >
                      {busyId === request.id ? 'Đang nhận…' : 'Nhận việc'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 className="card__title">Việc của tôi ({myRequests.length})</h2>

          {loading ? (
            <p className="card__empty">Đang tải danh sách…</p>
          ) : myRequests.length === 0 ? (
            <p className="card__empty">Bạn chưa nhận việc nào.</p>
          ) : (
            <ul className="req-list">
              {myRequests.map((request) => {
                const action = nextAction(request)
                return (
                  <li key={request.id} className="req-item">
                    <div className="req-item__top">
                      <strong>{request.device}</strong>
                      <StatusBadge status={request.status} />
                    </div>
                    <p className="req-item__issue">{request.issue}</p>
                    <p className="req-item__meta">
                      {request.customerName} • 📍 {request.address}
                    </p>
                    <div className="req-item__foot">
                      <span className="req-item__date">
                        {fmtDate(request.createdAt)}
                      </span>
                      {action && (
                        <button
                          className="btn btn--primary btn--sm"
                          type="button"
                          onClick={() => doAction(request.id, action.body)}
                          disabled={busyId === request.id}
                        >
                          {busyId === request.id ? 'Đang xử lý…' : action.label}
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </DashboardLayout>
  )
}