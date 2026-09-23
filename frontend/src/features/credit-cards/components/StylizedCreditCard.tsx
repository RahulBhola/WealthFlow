import React from 'react'
import { Wifi, AlertCircle, Clock, CheckCircle2, AlertTriangle, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { CreditCard } from '../types'

export interface StylizedCreditCardProps {
  card: CreditCard
  onPayBill: (card: CreditCard) => void
  onDelete?: (card: CreditCard) => void
}

const formatINR = (val: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val)
}

export const StylizedCreditCard: React.FC<StylizedCreditCardProps> = ({
  card,
  onPayBill,
  onDelete,
}) => {
  // Utilization bar color
  const utilization = card.utilizationPercentage
  const utilizationColor =
    utilization < 30
      ? 'bg-emerald-500'
      : utilization <= 70
      ? 'bg-amber-500'
      : 'bg-rose-500'

  // Due Date Alert Badge
  const getDueAlertBadge = () => {
    switch (card.alertSeverity) {
      case 'Overdue':
        return (
          <Badge variant="rose" size="sm" className="gap-1 animate-pulse">
            <AlertCircle className="w-3 h-3" />
            Overdue ({Math.abs(card.daysUntilDue)}d ago)
          </Badge>
        )
      case 'Critical':
        return (
          <Badge variant="rose" size="sm" className="gap-1">
            <AlertTriangle className="w-3 h-3" />
            Due in {card.daysUntilDue} day{card.daysUntilDue === 1 ? '' : 's'}
          </Badge>
        )
      case 'Warning':
        return (
          <Badge variant="amber" size="sm" className="gap-1">
            <Clock className="w-3 h-3" />
            Due in {card.daysUntilDue} days
          </Badge>
        )
      default:
        return (
          <Badge variant="emerald" size="sm" className="gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Due in {card.daysUntilDue} days
          </Badge>
        )
    }
  }

  return (
    <div className="flex flex-col space-y-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
      {/* Physical 1.586 : 1 Aspect Ratio Stylized Credit Card */}
      <div
        className="relative w-full aspect-[1.586/1] rounded-xl p-5 text-white shadow-xl overflow-hidden flex flex-col justify-between select-none"
        style={{
          background: card.colorTag
            ? `linear-gradient(135deg, ${card.colorTag} 0%, #0F172A 100%)`
            : 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
        }}
      >
        {/* Subtle holographic reflective gloss overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-white/10 to-transparent pointer-events-none" />

        {/* Top Bar: Bank Name & Contactless Wave Symbol */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-300">
              {card.bankName}
            </span>
            <span className="text-sm font-extrabold tracking-tight drop-shadow-sm">
              {card.cardName}
            </span>
          </div>
          <div className="p-1.5 rounded-full bg-white/10 backdrop-blur-sm">
            <Wifi className="w-4 h-4 text-slate-200 rotate-90" />
          </div>
        </div>

        {/* Golden EMV Chip Icon */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-7 rounded-md bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 p-1 border border-amber-300 shadow-inner flex flex-col justify-around">
            <div className="w-full h-px bg-amber-800/40" />
            <div className="w-full h-px bg-amber-800/40" />
            <div className="w-full h-px bg-amber-800/40" />
          </div>
          <span className="text-[10px] font-mono tracking-wider text-slate-300 opacity-90 uppercase">
            Debit Settlement
          </span>
        </div>

        {/* Embossed Card Number */}
        <div className="relative z-10 font-mono text-base tracking-[0.22em] text-slate-100 font-semibold drop-shadow">
          •••• •••• •••• {card.last4Digits || '0000'}
        </div>

        {/* Bottom Bar: Billing Day, Due Date & Security Tag */}
        <div className="relative z-10 flex items-end justify-between text-xs">
          <div>
            <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
              Payment Due
            </div>
            <div className="font-mono text-xs font-bold text-slate-200">
              Day {card.dueDay} of month
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/30 backdrop-blur-sm border border-white/10 text-[10px] font-bold tracking-wider uppercase text-amber-300">
            <span>Limit {formatINR(card.creditLimit).replace('.00', '')}</span>
          </div>
        </div>
      </div>

      {/* Card Telemetry Strip & Utilization Meter */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-xs">
          <div className="space-y-0.5">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Outstanding Balance
            </div>
            <div className="text-base font-bold font-mono text-rose-600 dark:text-rose-400 tabular-nums">
              {formatINR(card.currentBalance)}
            </div>
          </div>

          <div className="text-right space-y-0.5">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Available Credit
            </div>
            <div className="text-sm font-semibold font-mono text-slate-700 dark:text-slate-300 tabular-nums">
              {formatINR(card.availableCredit)}
            </div>
          </div>
        </div>

        {/* Utilization Gauge */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Utilization</span>
            <span className="font-mono font-semibold">{card.utilizationPercentage}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${utilizationColor}`}
              style={{ width: `${Math.min(100, Math.max(0, card.utilizationPercentage))}%` }}
            />
          </div>
        </div>

        {/* Due Date Alert & Actions Footer */}
        <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
          <div>{getDueAlertBadge()}</div>

          <div className="flex items-center gap-1.5">
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(card)}
                title="Remove credit card"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={() => onPayBill(card)}
              className="bg-indigo-600 hover:bg-indigo-700 text-xs px-3 py-1.5"
            >
              Pay Bill
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
