export default function ProfileModal({ isOpen, onClose, user }) {
  if (!isOpen || !user) return null

  const displayName =
    user.displayName ||
    user.fullName ||
    (user.email ? user.email.split('@')[0] : 'Người dùng')
  const initial = displayName.charAt(0).toUpperCase()
  const roleName =
    user.role === 'admin'
      ? 'Quản trị viên'
      : user.role === 'repairman'
        ? 'Thợ sửa chữa chuyên nghiệp'
        : 'Khách hàng'

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-content profile-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 480 }}
      >
        <div className="modal-header">
          <div className="modal-header__title-group">
            <h3>Thông tin tài khoản</h3>
            <p>Chi tiết hồ sơ người dùng trên Lucky Repairment</p>
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

        <div className="modal-body profile-modal__body">
          <div className="profile-modal__avatar-wrap">
            <span className="profile-modal__avatar">{initial}</span>
            <div className="profile-modal__badge">{roleName}</div>
          </div>

          <div className="profile-modal__fields">
            <div className="profile-modal__field">
              <span className="profile-modal__label">Họ và tên</span>
              <strong className="profile-modal__value">{displayName}</strong>
            </div>

            <div className="profile-modal__field">
              <span className="profile-modal__label">Địa chỉ Email</span>
              <span className="profile-modal__value">{user.email || 'Chưa cập nhật'}</span>
            </div>

            <div className="profile-modal__field">
              <span className="profile-modal__label">Số điện thoại</span>
              <span className="profile-modal__value">{user.phone || 'Chưa cập nhật'}</span>
            </div>

            <div className="profile-modal__field">
              <span className="profile-modal__label">Vai trò tài khoản</span>
              <span className="profile-modal__value">{roleName}</span>
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn--primary btn--sm" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
