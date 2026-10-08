const STATUS_LABEL = {
  open: 'Đang mở',
  resolved: 'Đã xử lý',
  rejected: 'Đã từ chối',
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  failed: 'Thất bại',
}

export default function AdminBadge({ status }) {
  if (!status) return null

  return (
    <span className={`status status--${status}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}
