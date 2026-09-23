import React, { useState, useEffect } from 'react'
import { X, ArrowDownRight, ArrowUpRight, HandCoins } from 'lucide-react'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { MoneyInput } from '@/features/transactions/components/MoneyInput'
import { accountsApi } from '@/features/accounts/api/accountsApi'
import { loansApi } from '../api/loansApi'
import type { CreateLoanPayload } from '../types'
import type { Account } from '@/features/accounts/types'

export interface AddLoanModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const AddLoanModal: React.FC<AddLoanModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [direction, setDirection] = useState<'Given' | 'Received'>('Given')
  const [counterpartyName, setCounterpartyName] = useState('')
  const [counterpartyContact, setCounterpartyContact] = useState('')
  const [principalAmount, setPrincipalAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [disbursementAccountId, setDisbursementAccountId] = useState('')
  const [notes, setNotes] = useState('')

  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    let ignore = false
    async function loadAccounts() {
      setIsLoadingAccounts(true)
      try {
        const accList = await accountsApi.getAccounts(false)
        if (!ignore) {
          setAccounts(accList)
        }
      } catch (err) {
        console.error('Failed to load accounts for loan disbursement:', err)
      } finally {
        if (!ignore) {
          setIsLoadingAccounts(false)
        }
      }
    }

    loadAccounts()
    return () => {
      ignore = true
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const numericAmount = parseFloat(principalAmount)

    if (!counterpartyName.trim()) {
      setError('Please enter the counterparty name.')
      return
    }

    if (!numericAmount || numericAmount <= 0) {
      setError('Please enter a valid principal amount greater than zero.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const payload: CreateLoanPayload = {
        direction,
        counterpartyName: counterpartyName.trim(),
        counterpartyContact: counterpartyContact.trim() || undefined,
        principalAmount: numericAmount,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        disbursementAccountId: disbursementAccountId || undefined,
        notes: notes.trim() || undefined,
      }

      await loansApi.createLoan(payload)
      onSuccess()
      onClose()
      // Reset
      setCounterpartyName('')
      setCounterpartyContact('')
      setPrincipalAmount('')
      setDueDate('')
      setDisbursementAccountId('')
      setNotes('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record loan.'
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                <HandCoins className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Record Loan Obligation
                </h2>
                <p className="text-xs text-slate-500">Bilateral receivables & payables</p>
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

          {/* Segmented Direction Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setDirection('Given')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
                direction === 'Given'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Money Lent (Receivable / Asset)
            </button>

            <button
              type="button"
              onClick={() => setDirection('Received')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
                direction === 'Received'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              Money Borrowed (Payable / Liability)
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

          {/* Notice */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300">
            {direction === 'Given' ? (
              <span>
                <strong>Asset Invariant:</strong> Money lent to a counterparty creates a Loan
                Receivable (asset). It is not an expense.
              </span>
            ) : (
              <span>
                <strong>Liability Invariant:</strong> Money borrowed creates a Loan Payable
                (liability). It is borrowed capital, not income.
              </span>
            )}
          </div>

          {/* Counterparty Name & Contact */}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Counterparty Name" required>
              <Input
                value={counterpartyName}
                onChange={(e) => setCounterpartyName(e.target.value)}
                placeholder="e.g. Amit Sharma, Cousin Rohit"
                required
              />
            </FormField>

            <FormField label="Contact Info (Optional)">
              <Input
                value={counterpartyContact}
                onChange={(e) => setCounterpartyContact(e.target.value)}
                placeholder="Phone or UPI ID"
              />
            </FormField>
          </div>

          {/* Principal Amount (MoneyInput) */}
          <FormField label="Principal Amount" required>
            <MoneyInput
              value={principalAmount}
              onChange={setPrincipalAmount}
              placeholder="0.00"
            />
          </FormField>

          {/* Disbursement Bank Account */}
          <FormField label={direction === 'Given' ? 'Disburse From Account (Optional)' : 'Deposit To Account (Optional)'}>
            <select
              value={disbursementAccountId}
              onChange={(e) => setDisbursementAccountId(e.target.value)}
              disabled={isLoadingAccounts || isSubmitting}
              className="w-full h-10 px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60"
            >
              <option value="">No account mutation (external cash / prior debt)</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.accountType})
                </option>
              ))}
            </select>
          </FormField>

          {/* Due Date & Notes */}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Expected Due Date (Optional)">
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </FormField>

            <FormField label="Notes / Reference">
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Emergency advance"
              />
            </FormField>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Save Loan Obligation
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
