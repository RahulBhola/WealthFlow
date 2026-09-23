import React from 'react'
import { TrendingUp, TrendingDown, RefreshCw, Layers, Calendar } from 'lucide-react'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { Investment } from '../types'

const formatINR = (val: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val)
}

const getAssetClassBadgeVariant = (
  assetClass: string
): 'emerald' | 'rose' | 'amber' | 'sky' | 'violet' | 'slate' | 'indigo' => {
  switch (assetClass.toLowerCase()) {
    case 'mutual fund':
      return 'sky'
    case 'stock':
      return 'emerald'
    case 'fixed deposit':
      return 'indigo'
    case 'gold':
      return 'amber'
    case 'ppf':
      return 'violet'
    default:
      return 'slate'
  }
}

export interface PortfolioCardProps {
  investment: Investment
  onUpdateValuation: (investment: Investment) => void
}

export const PortfolioCard: React.FC<PortfolioCardProps> = ({ investment, onUpdateValuation }) => {
  const isPositive = investment.absoluteGainLoss >= 0

  return (
    <Card className="hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200">
      <CardBody className="p-5 flex flex-col justify-between h-full space-y-4">
        {/* Header & Badges */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="font-semibold text-slate-900 dark:text-white text-base leading-snug line-clamp-1">
              {investment.name}
            </h3>
            <div className="flex items-center gap-2">
              <Badge variant={getAssetClassBadgeVariant(investment.assetClass)} size="sm">
                {investment.assetClass}
              </Badge>
              {investment.units > 0 && (
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono inline-flex items-center gap-1">
                  <Layers className="w-3 h-3 text-slate-400" />
                  {investment.units.toFixed(3)} units
                </span>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onUpdateValuation(investment)}
            className="text-xs shrink-0 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
            title="Update Current Valuation"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Update
          </Button>
        </div>

        {/* Valuation and Invested Strip */}
        <div className="grid grid-cols-2 gap-4 py-2 border-y border-slate-100 dark:border-slate-800/80">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Current Valuation
            </span>
            <span className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {formatINR(investment.currentValuation)}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Invested Capital
            </span>
            <span className="text-sm font-semibold font-mono tabular-nums text-slate-700 dark:text-slate-300">
              {formatINR(investment.investedAmount)}
            </span>
          </div>
        </div>

        {/* Gains / Returns and Date Footer */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-medium ${
                isPositive
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
              }`}
            >
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {isPositive ? '+' : ''}
              {formatINR(investment.absoluteGainLoss)} ({isPositive ? '+' : ''}
              {investment.returnPercentage.toFixed(2)}%)
            </span>
          </div>

          <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {investment.lastValuationDate
              ? new Date(investment.lastValuationDate).toLocaleDateString('en-IN', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'Initial'}
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
