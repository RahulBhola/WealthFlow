import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { AppLayout } from '@/components/layout/AppLayout'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'

describe('App smoke test', () => {
  it('renders the DashboardPage inside universal AppLayout without crashing', () => {
    render(
      <AppLayout currentPath="/" isAdmin={false} userEmail="test@wealthflow.local" userRole="User">
        <DashboardPage />
      </AppLayout>
    )
    expect(screen.getByText('Financial Overview')).toBeInTheDocument()
    expect(screen.getByText('Total Net Worth')).toBeInTheDocument()
    expect(screen.getByText('₹42,85,620.00')).toBeInTheDocument()
    expect(screen.getByText('Recent Transactions')).toBeInTheDocument()
  })
})
