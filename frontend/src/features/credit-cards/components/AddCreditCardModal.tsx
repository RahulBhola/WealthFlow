import React, { useState } from 'react'
import { X, CreditCard, ShieldCheck } from 'lucide-react'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { MoneyInput } from '@/features/transactions/components/MoneyInput'
import { creditCardsApi } from '../api/creditCardsApi'
import type { CreateCreditCardPayload } from '../types'

export interface AddCreditCardModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const CARD_THEMES = [
  { name: 'Midnight Slate', value: '#1E293B' },
  { name: 'Royal Indigo', value: '#3730A3' },
  { name: 'Emerald Velvet', value: '#065F46' },
  { name: 'Crimson Wine', value: '#881337' },
  { name: 'Obsidian Black', value: '#09090B' },
]

export const AddCreditCardModal: React.FC<AddCreditCardModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [bankName, setBankName] = useState('')
  const [cardName, setCardName] = useState('')
  const [creditLimit, setCreditLimit] = useState('')
  const [last4Digits, setLast4Digits] = useState('')
  const [billingCycleDay, setBillingCycleDay] = useState('15')
  const [dueDay, setDueDay] = useState('5')
  const [colorTag, setColorTag] = useState('#1E293B')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const numericLimit = parseFloat(creditLimit)

    if (!bankName.trim()) {
      setError('Please enter the bank or issuer name.')
      return
    }

    if (!cardName.trim()) {
      setError('Please enter the card name.')
      return
    }

    if (!numericLimit || numericLimit <= 0) {
      setError('Please enter a valid credit limit greater than zero.')
      return
    }

    const bDay = parseInt(billingCycleDay, 10)
    const dDay = parseInt(dueDay, 10)
    if (isNaN(bDay) || bDay < 1 || bDay > 31) {
      setError('Billing cycle day must be between 1 and 31.')
      return
    }

    if (isNaN(dDay) || dDay < 1 || dDay > 31) {
      setError('Payment due day must be between 1 and 31.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const payload: CreateCreditCardPayload = {
        bankName: bankName.trim(),
        cardName: cardName.trim(),
        creditLimit: numericLimit,
        billingCycleDay: bDay,
        dueDay: dDay,
        last4Digits: last4Digits.trim(),
        colorTag,
      }

      await creditCardsApi.createCreditCard(payload)
      onSuccess()
      onClose()
      // Reset
      setBankName('')
      setCardName('')
      setCreditLimit('')
      setLast4Digits('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add credit card.'
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
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Add Credit Card
              </h2>
              <p className="text-xs text-slate-500">Track liabilities, limits, and billing dates</p>
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

          {/* Zero-Trust Notice */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              Zero-Trust Boundary: Only last 4 digits are stored for visual card identification.
            </span>
          </div>

          {/* Bank & Card Name */}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Bank / Issuer" required>
              <Input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. HDFC Bank, ICICI"
                required
              />
            </FormField>

            <FormField label="Card Name" required>
              <Input
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="e.g. Regalia Gold, Magnus"
                required
              />
            </FormField>
          </div>

          {/* Credit Limit (MoneyInput) */}
          <FormField label="Credit Limit" required>
            <MoneyInput
              value={creditLimit}
              onChange={setCreditLimit}
              placeholder="0.00"
            />
          </FormField>

          {/* Last 4 Digits & Billing Days */}
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Last 4 Digits">
              <Input
                maxLength={4}
                value={last4Digits}
                onChange={(e) => setLast4Digits(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 4821"
                className="font-mono text-center tracking-widest"
              />
            </FormField>

            <FormField label="Statement Day" required>
              <Input
                type="number"
                min={1}
                max={31}
                value={billingCycleDay}
                onChange={(e) => setBillingCycleDay(e.target.value)}
                required
              />
            </FormField>

            <FormField label="Due Day" required>
              <Input
                type="number"
                min={1}
                max={31}
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                required
              />
            </FormField>
          </div>

          {/* Card Surface Theme Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Card Surface Theme
            </label>
            <div className="flex items-center gap-3">
              {CARD_THEMES.map((theme) => (
                <button
                  key={theme.name}
                  type="button"
                  onClick={() => setColorTag(theme.value)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    colorTag === theme.value
                      ? 'border-indigo-600 scale-110 shadow-md ring-2 ring-indigo-500/20'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: theme.value }}
                  title={theme.name}
                />
              ))}
            </div>
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
              Save Credit Card
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
