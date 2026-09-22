import React from 'react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ShieldCheck } from 'lucide-react'
import type { BudgetSummary, BudgetStatus, BudgetThreshold } from '../types'

export interface BudgetHealthWidgetProps {
  summary: BudgetSummary | null
  isLoading?: boolean
  onAddBudget?: () => void
}

const formatINR = (val: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val)
}

const getProgressBarColor = (status: BudgetThreshold) => {
  switch (status) {
    case 'Normal':
      return 'bg-emerald-500 dark:bg-emerald-400'
    case 'Warning':
      return 'bg-amber-500 dark:bg-amber-400'
    case 'Critical':
      return 'bg-orange-500 dark:bg-orange-400'
    case 'Exceeded':
      return 'bg-rose-500 dark:bg-rose-400'
    default:
      return 'bg-emerald-500'
  }
}

const getStatusBadge = (item: BudgetStatus) => {
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
          Exceeded (+{formatINR(item.overageAmount)})
        </Badge>
      )
  }
}

export const BudgetHealthWidget: React.FC<BudgetHealthWidgetProps> = ({
  summary,
  isLoading = false,
  onAddBudget,
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader title="Budget Health" subtitle="Real-time threshold monitoring" />
        <CardBody className="p-6 text-center text-xs text-slate-400 animate-pulse">
          Evaluating category budget utilization...
        </CardBody>
      </Card>
    )
  }

  if (!summary || summary.categories.length === 0) {
    return (
      <Card>
        <CardHeader
          title="Budget Health"
          subtitle="Real-time category spending thresholds"
        />
        <CardBody className="p-6 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No active budget limits configured for this month.
          </p>
          {onAddBudget && (
            <button
              type="button"
              onClick={onAddBudget}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Set Category Budget
            </button>
          )}
        </CardBody>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader
        title="Budget Health"
        subtitle={`Monthly utilization: ${summary.overallUtilizationPercentage}% of ${formatINR(summary.totalBudgeted)}`}
      />
      <CardBody className="p-4 space-y-4">
        {/* Dynamic Threshold Legend */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>&lt;80%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>80-89%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span>90-99%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>≥100%</span>
          </div>
        </div>

        {/* Categories List */}
        <div className="space-y-3.5">
          {summary.categories.map((item) => {
            const barWidth = Math.min(100, Math.max(0, item.utilizationPercentage))
            const barColor = getProgressBarColor(item.status)

            return (
              <div key={item.budgetId} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.categoryColor || '#6366F1' }}
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {item.categoryName}
                    </span>
                  </div>
                  <div>{getStatusBadge(item)}</div>
                </div>

                {/* Progress Meter */}
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>Spent: {formatINR(item.spentAmount)}</span>
                  <span>Limit: {formatINR(item.monthlyLimit)}</span>
                </div>
              </div>
            )
          })}
        </div>
      </CardBody>
    </Card>
  )
}
