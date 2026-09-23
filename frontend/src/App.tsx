import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/context/AuthContext'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { SessionsPage } from '@/features/auth/pages/SessionsPage'
import { AdminDashboardPage } from '@/features/admin/pages/AdminDashboardPage'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { AccountsPage } from '@/features/accounts/pages/AccountsPage'
import { LedgerPage } from '@/features/transactions/pages/LedgerPage'
import { CreditCardsPage } from '@/features/credit-cards/pages/CreditCardsPage'
import { LoansPage } from '@/features/loans/pages/LoansPage'
import { InvestmentsPage } from '@/features/investments/pages/InvestmentsPage'

export const AuthenticatedShell: React.FC = () => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <AppLayout
      currentPath={location.pathname}
      isAdmin={user?.role === 'Admin'}
      userEmail={user?.email || 'test@wealthflow.local'}
      userRole={user?.role || 'User'}
      onNavigate={(path) => navigate(path)}
      onLogout={async () => {
        await logout()
        navigate('/login')
      }}
    >
      <Outlet />
    </AppLayout>
  )
}

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Routes enforcing Single Layout & Role Guards */}
          <Route
            element={
              <ProtectedRoute>
                <AuthenticatedShell />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/transactions" element={<LedgerPage />} />
            <Route path="/ledger" element={<LedgerPage />} />
            <Route path="/budgets" element={<LedgerPage />} />
            <Route path="/credit-cards" element={<CreditCardsPage />} />
            <Route path="/loans" element={<LoansPage />} />
            <Route path="/investments" element={<InvestmentsPage />} />
            <Route path="/settings/sessions" element={<SessionsPage />} />
            <Route
              path="/admin"
              element={
                <RoleGuard requiredRole="Admin">
                  <AdminDashboardPage />
                </RoleGuard>
              }
            />
            {/* Catch-all redirect to Dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
