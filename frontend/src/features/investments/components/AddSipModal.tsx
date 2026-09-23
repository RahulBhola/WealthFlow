import React, { useState, useEffect } from 'react'
import { X, Calendar, Users, AlertCircle, ShieldCheck } from 'lucide-react'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { accountsApi } from '@/features/accounts/api/accountsApi'
import { investmentsApi } from '../api/investmentsApi'
import type { Investment, CreateSipPayload } from '../types'
import type { Account } from '@/features/accounts/types'

export interface AddSipModalProps {
  investments: Investment[]
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

export const AddSipModal: React.FC<AddSipModalProps> = ({
  investments,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('')
  const [investmentId, setInvestmentId] = useState('')
  const [sourceAccountId, setSourceAccountId] = useState('')
  const [amount, setAmount] = useState('15000')
  const [executionDay, setExecutionDay] = useState('5')
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState('')

  // Joint SIP controls
  const [isJoint, setIsJoint] = useState(false)
  const [coInvestorName, setCoInvestorName] = useState('')
  const [splitRatio, setSplitRatio] = useState(50) // User percentage, default 50%

  const [accounts, setAccounts] = useState<Account[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    let ignore = false
    async function loadAccounts() {
      try {
        const accList = await accountsApi.getAccounts(false)
        if (!ignore) {
          setAccounts(accList)
          // Default to first bank account
          const bank = accList.find((a) => a.accountType === 'Bank') || accList[0]
          if (bank) {
            setSourceAccountId(bank.id)
          }
        }
      } catch (err) {
        console.error('Failed to load accounts for SIP:', err)
      }
    }

    loadAccounts()

    if (investments.length > 0 && !investmentId) {
      setInvestmentId(investments[0].id)
      setName(`${investments[0].name} Monthly SIP`)
    }

    return () => {
      ignore = true
    }
  }, [isOpen, investments])

  if (!isOpen) return null

  const numericAmount = parseFloat(amount) || 0
  const userShare = Math.round((numericAmount * splitRatio) / 100 * 100) / 100
  const coInvestorShare = Math.round((numericAmount - userShare) * 100) / 100

  const handleInvestmentChange = (id: string) => {
    setInvestmentId(id)
    const selected = investments.find((i) => i.id === id)
    if (selected && !name) {
      setName(`${selected.name} Monthly SIP`)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError('Please provide a name for this SIP.')
      return
    }

    if (!investmentId) {
      setError('Please select an investment asset.')
      return
    }

    if (!sourceAccountId) {
      setError('Please select a source bank account.')
      return
    }

    if (numericAmount <= 0) {
      setError('Please enter a valid monthly SIP amount.')
      return
    }

    const day = parseInt(executionDay, 10)
    if (isNaN(day) || day < 1 || day > 28) {
      setError('Execution day must be between 1 and 28.')
      return
    }

    if (isJoint && !coInvestorName.trim()) {
      setError('Please provide the partner or co-investor name.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const payload: CreateSipPayload = {
        name: name.trim(),
        investmentId,
        sourceAccountId,
        amount: numericAmount,
        executionDay: day,
        startDate: new Date(startDate).toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : null,
        isJoint,
        userShare: isJoint ? userShare : numericAmount,
        coInvestorShare: isJoint ? coInvestorShare : 0,
        coInvestorName: isJoint ? coInvestorName.trim() : null,
      }

      await investmentsApi.createSip(payload)
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to schedule SIP.'
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Configure Systematic Investment Plan (SIP)
              </h2>
              <p className="text-xs text-slate-500">Automate personal or joint monthly investments</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <FormField label="SIP Plan Name" required>
            <Input
              type="text"
              placeholder="e.g. Monthly PPFAS Flexi Cap"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Investment Asset" required>
              <select
                value={investmentId}
                onChange={(e) => handleInvestmentChange(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="" disabled>
                  Select Asset
                </option>
                {investments.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.name} ({inv.assetClass})
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Debiting Bank Account" required>
              <select
                value={sourceAccountId}
                onChange={(e) => setSourceAccountId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Total Monthly Amount (₹)" required>
              <Input
                type="number"
                step="0.01"
                placeholder="15000.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </FormField>

            <FormField label="Execution Day (1–28)" required>
              <Input
                type="number"
                min="1"
                max="28"
                placeholder="5"
                value={executionDay}
                onChange={(e) => setExecutionDay(e.target.value)}
                required
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Start Date" required>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </FormField>

            <FormField label="End Date (Optional)">
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </FormField>
          </div>

          {/* Joint SIP Section */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="joint-sip-toggle"
                className="flex items-center gap-2 cursor-pointer select-none"
              >
                <input
                  id="joint-sip-toggle"
                  type="checkbox"
                  checked={isJoint}
                  onChange={(e) => setIsJoint(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-500" />
                  Is Joint / Shared SIP (Co-funded with partner)
                </span>
              </label>
            </div>

            {isJoint && (
              <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/60 space-y-4 animate-fadeIn">
                <FormField label="Partner / Co-Investor Name" required>
                  <Input
                    type="text"
                    placeholder="e.g. Rahul (Brother)"
                    value={coInvestorName}
                    onChange={(e) => setCoInvestorName(e.target.value)}
                    required={isJoint}
                  />
                </FormField>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-indigo-700 dark:text-indigo-300">
                      Your Share: {splitRatio}% ({formatINR(userShare)})
                    </span>
                    <span className="text-sky-700 dark:text-sky-300">
                      {coInvestorName || 'Partner'}: {100 - splitRatio}% ({formatINR(coInvestorShare)})
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    step="5"
                    value={splitRatio}
                    onChange={(e) => setSplitRatio(parseInt(e.target.value, 10))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>

                {/* Accounting Rule Callout */}
                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-indigo-200 dark:border-indigo-900/80 text-xs space-y-1">
                  <div className="font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" />
                    Double-Entry Accounting Invariant
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    Upon execution: <span className="font-mono font-medium text-slate-900 dark:text-white">-{formatINR(numericAmount)}</span> debited from your bank. <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">+{formatINR(userShare)}</span> credited to your portfolio equity, and <span className="font-mono font-medium text-indigo-600 dark:text-indigo-400">+{formatINR(coInvestorShare)}</span> booked as an active <strong>Loan Receivable</strong> asset from {coInvestorName || 'Partner'}. Your net worth remains 100% distortion-free.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Scheduling SIP...' : 'Setup SIP Schedule'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
