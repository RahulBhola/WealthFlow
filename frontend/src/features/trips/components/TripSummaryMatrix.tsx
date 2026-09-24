import React from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { CheckCircle2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { TripSummary } from '../types'
import { useCurrency } from '../../../context/CurrencyContext'

export interface TripSummaryMatrixProps {
  summary: TripSummary
}

export const TripSummaryMatrix: React.FC<TripSummaryMatrixProps> = ({ summary }) => {
  const { formatCurrency } = useCurrency()
  const formatINR = formatCurrency
  const sumNet = summary.memberSummaries.reduce((acc, m) => acc + m.netBalance, 0)
  const isBalanced = Math.abs(sumNet) < 0.05

  return (
    <Card className="overflow-hidden border border-slate-200 dark:border-slate-800">
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Participant Financial Matrix
          </h3>
          <p className="text-xs text-slate-500">
            Fair shares, bilateral advances, and net debt settlement status
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isBalanced ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Ledger Balanced (Σ = {formatINR(0)})</span>
            </div>
          ) : (
            <div className="text-xs text-amber-600 dark:text-amber-400">
              Imbalance: {formatINR(sumNet)}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-semibold">
              <th className="py-3 px-4">Member</th>
              <th className="py-3 px-4 text-right">Total Paid</th>
              <th className="py-3 px-4 text-right">Fair Share</th>
              <th className="py-3 px-4 text-right">Net Advances</th>
              <th className="py-3 px-4 text-right">Net Settlements</th>
              <th className="py-3 px-4 text-right">Net Balance</th>
              <th className="py-3 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {summary.memberSummaries.map((m) => {
              const netAdv = m.advancesGiven - m.advancesReceived
              const netSet = m.settlementsPaid - m.settlementsReceived
              const isCreditor = m.netBalance > 0.005
              const isDebtor = m.netBalance < -0.005

              return (
                <tr
                  key={m.memberId}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                    {m.memberName}
                  </td>
                  <td className="py-3 px-4 text-right font-medium">{formatINR(m.totalPaid)}</td>
                  <td className="py-3 px-4 text-right font-medium">{formatINR(m.fairShare)}</td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={
                        netAdv > 0
                          ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                          : netAdv < 0
                          ? 'text-rose-600 dark:text-rose-400 font-medium'
                          : 'text-slate-400'
                      }
                    >
                      {netAdv > 0 ? `+${formatINR(netAdv)}` : formatINR(netAdv)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={
                        netSet > 0
                          ? 'text-indigo-600 dark:text-indigo-400 font-medium'
                          : netSet < 0
                          ? 'text-amber-600 dark:text-amber-400 font-medium'
                          : 'text-slate-400'
                      }
                    >
                      {netSet > 0 ? `+${formatINR(netSet)}` : formatINR(netSet)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`font-bold ${
                        isCreditor
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : isDebtor
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-500'
                      }`}
                    >
                      {isCreditor
                        ? `+${formatINR(m.netBalance)}`
                        : formatINR(m.netBalance)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {isCreditor ? (
                      <Badge variant="emerald" size="sm" className="inline-flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        <span>Gets back</span>
                      </Badge>
                    ) : isDebtor ? (
                      <Badge variant="rose" size="sm" className="inline-flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" />
                        <span>Owes</span>
                      </Badge>
                    ) : (
                      <Badge variant="slate" size="sm" className="inline-flex items-center gap-1">
                        <Minus className="w-3 h-3" />
                        <span>Settled</span>
                      </Badge>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 font-bold text-slate-900 dark:text-slate-100">
              <td className="py-3 px-4">Group Total</td>
              <td className="py-3 px-4 text-right">{formatINR(summary.totalGroupSpending)}</td>
              <td className="py-3 px-4 text-right">{formatINR(summary.totalGroupSpending)}</td>
              <td className="py-3 px-4 text-right text-slate-500">{formatINR(0)}</td>
              <td className="py-3 px-4 text-right text-slate-500">{formatINR(0)}</td>
              <td className="py-3 px-4 text-right text-slate-500">{formatINR(0)}</td>
              <td className="py-3 px-4 text-center">
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Conserved
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  )
}
