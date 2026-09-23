import React, { useState, useEffect } from 'react'
import { X, Gift as GiftIcon, ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { MoneyInput } from '@/features/transactions/components/MoneyInput'
import { accountsApi } from '@/features/accounts/api/accountsApi'
import { loansApi } from '../api/loansApi'
import type { CreateGiftPayload } from '../types'
import type { Account } from '@/features/accounts/types'

export interface RecordGiftModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const COMMON_OCCASIONS = [
  'Birthday',
  'Wedding Blessing',
  'Diwali Shagun',
  'Housewarming',
  'Festival',
  'Token of Gratitude',
]

export const RecordGiftModal: React.FC<RecordGiftModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [direction, setDirection] = useState<'Given' | 'Received'>('Given')
  const [recipientOrGiver, setRecipientOrGiver] = useState('')
  const [occasion, setOccasion] = useState('Birthday')
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
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
          if (accList.length > 0) {
            setAccountId(accList[0].id)
          }
        }
      } catch (err) {
        console.error('Failed to load accounts for gift:', err)
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
    const numericAmount = parseFloat(amount)

    if (!recipientOrGiver.trim()) {
      setError('Please enter the name of the recipient or giver.')
      return
    }

    if (!occasion.trim()) {
      setError('Please enter the occasion.')
      return
    }

    if (!numericAmount || numericAmount <= 0) {
      setError('Please enter a valid gift amount greater than zero.')
      return
    }

    if (!accountId) {
      setError('Please select an account.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const payload: CreateGiftPayload = {
        direction,
        recipientOrGiver: recipientOrGiver.trim(),
        occasion: occasion.trim(),
        amount: numericAmount,
        accountId,
        date: new Date(date).toISOString(),
        notes: notes.trim() || undefined,
      }

      await loansApi.createGift(payload)
      onSuccess()
      onClose()
      // Reset
      setRecipientOrGiver('')
      setAmount('')
      setNotes('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record gift.'
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-pink-50 dark:bg-pink-950/50 text-pink-600 dark:text-pink-400">
                <GiftIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Record Gift
                </h2>
                <p className="text-xs text-slate-500">Pure one-way gifts (zero debt liabilities)</p>
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
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              Gift Given (Outflow)
            </button>

            <button
              type="button"
              onClick={() => setDirection('Received')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
                direction === 'Received'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Gift Received (Inflow)
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400 font-medium">
              {error}
            </div>
          )}

          {/* Recipient / Giver */}
          <FormField label={direction === 'Given' ? 'Recipient Name' : 'Giver Name'} required>
            <Input
              value={recipientOrGiver}
              onChange={(e) => setRecipientOrGiver(e.target.value)}
              placeholder="e.g. Sister, Best Friend Rohan"
              required
            />
          </FormField>

          {/* Occasion */}
          <FormField label="Occasion" required>
            <Input
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              placeholder="e.g. Birthday, Wedding"
              required
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {COMMON_OCCASIONS.map((occ) => (
                <button
                  key={occ}
                  type="button"
                  onClick={() => setOccasion(occ)}
                  className="px-2 py-0.5 text-[11px] rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  {occ}
                </button>
              ))}
            </div>
          </FormField>

          {/* Amount (MoneyInput) */}
          <FormField label="Gift Amount" required>
            <MoneyInput
              value={amount}
              onChange={setAmount}
              placeholder="0.00"
            />
          </FormField>

          {/* Account Selector */}
          <FormField label={direction === 'Given' ? 'Deduct From Account' : 'Deposit Into Account'} required>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              disabled={isLoadingAccounts || isSubmitting}
              className="w-full h-10 px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.accountType})
                </option>
              ))}
            </select>
          </FormField>

          {/* Date & Notes */}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Date" required>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </FormField>

            <FormField label="Notes (Optional)">
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Shagun envelope"
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
              className={direction === 'Given' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}
            >
              Save Gift Record
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
