import React, { useState, useEffect, useCallback } from 'react'
import {
  CreditCard as CreditCardIcon,
  ShieldAlert,
  Plus,
  TrendingDown,
  PieChart,
  Search,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { MetricCard } from '@/components/layout/MetricCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { StylizedCreditCard } from '../components/StylizedCreditCard'
import { PayBillModal } from '../components/PayBillModal'
import { AddCreditCardModal } from '../components/AddCreditCardModal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { creditCardsApi } from '../api/creditCardsApi'
import type { CreditCard, CreditCardSummary } from '../types'
import { useCurrency } from '../../../context/CurrencyContext'

export const CreditCardsPage: React.FC = () => {
  const { formatCurrency } = useCurrency()
  const formatINR = formatCurrency
  const [summary, setSummary] = useState<CreditCardSummary | null>(null)
  const [cards, setCards] = useState<CreditCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const [selectedCardForPayment, setSelectedCardForPayment] = useState<CreditCard | null>(null)
  const [isAddCardOpen, setIsAddCardOpen] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await creditCardsApi.getCreditCardSummary()
      setSummary(data)
      setCards(data.cards)
    } catch (err) {
      console.error('Failed to load credit cards:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let ignore = false
    async function init() {
      try {
        const data = await creditCardsApi.getCreditCardSummary()
        if (!ignore) {
          setSummary(data)
          setCards(data.cards)
        }
      } catch (err) {
        console.error('Failed to load credit cards:', err)
      } finally {
        if (!ignore) {
          setIsLoading(false)
        }
      }
    }

    init()
    return () => {
      ignore = true
    }
  }, [])

  const [cardToDelete, setCardToDelete] = useState<CreditCard | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteCard = (card: CreditCard) => {
    setCardToDelete(card)
  }

  const confirmDeleteCard = async () => {
    if (!cardToDelete) return
    try {
      setIsDeleting(true)
      await creditCardsApi.deleteCreditCard(cardToDelete.id)
      setCardToDelete(null)
      await loadData()
    } catch (err) {
      console.error('Failed to remove card:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredCards = cards.filter(
    (c) =>
      c.cardName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.bankName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.last4Digits.includes(searchQuery)
  )

  return (
    <div className="space-y-6">
      {/* Tier 1: Page Header */}
      <PageHeader
        title="Credit Cards & Liabilities"
        subtitle="Track available limits, credit utilization, payment due alerts, and record bill settlements."
        actionSlot={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddCardOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Card
          </Button>
        }
      />

      {/* Tier 2: 4-Card Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <MetricCard
          label="Total Credit Line"
          value={formatINR(summary?.totalCreditLimit ?? 0)}
          icon={<CreditCardIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
          subtext={`${summary?.activeCardCount ?? 0} active credit cards`}
        />
        <MetricCard
          label="Total Outstanding"
          value={formatINR(summary?.totalCurrentBalance ?? 0)}
          icon={<TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
          subtext="Current unsettled liability"
        />
        <MetricCard
          label="Available Credit"
          value={formatINR(summary?.totalAvailableCredit ?? 0)}
          icon={<ShieldAlert className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
          subtext="Immediate spending bandwidth"
        />
        <MetricCard
          label="Credit Utilization"
          value={`${summary?.overallUtilizationPercentage ?? 0}%`}
          icon={<PieChart className="w-4 h-4 text-sky-600 dark:text-sky-400" />}
          subtext={
            (summary?.overallUtilizationPercentage ?? 0) < 30
              ? 'Excellent (under 30%)'
              : (summary?.overallUtilizationPercentage ?? 0) <= 70
              ? 'Moderate utilization'
              : 'High utilization warning'
          }
        />
      </div>

      {/* Tier 3: Search Toolbar & Invariant Callout */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="w-full sm:w-80">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search bank, card name, digits..."
            leftElement={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>

        <div className="text-xs text-slate-500 flex items-center gap-2">
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {filteredCards.length}
          </span>{' '}
          card{filteredCards.length === 1 ? '' : 's'} displayed
        </div>
      </div>

      {/* Tier 4: Responsive Grid of 1.586:1 Aspect Ratio Stylized Cards */}
      {isLoading ? (
        <div className="py-20 text-center text-xs text-slate-500 animate-pulse">
          Loading credit cards & telemetry...
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="py-16 text-center p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <CreditCardIcon className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            No credit cards found
          </p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? 'No cards match your search criteria.'
              : 'Add your credit cards to track utilization limits and pay bills with zero expense double-counting.'}
          </p>
          <div className="pt-2">
            <Button variant="primary" size="sm" onClick={() => setIsAddCardOpen(true)}>
              Add Credit Card
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {filteredCards.map((card) => (
            <StylizedCreditCard
              key={card.id}
              card={card}
              onPayBill={(c) => setSelectedCardForPayment(c)}
              onDelete={handleDeleteCard}
            />
          ))}
        </div>
      )}

      {/* Pay Bill Modal */}
      <PayBillModal
        card={selectedCardForPayment}
        isOpen={Boolean(selectedCardForPayment)}
        onClose={() => setSelectedCardForPayment(null)}
        onSuccess={loadData}
      />

      {/* Add Card Modal */}
      <AddCreditCardModal
        isOpen={isAddCardOpen}
        onClose={() => setIsAddCardOpen(false)}
        onSuccess={loadData}
      />

      {/* Modern Glassmorphic Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!cardToDelete}
        onClose={() => setCardToDelete(null)}
        onConfirm={confirmDeleteCard}
        title="Remove Credit Card"
        message={`Are you sure you want to remove card "${cardToDelete?.cardName}"?`}
        subMessage="Any historical transactions recorded under this card will remain in your ledger, but the card balance and limit tracking will be removed."
        confirmText="Remove Card"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  )
}
