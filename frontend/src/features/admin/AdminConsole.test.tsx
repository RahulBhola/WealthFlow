import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { RoleGuard } from '@/components/auth/RoleGuard'
import {
  computeJsonDiff,
  AuditDiffDrawer,
} from './components/AuditDiffDrawer'
import { AdminDashboardPage } from './pages/AdminDashboardPage'
import type { AdminAuditLogDto } from './types'

// Mock useAuth for RoleGuard testing
let mockUser: { email: string; role: 'Admin' | 'User' } | null = {
  email: 'standard@wealthflow.local',
  role: 'User',
}

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    logout: vi.fn(),
  }),
}))

// Mock adminApi for AdminDashboardPage
vi.mock('./api/adminApi', () => ({
  fetchAdminDashboard: vi.fn().mockResolvedValue({
    status: 'Operational',
    totalUsersCount: 1,
    activeSessionsCount: 3,
    singleAdminVerified: true,
    adminCount: 1,
    adminEmailMask: 'adm***@wealthflow.local',
    adminLastLoginUtc: '2026-09-24T06:00:00Z',
    dbProvider: 'Npgsql PostgreSQL 16',
    dbPoolOccupancy: '4/50',
    dbQueryP95LatencyMs: 12,
    dbStorageSizeBytes: 44800000,
    syncOperationsToday: 1420,
    syncConflictRatePercentage: 0.04,
    syncDeadLetterCount: 0,
    securityEventsToday: 284,
    failedLoginAttemptsToday: 0,
    recentMutations: [
      {
        id: 'mut-1',
        timeUtc: '2026-09-24T07:15:00Z',
        actorEmail: 'admin@wealthflow.local',
        entity: 'Account',
        opType: 'UPDATE',
        latencyMs: 14,
        status: 'Synced',
        device: 'MacBook Pro',
      },
    ],
    subsystems: {
      postgreSqlStatus: 'Healthy',
      cloudStorageProvider: 'Google Drive API v3',
      cloudStorageQuotaUsed: '2.4 MB / 15 GB',
      backgroundJobs: ['Token Cleanup: Active'],
    },
  }),
  sweepStaleConflicts: vi.fn().mockResolvedValue({ sweptCount: 0, message: 'Swept 0 conflicts.' }),
  pruneRevokedTokens: vi.fn().mockResolvedValue({ prunedCount: 0, message: 'Pruned 0 tokens.' }),
  exportAuditLogsJson: vi.fn().mockResolvedValue(undefined),
}))

describe('Admin Console & Security Invariant (WF-EP18-002)', () => {
  describe('computeJsonDiff algorithm', () => {
    it('accurately identifies added, removed, and modified properties', () => {
      const oldJson = JSON.stringify({
        Balance: 24500.0,
        Note: 'Old Note',
        Unchanged: true,
      })
      const newJson = JSON.stringify({
        Balance: 26500.0,
        Category: 'Salary',
        Unchanged: true,
      })

      const diff = computeJsonDiff(oldJson, newJson)

      const removedLines = diff.filter((d) => d.type === 'removed')
      const addedLines = diff.filter((d) => d.type === 'added')
      const unchangedLines = diff.filter((d) => d.type === 'unchanged')

      // Balance was modified: should appear in removed (old value) and added (new value)
      expect(removedLines.some((l) => l.text.includes('"Balance": 24500'))).toBe(true)
      expect(addedLines.some((l) => l.text.includes('"Balance": 26500'))).toBe(true)

      // Note was deleted: should appear in removed
      expect(removedLines.some((l) => l.text.includes('"Note": "Old Note"'))).toBe(true)

      // Category was added: should appear in added
      expect(addedLines.some((l) => l.text.includes('"Category": "Salary"'))).toBe(true)

      // Unchanged was preserved
      expect(unchangedLines.some((l) => l.text.includes('"Unchanged": true'))).toBe(true)
    })

    it('handles empty and null state strings gracefully without throwing', () => {
      const diff = computeJsonDiff(null, JSON.stringify({ Initial: 'State' }))
      expect(diff.some((l) => l.type === 'added' && l.text.includes('"Initial": "State"'))).toBe(true)

      const diffEmpty = computeJsonDiff(null, null)
      expect(diffEmpty.some((l) => l.text.includes('No property modifications'))).toBe(true)
    })
  })

  describe('AuditDiffDrawer slide-over inspector', () => {
    const mockLog: AdminAuditLogDto = {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      timestampUtc: '2026-09-24T07:00:00Z',
      actorEmail: 'admin@wealthflow.local',
      action: 'UPDATE',
      entityName: 'Account',
      entityId: 'acc-12345678-0000',
      ipAddress: '103.21.201.44',
      userAgent: 'Mozilla/5.0 Chrome/128.0',
      oldValuesJson: JSON.stringify({ Balance: 24500 }),
      newValuesJson: JSON.stringify({ Balance: 26500 }),
    }

    it('renders colorized diff inspector drawer when open', () => {
      const onClose = vi.fn()
      render(<AuditDiffDrawer log={mockLog} isOpen={true} onClose={onClose} />)

      expect(screen.getByText('Account')).toBeInTheDocument()
      expect(screen.getByText('admin@wealthflow.local')).toBeInTheDocument()
      expect(screen.getByText('103.21.201.44')).toBeInTheDocument()
      expect(screen.getByTestId('diff-container')).toBeInTheDocument()

      // Close button
      const closeButtons = screen.getAllByRole('button', { name: /close/i })
      fireEvent.click(closeButtons[0])
      expect(onClose).toHaveBeenCalled()
    })

    it('returns null when drawer is not open', () => {
      const { container } = render(
        <AuditDiffDrawer log={mockLog} isOpen={false} onClose={vi.fn()} />
      )
      expect(container.firstChild).toBeNull()
    })
  })

  describe('RoleGuard 403 Forbidden Rejection', () => {
    it('blocks non-admin users with 403 Forbidden and returns to dashboard CTA', () => {
      mockUser = { email: 'guest@wealthflow.local', role: 'User' }

      render(
        <BrowserRouter>
          <RoleGuard requiredRole="Admin">
            <div data-testid="admin-secret-content">Secret Admin ERP</div>
          </RoleGuard>
        </BrowserRouter>
      )

      expect(screen.queryByTestId('admin-secret-content')).not.toBeInTheDocument()
      expect(screen.getByText('Access Denied (403 Forbidden)')).toBeInTheDocument()
      expect(screen.getByText('Return to Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Singleton Admin Policy')).toBeInTheDocument()
    })

    it('allows access for users with Admin role', () => {
      mockUser = { email: 'admin@wealthflow.local', role: 'Admin' }

      render(
        <BrowserRouter>
          <RoleGuard requiredRole="Admin">
            <div data-testid="admin-secret-content">Secret Admin ERP</div>
          </RoleGuard>
        </BrowserRouter>
      )

      expect(screen.getByTestId('admin-secret-content')).toBeInTheDocument()
      expect(screen.queryByText('Access Denied (403 Forbidden)')).not.toBeInTheDocument()
    })
  })

  describe('AdminDashboardPage Singleton Admin Verification', () => {
    it('renders Command Center with Singleton Admin Monitor prominently verifying AdminCount = 1', async () => {
      render(
        <BrowserRouter>
          <AdminDashboardPage />
        </BrowserRouter>
      )

      expect(await screen.findByText('Admin Command Center')).toBeInTheDocument()
      expect(screen.getByText('Singleton Admin Security Monitor')).toBeInTheDocument()
      expect(screen.getByText('UX_Users_SingleAdmin')).toBeInTheDocument()
      expect(screen.getByText('✓ Enforced (1 Admin)')).toBeInTheDocument()
      expect(screen.getByText('Quick ERP Operations')).toBeInTheDocument()
    })
  })
})
