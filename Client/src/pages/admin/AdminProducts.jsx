import { useState } from 'react'
import Field from '../../components/Field.jsx'
import { adminApi } from '../../lib/admin.js'
import { useAdminList } from '../../lib/useAdminList.js'
import { fmtDate, fmtMoney } from '../../lib/format.js'

const emptyForm = {
  name: '',
  category: 'electric',
  brand: '',
  price: '',
  originalPrice: '',
  image: '',
  shortDesc: '',
  description: '',
  installationFee: '',
  inStock: true,
  warranty: '',
  specifications: '',
  features: '',
}

const CATEGORY_OPTIONS = [
  { value: 'electric', label: 'Thiết bị điện' },
  { value: 'water', label: 'Thiết bị nước' },
]

function textToLines(value) {
  return (value || '')
    .split('\n')
    .map((line) => String(line).trim())
    .filter(Boolean)
}

export default function AdminProducts() {
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const { data, loading, error: loadError, reload } = useAdminList(
    () => adminApi.products.list({ sort: 'newest' }),
    'products',
  )

  const products = data?.products ?? []

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const set = (name, value) => setForm((prev) => ({ ...prev, [name]: value }))

  const submit = async (event) => {
    event.preventDefault()

    if (!form.name.trim()) {
      setError('Vui lòng nhập tên sản phẩm.')
      return
    }
    if (!Number(form.price) || Number(form.price) <= 0) {
      setError('Vui lòng nhập giá bán hợp lệ (lớn hơn 0).')
      return
    }

    setBusy(true)
    setError('')
    setNotice('')
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        brand: form.brand.trim() || 'Khác',
        price: Number(form.price),
        originalPrice: Number(form.originalPrice) || 0,
        image: form.image.trim(),
        shortDesc: form.shortDesc.trim(),
        description: form.description.trim(),
        installationFee: Number(form.installationFee) || 0,
        inStock: Boolean(form.inStock),
        warranty: form.warranty.trim(),
        specifications: textToLines(form.specifications),
        features: textToLines(form.features),
      }

      if (editingId) {
        await adminApi.products.update(editingId, payload)
        setNotice('Đã cập nhật sản phẩm.')
      } else {
        await adminApi.products.create(payload)
        setNotice('Đã thêm sản phẩm mới.')
      }

      resetForm()
      reload()
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setBusy(false)
    }
  }

  const startEdit = (product) => {
    setEditingId(product.id)
    setForm({
      name: product.name || '',
      category: product.category || 'electric',
      brand: product.brand || '',
      price: String(product.price ?? ''),
      originalPrice: String(product.originalPrice ?? ''),
      image: product.image || '',
      shortDesc: product.shortDesc || '',
      description: product.description || '',
      installationFee: String(product.installationFee ?? ''),
      inStock: product.inStock !== false,
      warranty: product.warranty || '',
      specifications: Array.isArray(product.specifications)
        ? product.specifications
            .map((item) => (typeof item === 'object' ? `${item.key}: ${item.value}` : String(item)))
            .join('\n')
        : '',
      features: Array.isArray(product.features) ? product.features.join('\n') : '',
    })
    setError('')
    setNotice('')
  }

  const remove = async (product) => {
    if (!window.confirm(`Bạn có chắc muốn xoá sản phẩm "${product.name}"?`)) return

    setBusyId(product.id)
    setError('')
    setNotice('')
    try {
      await adminApi.products.remove(product.id)
      if (editingId === product.id) resetForm()
      setNotice('Đã xoá sản phẩm.')
      reload()
    } catch (actionError) {
      setError(actionError.message)
    } finally {
      setBusyId(null)
    }
  }

  const toggleStock = async (product) => {
    setBusyId(product.id)
    setError('')
    setNotice('')
    try {
      await adminApi.products.update(product.id, {
        name: product.name,
        category: product.category,
        brand: product.brand,
        price: product.price,
        inStock: !product.inStock,
      })
      setNotice(product.inStock ? 'Đã tạm ẩn sản phẩm.' : 'Đã hiện sản phẩm.')
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
        <h1>Quản lý sản phẩm</h1>
        <p>Thêm, sửa, xoá và cập nhật tồn kho các thiết bị điện nước hiển thị cho khách hàng.</p>
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
            {editingId ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
          </h2>

          <form className="form" onSubmit={submit} noValidate>
            <Field
              id="prod-name"
              label="Tên sản phẩm *"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="VD: Aptomat chống giật Panasonic RCBO 32A"
            />

            <div className="field">
              <label htmlFor="prod-category">Danh mục</label>
              <div className="field__control">
                <select
                  id="prod-category"
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

            <Field
              id="prod-brand"
              label="Thương hiệu"
              value={form.brand}
              onChange={(e) => set('brand', e.target.value)}
              placeholder="VD: Panasonic"
            />

            <div className="order-form__grid">
              <Field
                id="prod-price"
                label="Giá bán (đ) *"
                type="number"
                min="0"
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
                placeholder="VD: 385000"
              />
              <Field
                id="prod-original"
                label="Giá gốc (đ)"
                type="number"
                min="0"
                value={form.originalPrice}
                onChange={(e) => set('originalPrice', e.target.value)}
                placeholder="VD: 450000"
              />
            </div>

            <Field
              id="prod-install"
              label="Phí thợ lắp đặt (đ)"
              type="number"
              min="0"
              value={form.installationFee}
              onChange={(e) => set('installationFee', e.target.value)}
              placeholder="VD: 100000"
            />

            <Field
              id="prod-image"
              label="Ảnh (URL)"
              value={form.image}
              onChange={(e) => set('image', e.target.value)}
              placeholder="https://..."
            />

            <div className="field">
              <label htmlFor="prod-short">Mô tả ngắn</label>
              <div className="field__control">
                <textarea
                  id="prod-short"
                  rows="2"
                  value={form.shortDesc}
                  onChange={(e) => set('shortDesc', e.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="prod-desc">Mô tả chi tiết</label>
              <div className="field__control">
                <textarea
                  id="prod-desc"
                  rows="4"
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                />
              </div>
            </div>

            <Field
              id="prod-warranty"
              label="Bảo hành"
              value={form.warranty}
              onChange={(e) => set('warranty', e.target.value)}
              placeholder="VD: 24 tháng chính hãng"
            />

            <div className="field">
              <label htmlFor="prod-specs">Thông số kỹ thuật (mỗi dòng một mục)</label>
              <div className="field__control">
                <textarea
                  id="prod-specs"
                  rows="4"
                  value={form.specifications}
                  onChange={(e) => set('specifications', e.target.value)}
                  placeholder={'Thương hiệu: Panasonic\nCông suất: 125W'}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="prod-features">Đặc điểm nổi bật (mỗi dòng một mục)</label>
              <div className="field__control">
                <textarea
                  id="prod-features"
                  rows="3"
                  value={form.features}
                  onChange={(e) => set('features', e.target.value)}
                  placeholder={'Tự động ngắt khi quá tải\nChống rò điện giật'}
                />
              </div>
            </div>

            <div className="field">
              <label className="form__check">
                <input
                  type="checkbox"
                  checked={form.inStock}
                  onChange={(e) => set('inStock', e.target.checked)}
                />
                Còn hàng
              </label>
            </div>

            <div className="admin-actions">
              <button className="btn btn--primary" type="submit" disabled={busy}>
                {busy ? 'Đang lưu…' : editingId ? 'Lưu thay đổi' : 'Thêm sản phẩm'}
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
            <h2 className="card__title">Danh sách ({products.length})</h2>
          </div>

          {loading ? (
            <p className="card__empty">Đang tải danh sách…</p>
          ) : products.length === 0 ? (
            <p className="card__empty">Chưa có sản phẩm nào.</p>
          ) : (
            <ul className="req-list">
              {products.map((product) => (
                <li key={product.id} className="req-item">
                  <div className="req-item__top">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      {product.image && (
                        <img
                          src={product.image}
                          alt={product.name}
                          style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }}
                        />
                      )}
                      <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {product.name}
                      </strong>
                    </div>
                    <span
                      className={product.inStock ? 'status status--done' : 'status status--failed'}
                    >
                      {product.inStock ? 'Còn hàng' : 'Hết hàng'}
                    </span>
                  </div>

                  <p className="req-item__meta">
                    {product.brand} · {CATEGORY_OPTIONS.find((c) => c.value === product.category)?.label || 'Khác'} ·{' '}
                    <strong>{fmtMoney(product.price)}</strong>
                    {product.ownerName && ` · Bởi ${product.ownerName}`}
                  </p>

                  <div className="req-item__foot">
                    <span className="req-item__date">Cập nhật: {fmtDate(product.updatedAt)}</span>
                    <span className="admin-actions">
                      <button
                        className="btn btn--outline btn--sm"
                        type="button"
                        onClick={() => toggleStock(product)}
                        disabled={busyId === product.id}
                      >
                        {product.inStock ? 'Ẩn' : 'Hiện'}
                      </button>
                      <button
                        className="btn btn--outline btn--sm"
                        type="button"
                        onClick={() => startEdit(product)}
                      >
                        Sửa
                      </button>
                      <button
                        className="btn btn--outline btn--sm"
                        type="button"
                        onClick={() => remove(product)}
                        disabled={busyId === product.id}
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