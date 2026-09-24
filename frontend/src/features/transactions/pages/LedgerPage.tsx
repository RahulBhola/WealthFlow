import React, { useState, useEffect, useCallback } from 'react'
import {
  ReceiptText,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Plus,
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { MetricCard } from '@/components/layout/MetricCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { QuickAddModal } from '../components/QuickAddModal'
import { BudgetHealthWidget } from '@/features/budgets/components/BudgetHealthWidget'
import { transactionsApi } from '../api/transactionsApi'
import { budgetsApi } from '@/features/budgets/api/budgetsApi'
import { accountsApi } from '@/features/accounts/api/accountsApi'
import type { Transaction, TransactionSummary } from '../types'
import type { BudgetSummary } from '@/features/budgets/types'
import type { Account } from '@/features/accounts/types'

const formatINR = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export const LedgerPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [summary, setSummary] = useState<TransactionSummary | null>(null)
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [pageSize] = useState(15)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('All')
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      const eventTypeParam = selectedType === 'All' ? undefined : selectedType

      const [txResult, sumResult, bSummary, accList] = await Promise.all([
        transactionsApi.getTransactions({
          page,
          pageSize,
          search: searchQuery.trim() || undefined,
          eventType: eventTypeParam,
          accountId: selectedAccount || undefined,
        }),
        transactionsApi.getSummary(),
        budgetsApi.getBudgetSummary(),
        accountsApi.getAccounts(false),
      ])

      setTransactions(txResult.items)
      setTotalPages(txResult.totalPages || 1)
      setTotalCount(txResult.totalCount)
      setSummary(sumResult)
      setBudgetSummary(bSummary)
      setAccounts(accList)
    } catch (err) {
      console.error('Failed to load ledger data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [page, pageSize, searchQuery, selectedType, selectedAccount])

  useEffect(() => {
    let ignore = false
    async function init() {
      try {
        const eventTypeParam = selectedType === 'All' ? undefined : selectedType
        const [txResult, sumResult, bSummary, accList] = await Promise.all([
          transactionsApi.getTransactions({
            page,
            pageSize,
            search: searchQuery.trim() || undefined,
            eventType: eventTypeParam,
            accountId: selectedAccount || undefined,
          }),
          transactionsApi.getSummary(),
          budgetsApi.getBudgetSummary(),
          accountsApi.getAccounts(false),
        ])

        if (!ignore) {
          setTransactions(txResult.items)
          setTotalPages(txResult.totalPages || 1)
          setTotalCount(txResult.totalCount)
          setSummary(sumResult)
          setBudgetSummary(bSummary)
          setAccounts(accList)
        }
      } catch (err) {
        console.error('Failed to load ledger data:', err)
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
  }, [page, pageSize, searchQuery, selectedType, selectedAccount])

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsQuickAddOpen((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleDelete = async (tx: Transaction) => {
    if (!window.confirm(`Delete transaction "${tx.description}"? Account balance will be reversed atomically.`)) {
      return
    }

    try {
      await transactionsApi.deleteTransaction(tx.id)
      await loadData()
    } catch (err) {
      console.error('Failed to delete transaction:', err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Tier 1: Page Header */}
      <PageHeader
        title="Transaction Ledger"
        subtitle="Authoritative double-entry ledger with atomic balance updates, neutral transfers, and budget monitoring."
        actionSlot={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsQuickAddOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Quick Add <span className="ml-1 text-[10px] font-mono opacity-80">(Ctrl+K)</span>
          </Button>
        }
      />

      {/* Tier 2: 4-Card Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Monthly Inflows"
          value={formatINR(summary?.totalInflows ?? 0)}
          icon={<TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
          subtext="Salary, consulting & credits"
        />
        <MetricCard
          label="Total Monthly Outflows"
          value={formatINR(summary?.totalOutflows ?? 0)}
          icon={<TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
          subtext="Expenses & lifestyle spend"
        />
        <MetricCard
          label="Net Cash Flow"
          value={formatINR(summary?.netCashFlow ?? 0)}
          icon={<ReceiptText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
          subtext={(summary?.netCashFlow ?? 0) >= 0 ? 'Positive savings rate' : 'Deficit burn'}
        />
        <MetricCard
          label="Total Transactions"
          value={(summary?.totalCount ?? 0).toString()}
          icon={<ArrowRightLeft className="w-4 h-4 text-sky-600 dark:text-sky-400" />}
          subtext={`${totalCount} matching active filters`}
        />
      </div>

      {/* Tier 3: Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="w-full sm:w-80">
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setPage(1)
            }}
            placeholder="Search description, merchant..."
            leftElement={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
          {/* Account Filter Dropdown */}
          <select
            value={selectedAccount}
            onChange={(e) => {
              setSelectedAccount(e.target.value)
              setPage(1)
            }}
            className="h-9 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="">All Accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          {/* Segmented Type Pills */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
            {['All', 'Expense', 'Income', 'Transfer'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setSelectedType(type)
                  setPage(1)
                }}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  selectedType === type
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tier 4: Standardized 12-Column Responsive Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Primary Workspace (8 Columns): High-Density Ledger Table */}
        <div className="lg:col-span-8 space-y-4">
          <Card>
            <CardHeader
              title="Ledger Entries"
              subtitle={`Showing ${transactions.length} of ${totalCount} records (36px high-density rows)`}
            />
            <CardBody className="p-0">
              {isLoading ? (
                <div className="py-16 text-center text-xs text-slate-500 animate-pulse">
                  Querying immutable ledger entries...
                </div>
              ) : transactions.length === 0 ? (
                <div className="py-16 text-center p-6 space-y-2">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    No transactions found
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {searchQuery || selectedType !== 'All' || selectedAccount
                      ? 'No records match your filter criteria.'
                      : 'Record your first transaction using Quick Add.'}
                  </p>
                  <div className="pt-2">
                    <Button variant="primary" size="sm" onClick={() => setIsQuickAddOpen(true)}>
                      Record Transaction
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-[11px] font-semibold text-slate-500 uppercase tracking-wider h-9">
                        <th className="px-4 py-2 w-28 font-mono">Date</th>
                        <th className="px-4 py-2">Description</th>
                        <th className="px-4 py-2">Category</th>
                        <th className="px-4 py-2">Account</th>
                        <th className="px-4 py-2 text-right">Amount</th>
                        <th className="px-4 py-2 w-12 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                      {transactions.map((tx) => {
                        const dateFormatted = new Date(tx.transactionDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })

                        const isIncome = tx.eventType === 'Income' || tx.eventType === 'Refund'
                        const isTransfer = tx.eventType === 'Transfer'

                        const amountColor = isIncome
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : isTransfer
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-rose-600 dark:text-rose-400'

                        const prefix = isIncome ? '+ ' : isTransfer ? '⇄ ' : '- '

                        return (
                          <tr
                            key={tx.id}
                            className="h-9 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="px-4 py-1.5 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {dateFormatted}
                            </td>

                            <td className="px-4 py-1.5 min-w-[180px]">
                              <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                {tx.description}
                              </div>
                              {tx.merchant && (
                                <div className="text-[10px] text-slate-400 truncate">
                                  {tx.merchant}
                                </div>
                              )}
                            </td>

                            <td className="px-4 py-1.5 whitespace-nowrap">
                              {tx.categoryName ? (
                                <Badge variant={tx.categoryName.toLowerCase().includes('transfer') ? 'indigo' : 'slate'} size="sm">
                                  {tx.categoryName}
                                </Badge>
                              ) : isTransfer ? (
                                <Badge variant="indigo" size="sm">
                                  Transfer to self
                                </Badge>
                              ) : (
                                <span className="text-slate-400 text-[11px]">—</span>
                              )}
                            </td>

                            <td className="px-4 py-1.5 whitespace-nowrap font-mono text-[11px] text-slate-600 dark:text-slate-300">
                              {isTransfer && tx.targetAccountName ? (
                                <span className="flex items-center gap-1">
                                  <span>{tx.accountName}</span>
                                  <span className="text-slate-400">›</span>
                                  <span className="text-indigo-600 dark:text-indigo-400">
                                    {tx.targetAccountName}
                                  </span>
                                </span>
                              ) : (
                                tx.accountName
                              )}
                            </td>

                            <td
                              className={`px-4 py-1.5 text-right font-mono font-bold whitespace-nowrap tabular-nums ${amountColor}`}
                            >
                              {prefix}
                              {formatINR(tx.amount)}
                            </td>

                            <td className="px-4 py-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleDelete(tx)}
                                title="Delete transaction and reverse balance impact"
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 text-xs text-slate-500 font-medium">
              <div>
                Page <span className="font-semibold text-slate-800 dark:text-slate-200">{page}</span> of{' '}
                <span className="font-semibold text-slate-800 dark:text-slate-200">{totalPages}</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Secondary Workspace (4 Columns): Budget Health Widget & Tips */}
        <div className="lg:col-span-4 space-y-6">
          <BudgetHealthWidget
            summary={budgetSummary}
            isLoading={isLoading}
            onAddBudget={() => setIsQuickAddOpen(true)}
          />

          {/* Atomic Invariant Reminder Card */}
          <Card>
            <CardHeader
              title="Ledger Compliance"
              subtitle="Materialized double-entry invariants"
            />
            <CardBody className="p-4 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-2">
                <span className="font-bold text-indigo-600 dark:text-indigo-400">•</span>
                <span>
                  <strong>Atomic Balance Mutation:</strong> Inflows, outflows, and transfers commit in
                  a single atomic transaction.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-indigo-600 dark:text-indigo-400">•</span>
                <span>
                  <strong>Neutral Transfers:</strong> Transfers move money between accounts with
                  net-zero change to wealth.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-indigo-600 dark:text-indigo-400">•</span>
                <span>
                  <strong>Dynamic Thresholds:</strong> Category budgets alert in real-time at 80%,
                  90%, and 100%+ utilization.
                </span>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Quick Add Modal */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSuccess={loadData}
      />
    </div>
  )
}
