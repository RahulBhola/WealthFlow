import React from 'react'
import { Calendar, MapPin, Users, Wallet, ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { Trip } from '../types'
import { useCurrency } from '../../../context/CurrencyContext'

export interface TripCardProps {
  trip: Trip
  onSelect: (tripId: string) => void
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

export const TripCard: React.FC<TripCardProps> = ({ trip, onSelect }) => {
  const { formatCurrency } = useCurrency()
  const formatINR = (val: number) => formatCurrency(val, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  const budget = trip.budget ?? 0
  const spent = trip.totalExpenses
  const pct = budget > 0 ? Math.min(Math.round((spent / budget) * 100), 100) : 0
  const isOverBudget = budget > 0 && spent > budget

  const statusVariant: 'emerald' | 'slate' | 'amber' =
    trip.status === 'Active'
      ? 'emerald'
      : trip.status === 'Completed'
      ? 'slate'
      : trip.status === 'Planning'
      ? 'amber'
      : 'slate'

  return (
    <Card
      className="p-6 transition-all duration-200 hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-700 cursor-pointer group flex flex-col justify-between"
      onClick={() => onSelect(trip.id)}
    >
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {trip.name}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>{trip.destination}</span>
            </div>
          </div>
          <Badge variant={statusVariant} size="sm">
            {trip.status}
          </Badge>
        </div>

        {/* Dates and Member Count */}
        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 py-2 border-y border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 my-3">
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>
              {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>{trip.memberCount} {trip.memberCount === 1 ? 'member' : 'members'}</span>
          </div>
        </div>

        {/* Expenses & Budget Metrics */}
        <div className="space-y-2 my-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5 text-slate-400" /> Total Expenses
            </span>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {formatINR(spent)}
            </span>
          </div>

          {budget > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Budget: {formatINR(budget)}</span>
                <span className={isOverBudget ? 'text-rose-500 font-bold' : 'text-slate-500'}>
                  {pct}% utilized
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isOverBudget
                      ? 'bg-rose-500'
                      : pct > 80
                      ? 'bg-amber-500'
                      : 'bg-indigo-600 dark:bg-indigo-500'
                  }`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer link */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 font-medium group-hover:translate-x-0.5 transition-transform">
        <span>Open Trip Workspace</span>
        <ArrowRight className="w-4 h-4" />
      </div>
    </Card>
  )
}
