import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AdminPager from '../../components/AdminPager.jsx'
import { adminApi } from '../../lib/admin.js'
import { buildQuery, useDebounced } from '../../lib/query.js'
import { useAdminList } from '../../lib/useAdminList.js'
import { fmtDate } from '../../lib/format.js'

const ROLE_OPTIONS = [
  { value: '', label: 'Tất cả vai trò' },
  { value: 'customer', label: 'Khách hàng' },
  { value: 'repairman', label: 'Thợ sửa chữa' },
  { value: 'admin', label: 'Quản trị viên' },
]

const PAGE_SIZE = 10

export default function AdminAccounts() {
  const [searchParams] = useSearchParams()
  const [keyword, setKeyword] = useState('')
  const search = useDebounced(keyword)
  const [role, setRole] = useState(searchParams.get('role') ?? '')
  const [page, setPage] = useState(1)
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const params = { search, role, page, pageSize: PAGE_SIZE }
  const key = buildQuery(params)
  const { data, loading, error, reload } = useAdminList(() => adminApi.users(params), key)

  const users = data?.users ?? []

  const changeRole = async (uid, nextRole) => {
    setBusyId(uid)
    setActionError('')
    setNotice('')
    try {
      const { user } = await adminApi.changeRole(uid, nextRole)
      setNotice(`Đã cập nhật vai trò cho ${user.displayName || user.email}.`)
      reload()
    } catch (changeError) {
      setActionError(changeError.message)
    } finally {
      setBusyId(null)
    }
  }

  const shownError = actionError || error

  return (
    <div className="page">
      <header className="page__header">
        <h1>Tài khoản</h1>
        <p>Xem toàn bộ người dùng và điều chỉnh vai trò của họ.</p>
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
            placeholder="Tìm theo tên, email, số điện thoại…"
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value)
              setPage(1)
            }}
          />
          <select
            className="admin-select"
            value={role}
            onChange={(event) => {
              setRole(event.target.value)
              setPage(1)
            }}
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="toolbar__spacer" />
          <span className="toolbar__count">{data?.total ?? 0} người dùng</span>
        </div>

        {loading ? (
          <p className="card__empty">Đang tải danh sách…</p>
        ) : users.length === 0 ? (
          <p className="card__empty">Không có người dùng nào khớp bộ lọc.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Người dùng</th>
                  <th>Email</th>
                  <th>Số điện thoại</th>
                  <th>Ngày tạo</th>
                  <th>Vai trò</th>
                </tr>
              </thead>
              <tbody>
                {users.map((item) => (
                  <tr key={item.uid}>
                    <td>{item.displayName || '—'}</td>
                    <td>{item.email || '—'}</td>
                    <td>{item.phone || '—'}</td>
                    <td>{fmtDate(item.createdAt)}</td>
                    <td>
                      <select
                        className="admin-select"
                        value={item.role}
                        disabled={busyId === item.uid}
                        onChange={(event) => changeRole(item.uid, event.target.value)}
                      >
                        {ROLE_OPTIONS.filter((option) => option.value).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
