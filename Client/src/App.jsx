import { Navigate, Route, Routes } from 'react-router-dom'
import AuthLayout from './layouts/AuthLayout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import Admin from './pages/Admin.jsx'
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
            <Admin />
          </ProtectedRoute>
        }
      />
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
