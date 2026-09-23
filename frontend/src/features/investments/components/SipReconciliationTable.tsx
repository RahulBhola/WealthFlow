import React, { useState } from 'react'
import {
  Calendar,
  CheckCircle2,
  HandCoins,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { JointSipReconciliation } from '../types'

const formatINR = (val: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val)
}

const getMonthName = (month: number): string => {
  const date = new Date(2000, month - 1, 1)
  return date.toLocaleString('en-US', { month: 'short' })
}

export interface SipReconciliationTableProps {
  reconciliations: JointSipReconciliation[]
  onOpenRepayModal: (rec: JointSipReconciliation) => void
}

export const SipReconciliationTable: React.FC<SipReconciliationTableProps> = ({
  reconciliations,
  onOpenRepayModal,
}) => {
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Settled'>('All')

  const filteredReconciliations = reconciliations.filter((rec) => {
    if (filter === 'Pending') return rec.remainingDue > 0
    if (filter === 'Settled') return rec.remainingDue === 0
    return true
  })

  return (
    <div className="space-y-4">
      {/* Table Filter Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg">
          {(['All', 'Pending', 'Settled'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                filter === tab
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab === 'All'
                ? `All Cycles (${reconciliations.length})`
                : tab === 'Pending'
                ? `Pending Due (${reconciliations.filter((r) => r.remainingDue > 0).length})`
                : `Settled (${reconciliations.filter((r) => r.remainingDue === 0).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Table Container */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3.5">Billing Cycle</th>
                <th className="px-5 py-3.5">Joint SIP</th>
                <th className="px-5 py-3.5 text-right">Debit Total</th>
                <th className="px-5 py-3.5 text-right">Your Share</th>
                <th className="px-5 py-3.5 text-right">Partner Share</th>
                <th className="px-5 py-3.5 text-right">Settled</th>
                <th className="px-5 py-3.5 text-right">Remaining Due</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredReconciliations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-slate-400 dark:text-slate-500">
                    No reconciliation cycles found for the selected filter.
                  </td>
                </tr>
              ) : (
                filteredReconciliations.map((rec) => {
                  const isSettled = rec.remainingDue === 0
                  const isPending = rec.amountSettled === 0
                  const statusVariant = isSettled ? 'emerald' : isPending ? 'rose' : 'amber'
                  const statusLabel = isSettled
                    ? 'Settled'
                    : isPending
                    ? 'Pending'
                    : 'Partial'

                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-5 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {getMonthName(rec.month)} {rec.year}
                        </div>
                      </td>

                      <td className="px-5 py-4 font-medium text-slate-800 dark:text-slate-200">
                        {rec.sipName}
                        {rec.notes && (
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-xs">
                            {rec.notes}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {formatINR(rec.totalAmount)}
                      </td>

                      <td className="px-5 py-4 text-right font-mono tabular-nums text-indigo-600 dark:text-indigo-400 font-medium">
                        {formatINR(rec.userShare)}
                      </td>

                      <td className="px-5 py-4 text-right font-mono tabular-nums text-sky-600 dark:text-sky-400 font-medium">
                        {formatINR(rec.coInvestorShare)}
                      </td>

                      <td className="px-5 py-4 text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                        {formatINR(rec.amountSettled)}
                      </td>

                      <td className="px-5 py-4 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                        {formatINR(rec.remainingDue)}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <Badge variant={statusVariant} size="sm" dot>
                          {statusLabel}
                        </Badge>
                      </td>

                      <td className="px-5 py-4 text-right">
                        {rec.remainingDue > 0 ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => onOpenRepayModal(rec)}
                            className="text-xs shrink-0"
                          >
                            <HandCoins className="w-3 h-3 mr-1" />
                            Record Repayment
                          </Button>
                        ) : (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Settled
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
