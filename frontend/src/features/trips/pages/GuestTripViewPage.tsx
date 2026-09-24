import React, { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import {
  Palmtree,
  Calendar,
  MapPin,
  Users,
  Receipt,
  Plus,
  HandCoins,
  ShieldCheck,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { MetricCard } from '@/components/layout/MetricCard'
import { TripSummaryMatrix } from '../components/TripSummaryMatrix'
import { SettleUpCard } from '../components/SettleUpCard'
import { AddTripExpenseModal } from '../components/AddTripExpenseModal'
import { useTripHub } from '../hooks/useTripHub'
import { tripsApi } from '../api/tripsApi'
import { useCurrency } from '../../../context/CurrencyContext'
import type { GuestTripView } from '../types'

const formatDate = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export const GuestTripViewPage: React.FC = () => {
  const { formatCurrency } = useCurrency()
  const formatINR = formatCurrency
  const { tripId, token } = useParams<{ tripId: string; token: string }>()

  const [guestView, setGuestView] = useState<GuestTripView | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'summary' | 'expenses' | 'advances' | 'members'>('summary')
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false)

  const loadGuestData = useCallback(async () => {
    if (!tripId || !token) return
    try {
      setIsLoading(true)
      const data = await tripsApi.getGuestTripView(tripId, token)
      setGuestView(data)
      setError(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid or expired guest link.'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [tripId, token])

  useEffect(() => {
    loadGuestData()
  }, [loadGuestData])

  // Real-time synchronization via SignalR
  useTripHub({
    tripId,
    onUpdate: loadGuestData,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <Palmtree className="w-8 h-8 text-indigo-500 animate-bounce mx-auto" />
          <p className="text-xs text-slate-500">Connecting to Trip Workspace...</p>
        </div>
      </div>
    )
  }

  if (error || !guestView) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Guest Access Unavailable
          </h2>
          <p className="text-xs text-slate-500">
            {error || 'This guest link may have expired, been revoked, or is invalid.'}
          </p>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-[11px] text-slate-500 text-left">
            <strong>Security Note:</strong> WealthFlow guest links are 256-bit single-participant
            tokens with time-bounded expirations. Ask your trip organizer to generate a new invite link.
          </div>
        </div>
      </div>
    )
  }

  const { trip, currentMember, members, expenses, advances, summary } = guestView
  const spent = summary.totalGroupSpending

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Standalone Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <Palmtree className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black tracking-wider uppercase text-indigo-600 dark:text-indigo-400">
                WealthFlow
              </span>
              <span className="text-xs text-slate-500 block">Trip Companion</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">Participant</span>
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {currentMember.guestName}
              </span>
            </div>
            <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center">
              {currentMember.guestName.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-5xl mx-auto p-4 sm:p-8 space-y-6">
        {/* Security Isolation Banner */}
        <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 flex items-start gap-2.5 text-xs text-emerald-900 dark:text-emerald-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Cryptographically Isolated Guest View:</span> You are viewing
            this collaborative trip as <strong>{currentMember.guestName}</strong>. You have direct
            access to view balances and record expenses without needing to create an account.
          </div>
        </div>

        {/* Trip Overview Banner */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{trip.name}</h1>
              <Badge variant="emerald" size="sm">
                {trip.status}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                {trip.destination}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-emerald-500" />
                {members.length} participants
              </span>
            </div>
          </div>

          {currentMember.canAddExpenses && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddExpenseOpen(true)}
              className="flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Record Expense</span>
            </Button>
          )}
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            label="Total Group Spending"
            value={formatINR(spent)}
            subtext="Shared expenses"
            icon={<Receipt className="w-5 h-5 text-indigo-500" />}
          />
          <MetricCard
            label="Expenses Recorded"
            value={expenses.length.toString()}
            subtext={`${advances.length} bilateral advances`}
            icon={<Calendar className="w-5 h-5 text-emerald-500" />}
          />
          <MetricCard
            label="Participants"
            value={members.length.toString()}
            subtext="Traveling together"
            icon={<Users className="w-5 h-5 text-blue-500" />}
          />
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200 dark:border-slate-800">
          <nav className="flex space-x-6">
            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              className={`pb-3 text-xs font-bold border-b-2 transition-colors ${
                activeTab === 'summary'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Overview & Balances
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('expenses')}
              className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'expenses'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>Expenses</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {expenses.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('advances')}
              className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'advances'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>Travel Advances</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
                {advances.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('members')}
              className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'members'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>Participants</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {members.length}
              </span>
            </button>
          </nav>
        </div>

        {/* Tab 1: Summary */}
        {activeTab === 'summary' && (
          <div className="space-y-6">
            <TripSummaryMatrix summary={summary} />

            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span>Greedy Debt Simplification</span>
              </h3>
              <SettleUpCard
                instructions={summary.simplifiedRepayments}
                onSettleUp={() => {}}
                readOnly
              />
            </div>
          </div>
        )}

        {/* Tab 2: Expenses */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                All Expenses ({expenses.length})
              </h3>
              {currentMember.canAddExpenses && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsAddExpenseOpen(true)}
                  className="flex items-center gap-1 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Expense</span>
                </Button>
              )}
            </div>

            {expenses.length === 0 ? (
              <Card className="p-8 text-center border-dashed border-2">
                <Receipt className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                  No Expenses Recorded
                </h4>
                <p className="text-xs text-slate-500">
                  Shared expenses will appear here once recorded.
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {expenses.map((expense) => (
                  <Card key={expense.id} className="p-4 border border-slate-200 dark:border-slate-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {expense.description}
                          </span>
                          <Badge variant="slate" size="sm">
                            {expense.splitType} Split
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <span>Paid by <strong>{expense.payerName}</strong></span>
                          <span>•</span>
                          <span>{formatDate(expense.expenseDate)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                          {formatINR(expense.amount)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5">
                      {expense.splits.map((s) => (
                        <span
                          key={s.id}
                          className="px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                        >
                          {s.memberName}: <strong className="text-slate-800 dark:text-slate-200">{formatINR(s.allocatedAmount)}</strong>
                        </span>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Advances */}
        {activeTab === 'advances' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Travel Advances ({advances.length})
            </h3>
            {advances.length === 0 ? (
              <Card className="p-8 text-center border-dashed border-2">
                <HandCoins className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                  No Advances Recorded
                </h4>
                <p className="text-xs text-slate-500">
                  Pre-trip advances will be listed here.
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {advances.map((adv) => (
                  <Card
                    key={adv.id}
                    className="p-4 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <div className="text-xs text-slate-900 dark:text-slate-100 font-semibold">
                        <span>{adv.giverName}</span>
                        <span className="text-slate-400 mx-2">→</span>
                        <span>{adv.receiverName}</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {formatDate(adv.advanceDate)}
                        {adv.notes && ` • "${adv.notes}"`}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                      {formatINR(adv.amount)}
                    </span>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Members */}
        {activeTab === 'members' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              All Participants ({members.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {members.map((m) => (
                <Card
                  key={m.id}
                  className={`p-4 border ${
                    m.id === currentMember.id
                      ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50/20 dark:bg-indigo-950/20'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <span>{m.guestName}</span>
                        {m.id === currentMember.id && (
                          <Badge variant="indigo" size="sm">
                            You
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Joined {formatDate(m.createdAtUtc)}
                      </span>
                    </div>
                    <Badge variant={m.canAddExpenses ? 'emerald' : 'slate'} size="sm">
                      {m.canAddExpenses ? 'Can Add Expenses' : 'View Only'}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Guest Add Expense Modal */}
      {tripId && (
        <AddTripExpenseModal
          isOpen={isAddExpenseOpen}
          tripId={tripId}
          members={members}
          initialPayerId={currentMember.id}
          guestToken={token}
          onClose={() => setIsAddExpenseOpen(false)}
          onSuccess={loadGuestData}
        />
      )}
    </div>
  )
}
