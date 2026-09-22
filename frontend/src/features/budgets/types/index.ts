export type BudgetThreshold = 'Normal' | 'Warning' | 'Critical' | 'Exceeded'

export interface BudgetStatus {
  budgetId: string
  categoryId: string
  categoryName: string
  categoryIcon?: string | null
  categoryColor?: string | null
  monthlyLimit: number
  spentAmount: number
  remainingAmount: number
  overageAmount: number
  utilizationPercentage: number
  status: BudgetThreshold
  hexColor: string
  isExceeded: boolean
}

export interface BudgetSummary {
  totalBudgeted: number
  totalSpent: number
  totalRemaining: number
  totalOverage: number
  overallUtilizationPercentage: number
  categories: BudgetStatus[]
}

export interface CreateBudgetPayload {
  categoryId: string
  monthlyLimit: number
  period?: 'Month' | 'Year'
}
