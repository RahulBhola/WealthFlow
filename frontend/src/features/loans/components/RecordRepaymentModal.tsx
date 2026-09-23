import React, { useState, useEffect } from 'react'
import { X, CheckCircle2, HandCoins } from 'lucide-react'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { MoneyInput } from '@/features/transactions/components/MoneyInput'
import { accountsApi } from '@/features/accounts/api/accountsApi'
import { loansApi } from '../api/loansApi'
import type { Loan, RecordRepaymentPayload } from '../types'
import type { Account } from '@/features/accounts/types'

export interface RecordRepaymentModalProps {
  loan: Loan | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const formatINR = (val: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val)
}

export const RecordRepaymentModal: React.FC<RecordRepaymentModalProps> = ({
  loan,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState('')
  const [repaymentDate, setRepaymentDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')

  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !loan) return
    const targetLoan = loan

    let ignore = false
    async function loadAccounts() {
      setIsLoadingAccounts(true)
      try {
        const accList = await accountsApi.getAccounts(false)
        if (!ignore) {
          setAccounts(accList)
          setAmount(targetLoan.outstandingBalance > 0 ? targetLoan.outstandingBalance.toString() : '')
          setError(null)
          if (accList.length > 0) {
            setAccountId(accList[0].id)
          }
        }
      } catch (err) {
        console.error('Failed to load accounts for repayment:', err)
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
  }, [isOpen, loan])

  if (!isOpen || !loan) return null

  const isLent = loan.direction === 'Given'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const numericAmount = parseFloat(amount)

    if (!numericAmount || numericAmount <= 0) {
      setError('Please enter a valid repayment amount greater than zero.')
      return
    }

    if (!accountId) {
      setError('Please select an account.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const payload: RecordRepaymentPayload = {
        accountId,
        amount: numericAmount,
        repaymentDate: new Date(repaymentDate).toISOString(),
        notes: notes.trim() || undefined,
      }

      await loansApi.recordRepayment(loan.id, payload)
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record repayment.'
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <HandCoins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {isLent ? 'Receive Repayment' : 'Make Repayment'}
              </h2>
              <p className="text-xs text-slate-500">
                {loan.counterpartyName} • Balance: {formatINR(loan.outstandingBalance)}
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
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400 font-medium">
              {error}
            </div>
          )}

          {/* Ledger Rule Alert */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300">
            {isLent ? (
              <span>
                <strong>Asset Settlement:</strong> Money received from {loan.counterpartyName} will
                increase your account balance and decrease the loan receivable.
              </span>
            ) : (
              <span>
                <strong>Liability Settlement:</strong> Money paid to {loan.counterpartyName} will
                decrease your account balance and reduce your loan payable.
              </span>
            )}
          </div>

          {/* Amount Input */}
          <FormField label="Repayment Amount" required>
            <MoneyInput
              value={amount}
              onChange={setAmount}
              autoFocus
              placeholder="0.00"
            />
            {loan.outstandingBalance > 0 && (
              <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                <span>Remaining: {formatINR(loan.outstandingBalance)}</span>
                <button
                  type="button"
                  onClick={() => setAmount(loan.outstandingBalance.toString())}
                  className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Settle Full Balance
                </button>
              </div>
            )}
          </FormField>

          {/* Account Selector */}
          <FormField label={isLent ? 'Deposit Into Account' : 'Pay From Account'} required>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              disabled={isLoadingAccounts || isSubmitting}
              className="w-full h-10 px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({formatINR(acc.currentBalance)})
                </option>
              ))}
            </select>
          </FormField>

          {/* Date & Notes */}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Repayment Date" required>
              <Input
                type="date"
                value={repaymentDate}
                onChange={(e) => setRepaymentDate(e.target.value)}
                required
              />
            </FormField>

            <FormField label="Notes (Optional)">
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. UPI Ref #489201"
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
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Confirm Repayment
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
