import React from 'react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ArrowUpRight, ShieldCheck } from 'lucide-react'
import type { BudgetGlanceDto } from '../types'
import { useCurrency } from '../../../context/CurrencyContext'

export interface DashboardBudgetWidgetProps {
  budgets: BudgetGlanceDto[]
  onViewAll?: () => void
}

const getProgressBarColor = (color: string) => {
  switch (color) {
    case 'emerald':
      return 'bg-emerald-500 dark:bg-emerald-400'
    case 'amber':
      return 'bg-amber-500 dark:bg-amber-400'
    case 'orange':
      return 'bg-orange-500 dark:bg-orange-400'
    case 'rose':
      return 'bg-rose-500 dark:bg-rose-400'
    default:
      return 'bg-indigo-500'
  }
}

const getBadgeVariant = (color: string): 'emerald' | 'amber' | 'rose' | 'slate' => {
  switch (color) {
    case 'emerald':
      return 'emerald'
    case 'amber':
    case 'orange':
      return 'amber'
    case 'rose':
      return 'rose'
    default:
      return 'slate'
  }
}

export const DashboardBudgetWidget: React.FC<DashboardBudgetWidgetProps> = ({
  budgets,
  onViewAll,
}) => {
  const { formatCurrency } = useCurrency()
  const formatINR = formatCurrency

  return (
    <Card>
      <CardHeader
        title="Budget Health Glance"
        subtitle="Tightest monitored spending thresholds"
        actionSlot={
          onViewAll && (
            <button
              type="button"
              onClick={onViewAll}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              Budgets <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )
        }
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

        {(!budgets || budgets.length === 0) ? (
          <div className="py-6 text-center space-y-2">
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-xs text-slate-400">All spending is currently well within configured caps.</p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {budgets.map((b) => {
              const utilPct = b.utilizationPercentage ?? (b as any).spentPercentage ?? 0
              const limit = b.budgetLimit ?? (b as any).monthlyLimit ?? 0
              const barWidth = Math.min(100, Math.max(0, utilPct))
              const barColor = getProgressBarColor(b.statusColor || (b as any).status?.toLowerCase())
              const badgeVariant = getBadgeVariant(b.statusColor || (b as any).status?.toLowerCase())

              return (
                <div key={b.categoryId || (b as any).budgetId} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {b.categoryName}
                    </span>
                    <Badge variant={badgeVariant} size="sm">
                      {utilPct}%
                    </Badge>
                  </div>

                  {/* Progress Meter */}
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>Spent: {formatINR(b.currentSpent)}</span>
                    <span>Cap: {formatINR(limit)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardBody>
    </Card>
  )
}
