import { Outlet } from 'react-router-dom'
import DashboardLayout from './DashboardLayout.jsx'
import AdminNav from '../components/AdminNav.jsx'

export default function AdminLayout() {
  return (
    <DashboardLayout roleLabel="Quản trị viên" sidebar={<AdminNav />}>
      <Outlet />
    </DashboardLayout>
  )
}
