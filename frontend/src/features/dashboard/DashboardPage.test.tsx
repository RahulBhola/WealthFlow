import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { DashboardPage } from './pages/DashboardPage'
import { NetWorthAreaChart } from './components/NetWorthAreaChart'
import { DashboardBudgetWidget } from './components/DashboardBudgetWidget'

// Mock api client to prevent network calls during testing
vi.mock('@/lib/api', () => ({
  apiClient: vi.fn().mockImplementation((url: string) => {
    if (url.includes('/api/v1/dashboard/summary')) {
      return Promise.resolve({
        totalNetWorth: 4285620,
        totalLiquidBalance: 320450,
        monthlyCashFlow: 85200,
        creditCardLiability: 48210,
        totalInvestments: 2850000,
        currency: 'INR',
        netWorthHistory: [
          { monthLabel: 'Jan', netWorth: 3500000, liquidCash: 250000, liabilities: 40000, year: 2026 },
          { monthLabel: 'Feb', netWorth: 3800000, liquidCash: 280000, liabilities: 35000, year: 2026 },
          { monthLabel: 'Mar', netWorth: 4285620, liquidCash: 320450, liabilities: 48210, year: 2026 },
        ],
        recentTransactions: [
          {
            id: 'txn-1',
            date: '2026-03-24',
            description: 'Organic Groceries & Protein',
            categoryName: 'Groceries',
            accountName: 'HDFC Salary Account',
            amount: 3200,
            type: 'Expense',
          },
        ],
        budgets: [
          {
            budgetId: 'b-1',
            categoryName: 'Groceries & Household',
            monthlyLimit: 25000,
            currentSpent: 18200,
            spentPercentage: 72.8,
            status: 'Normal',
          },
        ],
        accounts: [],
      })
    }
    return Promise.resolve({})
  }),
}))

describe('Executive Dashboard (WF-EP18-001)', () => {
  it('renders the 4-card metric strip with Net Worth, Liquid Balance, Cash Flow, and Liability', async () => {
    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    )

    expect(screen.getByText('Executive Financial Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Total Net Worth')).toBeInTheDocument()
    expect(screen.getByText('Total Liquid Cash')).toBeInTheDocument()
    expect(screen.getByText('Monthly Cash Flow')).toBeInTheDocument()
    expect(screen.getByText('Credit Card Liability')).toBeInTheDocument()
    expect(screen.getByText('Recent Transactions Stream')).toBeInTheDocument()
  })

  it('renders NetWorthAreaChart with SVG curve and gradient fills', () => {
    const mockData = [
      { monthLabel: 'Oct', netWorth: 3500000, liquidCash: 250000, liabilities: 40000, year: 2025 },
      { monthLabel: 'Nov', netWorth: 3800000, liquidCash: 280000, liabilities: 35000, year: 2025 },
      { monthLabel: 'Dec', netWorth: 4200000, liquidCash: 320000, liabilities: 45000, year: 2025 },
    ]

    const { container } = render(<NetWorthAreaChart data={mockData} />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()

    // Verify SVG path elements exist
    const paths = container.querySelectorAll('path')
    expect(paths.length).toBeGreaterThan(0)

    // Verify gradient definitions exist
    const linearGradient = container.querySelector('linearGradient#nwGradient')
    expect(linearGradient).toBeInTheDocument()
  })

  it('renders DashboardBudgetWidget with spending progress and threshold indicators', () => {
    const mockBudgets = [
      {
        budgetId: 'b-1',
        categoryName: 'Dining & Cafes',
        monthlyLimit: 10000,
        currentSpent: 8500,
        spentPercentage: 85,
        status: 'Warning',
      },
    ]

    render(<DashboardBudgetWidget budgets={mockBudgets} />)
    expect(screen.getByText('Budget Health Glance')).toBeInTheDocument()
    expect(screen.getByText('Dining & Cafes')).toBeInTheDocument()
    expect(screen.getByText('85%')).toBeInTheDocument()
  })
})
