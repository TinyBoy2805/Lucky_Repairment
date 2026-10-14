import { useState } from 'react'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
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

const COLORS = ['#2563eb', '#0ea5e9', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b']

export default function StatsPieChart() {
  const [range, setRange] = useState('30d')
  const [by, setBy] = useState('category') // 'category' | 'brand'

  const { data, loading, error } = useAdminList(() => adminApi.stats(range), range)

  const source =
    by === 'brand' ? data?.stats?.pieChartByBrand : data?.stats?.pieChart
  const rows = (source?.labels || [])
    .map((name, index) => ({ name, value: source.data[index] || 0 }))
    .filter((row) => row.value > 0)

  const total = rows.reduce((sum, row) => sum + row.value, 0)

  return (
    <section className="card">
      <div className="card__header">
        <h2 className="card__title">Cơ cấu doanh thu</h2>
        <div className="range-tabs">
          <button
            type="button"
            className={`btn btn--sm ${by === 'category' ? 'btn--primary' : 'btn--outline'}`}
            onClick={() => setBy('category')}
          >
            Theo danh mục
          </button>
          <button
            type="button"
            className={`btn btn--sm ${by === 'brand' ? 'btn--primary' : 'btn--outline'}`}
            onClick={() => setBy('brand')}
          >
            Theo thương hiệu
          </button>
        </div>
      </div>

      <div className="range-tabs range-tabs--sub">
        {RANGES.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`btn btn--sm ${range === option.value ? 'btn--primary' : 'btn--outline'}`}
            onClick={() => setRange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {loading && <p className="muted">Đang tải dữ liệu…</p>}
      {!loading && error && <p className="alert alert--error">{error}</p>}
      {!loading && !error && rows.length === 0 && (
        <p className="muted">Chưa có dữ liệu trong khoảng thời gian này.</p>
      )}

      {!loading && !error && rows.length > 0 && (
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={rows}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={110}
                label={({ name, percent }) => `${name} (${Math.round(percent * 100)}%)`}
                labelLine={false}
              >
                {rows.map((row, index) => (
                  <Cell key={row.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [
                  `${fmtMoney(value)} (${total ? Math.round((value / total) * 100) : 0}%)`,
                  name,
                ]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}
