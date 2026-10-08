import DashboardLayout from '../layouts/DashboardLayout.jsx'
import Placeholder from '../components/Placeholder.jsx'

const icon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)

export default function Admin() {
  return (
    <DashboardLayout roleLabel="Quản trị viên">
      <Placeholder
        icon={icon}
        title="Bảng điều khiển quản trị"
        description="Trang quản trị đang được xây dựng. Nội dung thống kê, quản lý người dùng và phân công công việc sẽ hiển thị tại đây."
      />
    </DashboardLayout>
  )
}
