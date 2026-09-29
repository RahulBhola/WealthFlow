import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BudgetsPage } from './pages/BudgetsPage'
import { budgetsApi } from './api/budgetsApi'
import { categoriesApi } from '@/features/categories/api/categoriesApi'
import type { BudgetSummary } from './types'

vi.mock('./api/budgetsApi', () => ({
  budgetsApi: {
    getBudgetSummary: vi.fn(),
    createOrUpdateBudget: vi.fn(),
    getBudgets: vi.fn(),
    deleteBudget: vi.fn(),
  },
}))

vi.mock('@/features/categories/api/categoriesApi', () => ({
  categoriesApi: {
    getCategories: vi.fn(),
  },
}))

const mockBudgetSummary: BudgetSummary = {
  totalBudgeted: 35000,
  totalSpent: 18000,
  totalRemaining: 17000,
  totalOverage: 0,
  overallUtilizationPercentage: 51.43,
  categories: [
    {
      budgetId: 'b-1',
      categoryId: 'cat-1',
      categoryName: 'Groceries',
      categoryIcon: null,
      categoryColor: '#10B981',
      monthlyLimit: 15000,
      spentAmount: 8500,
      remainingAmount: 6500,
      overageAmount: 0,
      utilizationPercentage: 56.67,
      status: 'Normal',
      hexColor: '#10B981',
      isExceeded: false,
    },
    {
      budgetId: 'b-2',
      categoryId: 'cat-2',
      categoryName: 'Dining & Restaurants',
      categoryIcon: null,
      categoryColor: '#F59E0B',
      monthlyLimit: 10000,
      spentAmount: 9500,
      remainingAmount: 500,
      overageAmount: 0,
      utilizationPercentage: 95.0,
      status: 'Critical',
      hexColor: '#F59E0B',
      isExceeded: false,
    },
  ],
}

describe('BudgetsPage and Category Spending Limits', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(budgetsApi.getBudgetSummary).mockResolvedValue(mockBudgetSummary)
    vi.mocked(categoriesApi.getCategories).mockResolvedValue([
      { id: 'cat-1', name: 'Groceries', isSystem: true },
      { id: 'cat-2', name: 'Dining & Restaurants', isSystem: true },
      { id: 'cat-3', name: 'Shopping', isSystem: true },
      { id: 'cat-4', name: 'Healthcare', isSystem: true },
    ])
  })

  it('renders budget header, 4-tier metric cards, and category cards', async () => {
    render(<BudgetsPage />)

    expect(screen.getByText('Budgets & Spending Limits')).toBeInTheDocument()
    expect(screen.getByText('TOTAL BUDGETED')).toBeInTheDocument()
    expect(screen.getByText('TOTAL SPENT')).toBeInTheDocument()
    expect(screen.getByText('REMAINING ALLOWANCE')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Groceries')).toBeInTheDocument()
      expect(screen.getByText('Dining & Restaurants')).toBeInTheDocument()
    })

    expect(screen.getByText(/51\.43%/)).toBeInTheDocument()
    expect(screen.getByText(/Normal \(56\.67%\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Critical \(95%\)/i)).toBeInTheDocument()
  })

  it('opens SetBudgetModal when clicking Set Category Budget button', async () => {
    render(<BudgetsPage />)

    const setBtn = screen.getByRole('button', { name: /set category budget/i })
    fireEvent.click(setBtn)

    await waitFor(() => {
      expect(screen.getByText('Set Category Budget', { selector: 'h2' })).toBeInTheDocument()
    })
  })

  it('excludes categories that are already budgeted on the board from the dropdown', async () => {
    render(<BudgetsPage />)

    await waitFor(() => {
      expect(screen.getByText('Groceries')).toBeInTheDocument()
    })

    const setBtn = screen.getByRole('button', { name: /set category budget/i })
    fireEvent.click(setBtn)

    await waitFor(() => {
      expect(screen.getByText('Set Category Budget', { selector: 'h2' })).toBeInTheDocument()
    })

    // Groceries (cat-1) and Dining & Restaurants (cat-2) should NOT be in the select options
    expect(screen.queryByRole('option', { name: 'Groceries' })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Dining & Restaurants' })).not.toBeInTheDocument()

    // Unbudgeted categories should be present
    expect(screen.getByRole('option', { name: 'Shopping' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Healthcare' })).toBeInTheDocument()
  })

  it('removes a budget when clicking the delete button on an envelope card', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(budgetsApi.deleteBudget).mockResolvedValue(undefined)

    render(<BudgetsPage />)

    await waitFor(() => {
      expect(screen.getByText('Groceries')).toBeInTheDocument()
    })

    const deleteBtn = screen.getByLabelText('Remove Groceries budget')
    fireEvent.click(deleteBtn)

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Groceries'))
    expect(budgetsApi.deleteBudget).toHaveBeenCalledWith('b-1')
  })
})
