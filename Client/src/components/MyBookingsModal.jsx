import { useEffect, useState } from 'react'
import { requestsApi } from '../lib/requests.js'
import StatusBadge from './StatusBadge.jsx'
import { fmtDate } from '../lib/format.js'

export default function MyBookingsModal({ isOpen, onClose }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    requestsApi
      .list()
      .then((data) => {
        if (!cancelled) {
          setRequests(data.requests || [])
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Không thể tải danh sách đơn sửa chữa.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-content my-bookings-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 640 }}
      >
        <div className="modal-header">
          <div className="modal-header__title-group">
            <h3>Đơn sửa chữa của tôi</h3>
            <p>Theo dõi tiến độ và lịch hẹn sửa chữa điện nước của bạn</p>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
          >
            ✕
          </button>
        </div>

        <div className="modal-body my-bookings-modal__body">
          {loading && (
            <div className="my-bookings-modal__loading">
              <div className="spinner" />
              <span>Đang tải danh sách đơn đặt...</span>
            </div>
          )}

          {error && (
            <div className="alert alert--error" role="alert">
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && requests.length === 0 && (
            <div className="my-bookings-modal__empty">
              <div className="my-bookings-modal__empty-icon">🛠️</div>
              <h4>Chưa có đơn sửa chữa nào</h4>
              <p>Bạn chưa đặt lịch sửa chữa điện nước nào trên hệ thống.</p>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => {
                  onClose()
                  const el = document.getElementById('services-featured')
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth' })
                  }
                }}
              >
                Đặt thợ sửa ngay
              </button>
            </div>
          )}

          {!loading && !error && requests.length > 0 && (
            <div className="my-bookings-list">
              {requests.map((item) => (
                <div key={item.id} className="my-booking-card">
                  <div className="my-booking-card__top">
                    <span className="my-booking-card__device">
                      {item.device || item.serviceName || 'Sửa chữa điện nước'}
                    </span>
                    <StatusBadge status={item.status} />
                  </div>

                  <p className="my-booking-card__issue">{item.issue}</p>

                  <div className="my-booking-card__meta">
                    {item.address && (
                      <div className="my-booking-card__meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span>{item.address}</span>
                      </div>
                    )}
                    {item.phone && (
                      <div className="my-booking-card__meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                        <span>{item.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="my-booking-card__foot">
                    <span className="my-booking-card__date">
                      Ngày đặt: {fmtDate(item.createdAt)}
                    </span>
                    <span className="my-booking-card__tech">
                      {item.repairmanName ? `Thợ phụ trách: ${item.repairmanName}` : 'Đang điều phối thợ'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>
            Tổng số: <strong>{requests.length}</strong> đơn yêu cầu
          </span>
          <button type="button" className="btn btn--outline btn--sm" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
