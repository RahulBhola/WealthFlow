import React, { useState } from 'react'
import { X, ShieldAlert } from 'lucide-react'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { Account, AccountType, CreateAccountPayload, UpdateAccountPayload } from '../types'

export interface AccountModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateAccountPayload | UpdateAccountPayload) => Promise<void>
  initialData?: Account | null
  isLoading?: boolean
}

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Rose
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
]

const ACCOUNT_TYPES: AccountType[] = ['Bank', 'Cash', 'Wallet', 'Savings', 'CreditCard', 'Other']

interface AccountFormProps {
  onClose: () => void
  onSubmit: (data: CreateAccountPayload | UpdateAccountPayload) => Promise<void>
  initialData?: Account | null
  isLoading?: boolean
}

const AccountForm: React.FC<AccountFormProps> = ({
  onClose,
  onSubmit,
  initialData,
  isLoading = false,
}) => {
  const isEdit = Boolean(initialData)

  const [name, setName] = useState(initialData?.name || '')
  const [accountType, setAccountType] = useState<AccountType>(initialData?.accountType || 'Bank')
  const [openingBalance, setOpeningBalance] = useState(
    initialData ? initialData.openingBalance.toString() : '0'
  )
  const [accountNumberMask, setAccountNumberMask] = useState(
    initialData?.accountNumberMask ? initialData.accountNumberMask.replace(/\D/g, '') : ''
  )
  const [colorTag, setColorTag] = useState(initialData?.colorTag || PRESET_COLORS[1])
  const [currency, setCurrency] = useState(initialData?.currency || 'INR')
  const [sortOrder, setSortOrder] = useState(initialData ? initialData.sortOrder.toString() : '0')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Account name is required.')
      return
    }

    try {
      setError(null)
      const payload: CreateAccountPayload | UpdateAccountPayload = {
        name: name.trim(),
        accountType,
        openingBalance: parseFloat(openingBalance) || 0,
        accountNumberMask: accountNumberMask.trim() || undefined,
        colorTag,
        currency: currency.trim() || 'INR',
        sortOrder: parseInt(sortOrder, 10) || 0,
      }
      await onSubmit(payload)
      onClose()
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unexpected error occurred.')
      }
    }
  }

  return (
    <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {isEdit ? 'Edit Account' : 'Add Financial Account'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isEdit
              ? 'Update depository details and display preferences'
              : 'Configure a new bank account, cash vault, or digital wallet'}
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
      <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400 font-medium">
            {error}
          </div>
        )}

        {/* Zero-Trust Banking Invariant Notice */}
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-200">
          <ShieldAlert className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Zero-Trust Banking Boundary:</span> WealthFlow is an
            internal bookkeeping ledger. Never enter banking passwords, OTPs, CVVs, or full account
            numbers.
          </div>
        </div>

        <FormField label="Account Name" required>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. HDFC Salary, SBI Personal, Cash Vault"
            required
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Account Type" required>
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value as AccountType)}
              className="w-full h-10 px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              {ACCOUNT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Opening Balance"
            helperText={isEdit ? 'Opening balance is locked' : 'Initial balance at creation'}
          >
            <Input
              type="number"
              step="0.01"
              disabled={isEdit}
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              placeholder="0.00"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Account Mask (Last 4 Digits)"
            helperText="Only up to 4 digits for display reference"
          >
            <Input
              value={accountNumberMask}
              maxLength={4}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 4)
                setAccountNumberMask(val)
              }}
              placeholder="e.g. 4821"
            />
          </FormField>

          <FormField label="Currency Code">
            <Input
              value={currency}
              maxLength={3}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              placeholder="INR"
            />
          </FormField>
        </div>

        <FormField label="Display Order" helperText="Lower numbers appear first">
          <Input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            placeholder="0"
          />
        </FormField>

        {/* Color Tag Selection */}
        <FormField label="Accent Color">
          <div className="flex items-center gap-2 pt-1">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setColorTag(color)}
                className={`w-7 h-7 rounded-full transition-transform ${
                  colorTag === color
                    ? 'scale-125 ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-slate-900'
                    : 'hover:scale-110'
                }`}
                style={{ backgroundColor: color }}
                aria-label={`Select color ${color}`}
              />
            ))}
          </div>
        </FormField>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            {isEdit ? 'Save Changes' : 'Create Account'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading = false,
}) => {
  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <AccountForm
        key={initialData?.id ?? 'create-new-account'}
        onClose={onClose}
        onSubmit={onSubmit}
        initialData={initialData}
        isLoading={isLoading}
      />
    </div>
  )
}
