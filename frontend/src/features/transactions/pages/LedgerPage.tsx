import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
  Calendar,
  Download,
  CloudUpload,
  Printer,
  Landmark,
  CreditCard as CreditCardIcon,
  Wallet,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { MetricCard } from '@/components/layout/MetricCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { QuickAddModal } from '../components/QuickAddModal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { BudgetHealthWidget } from '@/features/budgets/components/BudgetHealthWidget'
import { transactionsApi } from '../api/transactionsApi'
import { budgetsApi } from '@/features/budgets/api/budgetsApi'
import { accountsApi } from '@/features/accounts/api/accountsApi'
import { apiClient } from '@/lib/api'
import type { Transaction, TransactionSummary } from '../types'
import type { BudgetSummary } from '@/features/budgets/types'
import type { Account } from '@/features/accounts/types'

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const formatINR = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export const LedgerPage: React.FC = () => {
  const today = useMemo(() => new Date(), [])
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1)
  const [isMonthlyView, setIsMonthlyView] = useState<boolean>(true)

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

  // Cloud Archive State
  const [isArchiving, setIsArchiving] = useState(false)
  const [archiveSuccessMessage, setArchiveSuccessMessage] = useState<string | null>(null)

  // Calculate monthly date range
  const dateRange = useMemo(() => {
    if (!isMonthlyView) return { startDate: undefined, endDate: undefined }
    const start = new Date(Date.UTC(selectedYear, selectedMonth - 1, 1, 0, 0, 0, 0))
    const end = new Date(Date.UTC(selectedYear, selectedMonth, 0, 23, 59, 59, 999))
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    }
  }, [isMonthlyView, selectedYear, selectedMonth])

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
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        }),
        transactionsApi.getSummary(dateRange.startDate, dateRange.endDate),
        budgetsApi.getBudgetSummary(selectedYear, selectedMonth),
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
  }, [page, pageSize, searchQuery, selectedType, selectedAccount, dateRange, selectedYear, selectedMonth])

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
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
          }),
          transactionsApi.getSummary(dateRange.startDate, dateRange.endDate),
          budgetsApi.getBudgetSummary(selectedYear, selectedMonth),
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
  }, [page, pageSize, searchQuery, selectedType, selectedAccount, dateRange, selectedYear, selectedMonth])

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

  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = (tx: Transaction) => {
    setTxToDelete(tx)
  }

  const confirmDelete = async () => {
    if (!txToDelete) return
    try {
      setIsDeleting(true)
      await transactionsApi.deleteTransaction(txToDelete.id)
      setTxToDelete(null)
      await loadData()
    } catch (err) {
      console.error('Failed to delete transaction:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12)
      setSelectedYear((y) => y - 1)
    } else {
      setSelectedMonth((m) => m - 1)
    }
    setPage(1)
  }

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1)
      setSelectedYear((y) => y + 1)
    } else {
      setSelectedMonth((m) => m + 1)
    }
    setPage(1)
  }

  const handleResetToCurrentMonth = () => {
    setSelectedYear(today.getFullYear())
    setSelectedMonth(today.getMonth() + 1)
    setIsMonthlyView(true)
    setPage(1)
  }

  // Client-side Monthly Excel / CSV Export
  const handleExportCsv = () => {
    const monthName = MONTH_NAMES[selectedMonth - 1]
    const title = isMonthlyView
      ? `WealthFlow Monthly Ledger - ${monthName} ${selectedYear}`
      : 'WealthFlow Transaction Ledger - All Time'

    let csvContent = `\uFEFF# ${title}\n`
    csvContent += `# Generated At: ${new Date().toISOString()}\n`
    csvContent += `# Total Monthly Inflows: INR ${(summary?.totalInflows ?? 0).toFixed(2)}\n`
    csvContent += `# Total Monthly Outflows: INR ${(summary?.totalOutflows ?? 0).toFixed(2)}\n`
    csvContent += `# Net Cash Flow: INR ${(summary?.netCashFlow ?? 0).toFixed(2)}\n`
    csvContent += `# Active Accounts: ${accounts.map((a) => `${a.name}: INR ${a.currentBalance.toFixed(2)}`).join(' | ')}\n\n`
    csvContent += `TransactionId,Date,Type,Account,Category,Description,Merchant,Amount\n`

    transactions.forEach((tx) => {
      const dateStr = new Date(tx.transactionDate).toLocaleDateString('en-IN')
      const accountStr = tx.targetAccountName
        ? `${tx.accountName} > ${tx.targetAccountName}`
        : tx.accountName
      const categoryStr = tx.categoryName || 'General'
      const descStr = (tx.description || '').replace(/"/g, '""')
      const merchantStr = (tx.merchant || '').replace(/"/g, '""')
      csvContent += `"${tx.id}","${dateStr}","${tx.eventType}","${accountStr}","${categoryStr}","${descStr}","${merchantStr}",${tx.amount}\n`
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      isMonthlyView
        ? `WealthFlow_Ledger_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.csv`
        : 'WealthFlow_Ledger_AllTime.csv'
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Push Monthly Statement to Google Drive via backend cloud archiver
  const handleArchiveToGoogleDrive = async () => {
    try {
      setIsArchiving(true)
      setArchiveSuccessMessage(null)
      const res = await apiClient<{ success: boolean; message: string; fileName: string }>(
        `/api/v1/data/archive-monthly?year=${selectedYear}&month=${selectedMonth}`,
        { method: 'POST' }
      )
      setArchiveSuccessMessage(
        `Archived to Google Drive: ${res.fileName || `${MONTH_NAMES[selectedMonth - 1]} statement`}`
      )
      setTimeout(() => setArchiveSuccessMessage(null), 6000)
    } catch (err: unknown) {
      console.error('Failed to archive to Google Drive:', err)
      alert(err instanceof Error ? err.message : 'Failed to archive ledger to Google Drive.')
    } finally {
      setIsArchiving(false)
    }
  }

  // Bank & Credit Card accounts summary
  const accountBreakdown = useMemo(() => {
    const banks = accounts.filter((a) => a.accountType === 'Bank' || a.accountType === 'Savings')
    const cards = accounts.filter((a) => a.accountType === 'CreditCard')
    const wallets = accounts.filter((a) => a.accountType === 'Cash' || a.accountType === 'Wallet')

    const totalLiquid = accounts
      .filter((a) => a.accountType !== 'CreditCard')
      .reduce((sum, a) => sum + a.currentBalance, 0)

    const totalCardDebt = cards.reduce((sum, a) => sum + (a.currentBalance < 0 ? Math.abs(a.currentBalance) : 0), 0)

    return { banks, cards, wallets, totalLiquid, totalCardDebt }
  }, [accounts])

  const isCurrentMonth =
    selectedYear === today.getFullYear() && selectedMonth === today.getMonth() + 1

  return (
    <div className="space-y-6">
      {/* Tier 1: Page Header with Month Navigator & Export Tools */}
      <PageHeader
        title="Transaction Ledger"
        subtitle="Authoritative double-entry ledger with atomic balance updates, neutral transfers, and budget monitoring."
        actionSlot={
          <div className="flex flex-wrap items-center gap-2">
            {/* Monthly Navigator Pill */}
            <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1 shadow-sm">
              <button
                type="button"
                onClick={handlePrevMonth}
                disabled={!isMonthlyView}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors disabled:opacity-40"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="px-3 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 min-w-[130px] justify-center">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                <span>
                  {isMonthlyView ? `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}` : 'All Time'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleNextMonth}
                disabled={!isMonthlyView}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors disabled:opacity-40"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Toggle All Time / Monthly */}
            <button
              type="button"
              onClick={() => {
                setIsMonthlyView((prev) => !prev)
                setPage(1)
              }}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              {isMonthlyView ? 'View All Time' : 'View Monthly'}
            </button>

            {isMonthlyView && !isCurrentMonth && (
              <button
                type="button"
                onClick={handleResetToCurrentMonth}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
              >
                This Month
              </button>
            )}

            {/* Export Monthly to Excel/CSV */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              leftIcon={<Download className="w-4 h-4" />}
              title="Download clean CSV spreadsheet for Excel or Google Sheets"
            >
              Export Excel
            </Button>

            {/* Print / PDF Statement */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              leftIcon={<Printer className="w-4 h-4" />}
              title="Print or save monthly statement as PDF"
            >
              PDF
            </Button>

            {/* Push to Google Drive */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleArchiveToGoogleDrive}
              disabled={isArchiving}
              leftIcon={
                isArchiving ? (
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                ) : (
                  <CloudUpload className="w-4 h-4 text-emerald-500" />
                )
              }
              title="Instantly upload and archive this monthly ledger statement to Google Drive"
            >
              {isArchiving ? 'Uploading...' : 'Push to Drive'}
            </Button>

            {/* Quick Add */}
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsQuickAddOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Quick Add <span className="ml-1 text-[10px] font-mono opacity-80">(Ctrl+K)</span>
            </Button>
          </div>
        }
      />

      {/* Cloud Archive Success Alert */}
      {archiveSuccessMessage && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{archiveSuccessMessage}</span>
          <span className="text-[11px] font-normal text-emerald-600 dark:text-emerald-400 ml-auto">
            Auto-archiving on the 1st of every month is active.
          </span>
        </div>
      )}

      {/* Tier 1.5: Account Standings Strip (Live Bank Balances & Credit Card Standings) */}
      {accounts.length > 0 && (
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px] shrink-0">
            <Landmark className="w-4 h-4 text-indigo-500" />
            <span>Account Standings:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Banks & Cash Accounts */}
            {accountBreakdown.banks.map((acc) => (
              <div
                key={acc.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 font-medium"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: acc.colorTag || '#3B82F6' }}
                />
                <span className="text-slate-700 dark:text-slate-200">{acc.name}:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                  {formatINR(acc.currentBalance)}
                </span>
              </div>
            ))}

            {/* Cash / Wallets */}
            {accountBreakdown.wallets.map((acc) => (
              <div
                key={acc.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 font-medium"
              >
                <Wallet className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-slate-700 dark:text-slate-200">{acc.name}:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                  {formatINR(acc.currentBalance)}
                </span>
              </div>
            ))}

            {/* Credit Cards */}
            {accountBreakdown.cards.map((acc) => (
              <div
                key={acc.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 font-medium text-rose-700 dark:text-rose-300"
              >
                <CreditCardIcon className="w-3.5 h-3.5 text-rose-500" />
                <span>{acc.name}:</span>
                <span className="font-mono font-bold tabular-nums">
                  {formatINR(Math.abs(acc.currentBalance))}
                </span>
              </div>
            ))}

            {/* Net Liquid Summary */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900 font-semibold text-indigo-700 dark:text-indigo-300 ml-auto">
              <span>Total Liquid:</span>
              <span className="font-mono font-bold tabular-nums">
                {formatINR(accountBreakdown.totalLiquid)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tier 2: 4-Card Metric Strip (Dynamically Calculated for Selected Month) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <MetricCard
          label="Total Monthly Inflows"
          value={formatINR(summary?.totalInflows ?? 0)}
          icon={<TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
          subtext={`Inflows in ${isMonthlyView ? MONTH_NAMES[selectedMonth - 1] : 'All Time'}`}
        />
        <MetricCard
          label="Total Monthly Outflows"
          value={formatINR(summary?.totalOutflows ?? 0)}
          icon={<TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
          subtext={`Expenditures in ${isMonthlyView ? MONTH_NAMES[selectedMonth - 1] : 'All Time'}`}
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
              title={`Ledger Entries - ${isMonthlyView ? `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}` : 'All Records'}`}
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
                      : `No transactions recorded for ${isMonthlyView ? `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}` : 'this filter'}. Record your first transaction using Quick Add.`}
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
                        const isTransfer =
                          tx.eventType === 'Transfer' ||
                          (tx.description && tx.description.toLowerCase().includes('transfer to self')) ||
                          (tx.merchant && tx.merchant.toLowerCase().includes('transfer to self'))

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
                              {isTransfer || (tx.categoryName && tx.categoryName.toLowerCase().includes('transfer')) ? (
                                <Badge variant="indigo" size="sm">
                                  Transfer to self
                                </Badge>
                              ) : tx.categoryName ? (
                                <Badge variant="slate" size="sm">
                                  {tx.categoryName}
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

          {/* Automatic Cloud Archive Information Card */}
          <Card>
            <CardHeader
              title="Automated Monthly Archiving"
              subtitle="Google Drive ledger sync on 1st of every month"
            />
            <CardBody className="p-4 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>1st of Month Automation:</strong> WealthFlow compiles all monthly entries into a permanent statement and pushes to Google Drive.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Download className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Instant Excel Export:</strong> Download anytime as a UTF-8 CSV spreadsheet compatible with Microsoft Excel and Google Sheets.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Printer className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Printable Statement:</strong> Generates a clean ledger breakdown ready to save as PDF.
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

      {/* Modern Glassmorphic Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!txToDelete}
        onClose={() => setTxToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Transaction"
        message={`Are you sure you want to delete "${txToDelete?.description}"?`}
        subMessage="Account balance will be reversed atomically across your double-entry ledger."
        confirmText="Delete Transaction"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  )
}
