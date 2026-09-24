import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { SessionsPage } from '@/features/auth/pages/SessionsPage'
import { AdminDashboardPage } from '@/features/admin/pages/AdminDashboardPage'
import { AdminUsersPage } from '@/features/admin/pages/AdminUsersPage'
import { AdminAuditLogsPage } from '@/features/admin/pages/AdminAuditLogsPage'
import { AdminSyncMonitorPage } from '@/features/admin/pages/AdminSyncMonitorPage'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { AnalyticsPage } from '@/features/analytics/pages/AnalyticsPage'
import { AccountsPage } from '@/features/accounts/pages/AccountsPage'
import { LedgerPage } from '@/features/transactions/pages/LedgerPage'
import { CreditCardsPage } from '@/features/credit-cards/pages/CreditCardsPage'
import { LoansPage } from '@/features/loans/pages/LoansPage'
import { InvestmentsPage } from '@/features/investments/pages/InvestmentsPage'
import { TripsListPage } from '@/features/trips/pages/TripsListPage'
import { TripWorkspacePage } from '@/features/trips/pages/TripWorkspacePage'
import { GuestTripViewPage } from '@/features/trips/pages/GuestTripViewPage'

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
    <ThemeProvider>
      <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/trip/:tripId/guest/:token" element={<GuestTripViewPage />} />
          <Route path="/trips/:tripId/guest/:token" element={<GuestTripViewPage />} />

          {/* Protected Routes enforcing Single Layout & Role Guards */}
          <Route
            element={
              <ProtectedRoute>
                <AuthenticatedShell />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/transactions" element={<LedgerPage />} />
            <Route path="/ledger" element={<LedgerPage />} />
            <Route path="/budgets" element={<LedgerPage />} />
            <Route path="/credit-cards" element={<CreditCardsPage />} />
            <Route path="/loans" element={<LoansPage />} />
            <Route path="/investments" element={<InvestmentsPage />} />
            <Route path="/trips" element={<TripsListPage />} />
            <Route path="/trips/:tripId" element={<TripWorkspacePage />} />
            <Route path="/settings/sessions" element={<SessionsPage />} />
            <Route
              path="/admin"
              element={
                <RoleGuard requiredRole="Admin">
                  <AdminDashboardPage />
                </RoleGuard>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <RoleGuard requiredRole="Admin">
                  <AdminDashboardPage />
                </RoleGuard>
              }
            />
            <Route
              path="/admin/users"
              element={
                <RoleGuard requiredRole="Admin">
                  <AdminUsersPage />
                </RoleGuard>
              }
            />
            <Route
              path="/admin/audit-logs"
              element={
                <RoleGuard requiredRole="Admin">
                  <AdminAuditLogsPage />
                </RoleGuard>
              }
            />
            <Route
              path="/admin/sync-monitor"
              element={
                <RoleGuard requiredRole="Admin">
                  <AdminSyncMonitorPage />
                </RoleGuard>
              }
            />
            {/* Catch-all redirect to Dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </ThemeProvider>
  )
}

export default App
