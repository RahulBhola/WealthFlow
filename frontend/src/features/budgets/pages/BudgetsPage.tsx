import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  PieChart,
  Plus,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  Sparkles,
  Sliders,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { MetricCard } from '@/components/layout/MetricCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardBody } from '@/components/ui/Card'
import { SetBudgetModal } from '../components/SetBudgetModal'
import { budgetsApi } from '../api/budgetsApi'
import type { BudgetSummary, BudgetStatus, CreateBudgetPayload } from '../types'
import { cn } from '@/lib/utils'
import { useCurrency } from '../../../context/CurrencyContext'

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const getProgressBarColor = (status: string) => {
  switch (status) {
    case 'Normal':
      return 'bg-gradient-to-r from-emerald-500 to-teal-400'
    case 'Warning':
      return 'bg-gradient-to-r from-amber-500 to-amber-400'
    case 'Critical':
      return 'bg-gradient-to-r from-orange-500 to-amber-500'
    case 'Exceeded':
      return 'bg-gradient-to-r from-rose-600 to-rose-400'
    default:
      return 'bg-indigo-500'
  }
}

const getStatusBadge = (item: BudgetStatus, formatFn: (val: number) => string) => {
  switch (item.status) {
    case 'Normal':
      return (
        <Badge variant="emerald" size="sm">
          Normal ({item.utilizationPercentage}%)
        </Badge>
      )
    case 'Warning':
      return (
        <Badge variant="amber" size="sm">
          Warning ({item.utilizationPercentage}%)
        </Badge>
      )
    case 'Critical':
      return (
        <Badge variant="rose" size="sm">
          Critical ({item.utilizationPercentage}%)
        </Badge>
      )
    case 'Exceeded':
      return (
        <Badge variant="rose" size="sm">
          Exceeded (+{formatFn(item.overageAmount)})
        </Badge>
      )
    default:
      return (
        <Badge variant="slate" size="sm">
          {item.status}
        </Badge>
      )
  }
}

export const BudgetsPage: React.FC = () => {
  const { formatCurrency } = useCurrency()
  const formatINR = formatCurrency

  const today = new Date()
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1)
  const [summary, setSummary] = useState<BudgetSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<{
    id: string
    name: string
    limit: number
  } | null>(null)

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await budgetsApi.getBudgetSummary(selectedYear, selectedMonth)
      setSummary(data)
    } catch (err) {
      console.error('Failed to load budget summary:', err)
    } finally {
      setIsLoading(false)
    }
  }, [selectedYear, selectedMonth])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12)
      setSelectedYear((y) => y - 1)
    } else {
      setSelectedMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1)
      setSelectedYear((y) => y + 1)
    } else {
      setSelectedMonth((m) => m + 1)
    }
  }

  const handleResetToCurrentMonth = () => {
    setSelectedYear(today.getFullYear())
    setSelectedMonth(today.getMonth() + 1)
  }

  const handleOpenSetBudget = (category?: BudgetStatus) => {
    if (category) {
      setEditingCategory({
        id: category.categoryId,
        name: category.categoryName,
        limit: category.monthlyLimit,
      })
    } else {
      setEditingCategory(null)
    }
    setIsModalOpen(true)
  }

  const handleSaveBudget = async (payload: CreateBudgetPayload) => {
    await budgetsApi.createOrUpdateBudget(payload)
    await loadData()
  }

  // Days remaining in selected month for run-rate calculation
  const daysInfo = useMemo(() => {
    const isCurrentMonth =
      selectedYear === today.getFullYear() && selectedMonth === today.getMonth() + 1

    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate()
    const daysLeft = isCurrentMonth ? Math.max(1, daysInMonth - today.getDate()) : daysInMonth
    return { daysInMonth, daysLeft, isCurrentMonth }
  }, [selectedYear, selectedMonth, today])

  const safeDailySpend = useMemo(() => {
    if (!summary || summary.totalRemaining <= 0) return 0
    return summary.totalRemaining / daysInfo.daysLeft
  }, [summary, daysInfo.daysLeft])

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        title="Budgets & Spending Limits"
        subtitle="Manage category allocations, track monthly spending envelopes, and prevent budget overages with live alerts."
        actionSlot={
          <div className="flex items-center gap-3">
            {/* Month Navigator */}
            <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-xs dark:shadow-sm">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="px-3 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 min-w-[130px] justify-center">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                <span>
                  {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                </span>
              </div>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {!daysInfo.isCurrentMonth && (
              <Button variant="outline" size="sm" onClick={handleResetToCurrentMonth}>
                Current Month
              </Button>
            )}

            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4 shrink-0" />}
              onClick={() => handleOpenSetBudget()}
            >
              Set Category Budget
            </Button>
          </div>
        }
      />

      {/* 2. Top Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="TOTAL BUDGETED"
          value={formatINR(summary?.totalBudgeted || 0)}
          icon={<PieChart className="w-5 h-5 text-indigo-500" />}
          subtext={`Allocated for ${MONTH_NAMES[selectedMonth - 1]}`}
        />

        <MetricCard
          label="TOTAL SPENT"
          value={formatINR(summary?.totalSpent || 0)}
          icon={<TrendingDown className="w-5 h-5 text-rose-500" />}
          subtext={`${summary?.categories?.length || 0} active envelopes`}
        />

        <MetricCard
          label="REMAINING ALLOWANCE"
          value={formatINR(summary?.totalRemaining || 0)}
          icon={<TrendingUp className="w-5 h-5 text-emerald-500" />}
          subtext={
            (summary?.totalOverage || 0) > 0
              ? `Overage: +${formatINR(summary?.totalOverage || 0)}`
              : 'Safe unspent liquidity'
          }
        />

        <MetricCard
          label="OVERALL UTILIZATION"
          value={`${summary?.overallUtilizationPercentage || 0}%`}
          icon={<ShieldCheck className="w-5 h-5 text-indigo-500" />}
          subtext={
            (summary?.overallUtilizationPercentage || 0) >= 100
              ? 'Exceeded monthly limit'
              : `${formatINR(safeDailySpend)}/day safe burn rate`
          }
        />
      </div>

      {/* 3. Run-Rate Insights Bar */}
      {summary && summary.categories.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-sky-50/70 to-purple-50/80 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-slate-900/40 border border-indigo-200/80 dark:border-indigo-500/20 shadow-xs dark:shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs transition-colors">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white dark:bg-indigo-500/20 dark:text-indigo-400 shadow-sm shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Safe Daily Spend Allowance:</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-extrabold font-mono">
                  {formatINR(safeDailySpend)} / day
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                Based on <span className="font-semibold text-slate-800 dark:text-slate-200">{daysInfo.daysLeft} days remaining</span> in {MONTH_NAMES[selectedMonth - 1]} across your unspent envelope balance of <span className="font-semibold text-slate-800 dark:text-slate-200">{formatINR(summary.totalRemaining)}</span>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-indigo-200/50 dark:border-indigo-900/50">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Threshold Guard:</span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
              &lt;80% Normal
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30">
              80-99% Alert
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30">
              ≥100% Exceeded
            </span>
          </div>
        </div>
      )}

      {/* 4. Envelopes Grid / Empty State */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-sm animate-pulse">
          Loading monthly category envelopes and spending ledger...
        </div>
      ) : !summary || summary.categories.length === 0 ? (
        <Card className="rounded-2xl">
          <CardBody className="py-16 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center mx-auto border border-indigo-100 dark:border-indigo-900/50">
              <PieChart className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                No Category Budgets Configured for {MONTH_NAMES[selectedMonth - 1]}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Set monthly limits for Groceries, Rent, Dining, Travel, or Entertainment to track real-time utilization and prevent unexpected overspending.
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="w-4 h-4 shrink-0" />}
              onClick={() => handleOpenSetBudget()}
            >
              Set First Category Budget
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {summary.categories.map((item) => {
            const barWidth = Math.min(100, Math.max(0, item.utilizationPercentage))
            const barColor = getProgressBarColor(item.status)

            return (
              <div
                key={item.budgetId}
                className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md hover:border-indigo-300 dark:hover:border-slate-700 transition-all duration-200 flex flex-col"
              >
                <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                  {/* Category Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs ring-2 ring-white dark:ring-slate-900"
                        style={{ backgroundColor: item.categoryColor || '#6366F1' }}
                      />
                      <span className="font-bold text-sm text-slate-900 dark:text-white tracking-tight">
                        {item.categoryName}
                      </span>
                    </div>
                    {getStatusBadge(item, formatCurrency)}
                  </div>

                  {/* Amount Breakdown */}
                  <div className="flex items-baseline justify-between pt-1">
                    <div>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Spent:</span>
                      <div className="text-xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight tabular-nums mt-0.5">
                        {formatINR(item.spentAmount)}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Monthly Limit:</span>
                      <div className="text-sm font-semibold text-slate-600 dark:text-slate-300 font-mono tracking-tight tabular-nums mt-0.5">
                        {formatINR(item.monthlyLimit)}
                      </div>
                    </div>
                  </div>

                  {/* Utilization Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700/50">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', barColor)}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 pt-0.5">
                      <span className="font-medium">
                        {item.isExceeded
                          ? `Over budget by ${formatINR(item.overageAmount)}`
                          : `${formatINR(item.remainingAmount)} remaining`}
                      </span>
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60">
                        {item.utilizationPercentage}%
                      </span>
                    </div>
                  </div>

                  {/* Actions & Footer */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between mt-auto">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {item.isExceeded ? (
                        <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Exceeded Limit
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                          Envelope Active
                        </span>
                      )}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleOpenSetBudget(item)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800/50 transition-all cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5 shrink-0" />
                      <span>Adjust Limit</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Set / Edit Budget Modal */}
      <SetBudgetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSaveBudget}
        initialCategoryId={editingCategory?.id}
        initialLimit={editingCategory?.limit}
        categoryName={editingCategory?.name}
      />
    </div>
  )
}
