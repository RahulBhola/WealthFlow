import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Palmtree,
  Plus,
  Search,
  Wallet,
  Users,
  CheckCircle2,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { MetricCard } from '@/components/layout/MetricCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { TripCard } from '../components/TripCard'
import { AddTripModal } from '../components/AddTripModal'
import { tripsApi } from '../api/tripsApi'
import { useCurrency } from '../../../context/CurrencyContext'
import type { Trip } from '../types'

export const TripsListPage: React.FC = () => {
  const { formatCurrency } = useCurrency()
  const formatINR = (val: number) => formatCurrency(val, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  const navigate = useNavigate()
  const [trips, setTrips] = useState<Trip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [isAddTripOpen, setIsAddTripOpen] = useState(false)

  const loadTrips = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await tripsApi.getTrips()
      setTrips(data)
    } catch (err) {
      console.error('Failed to load trips:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTrips()
  }, [loadTrips])

  // Filtered trips
  const filteredTrips = trips.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.destination.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Metrics
  const activeTripsCount = trips.filter((t) => t.status === 'Active').length
  const totalSpending = trips.reduce((sum, t) => sum + t.totalExpenses, 0)
  const totalTravelers = trips.reduce((sum, t) => sum + t.memberCount, 0)
  const completedTripsCount = trips.filter((t) => t.status === 'Completed').length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trips Workspace"
        subtitle="Collaborative travel expense splitting, bilateral advances & greedy debt minimization"
        actionSlot={
          <Button
            variant="primary"
            onClick={() => setIsAddTripOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Plan New Trip</span>
          </Button>
        }
      />

      {/* Metric Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Active Trips"
          value={activeTripsCount.toString()}
          subtext="Currently ongoing journeys"
          icon={<Palmtree className="w-5 h-5 text-indigo-500" />}
        />
        <MetricCard
          label="Total Group Spending"
          value={formatINR(totalSpending)}
          subtext="All trips combined"
          icon={<Wallet className="w-5 h-5 text-emerald-500" />}
        />
        <MetricCard
          label="Total Travelers"
          value={totalTravelers.toString()}
          subtext="Friends and companions"
          icon={<Users className="w-5 h-5 text-blue-500" />}
        />
        <MetricCard
          label="Completed Trips"
          value={completedTripsCount.toString()}
          subtext="Archived & settled journeys"
          icon={<CheckCircle2 className="w-5 h-5 text-teal-500" />}
        />
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search by trip name or destination..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          {['All', 'Active', 'Planning', 'Completed'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === status
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Trips Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-slate-400">Loading trips workspace...</div>
      ) : filteredTrips.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <Palmtree className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
            No Trips Found
          </h3>
          <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">
            {searchQuery
              ? 'No trips matched your search filter.'
              : 'Create your first collaborative trip to start tracking shared expenses, pocket advances, and auto-settlements.'}
          </p>
          <Button variant="primary" onClick={() => setIsAddTripOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Plan a Trip
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTrips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onSelect={(tripId) => navigate(`/trips/${tripId}`)}
            />
          ))}
        </div>
      )}

      {/* Create Trip Modal */}
      <AddTripModal
        isOpen={isAddTripOpen}
        onClose={() => setIsAddTripOpen(false)}
        onSuccess={(newTripId) => {
          loadTrips()
          navigate(`/trips/${newTripId}`)
        }}
      />
    </div>
  )
}
