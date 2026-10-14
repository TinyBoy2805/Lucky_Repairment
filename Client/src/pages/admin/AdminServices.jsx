import { useState } from 'react'
import Field from '../../components/Field.jsx'
import { adminApi } from '../../lib/admin.js'
import { useAdminList } from '../../lib/useAdminList.js'
import { fmtDate, fmtMoney } from '../../lib/format.js'

const emptyForm = {
  title: '',
  category: 'electric',
  startingPrice: '',
  priceDisplay: '',
  responseTime: '',
  warranty: '',
  image: '',
  shortDesc: '',
  description: '',
  signs: '',
}

const CATEGORY_OPTIONS = [
  { value: 'electric', label: 'Sửa chữa điện' },
  { value: 'water', label: 'Sửa chữa nước' },
]

const categoryLabel = (value) =>
  CATEGORY_OPTIONS.find((option) => option.value === value)?.label || 'Khác'

function textToLines(value) {
  return (value || '')
    .split('\n')
    .map((line) => String(line).trim())
    .filter(Boolean)
}

function signsToText(signs) {
  if (!Array.isArray(signs)) return ''
  return signs
    .map((sign) =>
      sign && typeof sign === 'object' ? sign.text ?? sign.label ?? '' : String(sign),
    )
    .filter(Boolean)
    .join('\n')
}

export default function AdminServices() {
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const { data, loading, error: loadError, reload } = useAdminList(
    () => adminApi.services.list(),
    'services',
  )

  const services = data?.services ?? []

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const set = (name, value) => setForm((prev) => ({ ...prev, [name]: value }))

  const submit = async (event) => {
    event.preventDefault()

    if (!form.title.trim()) {
      setError('Vui lòng nhập tên dịch vụ.')
      return
    }
    if (!Number(form.startingPrice) || Number(form.startingPrice) <= 0) {
      setError('Vui lòng nhập giá khởi điểm hợp lệ (lớn hơn 0).')
      return
    }

    setBusy(true)
    setError('')
    setNotice('')
    try {
      const price = Number(form.startingPrice)
      const payload = {
        title: form.title.trim(),
        category: form.category,
        categoryName: categoryLabel(form.category),
        startingPrice: price,
        priceDisplay: form.priceDisplay.trim() || `Từ ${fmtMoney(price)}`,
        responseTime: form.responseTime.trim(),
        warranty: form.warranty.trim(),
        image: form.image.trim(),
        shortDesc: form.shortDesc.trim(),
        description: form.description.trim(),
        signs: textToLines(form.signs),
      }

      if (editingId) {
        await adminApi.services.update(editingId, payload)
        setNotice('Đã cập nhật dịch vụ.')
      } else {
        await adminApi.services.create(payload)
        setNotice('Đã thêm dịch vụ mới.')
      }

      resetForm()
      reload()
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setBusy(false)
    }
  }

  const startEdit = (service) => {
    setEditingId(service.id)
    setForm({
      title: service.title || '',
      category: service.category || 'electric',
      startingPrice: String(service.startingPrice ?? ''),
      priceDisplay: service.priceDisplay || '',
      responseTime: service.responseTime || '',
      warranty: service.warranty || '',
      image: service.image || '',
      shortDesc: service.shortDesc || '',
      description: service.description || '',
      signs: signsToText(service.signs),
    })
    setError('')
    setNotice('')
  }

  const remove = async (service) => {
    if (!window.confirm(`Bạn có chắc muốn xoá dịch vụ "${service.title}"?`)) return

    setBusyId(service.id)
    setError('')
    setNotice('')
    try {
      await adminApi.services.remove(service.id)
      if (editingId === service.id) resetForm()
      setNotice('Đã xoá dịch vụ.')
      reload()
    } catch (removeError) {
      setError(removeError.message)
    } finally {
      setBusyId(null)
    }
  }

  const shownError = error || loadError

  return (
    <div className="page">
      <header className="page__header">
        <h1>Quản lý dịch vụ</h1>
        <p>
          Thêm, sửa, xoá các dịch vụ sửa chữa điện nước hiển thị cho khách hàng. Dịch vụ do thợ
          tạo sẽ hiển thị tên người tạo.
        </p>
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
          <h2 className="card__title">{editingId ? 'Sửa dịch vụ' : 'Thêm dịch vụ'}</h2>

          <form className="form" onSubmit={submit} noValidate>
            <Field
              id="svc-title"
              label="Tên dịch vụ *"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="VD: Sửa chữa điện chập, mất điện cục bộ"
            />

            <div className="field">
              <label htmlFor="svc-category">Danh mục</label>
              <div className="field__control">
                <select
                  id="svc-category"
                  className="admin-select"
                  value={form.category}
                  onChange={(e) => set('category', e.target.value)}
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form__grid">
              <Field
                id="svc-price"
                label="Giá khởi điểm (đ) *"
                type="number"
                min="0"
                value={form.startingPrice}
                onChange={(e) => set('startingPrice', e.target.value)}
                placeholder="VD: 200000"
              />
              <Field
                id="svc-price-display"
                label="Hiển thị giá"
                value={form.priceDisplay}
                onChange={(e) => set('priceDisplay', e.target.value)}
                placeholder="Để trống để tự tạo (VD: Từ 200.000 đ)"
              />
            </div>

            <div className="form__grid">
              <Field
                id="svc-response"
                label="Thời gian có mặt"
                value={form.responseTime}
                onChange={(e) => set('responseTime', e.target.value)}
                placeholder="VD: 15 - 30 phút"
              />
              <Field
                id="svc-warranty"
                label="Bảo hành"
                value={form.warranty}
                onChange={(e) => set('warranty', e.target.value)}
                placeholder="VD: 6 tháng"
              />
            </div>

            <Field
              id="svc-image"
              label="Ảnh (URL)"
              value={form.image}
              onChange={(e) => set('image', e.target.value)}
              placeholder="https://..."
            />

            <div className="field">
              <label htmlFor="svc-short">Mô tả ngắn</label>
              <div className="field__control">
                <textarea
                  id="svc-short"
                  rows="2"
                  value={form.shortDesc}
                  onChange={(e) => set('shortDesc', e.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="svc-desc">Mô tả chi tiết</label>
              <div className="field__control">
                <textarea
                  id="svc-desc"
                  rows="4"
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="svc-signs">Dấu hiệu sự cố (mỗi dòng một mục)</label>
              <div className="field__control">
                <textarea
                  id="svc-signs"
                  rows="4"
                  value={form.signs}
                  onChange={(e) => set('signs', e.target.value)}
                  placeholder={'Aptomat nhảy liên tục\nỔ cắm bị đen, nóng chảy'}
                />
              </div>
            </div>

            <div className="admin-actions">
              <button className="btn btn--primary" type="submit" disabled={busy}>
                {busy ? 'Đang lưu…' : editingId ? 'Lưu thay đổi' : 'Thêm dịch vụ'}
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
            <h2 className="card__title">Danh sách ({services.length})</h2>
          </div>

          {loading ? (
            <p className="card__empty">Đang tải danh sách…</p>
          ) : services.length === 0 ? (
            <p className="card__empty">Chưa có dịch vụ nào.</p>
          ) : (
            <ul className="req-list">
              {services.map((service) => (
                <li key={service.id} className="req-item">
                  <div className="req-item__top">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      {service.image && (
                        <img
                          src={service.image}
                          alt={service.title}
                          style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }}
                        />
                      )}
                      <strong
                        style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {service.title}
                      </strong>
                    </div>
                    <span className="chip">
                      {service.categoryName || categoryLabel(service.category)}
                    </span>
                  </div>

                  <p className="req-item__meta">
                    <strong>{service.priceDisplay || fmtMoney(service.startingPrice)}</strong>
                    {service.responseTime ? ` · Có mặt sau ${service.responseTime}` : ''}
                    {service.warranty ? ` · Bảo hành ${service.warranty}` : ''}
                  </p>

                  <p className="req-item__meta">
                    Người tạo: {service.ownerUid ? service.ownerName || 'Thợ sửa chữa' : 'Nền tảng'}
                  </p>

                  <div className="req-item__foot">
                    <span className="req-item__date">Cập nhật: {fmtDate(service.updatedAt)}</span>
                    <span className="admin-actions">
                      <button
                        className="btn btn--outline btn--sm"
                        type="button"
                        onClick={() => startEdit(service)}
                      >
                        Sửa
                      </button>
                      <button
                        className="btn btn--outline btn--sm"
                        type="button"
                        onClick={() => remove(service)}
                        disabled={busyId === service.id}
                      >
                        Xoá
                      </button>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
