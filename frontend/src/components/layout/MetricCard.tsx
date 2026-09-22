import React from 'react'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

export interface MetricCardProps {
  label: string
  value: string
  icon?: React.ReactNode
  delta?: {
    value: string
    isPositive: boolean
  }
  subtext?: string
  className?: string
}

/**
 * MetricCard component for the standardized 4-card metric/KPI strip.
 * Enforces tabular monetary figures and semantic color delta pills.
 */
export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  icon,
  delta,
  subtext,
  className,
}) => {
  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-3 transition-colors',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {label}
        </span>
        {icon && (
          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {icon}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white tracking-tight">
          {value}
        </div>

        <div className="flex items-center gap-2 text-xs">
          {delta && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-medium font-mono text-[11px]',
                delta.isPositive
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
              )}
            >
              {delta.isPositive ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {delta.value}
            </span>
          )}
          {subtext && (
            <span className="text-slate-500 dark:text-slate-400 truncate">
              {subtext}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
