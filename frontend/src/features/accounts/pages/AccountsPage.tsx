import React, { useState, useEffect, useCallback } from 'react'
import {
  Landmark,
  Building2,
  Wallet,
  Coins,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { MetricCard } from '@/components/layout/MetricCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { accountsApi } from '../api/accountsApi'
import { AccountCard } from '../components/AccountCard'
import { AccountModal } from '../components/AccountModal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import type {
  Account,
  AccountSummary,
  CreateAccountPayload,
  UpdateAccountPayload,
  ReconcileResponse,
} from '../types'
import { useCurrency } from '../../../context/CurrencyContext'

export const AccountsPage: React.FC = () => {
  const { formatCurrency } = useCurrency()
  const formatINR = formatCurrency
  const [accounts, setAccounts] = useState<Account[]>([])
  const [summary, setSummary] = useState<AccountSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [includeArchived, setIncludeArchived] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('All')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reconciliation & Action States
  const [reconcilingId, setReconcilingId] = useState<string | null>(null)
  const [notification, setNotification] = useState<{
    type: 'success' | 'warning' | 'error'
    message: string
  } | null>(null)

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      const [accountsData, summaryData] = await Promise.all([
        accountsApi.getAccounts(includeArchived),
        accountsApi.getAccountSummary(),
      ])
      setAccounts(accountsData)
      setSummary(summaryData)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load accounts.'
      setNotification({ type: 'error', message: msg })
    } finally {
      setIsLoading(false)
    }
  }, [includeArchived])

  useEffect(() => {
    let ignore = false
    async function fetchData() {
      try {
        const [accountsData, summaryData] = await Promise.all([
          accountsApi.getAccounts(includeArchived),
          accountsApi.getAccountSummary(),
        ])
        if (!ignore) {
          setAccounts(accountsData)
          setSummary(summaryData)
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : 'Failed to load accounts.'
          setNotification({ type: 'error', message: msg })
        }
      } finally {
        if (!ignore) {
          setIsLoading(false)
        }
      }
    }

    fetchData()
    return () => {
      ignore = true
    }
  }, [includeArchived])

  const handleCreateOrUpdate = async (data: CreateAccountPayload | UpdateAccountPayload) => {
    setIsSubmitting(true)
    try {
      if (editingAccount) {
        await accountsApi.updateAccount(editingAccount.id, data as UpdateAccountPayload)
        setNotification({
          type: 'success',
          message: `Account "${data.name}" updated successfully.`,
        })
      } else {
        await accountsApi.createAccount(data as CreateAccountPayload)
        setNotification({
          type: 'success',
          message: `Account "${data.name}" created with verified opening balance.`,
        })
      }
      await loadData()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleArchive = async (account: Account) => {
    try {
      if (account.isActive) {
        await accountsApi.archiveAccount(account.id)
        setNotification({
          type: 'warning',
          message: `Account "${account.name}" archived.`,
        })
      } else {
        await accountsApi.activateAccount(account.id)
        setNotification({
          type: 'success',
          message: `Account "${account.name}" activated.`,
        })
      }
      await loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change account status.'
      setNotification({ type: 'error', message: msg })
    }
  }

  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = (account: Account) => {
    setAccountToDelete(account)
  }

  const confirmDeleteAccount = async () => {
    if (!accountToDelete) return
    try {
      setIsDeleting(true)
      await accountsApi.deleteAccount(accountToDelete.id)
      setNotification({
        type: 'success',
        message: `Account "${accountToDelete.name}" deleted successfully.`,
      })
      setAccountToDelete(null)
      await loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete account.'
      setNotification({ type: 'error', message: msg })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleReconcile = async (account: Account) => {
    setReconcilingId(account.id)
    try {
      const res: ReconcileResponse = await accountsApi.reconcileAccount(account.id)
      if (res.hasDiscrepancy) {
        setNotification({
          type: 'warning',
          message: `Discrepancy of ${formatINR(res.discrepancy)} detected on "${account.name}". Balance reconciled to ${formatINR(res.reconciledBalance)} across ${res.transactionCount} transactions.`,
        })
      } else {
        setNotification({
          type: 'success',
          message: `Account "${account.name}" is 100% reconciled across ${res.transactionCount} transactions. No discrepancy found.`,
        })
      }
      await loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Reconciliation failed.'
      setNotification({ type: 'error', message: msg })
    } finally {
      setReconcilingId(null)
    }
  }

  // Filter accounts
  const filteredAccounts = accounts.filter((acc) => {
    const matchesSearch =
      acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (acc.accountNumberMask &&
        acc.accountNumberMask.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesType = selectedType === 'All' || acc.accountType === selectedType
    return matchesSearch && matchesType
  })

  return (
    <div className="space-y-6">
      {/* Tier 1: Page Header */}
      <PageHeader
        title="Financial Accounts"
        subtitle="Manage depository accounts, cash vaults, and digital wallets with verified ledger reconciliation."
        actionSlot={
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingAccount(null)
              setIsModalOpen(true)
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Account
          </Button>
        }
      />

      {/* Notification Toast Banner */}
      {notification && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl border text-sm transition-all duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
              : notification.type === 'warning'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' && (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            )}
            {notification.type === 'warning' && (
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
            )}
            {notification.type === 'error' && (
              <XCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>

          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-xs font-semibold underline ml-4 hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tier 2: Standardized 4-Card Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <MetricCard
          label="Total Liquid Balance"
          value={formatINR(summary?.totalLiquidBalance ?? 0)}
          icon={<Landmark className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
          subtext="Bank + Cash + Wallets"
        />
        <MetricCard
          label="Bank Deposits"
          value={formatINR(summary?.totalBankBalance ?? 0)}
          icon={<Building2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />}
          subtext="Savings & Current accounts"
        />
        <MetricCard
          label="Cash & Wallets"
          value={formatINR(
            (summary?.totalCashBalance ?? 0) + (summary?.totalWalletBalance ?? 0)
          )}
          icon={<Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
          subtext="Physical reserves & mobile UPI"
        />
        <MetricCard
          label="Active Accounts"
          value={(summary?.activeAccountCount ?? 0).toString()}
          icon={<Coins className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
          subtext="Depository entities"
        />
      </div>

      {/* Tier 3: Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="w-full sm:w-72">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search accounts..."
            leftElement={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            {['All', 'Bank', 'Cash', 'Wallet', 'Savings', 'Other'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  selectedType === type
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer select-none ml-2">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
            />
            <span>Show Archived</span>
          </label>
        </div>
      </div>

      {/* Tier 4: Accounts Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400 animate-pulse">
          Loading financial accounts...
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="py-16 text-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 space-y-3">
          <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <Landmark className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            No accounts found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {searchQuery || selectedType !== 'All'
              ? 'No accounts matched your search filters. Try clearing your search.'
              : 'Add your first depository account, bank, or cash vault to start tracking balances.'}
          </p>
          <div className="pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingAccount(null)
                setIsModalOpen(true)
              }}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add First Account
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAccounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onEdit={(acc) => {
                setEditingAccount(acc)
                setIsModalOpen(true)
              }}
              onToggleArchive={handleToggleArchive}
              onDelete={handleDelete}
              onReconcile={handleReconcile}
              isReconciling={reconcilingId === account.id}
            />
          ))}
        </div>
      )}

      {/* Account Create / Edit Modal */}
      <AccountModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingAccount(null)
        }}
        onSubmit={handleCreateOrUpdate}
        initialData={editingAccount}
        isLoading={isSubmitting}
      />

      {/* Modern Glassmorphic Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!accountToDelete}
        onClose={() => setAccountToDelete(null)}
        onConfirm={confirmDeleteAccount}
        title="Delete Account"
        message={`Are you sure you want to delete account "${accountToDelete?.name}"?`}
        subMessage="This account will be permanently removed. To preserve transaction integrity without deletion, consider archiving the account instead."
        confirmText="Delete Account"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  )
}
