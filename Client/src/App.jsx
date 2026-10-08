import { Navigate, Route, Routes } from 'react-router-dom'
import AuthLayout from './layouts/AuthLayout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import Admin from './pages/Admin.jsx'
import Customer from './pages/Customer.jsx'
import Repairman from './pages/Repairman.jsx'

import Home from './pages/Home.jsx'

export default function App() {
  return (
    <Routes>
      {/* Trang chủ */}
      <Route path="/" element={<Home />} />

      {/* Khu vực xác thực */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
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
      <Route
        path="/customer"
        element={
          <ProtectedRoute allow={['customer']}>
            <Customer />
          </ProtectedRoute>
        }
      />
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
