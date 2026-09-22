import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { DeviceSessionCard } from './components/DeviceSessionCard'
import { RoleGuard } from '@/components/auth/RoleGuard'
import type { Session } from './types'

// Mock useAuth
const mockUseAuth = vi.fn()
vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

describe('Authentication Pages & Components', () => {
  it('LoginPage renders fields and fills universal test account on click', () => {
    mockUseAuth.mockReturnValue({
      login: vi.fn(),
      isAuthenticated: false,
      isLoading: false,
    })

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement
    const passwordInput = screen.getByLabelText(/^password/i) as HTMLInputElement
    const prefillButton = screen.getByText(/pre-fill universal test account/i)

    expect(emailInput).toBeInTheDocument()
    expect(passwordInput).toBeInTheDocument()
    expect(emailInput.value).toBe('')

    fireEvent.click(prefillButton)

    expect(emailInput.value).toBe('test@wealthflow.local')
    expect(passwordInput.value).toBe('Test@123456')
  })

  it('RegisterPage renders registration form and singleton admin notice', () => {
    mockUseAuth.mockReturnValue({
      register: vi.fn(),
      isAuthenticated: false,
      isLoading: false,
    })

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    )

    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/base currency/i)).toBeInTheDocument()
    expect(screen.getByText(/public registration strictly creates/i)).toBeInTheDocument()
  })

  it('DeviceSessionCard displays "This Device" badge for current session', () => {
    const currentSession: Session = {
      id: 'session-1',
      deviceName: 'MacBook Pro',
      deviceType: 'Desktop',
      browser: 'Chrome 120',
      ipAddress: '192.168.1.1',
      lastActiveAtUtc: new Date().toISOString(),
      expiresAtUtc: new Date().toISOString(),
      isCurrent: true,
    }

    render(
      <DeviceSessionCard
        session={currentSession}
        onRevoke={vi.fn()}
      />
    )

    expect(screen.getByText('MacBook Pro')).toBeInTheDocument()
    expect(screen.getByText('This Device')).toBeInTheDocument()
    expect(screen.queryByText(/revoke session/i)).not.toBeInTheDocument()
  })

  it('DeviceSessionCard displays "Revoke Session" button for remote session', () => {
    const onRevoke = vi.fn()
    const remoteSession: Session = {
      id: 'session-2',
      deviceName: 'iPhone 15',
      deviceType: 'Mobile',
      browser: 'Safari Mobile',
      ipAddress: '192.168.1.20',
      lastActiveAtUtc: new Date().toISOString(),
      expiresAtUtc: new Date().toISOString(),
      isCurrent: false,
    }

    render(
      <DeviceSessionCard
        session={remoteSession}
        onRevoke={onRevoke}
      />
    )

    expect(screen.getByText('iPhone 15')).toBeInTheDocument()
    expect(screen.queryByText('This Device')).not.toBeInTheDocument()

    const revokeBtn = screen.getByText(/revoke session/i)
    expect(revokeBtn).toBeInTheDocument()
    fireEvent.click(revokeBtn)
    expect(onRevoke).toHaveBeenCalledWith('session-2')
  })

  it('RoleGuard blocks non-Admin user and displays 403 Forbidden screen', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: '11111111-1111-1111-1111-111111111111',
        email: 'test@wealthflow.local',
        fullName: 'Universal Tester',
        role: 'User',
        baseCurrency: 'INR',
        isLockedOut: false,
      },
      isAuthenticated: true,
      isLoading: false,
    })

    render(
      <MemoryRouter>
        <RoleGuard requiredRole="Admin">
          <div data-testid="admin-content">Secret Admin Panel</div>
        </RoleGuard>
      </MemoryRouter>
    )

    expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument()
    expect(screen.getByText(/access denied \(403 forbidden\)/i)).toBeInTheDocument()
    expect(screen.getByText(/singleton admin policy/i)).toBeInTheDocument()
  })
})
