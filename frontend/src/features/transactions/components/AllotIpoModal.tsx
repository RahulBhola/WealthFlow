import React, { useState } from 'react'
import { X, CheckCircle2, TrendingUp, AlertCircle } from 'lucide-react'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { MoneyInput } from './MoneyInput'
import { transactionsApi } from '../api/transactionsApi'
import type { Transaction } from '../types'
import { useCurrency } from '../../../context/CurrencyContext'

export interface AllotIpoModalProps {
  isOpen: boolean
  transaction: Transaction | null
  onClose: () => void
  onSuccess: () => void
}

export const AllotIpoModal: React.FC<AllotIpoModalProps> = ({
  isOpen,
  transaction,
  onClose,
  onSuccess,
}) => {
  const { formatCurrency } = useCurrency()
  const [units, setUnits] = useState(() => (transaction?.allottedUnits ? transaction.allottedUnits.toString() : '50'))
  const [amount, setAmount] = useState(() => (transaction?.amount ? transaction.amount.toString() : ''))
  const [stockName, setStockName] = useState(() => {
    if (!transaction) return ''
    return transaction.description.replace(/IPO\s*Application/gi, '').trim() || transaction.description
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sync state if transaction changes when opened
  React.useEffect(() => {
    if (transaction) {
      setUnits(transaction.allottedUnits ? transaction.allottedUnits.toString() : '50')
      setAmount(transaction.amount.toString())
      const cleanName = transaction.description.replace(/IPO\s*Application/gi, '').trim() || transaction.description
      setStockName(cleanName)
    }
  }, [transaction])

  if (!isOpen || !transaction) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const numericUnits = parseFloat(units)
    if (!numericUnits || numericUnits <= 0) {
      setError('Please enter valid allotted units / shares greater than 0.')
      return
    }

    const numericAmount = parseFloat(amount)
    if (!numericAmount || numericAmount <= 0) {
      setError('Please enter a valid allotted amount.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await transactionsApi.allotIpo(transaction.id, {
        allottedUnits: numericUnits,
        allottedAmount: numericAmount,
        stockName: stockName.trim() || undefined,
      })
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to confirm IPO allotment.'
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Confirm IPO Allotment
              </h2>
              <p className="text-xs text-slate-500">
                Deduct blocked funds and add to Investment Portfolio
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs space-y-1.5">
            <div className="flex justify-between text-slate-500">
              <span>Application</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{transaction.description}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Bank Account</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{transaction.accountName}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Currently On Hold</span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                {formatCurrency(transaction.amount)}
              </span>
            </div>
          </div>

          <FormField label="Portfolio Stock Name" required>
            <Input
              value={stockName}
              onChange={(e) => setStockName(e.target.value)}
              placeholder="e.g. Swiggy Ltd"
              required
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Allotted Units / Shares" required>
              <Input
                type="number"
                min="1"
                step="1"
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                placeholder="e.g. 50"
                required
              />
            </FormField>

            <FormField label="Final Debited Amount" required>
              <MoneyInput
                value={amount}
                onChange={setAmount}
                placeholder="15000.00"
              />
            </FormField>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-2 text-xs text-emerald-800 dark:text-emerald-300">
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span>
              This will debit <strong>{formatCurrency(parseFloat(amount) || transaction.amount)}</strong> from <strong>{transaction.accountName}</strong>, release the lien, and create a Stock holding under your Investments portfolio.
            </span>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Confirm Allotment
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
