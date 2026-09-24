import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'

describe('App smoke test', () => {
  it('renders the DashboardPage inside universal AppLayout without crashing', () => {
    render(
      <BrowserRouter>
        <AppLayout currentPath="/" isAdmin={false} userEmail="test@wealthflow.local" userRole="User">
          <DashboardPage />
        </AppLayout>
      </BrowserRouter>
    )
    expect(screen.getByText('Executive Financial Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Total Net Worth')).toBeInTheDocument()
    expect(screen.getByText('₹42,85,620.00')).toBeInTheDocument()
    expect(screen.getByText('Recent Transactions Stream')).toBeInTheDocument()
  })
})
