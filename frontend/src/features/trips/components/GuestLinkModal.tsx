import React, { useState, useEffect } from 'react'
import { X, Link2, Copy, Check, ShieldCheck, AlertCircle, Trash2 } from 'lucide-react'
import { FormField } from '@/components/ui/FormField'
import { Button } from '@/components/ui/Button'
import { tripsApi } from '../api/tripsApi'
import type { TripMember, CreateGuestLinkResponse } from '../types'

export interface GuestLinkModalProps {
  isOpen: boolean
  tripId: string
  member: TripMember | null
  onClose: () => void
  onSuccess: () => void
}

export const GuestLinkModal: React.FC<GuestLinkModalProps> = ({
  isOpen,
  tripId,
  member,
  onClose,
  onSuccess,
}) => {
  const [canAddExpenses, setCanAddExpenses] = useState(member?.canAddExpenses ?? true)
  const [expiryDays, setExpiryDays] = useState('30')
  const [createdLink, setCreatedLink] = useState<CreateGuestLinkResponse | null>(null)
  const [copied, setCopied] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (member) {
      setCanAddExpenses(member.canAddExpenses)
      setCreatedLink(null)
      setError(null)
    }
  }, [member])

  if (!isOpen || !member) return null

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const res = await tripsApi.createGuestLink(tripId, member.id, {
        canAddExpenses,
        expiryDays: parseInt(expiryDays, 10) || 30,
      })

      // Construct browser URL using current window location origin
      const fullUrl = `${window.location.origin}/trip/${tripId}/guest/${res.rawToken}`
      setCreatedLink({
        ...res,
        guestUrl: fullUrl,
      })
      onSuccess()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate guest link.'
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRevoke = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      await tripsApi.revokeGuestLink(tripId, member.id)
      setCreatedLink(null)
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to revoke guest link.'
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopy = () => {
    if (createdLink) {
      navigator.clipboard.writeText(createdLink.guestUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Guest Invite Link: {member.guestName}
              </h2>
              <p className="text-xs text-slate-500">
                Cryptographically isolated access for friends & companions
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

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Security Banner */}
          <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 flex items-start gap-2.5 text-xs text-indigo-900 dark:text-indigo-200">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Zero-Access Isolation:</span> Guest tokens grant access
              exclusively to this specific trip. Guests cannot view your personal bank accounts,
              account balances, transactions, budgets, or any other trips.
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center justify-between gap-2 text-xs text-rose-700 dark:text-rose-400">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
              {(error.includes('expired') || error.includes('401')) && (
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = `/login?from=${encodeURIComponent(window.location.pathname)}`
                  }}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-semibold shrink-0 cursor-pointer"
                >
                  Log In
                </button>
              )}
            </div>
          )}

          {createdLink ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Shareable Cryptographic URL:
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={createdLink.guestUrl}
                    className="w-full text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-300 select-all"
                  />
                  <Button
                    type="button"
                    variant={copied ? 'primary' : 'outline'}
                    size="sm"
                    onClick={handleCopy}
                    className="shrink-0 flex items-center gap-1"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </Button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Expires:{' '}
                  {new Date(createdLink.expiresAtUtc).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRevoke}
                  disabled={isSubmitting}
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Revoke Link</span>
                </Button>
                <Button type="button" variant="primary" onClick={onClose}>
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                    Allow Adding Expenses
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Guest can record expenses on this trip
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={canAddExpenses}
                  onChange={(e) => setCanAddExpenses(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
              </div>

              <FormField label="Link Expiry (Days)">
                <select
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="7">7 Days</option>
                  <option value="14">14 Days</option>
                  <option value="30">30 Days</option>
                  <option value="90">90 Days</option>
                </select>
              </FormField>

              {member.hasActiveGuestToken && (
                <div className="text-xs text-amber-600 dark:text-amber-400">
                  Note: An active link already exists. Generating a new link will rotate the token.
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                {member.hasActiveGuestToken ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRevoke}
                    disabled={isSubmitting}
                    className="text-rose-600"
                  >
                    Revoke Existing
                  </Button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Generating...' : 'Generate Secure Link'}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
