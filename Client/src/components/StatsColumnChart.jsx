import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { adminApi } from '../lib/admin.js'
import { useAdminList } from '../lib/useAdminList.js'
import { fmtMoney } from '../lib/format.js'

const RANGES = [
  { value: 'today', label: 'Hôm nay' },
  { value: '7d', label: '7 ngày' },
  { value: '30d', label: '30 ngày' },
  { value: '90d', label: '90 ngày' },
  { value: 'all', label: 'Tất cả' },
]

/** Định dạng nhãn trục X: "2024-05-12" → "12/05", "2024-05" → "05/2024" */
function formatLabel(label) {
  if (/^\d{4}-\d{2}$/.test(label)) {
    const [year, month] = label.split('-')
    return `${month}/${year}`
  }
  const parts = String(label).split('-')
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`
  return label
}

/** Mốc thời gian đầu ngày (00:00:00.000) theo giờ địa phương. */
function dayStart(dateStr) {
  return new Date(`${dateStr}T00:00:00`).getTime()
}

/** Mốc thời gian cuối ngày (23:59:59.999) theo giờ địa phương. */
function dayEnd(dateStr) {
  return new Date(`${dateStr}T23:59:59.999`).getTime()
}

export default function StatsColumnChart() {
  const [mode, setMode] = useState('preset') // 'preset' | 'custom'
  const [range, setRange] = useState('30d')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const customReady = Boolean(from && to)
  const customInvalid = customReady && dayStart(from) > dayEnd(to)
  const useCustom = mode === 'custom' && customReady && !customInvalid

  const params = useCustom ? { from: dayStart(from), to: dayEnd(to) } : { range }
  const queryKey = useCustom ? `custom:${from}:${to}` : `range:${range}`

  const { data, loading, error } = useAdminList(
    () => adminApi.stats(params),
    queryKey,
  )

  const chart = data?.stats?.columnChart
  const rows = (chart?.labels || []).map((label, index) => ({
    label: formatLabel(label),
    revenue: chart.data[index] || 0,
  }))

  return (
    <section className="card">
      <div className="card__header">
        <h2 className="card__title">Doanh thu theo thời gian</h2>
        <div className="range-tabs">
          {RANGES.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`btn btn--sm ${
                mode === 'preset' && range === option.value
                  ? 'btn--primary'
                  : 'btn--outline'
              }`}
              onClick={() => {
                setMode('preset')
                setRange(option.value)
              }}
            >
              {option.label}
            </button>
          ))}
          <button
            type="button"
            className={`btn btn--sm ${mode === 'custom' ? 'btn--primary' : 'btn--outline'}`}
            onClick={() => setMode((current) => (current === 'custom' ? 'preset' : 'custom'))}
          >
            Tuỳ chọn
          </button>
        </div>
      </div>

      {mode === 'custom' && (
        <div className="range-tabs range-tabs--sub" style={{ alignItems: 'center' }}>
          <label style={{ fontSize: 13, color: '#475569' }}>
            Từ ngày
            <input
              className="admin-input"
              type="date"
              style={{ marginLeft: 8 }}
              value={from}
              max={to || undefined}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>
          <label style={{ fontSize: 13, color: '#475569' }}>
            Đến ngày
            <input
              className="admin-input"
              type="date"
              style={{ marginLeft: 8 }}
              value={to}
              min={from || undefined}
              onChange={(event) => setTo(event.target.value)}
            />
          </label>
        </div>
      )}

      {mode === 'custom' && customInvalid && (
        <p className="alert alert--error">Ngày bắt đầu phải trước ngày kết thúc.</p>
      )}
      {mode === 'custom' && !customReady && !customInvalid && (
        <p className="muted">Chọn cả ngày bắt đầu và ngày kết thúc để xem biểu đồ.</p>
      )}

      {loading && <p className="muted">Đang tải dữ liệu…</p>}
      {!loading && error && <p className="alert alert--error">{error}</p>}
      {!loading && !error && rows.length === 0 && (
        <p className="muted">Chưa có đơn hàng trong khoảng thời gian này.</p>
      )}

      {!loading && !error && rows.length > 0 && (
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} tickMargin={8} />
              <YAxis
                tick={{ fontSize: 12 }}
                width={80}
                tickFormatter={(value) => `${Math.round(value / 1000)}k`}
              />
              <Tooltip formatter={(value) => [fmtMoney(value), 'Doanh thu']} />
              <Bar dataKey="revenue" name="Doanh thu" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}
