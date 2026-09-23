import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Plus,
  Receipt,
  HandCoins,
  CheckCircle2,
  Sparkles,
  Link2,
} from 'lucide-react'
import { MetricCard } from '@/components/layout/MetricCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { TripSummaryMatrix } from '../components/TripSummaryMatrix'
import { SettleUpCard } from '../components/SettleUpCard'
import { AddTripExpenseModal } from '../components/AddTripExpenseModal'
import { AddTripAdvanceModal } from '../components/AddTripAdvanceModal'
import { AddTripMemberModal } from '../components/AddTripMemberModal'
import { GuestLinkModal } from '../components/GuestLinkModal'
import { SettleUpModal } from '../components/SettleUpModal'
import { useTripHub } from '../hooks/useTripHub'
import { tripsApi } from '../api/tripsApi'
import type { TripDetail, TripMember, SettlementInstruction } from '../types'

const formatINR = (val: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val)
}

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

type TabType = 'summary' | 'expenses' | 'advances' | 'members' | 'settlements'

export const TripWorkspacePage: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<TabType>('summary')
  const [detail, setDetail] = useState<TripDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Modals state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false)
  const [isAddAdvanceOpen, setIsAddAdvanceOpen] = useState(false)
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false)
  const [selectedMemberForGuestLink, setSelectedMemberForGuestLink] = useState<TripMember | null>(null)
  const [selectedInstructionForSettleUp, setSelectedInstructionForSettleUp] = useState<SettlementInstruction | null>(null)

  const loadData = useCallback(async () => {
    if (!tripId) return
    try {
      const data = await tripsApi.getTrip(tripId)
      setDetail(data)
    } catch (err) {
      console.error('Failed to load trip workspace:', err)
    } finally {
      setIsLoading(false)
    }
  }, [tripId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Real-time live synchronization with SignalR group
  useTripHub({
    tripId,
    onUpdate: loadData,
  })

  if (isLoading) {
    return (
      <div className="py-20 text-center text-xs text-slate-400">
        Loading trip workspace and calculating group balances...
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="py-20 text-center space-y-3">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          Trip Not Found
        </h3>
        <p className="text-xs text-slate-500">
          This trip may have been removed or you do not have permission to view it.
        </p>
        <Button variant="primary" onClick={() => navigate('/trips')}>
          Back to Trips
        </Button>
      </div>
    )
  }

  const { trip, members, expenses, advances, settlements, summary } = detail
  const budget = trip.budget ?? 0
  const spent = summary.totalGroupSpending
  const budgetPct = budget > 0 ? Math.round((spent / budget) * 100) : null
  const pendingRepaymentsCount = summary.simplifiedRepayments.length

  return (
    <div className="space-y-6">
      {/* Top Navigation & Title */}
      <div>
        <button
          type="button"
          onClick={() => navigate('/trips')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Trips</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                {trip.name}
              </h1>
              <Badge variant={trip.status === 'Active' ? 'emerald' : 'slate'} size="sm">
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
                {members.length} {members.length === 1 ? 'participant' : 'participants'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddMemberOpen(true)}
              className="flex items-center gap-1.5 text-xs"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Add Member</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddAdvanceOpen(true)}
              className="flex items-center gap-1.5 text-xs"
            >
              <HandCoins className="w-3.5 h-3.5 text-amber-500" />
              <span>Record Advance</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddExpenseOpen(true)}
              className="flex items-center gap-1.5 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Expense</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 4-Card Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Group Spending"
          value={formatINR(spent)}
          subtext="Direct expenses (advances excluded)"
          icon={<Receipt className="w-5 h-5 text-indigo-500" />}
        />
        <MetricCard
          label="Trip Budget"
          value={budget > 0 ? formatINR(budget) : 'No Budget Set'}
          subtext={budgetPct !== null ? `${budgetPct}% budget utilized` : 'Flexible budget'}
          icon={<Calendar className="w-5 h-5 text-emerald-500" />}
        />
        <MetricCard
          label="Debt Simplification"
          value={
            pendingRepaymentsCount === 0
              ? 'All Settled'
              : `${pendingRepaymentsCount} Repayment${pendingRepaymentsCount > 1 ? 's' : ''}`
          }
          subtext="Greedy debt minimization"
          icon={<Sparkles className="w-5 h-5 text-amber-500" />}
        />
        <MetricCard
          label="Participants"
          value={members.length.toString()}
          subtext={`${members.filter((m) => m.hasActiveGuestToken).length} with guest links`}
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
            Overview & Settlements
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
          <button
            type="button"
            onClick={() => setActiveTab('settlements')}
            className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'settlements'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>Settlement History</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {settlements.length}
            </span>
          </button>
        </nav>
      </div>

      {/* Tab 1: Overview & Matrix */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          <TripSummaryMatrix summary={summary} />

          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>Suggested Greedy Settlements</span>
            </h3>
            <SettleUpCard
              instructions={summary.simplifiedRepayments}
              onSettleUp={(inst) => setSelectedInstructionForSettleUp(inst)}
            />
          </div>
        </div>
      )}

      {/* Tab 2: Expenses */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Trip Expenses ({expenses.length})
            </h3>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddExpenseOpen(true)}
              className="flex items-center gap-1 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Expense</span>
            </Button>
          </div>

          {expenses.length === 0 ? (
            <Card className="p-8 text-center border-dashed border-2">
              <Receipt className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                No Expenses Recorded Yet
              </h4>
              <p className="text-xs text-slate-500 mb-3">
                Track shared meals, stays, tickets, and activities.
              </p>
              <Button size="sm" variant="primary" onClick={() => setIsAddExpenseOpen(true)}>
                Record First Expense
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {expenses.map((expense) => (
                <Card
                  key={expense.id}
                  className="p-4 border border-slate-200 dark:border-slate-800 hover:shadow-sm transition-shadow"
                >
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
                        <span>Paid by <strong className="text-slate-700 dark:text-slate-300">{expense.payerName}</strong></span>
                        <span>•</span>
                        <span>{formatDate(expense.expenseDate)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {formatINR(expense.amount)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {expense.splits.length} participants
                      </div>
                    </div>
                  </div>

                  {/* Splits detail pills */}
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

      {/* Tab 3: Travel Advances */}
      {activeTab === 'advances' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200">
            <span className="font-bold">Travel Advance Invariant:</span> Prepayments and pooled cash
            transfers are strictly isolated from group expense totals. They adjust settlement credits
            and debits without inflating total trip spending.
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Recorded Advances ({advances.length})
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddAdvanceOpen(true)}
              className="flex items-center gap-1 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Advance</span>
            </Button>
          </div>

          {advances.length === 0 ? (
            <Card className="p-8 text-center border-dashed border-2">
              <HandCoins className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                No Travel Advances
              </h4>
              <p className="text-xs text-slate-500 mb-3">
                Record upfront cash given to trip organizers or drivers.
              </p>
              <Button size="sm" variant="outline" onClick={() => setIsAddAdvanceOpen(true)}>
                Record Advance
              </Button>
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
                  <div className="text-right">
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                      {formatINR(adv.amount)}
                    </span>
                    <span className="text-[10px] block text-slate-400">Prepayment</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Participants & Guest Links */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Trip Participants ({members.length})
            </h3>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddMemberOpen(true)}
              className="flex items-center gap-1 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Participant</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {members.map((m) => (
              <Card
                key={m.id}
                className="p-5 border border-slate-200 dark:border-slate-800 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="space-y-0.5">
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {m.guestName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {m.registeredUserId ? 'Registered WealthFlow User' : 'Guest Traveler'}
                      </div>
                    </div>
                    {m.canAddExpenses ? (
                      <Badge variant="emerald" size="sm">
                        Can Add Expenses
                      </Badge>
                    ) : (
                      <Badge variant="slate" size="sm">
                        View Only
                      </Badge>
                    )}
                  </div>

                  {m.hasActiveGuestToken && (
                    <div className="flex items-center gap-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 mt-2">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Active cryptographic link enabled</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Joined {formatDate(m.createdAtUtc)}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedMemberForGuestLink(m)}
                    className="flex items-center gap-1 text-xs"
                  >
                    <Link2 className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{m.hasActiveGuestToken ? 'Manage Guest Link' : 'Generate Link'}</span>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Settlements History */}
      {activeTab === 'settlements' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Confirmed Settle-Up History ({settlements.length})
          </h3>

          {settlements.length === 0 ? (
            <Card className="p-8 text-center border-dashed border-2">
              <CheckCircle2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                No Settlements Recorded Yet
              </h4>
              <p className="text-xs text-slate-500">
                Execute repayments under the Overview tab once members clear their balances.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {settlements.map((s) => (
                <Card
                  key={s.id}
                  className="p-4 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      <span>{s.payerName}</span>
                      <span className="text-slate-400 mx-2">paid</span>
                      <span>{s.receiverName}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">
                        {s.settlementMethod}
                      </span>
                      <span>•</span>
                      <span>{formatDate(s.settledAtUtc)}</span>
                      {s.notes && (
                        <>
                          <span>•</span>
                          <span>"{s.notes}"</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {formatINR(s.amount)}
                    </span>
                    <span className="text-[10px] block text-emerald-500 font-semibold">
                      Confirmed Paid
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AddTripExpenseModal
        isOpen={isAddExpenseOpen}
        tripId={trip.id}
        members={members}
        onClose={() => setIsAddExpenseOpen(false)}
        onSuccess={loadData}
      />

      <AddTripAdvanceModal
        isOpen={isAddAdvanceOpen}
        tripId={trip.id}
        members={members}
        onClose={() => setIsAddAdvanceOpen(false)}
        onSuccess={loadData}
      />

      <AddTripMemberModal
        isOpen={isAddMemberOpen}
        tripId={trip.id}
        onClose={() => setIsAddMemberOpen(false)}
        onSuccess={loadData}
      />

      <GuestLinkModal
        isOpen={Boolean(selectedMemberForGuestLink)}
        tripId={trip.id}
        member={selectedMemberForGuestLink}
        onClose={() => setSelectedMemberForGuestLink(null)}
        onSuccess={loadData}
      />

      <SettleUpModal
        isOpen={Boolean(selectedInstructionForSettleUp)}
        tripId={trip.id}
        instruction={selectedInstructionForSettleUp}
        onClose={() => setSelectedInstructionForSettleUp(null)}
        onSuccess={loadData}
      />
    </div>
  )
}
