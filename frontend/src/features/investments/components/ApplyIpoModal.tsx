import React, { useState, useEffect } from 'react'
import { X, Rocket, AlertCircle, Info, Landmark } from 'lucide-react'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { accountsApi } from '@/features/accounts/api/accountsApi'
import { transactionsApi } from '@/features/transactions/api/transactionsApi'
import type { Account } from '@/features/accounts/types'

export interface ApplyIpoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const ApplyIpoModal: React.FC<ApplyIpoModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountId, setAccountId] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [units, setUnits] = useState('')
  const [transactionDate, setTransactionDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      accountsApi
        .getAccounts()
        .then((accs) => {
          setAccounts(accs)
          if (accs.length > 0 && !accountId) {
            const defaultAcc = accs.find((a) => a.accountType === 'Bank' || a.accountType === 'Savings') || accs[0]
            setAccountId(defaultAcc.id)
          }
        })
        .catch(console.error)
    }
  }, [isOpen, accountId])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!accountId) {
      setError('Please select a bank account to hold funds.')
      return
    }

    if (!description.trim()) {
      setError('Please enter the IPO / company name.')
      return
    }

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid bid amount greater than zero.')
      return
    }

    const numUnits = units ? parseFloat(units) : undefined
    if (numUnits !== undefined && (isNaN(numUnits) || numUnits <= 0)) {
      setError('Please enter valid bid units / shares or leave blank.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await transactionsApi.createTransaction({
        accountId,
        amount: numAmount,
        eventType: 'IpoApplication',
        transactionDate: new Date(transactionDate).toISOString(),
        description: description.trim(),
        allottedUnits: numUnits,
        notes: notes.trim() || undefined,
      })

      onSuccess()
      onClose()
      setDescription('')
      setAmount('')
      setUnits('')
      setNotes('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to apply for IPO.'
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Apply for New IPO
              </h2>
              <p className="text-xs text-slate-500">
                Record bank fund hold & track allotment status
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Plain English Fund Block Clarification */}
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Bank Fund Hold</p>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                Funds will be temporarily placed on hold in your selected bank account. Your balance is not deducted until shares are officially allotted.
              </p>
            </div>
          </div>

          <FormField label="Bank Account (Holding Funds)" required>
            <div className="relative">
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                disabled={isSubmitting}
                className="w-full h-10 pl-9 pr-3 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 disabled:opacity-60 cursor-pointer"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.accountType})
                  </option>
                ))}
              </select>
              <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </FormField>

          <FormField label="IPO / Company Name" required>
            <Input
              type="text"
              placeholder="e.g. Swiggy Limited IPO, NTPC Green IPO"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              autoFocus
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Bid Amount (Held in Bank)" required>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                  ₹
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="15000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={isSubmitting}
                  className="pl-8"
                />
              </div>
            </FormField>

            <FormField label="Bid Lot / Shares (Optional)">
              <Input
                type="number"
                step="1"
                min="1"
                placeholder="e.g. 50 shares"
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                disabled={isSubmitting}
              />
            </FormField>
          </div>

          <FormField label="Application Date" required>
            <Input
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              disabled={isSubmitting}
            />
          </FormField>

          <FormField label="Notes (Optional)">
            <Input
              type="text"
              placeholder="e.g. Application No., UPI Mandate ID, broker applied from"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
            />
          </FormField>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 font-bold border-none"
            >
              {isSubmitting ? 'Recording Application...' : 'Record IPO Application'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
