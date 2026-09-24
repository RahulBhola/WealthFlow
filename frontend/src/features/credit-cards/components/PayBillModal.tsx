import React, { useState, useEffect } from 'react'
import { X, ShieldAlert, CheckCircle2 } from 'lucide-react'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { MoneyInput } from '@/features/transactions/components/MoneyInput'
import { accountsApi } from '@/features/accounts/api/accountsApi'
import { creditCardsApi } from '../api/creditCardsApi'
import type { CreditCard, PayCreditCardBillPayload } from '../types'
import type { Account } from '@/features/accounts/types'

export interface PayBillModalProps {
  card: CreditCard | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

import { useCurrency } from '../../../context/CurrencyContext'

export const PayBillModal: React.FC<PayBillModalProps> = ({
  card,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { formatCurrency } = useCurrency()
  const formatINR = formatCurrency
  const [amount, setAmount] = useState('')
  const [sourceAccountId, setSourceAccountId] = useState('')
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')

  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !card) return
    const targetCard = card

    let ignore = false
    async function loadAccounts() {
      setIsLoadingAccounts(true)
      try {
        const accList = await accountsApi.getAccounts(false)
        if (!ignore) {
          setAccounts(accList)
          setAmount(targetCard.currentBalance > 0 ? targetCard.currentBalance.toString() : '')
          setError(null)
          // Default to first bank account
          const bank = accList.find((a) => a.accountType === 'Bank') || accList[0]
          if (bank) {
            setSourceAccountId(bank.id)
          }
        }
      } catch (err) {
        console.error('Failed to load accounts for bill payment:', err)
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
  }, [isOpen, card])

  if (!isOpen || !card) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const numericAmount = parseFloat(amount)

    if (!numericAmount || numericAmount <= 0) {
      setError('Please enter a valid payment amount greater than zero.')
      return
    }

    if (!sourceAccountId) {
      setError('Please select a source bank account.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const payload: PayCreditCardBillPayload = {
        sourceAccountId,
        amount: numericAmount,
        paymentDate: new Date(paymentDate).toISOString(),
        notes: notes.trim() || undefined,
      }

      await creditCardsApi.payBill(card.id, payload)
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record bill payment.'
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
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Pay Credit Card Bill
            </h2>
            <p className="text-xs text-slate-500">
              {card.cardName} ({card.bankName} •••• {card.last4Digits})
            </p>
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

          {/* Zero-Expense Debt Reduction Notice */}
          <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-indigo-900 dark:text-indigo-200 leading-relaxed">
              <strong className="font-semibold">Debt Reduction Invariant:</strong> Paying your credit
              card bill decreases bank balance and settles card liability. It is strictly a debt
              reduction, <strong>NEVER</strong> an expense.
            </div>
          </div>

          {/* Amount Input */}
          <FormField label="Payment Amount" required>
            <MoneyInput
              value={amount}
              onChange={setAmount}
              autoFocus
              placeholder="0.00"
            />
            {card.currentBalance > 0 && (
              <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                <span>Total Due: {formatINR(card.currentBalance)}</span>
                <button
                  type="button"
                  onClick={() => setAmount(card.currentBalance.toString())}
                  className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Pay Full Outstanding
                </button>
              </div>
            )}
          </FormField>

          {/* Source Bank Account Selector */}
          <FormField label="Debit From Account" required>
            <select
              value={sourceAccountId}
              onChange={(e) => setSourceAccountId(e.target.value)}
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

          {/* Payment Date & Notes */}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Payment Date" required>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </FormField>

            <FormField label="Notes (Optional)">
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Bill ref #88219"
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
              Confirm Settlement
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
