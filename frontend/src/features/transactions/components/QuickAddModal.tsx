import React, { useState, useEffect } from 'react'
import { X, ArrowDownRight, ArrowUpRight, ArrowRightLeft, ShieldCheck } from 'lucide-react'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { MoneyInput } from './MoneyInput'
import { accountsApi } from '@/features/accounts/api/accountsApi'
import { categoriesApi } from '@/features/categories/api/categoriesApi'
import { transactionsApi } from '../api/transactionsApi'
import type { Account } from '@/features/accounts/types'
import type { TransactionType, CreateTransactionPayload } from '../types'

export interface QuickAddModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface CategoryOption {
  id: string
  name: string
  parentName?: string
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<TransactionType>('Expense')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [transactionDate, setTransactionDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [accountId, setAccountId] = useState('')
  const [targetAccountId, setTargetAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [merchant, setMerchant] = useState('')
  const [notes, setNotes] = useState('')

  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    let ignore = false
    async function loadMeta() {
      setIsLoadingMetadata(true)
      try {
        const [accList, catRes] = await Promise.all([
          accountsApi.getAccounts(false),
          categoriesApi.getCategories().catch(() => []),
        ])

        if (!ignore) {
          setAccounts(accList)
          setAccountId((prev) => prev || (accList.length > 0 ? accList[0].id : ''))
          setTargetAccountId((prev) => prev || (accList.length > 1 ? accList[1].id : ''))

          // Flatten categories tree
          const flatCats: CategoryOption[] = []
          for (const parent of catRes) {
            flatCats.push({ id: parent.id, name: parent.name })
            if (parent.subcategories) {
              for (const sub of parent.subcategories) {
                flatCats.push({ id: sub.id, name: sub.name, parentName: parent.name })
              }
            }
          }
          setCategories(flatCats)
        }
      } catch (err) {
        console.error('Failed to load accounts/categories metadata:', err)
      } finally {
        if (!ignore) {
          setIsLoadingMetadata(false)
        }
      }
    }

    loadMeta()
    return () => {
      ignore = true
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const numericAmount = parseFloat(amount)
    if (!numericAmount || numericAmount <= 0) {
      setError('Please enter a valid amount greater than zero.')
      return
    }

    if (!accountId) {
      setError('Please select an account.')
      return
    }

    if (activeTab === 'Transfer') {
      if (!targetAccountId) {
        setError('Please select a destination account for the transfer.')
        return
      }
      if (accountId === targetAccountId) {
        setError('Source and destination accounts must be different.')
        return
      }
    }

    if (!description.trim()) {
      setError('Please enter a description or payee name.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const payload: CreateTransactionPayload = {
        accountId,
        amount: numericAmount,
        eventType: activeTab,
        transactionDate: new Date(transactionDate).toISOString(),
        description: description.trim(),
        categoryId: categoryId || undefined,
        targetAccountId: activeTab === 'Transfer' ? targetAccountId : undefined,
        merchant: merchant.trim() || undefined,
        notes: notes.trim() || undefined,
      }

      await transactionsApi.createTransaction(payload)
      onSuccess?.()
      onClose()
      // Reset form
      setAmount('')
      setDescription('')
      setMerchant('')
      setNotes('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record transaction.'
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header with Segmented Tabs */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Quick Record</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-normal">
                Ctrl+K
              </span>
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Segmented Tabs */}
          <div className="grid grid-cols-3 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('Expense')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
                activeTab === 'Expense'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              Expense
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('Income')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
                activeTab === 'Income'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Income
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('Transfer')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
                activeTab === 'Transfer'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              Transfer
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400 font-medium">
              {error}
            </div>
          )}

          {/* Amount (MoneyInput) */}
          <FormField label="Amount" required>
            <MoneyInput
              value={amount}
              onChange={setAmount}
              autoFocus
              placeholder="0.00"
            />
          </FormField>

          {/* Transfer Specific: Source & Destination Accounts */}
          {activeTab === 'Transfer' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="From Account" required>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    disabled={isLoadingMetadata || isSubmitting}
                    className="w-full h-10 px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.accountType})
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="To Account" required>
                  <select
                    value={targetAccountId}
                    onChange={(e) => setTargetAccountId(e.target.value)}
                    disabled={isLoadingMetadata || isSubmitting}
                    className="w-full h-10 px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.accountType})
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/50 flex items-center justify-between text-xs text-indigo-700 dark:text-indigo-300">
                <span className="font-medium">Category</span>
                <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 font-semibold text-indigo-700 dark:text-indigo-200">
                  Transfer to self
                </span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Account" required>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  disabled={isLoadingMetadata || isSubmitting}
                  className="w-full h-10 px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Category">
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  disabled={isLoadingMetadata || isSubmitting}
                  className="w-full h-10 px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60"
                >
                  <option value="">Uncategorized</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.parentName ? `${cat.parentName} › ${cat.name}` : cat.name}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          )}

          {/* Description & Date */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <FormField label="Description" required>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    activeTab === 'Transfer'
                      ? 'e.g. Wallet refill via UPI'
                      : activeTab === 'Expense'
                      ? 'e.g. Weekly Groceries (Blinkit)'
                      : 'e.g. Monthly Salary Credit'
                  }
                  required
                />
              </FormField>
            </div>

            <div>
              <FormField label="Date" required>
                <Input
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  required
                />
              </FormField>
            </div>
          </div>

          {/* Merchant / Payee for Expense/Income */}
          {activeTab !== 'Transfer' && (
            <FormField label="Merchant / Payee (Optional)">
              <Input
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                placeholder="e.g. Swiggy, Amazon, Client Ltd"
              />
            </FormField>
          )}

          {/* Notes */}
          <FormField label="Notes / Tag Reference (Optional)">
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. UPI ref: 489218209312"
            />
          </FormField>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Atomic Ledger Commit</span>
            </div>

            <div className="flex items-center gap-2.5">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmitting}
                className={
                  activeTab === 'Expense'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : activeTab === 'Income'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }
              >
                Record {activeTab}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
