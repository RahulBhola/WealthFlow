import type { NetWorthHistoryPointDto } from '@/features/dashboard/types'

export interface CategorySpendingBreakdownDto {
  categoryId: string | null
  categoryName: string
  amount: number
  percentage: number
  colorHex: string | null
  isSpecialProtein: boolean
  isSpecialClothing: boolean
}

export interface CashFlowWaterfallStepDto {
  stepName: string
  amount: number
  runningBalance: number
  stepType: 'Opening' | 'Inflow' | 'Expense' | 'Investment' | 'DebtPayoff' | 'Ending' | string
}

export interface AnalyticsSummaryDto {
  netWorthHistory: NetWorthHistoryPointDto[]
  categoryBreakdown: CategorySpendingBreakdownDto[]
  cashFlowWaterfall: CashFlowWaterfallStepDto[]
  dailyBurnRate: number
  savingsRatePercentage: number
  totalInvestments: number
  totalLiquidCash: number
}
