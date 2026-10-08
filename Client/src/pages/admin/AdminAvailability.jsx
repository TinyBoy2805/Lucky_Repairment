import { useState } from 'react'
import AdminPager from '../../components/AdminPager.jsx'
import { adminApi } from '../../lib/admin.js'
import { buildQuery, useDebounced } from '../../lib/query.js'
import { useAdminList } from '../../lib/useAdminList.js'

const ONLINE_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'true', label: 'Đang online' },
  { value: 'false', label: 'Đang offline' },
]

const WEEKDAY_LABEL = {
  1: 'T2',
  2: 'T3',
  3: 'T4',
  4: 'T5',
  5: 'T6',
  6: 'T7',
  7: 'CN',
}

const PAGE_SIZE = 8

export default function AdminAvailability() {
  const [keyword, setKeyword] = useState('')
  const search = useDebounced(keyword)
  const [online, setOnline] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [timeOff, setTimeOff] = useState({ start: '', end: '', reason: '' })

  const params = { search, online, page, pageSize: PAGE_SIZE }
  const key = buildQuery(params)
  const { data, loading, error: loadError, reload } = useAdminList(
    () => adminApi.schedules.list(params),
    key,
  )

  const schedules = data?.schedules ?? []

  const resetMessages = () => {
    setError('')
    setNotice('')
  }

  const openDetail = async (schedule) => {
    setSelected(schedule)
    setDetail(null)
    setTimeOff({ start: '', end: '', reason: '' })
    resetMessages()
    try {
      const result = await adminApi.schedules.show(schedule.uid)
      setDetail(result.schedule)
    } catch (detailError) {
      setError(detailError.message)
    }
  }

  const refreshDetail = async (uid) => {
    const result = await adminApi.schedules.show(uid)
    setDetail(result.schedule)
  }

  const saveSchedule = async (event) => {
    event.preventDefault()
    if (!detail) return

    setBusy(true)
    resetMessages()
    try {
      await adminApi.schedules.update(detail.uid, {
        online: Boolean(detail.online),
        defaultStart: detail.defaultStart,
        defaultEnd: detail.defaultEnd,
      })
      await refreshDetail(detail.uid)
      setNotice('Đã lưu lịch làm việc.')
      reload()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setBusy(false)
    }
  }

  const addTimeOff = async (event) => {
    event.preventDefault()
    if (!detail) return

    if (!timeOff.start || !timeOff.end) {
      setError('Vui lòng nhập thời gian bắt đầu và kết thúc.')
      return
    }

    setBusy(true)
    resetMessages()
    try {
      await adminApi.schedules.addTimeOff(detail.uid, timeOff)
      setTimeOff({ start: '', end: '', reason: '' })
      await refreshDetail(detail.uid)
      setNotice('Đã thêm khung giờ nghỉ.')
      reload()
    } catch (addError) {
      setError(addError.message)
    } finally {
      setBusy(false)
    }
  }

  const removeTimeOff = async (id) => {
    if (!detail) return
    if (!window.confirm('Bạn có chắc muốn xoá khung giờ nghỉ này?')) return

    setBusy(true)
    resetMessages()
    try {
      await adminApi.schedules.removeTimeOff(detail.uid, id)
      await refreshDetail(detail.uid)
      setNotice('Đã xoá khung giờ nghỉ.')
      reload()
    } catch (removeError) {
      setError(removeError.message)
    } finally {
      setBusy(false)
    }
  }

  const timeOffList = detail
    ? Object.entries(detail.timeOff ?? {}).map(([id, item]) => ({ id, ...item }))
    : []

  const shownError = error || loadError

  return (
    <div className="page">
      <header className="page__header">
        <h1>Lịch làm việc</h1>
        <p>Quản lý giờ làm mặc định và khung giờ nghỉ của thợ.</p>
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
          <div className="toolbar">
            <h2 className="card__title">Thợ ({data?.total ?? 0})</h2>
          </div>

          <input
            className="admin-input"
            type="search"
            placeholder="Tìm theo tên hoặc email…"
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value)
              setPage(1)
            }}
          />
          <select
            className="admin-select"
            value={online}
            onChange={(event) => {
              setOnline(event.target.value)
              setPage(1)
            }}
          >
            {ONLINE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {loading ? (
            <p className="card__empty">Đang tải danh sách…</p>
          ) : schedules.length === 0 ? (
            <p className="card__empty">Không có thợ nào khớp bộ lọc.</p>
          ) : (
            <ul className="req-list wallet-list">
              {schedules.map((schedule) => (
                <li
                  key={schedule.uid}
                  className={
                    selected?.uid === schedule.uid
                      ? 'req-item wallet-item is-active'
                      : 'req-item wallet-item'
                  }
                >
                  <button
                    className="wallet-item__button"
                    type="button"
                    onClick={() => openDetail(schedule)}
                  >
                    <span className="wallet-item__name">
                      {schedule.name || schedule.email || schedule.uid}
                    </span>
                    <span
                      className={
                        schedule.online ? 'status status--done' : 'status status--failed'
                      }
                    >
                      {schedule.online ? 'Online' : 'Offline'}
                    </span>
                  </button>
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

        <section className="card">
          <h2 className="card__title">
            {selected ? selected.name || selected.email || selected.uid : 'Chi tiết'}
          </h2>

          {!detail ? (
            <p className="card__empty">Chọn một thợ bên trái để xem lịch làm việc.</p>
          ) : (
            <>
              <form className="form" onSubmit={saveSchedule} noValidate>
                <div className="field">
                  <label htmlFor="av-online">Trạng thái</label>
                  <div className="field__control">
                    <label className="form__check">
                      <input
                        id="av-online"
                        type="checkbox"
                        checked={Boolean(detail.online)}
                        onChange={(event) =>
                          setDetail((prev) => ({ ...prev, online: event.target.checked }))
                        }
                      />
                      Đang nhận việc
                    </label>
                  </div>
                </div>

                <div className="form__grid">
                  <div className="field">
                    <label htmlFor="av-start">Giờ bắt đầu</label>
                    <div className="field__control">
                      <input
                        id="av-start"
                        className="admin-input"
                        type="time"
                        value={detail.defaultStart}
                        onChange={(event) =>
                          setDetail((prev) => ({ ...prev, defaultStart: event.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="av-end">Giờ kết thúc</label>
                    <div className="field__control">
                      <input
                        id="av-end"
                        className="admin-input"
                        type="time"
                        value={detail.defaultEnd}
                        onChange={(event) =>
                          setDetail((prev) => ({ ...prev, defaultEnd: event.target.value }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="field">
                  <label>Ngày làm việc</label>
                  <div className="chips">
                    {(detail.workDays ?? []).map((day) => (
                      <span key={day} className="chip">
                        {WEEKDAY_LABEL[day] ?? day}
                      </span>
                    ))}
                  </div>
                </div>

                <button className="btn btn--primary" type="submit" disabled={busy}>
                  {busy ? 'Đang lưu…' : 'Lưu lịch làm việc'}
                </button>
              </form>

              <div className="detail">
                <h3 className="detail__title">Khung giờ nghỉ</h3>

                {timeOffList.length === 0 ? (
                  <p className="card__empty">Chưa có khung giờ nghỉ.</p>
                ) : (
                  <ul className="detail__list">
                    {timeOffList.map((item) => (
                      <li key={item.id} className="detail__item">
                        <span>
                          {item.start} → {item.end}
                          {item.reason ? ` · ${item.reason}` : ''}
                        </span>
                        <button
                          className="btn btn--outline btn--sm"
                          type="button"
                          onClick={() => removeTimeOff(item.id)}
                          disabled={busy}
                        >
                          Xoá
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <form className="form" onSubmit={addTimeOff} noValidate>
                  <div className="form__grid">
                    <div className="field">
                      <label htmlFor="to-start">Bắt đầu</label>
                      <div className="field__control">
                        <input
                          id="to-start"
                          className="admin-input"
                          type="datetime-local"
                          value={timeOff.start}
                          onChange={(event) =>
                            setTimeOff((prev) => ({ ...prev, start: event.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor="to-end">Kết thúc</label>
                      <div className="field__control">
                        <input
                          id="to-end"
                          className="admin-input"
                          type="datetime-local"
                          value={timeOff.end}
                          onChange={(event) =>
                            setTimeOff((prev) => ({ ...prev, end: event.target.value }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="to-reason">Lý do</label>
                    <div className="field__control">
                      <input
                        id="to-reason"
                        className="admin-input"
                        placeholder="Không bắt buộc"
                        value={timeOff.reason}
                        onChange={(event) =>
                          setTimeOff((prev) => ({ ...prev, reason: event.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <button className="btn btn--outline" type="submit" disabled={busy}>
                    Thêm khung giờ nghỉ
                  </button>
                </form>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
