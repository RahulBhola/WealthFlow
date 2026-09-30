import React from 'react'
import {
  Rocket,
  Lock,
  CheckCircle2,
  Ban,
  Calendar,
  Landmark,
  Plus,
  ArrowUpRight,
  Clock,
  Sparkles,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import type { Transaction } from '@/features/transactions/types'
import { useCurrency } from '../../../context/CurrencyContext'

export interface IpoApplicationsSectionProps {
  ipos: Transaction[]
  onApplyIpo: () => void
  onAllotIpo: (tx: Transaction) => void
  onReleaseIpo: (tx: Transaction) => void
  searchQuery?: string
}

export const IpoApplicationsSection: React.FC<IpoApplicationsSectionProps> = ({
  ipos,
  onApplyIpo,
  onAllotIpo,
  onReleaseIpo,
  searchQuery = '',
}) => {
  const { formatCurrency } = useCurrency()
  const formatINR = formatCurrency

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  // Filter IPOs
  const filteredIpos = ipos.filter((tx) => {
    const q = searchQuery.toLowerCase()
    return (
      tx.description.toLowerCase().includes(q) ||
      (tx.accountName && tx.accountName.toLowerCase().includes(q)) ||
      (tx.notes && tx.notes.toLowerCase().includes(q))
    )
  })

  // Metrics
  const blockedIpos = ipos.filter((tx) => tx.status === 'Blocked' || !tx.status)
  const allottedIpos = ipos.filter((tx) => tx.status === 'Allotted')
  const releasedIpos = ipos.filter((tx) => tx.status === 'Released')
  const totalBlockedAmount = blockedIpos.reduce((sum, tx) => sum + tx.amount, 0)
  const totalAllottedAmount = allottedIpos.reduce((sum, tx) => sum + tx.amount, 0)

  return (
    <div className="space-y-6">
      {/* IPO Metrics Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Active IPOs On Hold */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-900/40 hover:border-amber-400 dark:hover:border-amber-500/40 transition-all shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Pending Allotment
            </span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 tracking-tight block">
              {formatINR(totalBlockedAmount)}
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {blockedIpos.length} active {blockedIpos.length === 1 ? 'bid' : 'bids'} on hold in bank
            </p>
          </div>
        </div>

        {/* Card 2: Allotted to Portfolio */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-emerald-900/40 hover:border-emerald-400 dark:hover:border-emerald-500/40 transition-all shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Allotted Holdings
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight block">
              {formatINR(totalAllottedAmount)}
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {allottedIpos.length} {allottedIpos.length === 1 ? 'IPO' : 'IPOs'} added to equity stocks
            </p>
          </div>
        </div>

        {/* Card 3: Released / Refunded */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Ban className="w-3.5 h-3.5" />
              Released / Refunded
            </span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-200 tracking-tight block">
              {releasedIpos.length}
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Unsuccessful bids unblocked (₹0 debited)
            </p>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {filteredIpos.length === 0 ? (
        <div className="p-8 sm:p-12 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl bg-slate-50/80 dark:bg-gradient-to-b dark:from-slate-900/40 dark:to-slate-950/60 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-sm dark:shadow-[0_0_25px_rgba(245,158,11,0.15)]">
            <Rocket className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">No IPO Applications Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              {searchQuery
                ? 'No IPO applications matched your search keyword.'
                : 'Apply for upcoming IPOs, track funds kept on hold in your bank, and seamlessly transfer allotted shares directly into your equity portfolio.'}
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={onApplyIpo}
              leftIcon={<Plus className="w-3.5 h-3.5 shrink-0" />}
              className="text-xs px-5 py-2.5 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 shadow-md shadow-amber-500/20 border-none font-bold text-white dark:text-slate-950"
            >
              Apply for IPO
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm dark:shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">IPO / Company</th>
                  <th className="px-4 py-3.5">Holding Bank Account</th>
                  <th className="px-4 py-3.5">Bid Amount</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Bid Lots</th>
                  <th className="px-4 py-3.5">Allotment Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredIpos.map((tx) => {
                  const isBlocked = tx.status === 'Blocked' || !tx.status
                  const isAllotted = tx.status === 'Allotted'
                  const isReleased = tx.status === 'Released'

                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isReleased ? 'opacity-60 bg-slate-100/50 dark:bg-slate-950/20' : ''
                      }`}
                    >
                      {/* Name */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`p-2 rounded-xl border ${
                              isAllotted
                                ? 'bg-emerald-100 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                                : isBlocked
                                ? 'bg-amber-100 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400'
                                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            <Rocket className="w-4 h-4" />
                          </div>
                          <div>
                            <span
                              className={`font-semibold text-slate-900 dark:text-slate-100 block ${
                                isReleased ? 'line-through text-slate-400 dark:text-slate-500' : ''
                              }`}
                            >
                              {tx.description}
                            </span>
                            {tx.notes && (
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate max-w-xs">
                                {tx.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Bank Account */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <Landmark className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                          <span>{tx.accountName || 'Primary Account'}</span>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-4 whitespace-nowrap font-mono font-bold">
                        <div className="flex items-center gap-1.5">
                          {isBlocked && <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />}
                          <span
                            className={
                              isAllotted
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : isBlocked
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-slate-400 dark:text-slate-500 line-through'
                            }
                          >
                            {formatINR(tx.amount)}
                          </span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                          <span>{formatDate(tx.transactionDate)}</span>
                        </div>
                      </td>

                      {/* Units */}
                      <td className="px-4 py-4 whitespace-nowrap text-slate-700 dark:text-slate-300 font-mono">
                        {tx.allottedUnits ? `${tx.allottedUnits} shares` : '—'}
                      </td>

                      {/* Status Badge */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        {isBlocked ? (
                          <Badge
                            variant="amber"
                            size="sm"
                            className="bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30 flex items-center gap-1 w-fit"
                          >
                            <Clock className="w-3 h-3" />
                            <span>Pending Allotment</span>
                          </Badge>
                        ) : isAllotted ? (
                          <Badge
                            variant="emerald"
                            size="sm"
                            className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30 flex items-center gap-1 w-fit"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Allotted to Portfolio</span>
                          </Badge>
                        ) : (
                          <Badge
                            variant="slate"
                            size="sm"
                            className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 flex items-center gap-1 w-fit line-through"
                          >
                            <Ban className="w-3 h-3" />
                            <span>Hold Released (₹0)</span>
                          </Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        {isBlocked ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onAllotIpo(tx)}
                              className="text-[11px] h-7 px-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30"
                              title="Shares allotted: debit bank and credit stock to portfolio"
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-400" />
                              Allot Shares
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onReleaseIpo(tx)}
                              className="text-[11px] h-7 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                              title="Not allotted: release bank fund hold without debit"
                            >
                              <Ban className="w-3 h-3 mr-1 text-rose-500 dark:text-rose-400" />
                              Release
                            </Button>
                          </div>
                        ) : isAllotted ? (
                          <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
                            <span>In Stock Portfolio</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                            Hold Unblocked
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
