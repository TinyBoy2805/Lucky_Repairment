/** Trang đích mặc định theo từng vai trò. */
export const ROLE_HOME = {
  admin: '/admin',
  customer: '/customer',
  repairman: '/repairman',
}

export const ROLE_LABEL = {
  admin: 'Quản trị viên',
  customer: 'Khách hàng',
  repairman: 'Thợ sửa chữa',
}

export function homeFor(role) {
  return ROLE_HOME[role] ?? '/customer'
}
