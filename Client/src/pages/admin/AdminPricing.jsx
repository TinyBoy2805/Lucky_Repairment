import { useEffect, useState } from 'react'
import Field from '../../components/Field.jsx'
import { adminApi } from '../../lib/admin.js'
import { fmtDateTime } from '../../lib/format.js'

const emptyForm = { commissionRate: '', minServiceFee: '', currency: 'VND', note: '' }

export default function AdminPricing() {
  const [form, setForm] = useState(emptyForm)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    adminApi.pricing
      .get()
      .then((data) => {
        const pricing = data.pricing
        setForm({
          commissionRate: String(pricing.commissionRate ?? ''),
          minServiceFee: String(pricing.minServiceFee ?? ''),
          currency: pricing.currency ?? 'VND',
          note: pricing.note ?? '',
        })
        setUpdatedAt(pricing.updatedAt ?? null)
      })
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false))
  }, [])

  const update = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const submit = async (event) => {
    event.preventDefault()

    setBusy(true)
    setError('')
    setNotice('')
    try {
      const { pricing } = await adminApi.pricing.update({
        commissionRate: Number(form.commissionRate),
        minServiceFee: Number(form.minServiceFee),
        currency: form.currency,
        note: form.note,
      })
      setForm({
        commissionRate: String(pricing.commissionRate),
        minServiceFee: String(pricing.minServiceFee),
        currency: pricing.currency,
        note: pricing.note,
      })
      setUpdatedAt(pricing.updatedAt)
      setNotice('Đã lưu cấu hình giá.')
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <header className="page__header">
        <h1>Cấu hình giá</h1>
        <p>Thiết lập tỷ lệ hoa hồng và phí dịch vụ tối thiểu của nền tảng.</p>
      </header>

      {error && (
        <div className="alert alert--error" role="alert">
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div className="alert alert--success" role="status">
          <span>{notice}</span>
        </div>
      )}

      <section className="card">
        <h2 className="card__title">Chính sách giá</h2>

        {loading ? (
          <p className="card__empty">Đang tải cấu hình…</p>
        ) : (
          <form className="form" onSubmit={submit} noValidate>
            <Field
              id="price-commission"
              label="Tỷ lệ hoa hồng (%)"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={form.commissionRate}
              onChange={(event) => update('commissionRate', event.target.value)}
            />

            <Field
              id="price-min"
              label="Phí dịch vụ tối thiểu"
              type="number"
              min="0"
              step="1000"
              value={form.minServiceFee}
              onChange={(event) => update('minServiceFee', event.target.value)}
            />

            <div className="field">
              <label htmlFor="price-currency">Đơn vị tiền tệ</label>
              <div className="field__control">
                <select
                  id="price-currency"
                  className="admin-select"
                  value={form.currency}
                  onChange={(event) => update('currency', event.target.value)}
                >
                  <option value="VND">VND</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>

            <div className="field">
              <label htmlFor="price-note">Ghi chú</label>
              <div className="field__control">
                <textarea
                  id="price-note"
                  rows="3"
                  placeholder="Ghi chú nội bộ (không bắt buộc)"
                  value={form.note}
                  onChange={(event) => update('note', event.target.value)}
                />
              </div>
            </div>

            <div className="admin-actions">
              <button className="btn btn--primary" type="submit" disabled={busy}>
                {busy ? 'Đang lưu…' : 'Lưu cấu hình'}
              </button>
              {updatedAt && (
                <span className="form__hint">
                  Cập nhật lần cuối: {fmtDateTime(updatedAt)}
                </span>
              )}
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
