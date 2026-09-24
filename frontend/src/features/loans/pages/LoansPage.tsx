import React, { useState, useEffect, useCallback } from 'react'
import {
  HandCoins,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Search,
  Gift as GiftIcon,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Trash2,
  User,
  Scale,
  Calendar,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { MetricCard } from '@/components/layout/MetricCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AddLoanModal } from '../components/AddLoanModal'
import { RecordRepaymentModal } from '../components/RecordRepaymentModal'
import { RecordGiftModal } from '../components/RecordGiftModal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { loansApi } from '../api/loansApi'
import type { Loan, LoanSummary, Gift, GiftSummary } from '../types'
import { useCurrency } from '../../../context/CurrencyContext'

type TabType = 'lent' | 'borrowed' | 'gifts'

export const LoansPage: React.FC = () => {
  const { formatCurrency } = useCurrency()
  const formatINR = formatCurrency
  const [activeTab, setActiveTab] = useState<TabType>('lent')
  const [loanSummary, setLoanSummary] = useState<LoanSummary | null>(null)
  const [giftSummary, setGiftSummary] = useState<GiftSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Settled'>('All')

  // Modals state
  const [isAddLoanOpen, setIsAddLoanOpen] = useState(false)
  const [isRecordGiftOpen, setIsRecordGiftOpen] = useState(false)
  const [repaymentLoan, setRepaymentLoan] = useState<Loan | null>(null)
  const [expandedLoanIds, setExpandedLoanIds] = useState<Record<string, boolean>>({})

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      const [lSummary, gSummary] = await Promise.all([
        loansApi.getLoanSummary(),
        loansApi.getGiftSummary(),
      ])
      setLoanSummary(lSummary)
      setGiftSummary(gSummary)
    } catch (err) {
      console.error('Failed to load loans and gifts data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let ignore = false
    async function init() {
      try {
        const [lSummary, gSummary] = await Promise.all([
          loansApi.getLoanSummary(),
          loansApi.getGiftSummary(),
        ])
        if (!ignore) {
          setLoanSummary(lSummary)
          setGiftSummary(gSummary)
        }
      } catch (err) {
        console.error('Failed to load loans and gifts data:', err)
      } finally {
        if (!ignore) {
          setIsLoading(false)
        }
      }
    }

    init()
    return () => {
      ignore = true
    }
  }, [])

  const toggleExpand = (loanId: string) => {
    setExpandedLoanIds((prev) => ({
      ...prev,
      [loanId]: !prev[loanId],
    }))
  }

  const [loanToDelete, setLoanToDelete] = useState<Loan | null>(null)
  const [giftToDelete, setGiftToDelete] = useState<Gift | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteLoan = (loan: Loan) => {
    setLoanToDelete(loan)
  }

  const confirmDeleteLoan = async () => {
    if (!loanToDelete) return
    try {
      setIsDeleting(true)
      await loansApi.deleteLoan(loanToDelete.id)
      setLoanToDelete(null)
      await loadData()
    } catch (err) {
      console.error('Failed to delete loan:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteGift = (gift: Gift) => {
    setGiftToDelete(gift)
  }

  const confirmDeleteGift = async () => {
    if (!giftToDelete) return
    try {
      setIsDeleting(true)
      await loansApi.deleteGift(giftToDelete.id)
      setGiftToDelete(null)
      await loadData()
    } catch (err) {
      console.error('Failed to delete gift:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  // Filtered loans based on direction, search query, status filter
  const allLoans = loanSummary?.loans ?? []
  const lentLoans = allLoans.filter((l) => l.direction === 'Given')
  const borrowedLoans = allLoans.filter((l) => l.direction === 'Received')

  const currentLoans = activeTab === 'lent' ? lentLoans : borrowedLoans

  const filteredLoans = currentLoans.filter((l) => {
    const matchesSearch =
      l.counterpartyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.notes && l.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (l.counterpartyContact && l.counterpartyContact.toLowerCase().includes(searchQuery.toLowerCase()))

    if (!matchesSearch) return false

    if (statusFilter === 'Active') {
      return !l.isSettled
    }
    if (statusFilter === 'Settled') {
      return l.isSettled
    }
    return true
  })

  // Filtered gifts
  const allGifts = giftSummary?.gifts ?? []
  const filteredGifts = allGifts.filter((g) => {
    return (
      g.recipientOrGiver.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.occasion.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.notes && g.notes.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  })

  return (
    <div className="space-y-6">
      {/* Tier 1: Page Header */}
      <PageHeader
        title="Loans & Bilateral Obligations"
        subtitle="Track personal loans lent and borrowed, repayments towards principal balance, and one-way gifts."
        actionSlot={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRecordGiftOpen(true)}
              leftIcon={<GiftIcon className="w-4 h-4 text-pink-600 dark:text-pink-400" />}
            >
              Record Gift
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddLoanOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Record Loan
            </Button>
          </div>
        }
      />

      {/* Tier 2: 4-Card Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <MetricCard
          label="Total Lent (Receivables)"
          value={formatINR(loanSummary?.totalReceivable ?? 0)}
          icon={<ArrowUpRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
          subtext={`${loanSummary?.activeLentCount ?? 0} active lent borrowers`}
        />
        <MetricCard
          label="Total Borrowed (Payables)"
          value={formatINR(loanSummary?.totalPayable ?? 0)}
          icon={<ArrowDownRight className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
          subtext={`${loanSummary?.activeBorrowedCount ?? 0} active lenders`}
        />
        <MetricCard
          label="Net Bilateral Position"
          value={formatINR(loanSummary?.netBilateralPosition ?? 0)}
          icon={<Scale className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
          subtext={
            (loanSummary?.netBilateralPosition ?? 0) >= 0
              ? 'Net Creditor (Receivable > Payable)'
              : 'Net Debtor (Payable > Receivable)'
          }
        />
        <MetricCard
          label="Gift Flow Balance"
          value={formatINR(giftSummary?.netGiftFlow ?? 0)}
          icon={<GiftIcon className="w-4 h-4 text-pink-600 dark:text-pink-400" />}
          subtext={`${giftSummary?.totalGiftsCount ?? 0} recorded gifts`}
        />
      </div>

      {/* Tier 3: Segmented Tab Bar & Search Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('lent')
              setSearchQuery('')
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'lent'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
            <span>Money Lent ({lentLoans.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('borrowed')
              setSearchQuery('')
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'borrowed'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5 text-amber-500" />
            <span>Money Borrowed ({borrowedLoans.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('gifts')
              setSearchQuery('')
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'gifts'
                ? 'bg-white dark:bg-slate-900 text-pink-600 dark:text-pink-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <GiftIcon className="w-3.5 h-3.5 text-pink-500" />
            <span>Gifts Log ({allGifts.length})</span>
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-3">
          <div className="w-full md:w-64">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === 'gifts'
                  ? 'Search recipient, occasion...'
                  : 'Search counterparty, notes...'
              }
              leftElement={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>

          {activeTab !== 'gifts' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'All' | 'Active' | 'Settled')}
              aria-label="Filter loans by settlement status"
              className="h-10 px-3 py-2 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active Obligations</option>
              <option value="Settled">Fully Settled</option>
            </select>
          )}
        </div>
      </div>

      {/* Tier 4: Content Section */}
      {isLoading ? (
        <div className="py-20 text-center text-xs text-slate-500 animate-pulse">
          Loading obligations and ledgers...
        </div>
      ) : activeTab === 'gifts' ? (
        /* GIFTS LOG VIEW */
        <div className="space-y-4">
          {/* Gifts Metric Mini-bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500">Total Gifts Given</span>
              <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                {formatINR(giftSummary?.totalGiftsGiven ?? 0)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500">Total Gifts Received</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {formatINR(giftSummary?.totalGiftsReceived ?? 0)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500">Net Flow (Inflow - Outflow)</span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {formatINR(giftSummary?.netGiftFlow ?? 0)}
              </span>
            </div>
          </div>

          {filteredGifts.length === 0 ? (
            <div className="py-16 text-center p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <GiftIcon className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No gifts recorded
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Track one-way gifts given and received for birthdays, festivals, or occasions without creating debt.
              </p>
              <div className="pt-2">
                <Button variant="primary" size="sm" onClick={() => setIsRecordGiftOpen(true)}>
                  Record First Gift
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 uppercase tracking-wider font-semibold">
                      <th className="py-3 px-4">Direction</th>
                      <th className="py-3 px-4">Person</th>
                      <th className="py-3 px-4">Occasion</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Account</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {filteredGifts.map((gift) => (
                      <tr key={gift.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              gift.direction === 'Given'
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/60'
                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/60'
                            }`}
                          >
                            {gift.direction === 'Given' ? (
                              <ArrowDownRight className="w-3 h-3" />
                            ) : (
                              <ArrowUpRight className="w-3 h-3" />
                            )}
                            {gift.direction === 'Given' ? 'Given' : 'Received'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                          {gift.recipientOrGiver}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {gift.occasion}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(gift.date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {gift.accountName || 'Cash / Linked Account'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                          <span
                            className={
                              gift.direction === 'Given'
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }
                          >
                            {gift.direction === 'Given' ? '-' : '+'}
                            {formatINR(gift.amount)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteGift(gift)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Delete Gift Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* LOANS VIEW (LENT OR BORROWED) */
        <div className="space-y-4">
          {filteredLoans.length === 0 ? (
            <div className="py-16 text-center p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <HandCoins className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {activeTab === 'lent' ? 'No money lent records' : 'No money borrowed records'}
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {activeTab === 'lent'
                  ? 'Record money lent to friends, relatives, or peers as receivables.'
                  : 'Record money borrowed from lenders with automatic repayment balance deductions.'}
              </p>
              <div className="pt-2">
                <Button variant="primary" size="sm" onClick={() => setIsAddLoanOpen(true)}>
                  Record New Loan
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLoans.map((loan) => {
                const isExpanded = Boolean(expandedLoanIds[loan.id])
                const hasRepayments = loan.repayments && loan.repayments.length > 0

                return (
                  <div
                    key={loan.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-all"
                  >
                    {/* Top Row: Counterparty, Status, Quick Actions */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            loan.direction === 'Given'
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                              : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              {loan.counterpartyName}
                            </h3>
                            {loan.isSettled ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                                <CheckCircle2 className="w-3 h-3" />
                                Fully Settled
                              </span>
                            ) : loan.repaymentPercentage > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900">
                                <Clock className="w-3 h-3" />
                                Partially Repaid ({loan.repaymentPercentage}%)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
                                <Clock className="w-3 h-3" />
                                Open
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                            {loan.counterpartyContact && <span>{loan.counterpartyContact} •</span>}
                            <span>
                              Created:{' '}
                              {new Date(loan.createdAtUtc).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                            {loan.dueDate && (
                              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                                • <Calendar className="w-3 h-3 text-slate-400" /> Due:{' '}
                                {new Date(loan.dueDate).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {!loan.isSettled && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setRepaymentLoan(loan)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-xs"
                          >
                            Record Repayment
                          </Button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteLoan(loan)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Delete Loan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Middle Row: Progress Bar & Financial Figures */}
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <span className="text-slate-500 font-medium">Principal Amount</span>
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {formatINR(loan.principalAmount)}
                          </p>
                        </div>

                        <div className="space-y-0.5 text-center">
                          <span className="text-slate-500 font-medium">Total Repaid</span>
                          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            {formatINR(loan.totalRepaidAmount)}
                          </p>
                        </div>

                        <div className="space-y-0.5 text-right">
                          <span className="text-slate-500 font-medium">Outstanding Balance</span>
                          <p
                            className={`text-sm font-bold ${
                              loan.outstandingBalance === 0
                                ? 'text-slate-400'
                                : loan.direction === 'Given'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {formatINR(loan.outstandingBalance)}
                          </p>
                        </div>
                      </div>

                      {/* Repayment Progress Bar */}
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            loan.isSettled
                              ? 'bg-emerald-500'
                              : loan.direction === 'Given'
                              ? 'bg-emerald-600'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.min(100, loan.repaymentPercentage)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>{loan.repaymentPercentage}% repaid</span>
                        {loan.notes && <span className="italic">{loan.notes}</span>}
                      </div>
                    </div>

                    {/* Accordion Toggle for Repayment Ledger */}
                    {hasRepayments && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => toggleExpand(loan.id)}
                          className="flex items-center justify-between w-full py-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                        >
                          <span>Repayment History ({loan.repayments.length})</span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-indigo-200 dark:border-indigo-900">
                            {loan.repayments.map((rep) => (
                              <div
                                key={rep.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-xs"
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                                      {formatINR(rep.amount)}
                                    </span>
                                    {rep.accountName && (
                                      <span className="text-[11px] text-slate-500">
                                        via {rep.accountName}
                                      </span>
                                    )}
                                  </div>
                                  {rep.notes && (
                                    <p className="text-[11px] text-slate-500">{rep.notes}</p>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-500">
                                  {new Date(rep.repaymentDate).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AddLoanModal
        isOpen={isAddLoanOpen}
        onClose={() => setIsAddLoanOpen(false)}
        onSuccess={loadData}
      />

      <RecordRepaymentModal
        loan={repaymentLoan}
        isOpen={Boolean(repaymentLoan)}
        onClose={() => setRepaymentLoan(null)}
        onSuccess={loadData}
      />

      <RecordGiftModal
        isOpen={isRecordGiftOpen}
        onClose={() => setIsRecordGiftOpen(false)}
        onSuccess={loadData}
      />

      {/* Modern Glassmorphic Loan Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!loanToDelete}
        onClose={() => setLoanToDelete(null)}
        onConfirm={confirmDeleteLoan}
        title="Delete Loan Record"
        message={`Are you sure you want to delete the loan record for "${loanToDelete?.counterpartyName}"?`}
        subMessage="This loan and all its associated repayment installments will be removed from your debt overview."
        confirmText="Delete Loan"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Modern Glassmorphic Gift Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!giftToDelete}
        onClose={() => setGiftToDelete(null)}
        onConfirm={confirmDeleteGift}
        title="Delete Gift Record"
        message={`Are you sure you want to delete the gift record for "${giftToDelete?.recipientOrGiver}"?`}
        subMessage="This gift entry will be permanently removed from your historical gift transactions."
        confirmText="Delete Gift"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  )
}
