import React, { useState, useEffect } from 'react'
import { X, HandCoins, AlertCircle, Scale, ShieldCheck } from 'lucide-react'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { accountsApi } from '@/features/accounts/api/accountsApi'
import { investmentsApi } from '../api/investmentsApi'
import type { JointSipReconciliation, SipRepaymentPayload } from '../types'
import type { Account } from '@/features/accounts/types'

export interface RecordSipRepaymentModalProps {
  reconciliation: JointSipReconciliation | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

import { useCurrency } from '../../../context/CurrencyContext'

const getMonthName = (month: number): string => {
  const date = new Date(2000, month - 1, 1)
  return date.toLocaleString('en-US', { month: 'short' })
}

export const RecordSipRepaymentModal: React.FC<RecordSipRepaymentModalProps> = ({
  reconciliation,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { formatCurrency } = useCurrency()
  const formatINR = formatCurrency
  const [amount, setAmount] = useState('')
  const [destinationAccountId, setDestinationAccountId] = useState('')
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [paymentMode, setPaymentMode] = useState('UPI')
  const [isMutualDebtOffset, setIsMutualDebtOffset] = useState(false)
  const [offsetNotes, setOffsetNotes] = useState('')
  const [notes, setNotes] = useState('')

  const [accounts, setAccounts] = useState<Account[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !reconciliation) return

    setAmount(reconciliation.remainingDue.toString())
    setPaymentDate(new Date().toISOString().slice(0, 10))
    setIsMutualDebtOffset(false)
    setOffsetNotes('')
    setNotes('')
    setError(null)

    let ignore = false
    async function loadAccounts() {
      try {
        const accList = await accountsApi.getAccounts(false)
        if (!ignore) {
          setAccounts(accList)
          const bank = accList.find((a) => a.accountType === 'Bank') || accList[0]
          if (bank) {
            setDestinationAccountId(bank.id)
          }
        }
      } catch (err) {
        console.error('Failed to load accounts:', err)
      }
    }

    loadAccounts()
    return () => {
      ignore = true
    }
  }, [isOpen, reconciliation])

  if (!isOpen || !reconciliation) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid repayment amount greater than zero.')
      return
    }

    if (numAmount > reconciliation.remainingDue) {
      setError(`Repayment cannot exceed the remaining due amount of ${formatINR(reconciliation.remainingDue)}.`)
      return
    }

    if (!isMutualDebtOffset && !destinationAccountId) {
      setError('Please select a destination bank account to receive the funds.')
      return
    }

    if (isMutualDebtOffset && !offsetNotes.trim()) {
      setError('Please provide an offset reason or description.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const payload: SipRepaymentPayload = {
        destinationAccountId: isMutualDebtOffset ? null : destinationAccountId,
        amount: numAmount,
        paymentDate: new Date(paymentDate).toISOString(),
        paymentMode: isMutualDebtOffset ? 'MutualDebtOffset' : paymentMode,
        isMutualDebtOffset,
        offsetNotes: isMutualDebtOffset ? offsetNotes.trim() : null,
        notes: notes.trim() || null,
      }

      await investmentsApi.repayReconciliation(reconciliation.id, payload)
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
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <HandCoins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Record Partner Repayment
              </h2>
              <p className="text-xs text-slate-500">
                {reconciliation.sipName} • {getMonthName(reconciliation.month)} {reconciliation.year}
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

          {/* Cycle Due Breakdown */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 text-center">
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Partner Share</span>
              <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                {formatINR(reconciliation.coInvestorShare)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Settled</span>
              <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {formatINR(reconciliation.amountSettled)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Remaining Due</span>
              <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400">
                {formatINR(reconciliation.remainingDue)}
              </span>
            </div>
          </div>

          <FormField label="Repayment Amount (₹)" required>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Payment Date" required>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </FormField>

            {!isMutualDebtOffset && (
              <FormField label="Payment Mode">
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer (IMPS/NEFT)</option>
                  <option value="Cash">Cash</option>
                  <option value="Other">Other</option>
                </select>
              </FormField>
            )}
          </div>

          {/* Mutual Bilateral Debt Offset Option */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <label
              htmlFor="debt-offset-toggle"
              className="flex items-center gap-2 cursor-pointer select-none"
            >
              <input
                id="debt-offset-toggle"
                type="checkbox"
                checked={isMutualDebtOffset}
                onChange={(e) => setIsMutualDebtOffset(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
              />
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-emerald-500" />
                Mutual Bilateral Debt Offset (No cash inflow)
              </span>
            </label>

            {isMutualDebtOffset ? (
              <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-900/60 space-y-3 animate-fadeIn">
                <FormField label="Offset Reason / Transaction Reference" required>
                  <Input
                    type="text"
                    placeholder="e.g. Offset against partner's contribution to flight tickets"
                    value={offsetNotes}
                    onChange={(e) => setOffsetNotes(e.target.value)}
                    required={isMutualDebtOffset}
                  />
                </FormField>
                <div className="text-[11px] text-emerald-800 dark:text-emerald-300 flex items-start gap-1.5">
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    No funds will be deposited into your bank account. The joint SIP cycle will be marked settled and partner's loan receivable is reduced accordingly.
                  </span>
                </div>
              </div>
            ) : (
              <FormField label="Destination Bank Account (To Receive Funds)" required>
                <select
                  value={destinationAccountId}
                  onChange={(e) => setDestinationAccountId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required={!isMutualDebtOffset}
                >
                  <option value="" disabled>
                    Select Bank Account
                  </option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatINR(acc.currentBalance)})
                    </option>
                  ))}
                </select>
              </FormField>
            )}
          </div>

          <FormField label="Notes (Optional)">
            <Input
              type="text"
              placeholder="e.g. GPay reference / UPI UTR number"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </FormField>

          {/* Action Footer */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Recording...' : 'Confirm Repayment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
