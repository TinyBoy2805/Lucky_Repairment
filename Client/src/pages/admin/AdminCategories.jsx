import { useState } from 'react'
import AdminPager from '../../components/AdminPager.jsx'
import Field from '../../components/Field.jsx'
import { adminApi } from '../../lib/admin.js'
import { buildQuery, useDebounced } from '../../lib/query.js'
import { useAdminList } from '../../lib/useAdminList.js'
import { fmtDate } from '../../lib/format.js'

const emptyForm = { name: '', description: '', active: true }

const ACTIVE_OPTIONS = [
  { value: '', label: 'Tất cả danh mục' },
  { value: 'true', label: 'Đang dùng' },
  { value: 'false', label: 'Đã ẩn' },
]

const PAGE_SIZE = 10

export default function AdminCategories() {
  const [keyword, setKeyword] = useState('')
  const search = useDebounced(keyword)
  const [active, setActive] = useState('')
  const [page, setPage] = useState(1)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const params = { search, active, page, pageSize: PAGE_SIZE }
  const key = buildQuery(params)
  const { data, loading, error: loadError, reload } = useAdminList(
    () => adminApi.categories.list(params),
    key,
  )

  const categories = data?.categories ?? []

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const submit = async (event) => {
    event.preventDefault()

    if (!form.name.trim()) {
      setError('Vui lòng nhập tên danh mục.')
      return
    }

    setBusy(true)
    setError('')
    setNotice('')
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        active: Boolean(form.active),
      }

      if (editingId) {
        await adminApi.categories.update(editingId, payload)
        setNotice('Đã cập nhật danh mục.')
      } else {
        await adminApi.categories.create(payload)
        setNotice('Đã thêm danh mục mới.')
      }

      resetForm()
      reload()
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setBusy(false)
    }
  }

  const startEdit = (category) => {
    setEditingId(category.id)
    setForm({
      name: category.name,
      description: category.description || '',
      active: Boolean(category.active),
    })
    setError('')
    setNotice('')
  }

  const toggleActive = async (category) => {
    setBusyId(category.id)
    setError('')
    setNotice('')
    try {
      await adminApi.categories.update(category.id, { active: !category.active })
      setNotice(category.active ? 'Đã ẩn danh mục.' : 'Đã hiện danh mục.')
      reload()
    } catch (actionError) {
      setError(actionError.message)
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (category) => {
    if (!window.confirm(`Bạn có chắc muốn xoá danh mục "${category.name}"?`)) return

    setBusyId(category.id)
    setError('')
    setNotice('')
    try {
      await adminApi.categories.remove(category.id)
      if (editingId === category.id) resetForm()
      setNotice('Đã xoá danh mục.')
      reload()
    } catch (actionError) {
      setError(actionError.message)
    } finally {
      setBusyId(null)
    }
  }

  const shownError = error || loadError

  return (
    <div className="page">
      <header className="page__header">
        <h1>Danh mục</h1>
        <p>Quản lý các nhóm dịch vụ sửa chữa hiển thị cho khách hàng.</p>
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

      <div className="admin-cols">
        <section className="card">
          <h2 className="card__title">
            {editingId ? 'Sửa danh mục' : 'Thêm danh mục'}
          </h2>

          <form className="form" onSubmit={submit} noValidate>
            <Field
              id="cat-name"
              label="Tên danh mục"
              placeholder="VD: Điện lạnh"
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
            />

            <div className="field">
              <label htmlFor="cat-desc">Mô tả</label>
              <div className="field__control">
                <textarea
                  id="cat-desc"
                  rows="3"
                  placeholder="Mô tả ngắn (không bắt buộc)"
                  value={form.description}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="cat-active">Trạng thái</label>
              <div className="field__control">
                <select
                  id="cat-active"
                  className="admin-select"
                  value={form.active ? 'true' : 'false'}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, active: event.target.value === 'true' }))
                  }
                >
                  <option value="true">Đang dùng</option>
                  <option value="false">Đã ẩn</option>
                </select>
              </div>
            </div>

            <div className="admin-actions">
              <button className="btn btn--primary" type="submit" disabled={busy}>
                {busy
                  ? 'Đang lưu…'
                  : editingId
                    ? 'Lưu thay đổi'
                    : 'Thêm danh mục'}
              </button>
              {editingId && (
                <button
                  className="btn btn--outline"
                  type="button"
                  onClick={resetForm}
                  disabled={busy}
                >
                  Huỷ
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="card">
          <div className="toolbar">
            <h2 className="card__title">Danh sách ({data?.total ?? 0})</h2>
            <span className="toolbar__spacer" />
            <input
              className="admin-input"
              type="search"
              placeholder="Tìm danh mục…"
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value)
                setPage(1)
              }}
            />
            <select
              className="admin-select"
              value={active}
              onChange={(event) => {
                setActive(event.target.value)
                setPage(1)
              }}
            >
              {ACTIVE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <p className="card__empty">Đang tải danh sách…</p>
          ) : categories.length === 0 ? (
            <p className="card__empty">Chưa có danh mục nào.</p>
          ) : (
            <ul className="req-list">
              {categories.map((category) => (
                <li key={category.id} className="req-item">
                  <div className="req-item__top">
                    <strong>{category.name}</strong>
                    <span
                      className={
                        category.active
                          ? 'status status--done'
                          : 'status status--failed'
                      }
                    >
                      {category.active ? 'Đang dùng' : 'Đã ẩn'}
                    </span>
                  </div>

                  {category.description && (
                    <p className="req-item__issue">{category.description}</p>
                  )}

                  <div className="req-item__foot">
                    <span className="req-item__date">
                      Cập nhật: {fmtDate(category.updatedAt)}
                    </span>
                    <span className="admin-actions">
                      <button
                        className="btn btn--outline btn--sm"
                        type="button"
                        onClick={() => toggleActive(category)}
                        disabled={busyId === category.id}
                      >
                        {category.active ? 'Ẩn' : 'Hiện'}
                      </button>
                      <button
                        className="btn btn--outline btn--sm"
                        type="button"
                        onClick={() => startEdit(category)}
                      >
                        Sửa
                      </button>
                      <button
                        className="btn btn--outline btn--sm"
                        type="button"
                        onClick={() => remove(category)}
                        disabled={busyId === category.id}
                      >
                        Xoá
                      </button>
                    </span>
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
    </div>
  )
}
