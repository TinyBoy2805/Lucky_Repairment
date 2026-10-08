import { useState } from 'react'
import { Link } from 'react-router-dom'
import AdminBadge from '../../components/AdminBadge.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { adminApi } from '../../lib/admin.js'
import { useAdminList } from '../../lib/useAdminList.js'
import { fmtDate, fmtDateTime, fmtMoney } from '../../lib/format.js'

const RANGES = [
  { value: 'all', label: 'Tất cả' },
  { value: 'today', label: 'Hôm nay' },
  { value: '7d', label: '7 ngày' },
  { value: '30d', label: '30 ngày' },
]

function BreakdownRow({ row }) {
  return (
    <li className="breakdown__row">
      <span className="breakdown__label">
        {row.dot && <span className={`dot dot--${row.dot}`} />}
        {row.label}
      </span>
      <span className="breakdown__value">{row.value}</span>
    </li>
  )
}

function BreakdownCard({ title, rows }) {
  return (
    <section className="card">
      <h2 className="card__title">{title}</h2>
      <ul className="breakdown">
        {rows.map((row) => (
          <BreakdownRow key={row.label} row={row} />
        ))}
      </ul>
    </section>
  )
}

export default function AdminDashboard() {
  const [range, setRange] = useState('all')
  const { data, loading, error, reload } = useAdminList(
    () => adminApi.stats(range),
    range,
  )

  const stats = data?.stats
  const ranged = stats && range !== 'all'

  const kpis = stats
    ? [
        {
          to: '/admin/accounts',
          label: 'Người dùng',
          value: stats.users.total,
          sub: ranged ? `+${stats.users.inRange} kỳ này` : 'Tất cả vai trò',
        },
        {
          to: '/admin/orders',
          label: 'Đơn sửa chữa',
          value: stats.requests.total,
          sub: `${stats.requests.byStatus.pending} chờ xử lý`,
        },
        {
          to: '/admin/payments?status=confirmed',
          label: 'Doanh thu đã xác nhận',
          value: fmtMoney(stats.payments.confirmedAmount),
          money: true,
          sub: `${stats.payments.total} giao dịch`,
        },
        {
          to: '/admin/reports?status=open',
          label: 'Báo cáo đang mở',
          value: stats.reports.byStatus.open,
          sub: `Tổng ${stats.reports.total} báo cáo`,
        },
      ]
    : []

  const roleRows = stats
    ? [
        { label: 'Quản trị viên', value: stats.users.byRole.admin },
        { label: 'Thợ sửa chữa', value: stats.users.byRole.repairman },
        { label: 'Khách hàng', value: stats.users.byRole.customer },
      ]
    : []

  const statusRows = stats
    ? [
        { label: 'Chờ tiếp nhận', dot: 'pending', value: stats.requests.byStatus.pending },
        { label: 'Đã nhận việc', dot: 'assigned', value: stats.requests.byStatus.assigned },
        { label: 'Đang sửa', dot: 'in_progress', value: stats.requests.byStatus.in_progress },
        { label: 'Hoàn thành', dot: 'done', value: stats.requests.byStatus.done },
      ]
    : []

  const walletRows = stats
    ? [
        { label: 'Tổng số dư ví', value: fmtMoney(stats.wallets.totalBalance) },
        { label: 'Số ví', value: stats.wallets.total },
        { label: 'Đánh giá', value: stats.ratings.total },
        { label: 'Điểm trung bình', value: `${stats.ratings.averageScore} / 5` },
      ]
    : []

  const catalogRows = stats
    ? [
        { label: 'Danh mục', value: stats.categories.total },
        { label: 'Giao dịch ví', value: stats.transactions.total },
      ]
    : []

  return (
    <div className="page">
      <header className="page__header page__header--row">
        <div>
          <h1>Tổng quan</h1>
          <p>Số liệu toàn hệ thống lấy trực tiếp từ cơ sở dữ liệu.</p>
        </div>
        <button className="btn btn--outline btn--sm" type="button" onClick={reload}>
          Làm mới
        </button>
      </header>

      {error && (
        <div className="alert alert--error" role="alert">
          <span>{error}</span>
        </div>
      )}

      <div className="range-tabs">
        {RANGES.map((option) => (
          <button
            key={option.value}
            type="button"
            className={
              range === option.value
                ? 'range-tabs__item is-active'
                : 'range-tabs__item'
            }
            onClick={() => setRange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="card__empty">Đang tải số liệu…</p>
      ) : (
        <>
          {ranged && stats && (
            <p className="page__hint">
              Kỳ đang chọn: +{stats.users.inRange} người dùng · +
              {stats.requests.inRange} đơn · +{stats.ratings.inRange} đánh giá ·
              doanh thu {fmtMoney(stats.payments.confirmedAmountInRange)}
            </p>
          )}

          <div className="stat-grid">
            {kpis.map((kpi) => (
              <Link key={kpi.label} to={kpi.to} className="stat">
                <span className="stat__label">{kpi.label}</span>
                <strong
                  className={
                    kpi.money ? 'stat__value stat__value--money' : 'stat__value'
                  }
                >
                  {kpi.value}
                </strong>
                <span className="stat__meta">{kpi.sub}</span>
              </Link>
            ))}
          </div>

          <div className="admin-cols">
            <BreakdownCard title="Người dùng theo vai trò" rows={roleRows} />
            <BreakdownCard title="Đơn theo trạng thái" rows={statusRows} />
            <BreakdownCard title="Ví & đánh giá" rows={walletRows} />
            <BreakdownCard title="Danh mục & giao dịch" rows={catalogRows} />
          </div>

          <div className="admin-cols">
            <section className="card">
              <div className="toolbar">
                <h2 className="card__title">Đơn gần đây</h2>
                <span className="toolbar__spacer" />
                <Link className="form__link" to="/admin/orders">
                  Xem tất cả
                </Link>
              </div>

              {stats?.recentRequests?.length ? (
                <ul className="req-list">
                  {stats.recentRequests.map((item) => (
                    <li key={item.id} className="req-item">
                      <div className="req-item__top">
                        <strong>{item.device}</strong>
                        <StatusBadge status={item.status} />
                      </div>
                      <p className="req-item__meta">
                        {item.customerName || 'Khách hàng'} ·{' '}
                        {fmtDate(item.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="card__empty">Chưa có đơn nào.</p>
              )}
            </section>

            <section className="card">
              <div className="toolbar">
                <h2 className="card__title">Báo cáo gần đây</h2>
                <span className="toolbar__spacer" />
                <Link className="form__link" to="/admin/reports">
                  Xem tất cả
                </Link>
              </div>

              {stats?.recentReports?.length ? (
                <ul className="req-list">
                  {stats.recentReports.map((item) => (
                    <li key={item.id} className="req-item">
                      <div className="req-item__top">
                        <strong>{item.reason}</strong>
                        <AdminBadge status={item.status} />
                      </div>
                      <p className="req-item__meta">
                        {item.reporterName || '—'} · {fmtDateTime(item.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="card__empty">Chưa có báo cáo nào.</p>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  )
}
