export interface BudgetGlanceDto {
  categoryId: string
  categoryName: string
  budgetLimit: number
  currentSpent: number
  utilizationPercentage: number
  statusColor: 'emerald' | 'amber' | 'orange' | 'rose' | string
}

export interface NetWorthHistoryPointDto {
  monthName: string
  date: string
  netWorth: number
  assets: number
  liabilities: number
}

export interface DashboardTransactionDto {
  id: string
  date: string
  merchant: string
  description: string
  categoryName: string
  accountName: string
  amount: number
  eventType: string
  syncStatus: string
}

export interface DashboardAccountDto {
  id: string
  name: string
  accountType: string
  maskedNumber: string | null
  balance: number
  currency: string
}

export interface DashboardSummaryDto {
  netWorth: number
  netWorthDeltaPercentage: number
  totalLiquidCash: number
  totalInvestments: number
  monthlyInflow: number
  monthlyExpenses: number
  savingsRatePercentage: number
  creditCardLiability: number
  nearestCardDueDate: string | null
  cardUtilizationPercentage: number
  budgetGlances: BudgetGlanceDto[]
  netWorthHistory: NetWorthHistoryPointDto[]
  recentTransactions: DashboardTransactionDto[]
  accountsSummary: DashboardAccountDto[]
}
