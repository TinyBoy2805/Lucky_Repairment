import { Navigate, Route, Routes } from 'react-router-dom'
import AuthLayout from './layouts/AuthLayout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import AdminLayout from './layouts/AdminLayout.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import AdminAccounts from './pages/admin/AdminAccounts.jsx'
import AdminOrders from './pages/admin/AdminOrders.jsx'
import AdminCategories from './pages/admin/AdminCategories.jsx'
import AdminReports from './pages/admin/AdminReports.jsx'
import AdminRatings from './pages/admin/AdminRatings.jsx'
import AdminPayments from './pages/admin/AdminPayments.jsx'
import AdminWallet from './pages/admin/AdminWallet.jsx'
import AdminAvailability from './pages/admin/AdminAvailability.jsx'
import AdminPricing from './pages/admin/AdminPricing.jsx'
import Repairman from './pages/Repairman.jsx'

import MainLayout from './layouts/MainLayout.jsx'
import Home from './pages/Home.jsx'
import Services from './pages/Services.jsx'
import ServiceDetail from './pages/ServiceDetail.jsx'
import Products from './pages/Products.jsx'
import ProductDetail from './pages/ProductDetail.jsx'

export default function App() {
  return (
    <Routes>
      {/* Các trang công khai — dùng chung thanh Header/Navbar cố định */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/services" element={<Services />} />
        <Route path="/services/:id" element={<ServiceDetail />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetail />} />

        {/* Khu vực xác thực — cũng hiển thị thanh heading (Navbar) */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Route>
      </Route>

      {/* 3 trang theo vai trò — bảo vệ bằng role */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allow={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="accounts" element={<AdminAccounts />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="ratings" element={<AdminRatings />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="wallet" element={<AdminWallet />} />
        <Route path="availability" element={<AdminAvailability />} />
        <Route path="pricing" element={<AdminPricing />} />
      </Route>
        <Route path="/customer" element={<Navigate to="/" replace />} />
      <Route
        path="/repairman"
        element={
          <ProtectedRoute allow={['repairman']}>
            <Repairman />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
