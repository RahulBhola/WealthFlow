import React, { useState, useEffect, useCallback } from 'react'
import {
  TrendingUp,
  TrendingDown,
  PieChart,
  Calendar,
  Users,
  Plus,
  Search,
  HandCoins,
  Wallet,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { MetricCard } from '@/components/layout/MetricCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PortfolioCard } from '../components/PortfolioCard'
import { JointSipCard } from '../components/JointSipCard'
import { SipReconciliationTable } from '../components/SipReconciliationTable'
import { AddInvestmentModal } from '../components/AddInvestmentModal'
import { UpdateValuationModal } from '../components/UpdateValuationModal'
import { AddSipModal } from '../components/AddSipModal'
import { RecordSipRepaymentModal } from '../components/RecordSipRepaymentModal'
import { investmentsApi } from '../api/investmentsApi'
import type {
  Investment,
  InvestmentSummary,
  Sip,
  JointSipSummary,
  JointSipReconciliation,
} from '../types'

const formatINR = (val: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val)
}

type TabType = 'portfolio' | 'sips' | 'reconciliation'

export const InvestmentsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('portfolio')
  const [summary, setSummary] = useState<InvestmentSummary | null>(null)
  const [sips, setSips] = useState<Sip[]>([])
  const [jointSummary, setJointSummary] = useState<JointSipSummary | null>(null)
  const [reconciliations, setReconciliations] = useState<JointSipReconciliation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [assetClassFilter, setAssetClassFilter] = useState('All')

  // Modals state
  const [isAddInvestmentOpen, setIsAddInvestmentOpen] = useState(false)
  const [isAddSipOpen, setIsAddSipOpen] = useState(false)
  const [selectedInvestmentForUpdate, setSelectedInvestmentForUpdate] = useState<Investment | null>(null)
  const [selectedReconciliationForRepay, setSelectedReconciliationForRepay] = useState<JointSipReconciliation | null>(null)

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      const [invSummary, sipList, jointSum, recList] = await Promise.all([
        investmentsApi.getInvestmentSummary(),
        investmentsApi.getSips(),
        investmentsApi.getJointSipSummary(),
        investmentsApi.getReconciliations(),
      ])
      setSummary(invSummary)
      setSips(sipList)
      setJointSummary(jointSum)
      setReconciliations(recList)
    } catch (err) {
      console.error('Failed to load investments and SIP data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let ignore = false
    async function init() {
      try {
        const [invSummary, sipList, jointSum, recList] = await Promise.all([
          investmentsApi.getInvestmentSummary(),
          investmentsApi.getSips(),
          investmentsApi.getJointSipSummary(),
          investmentsApi.getReconciliations(),
        ])
        if (!ignore) {
          setSummary(invSummary)
          setSips(sipList)
          setJointSummary(jointSum)
          setReconciliations(recList)
        }
      } catch (err) {
        console.error('Failed to load investments data:', err)
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }

    init()
    return () => {
      ignore = true
    }
  }, [])

  const handleExecuteSip = async (sip: Sip) => {
    try {
      await investmentsApi.executeSip(sip.id)
      await loadData()
    } catch (err) {
      console.error('Failed to execute SIP:', err)
      alert(err instanceof Error ? err.message : 'Failed to execute SIP.')
    }
  }

  const handleToggleSipStatus = async (sip: Sip, newStatus: 'Active' | 'Paused' | 'Stopped') => {
    try {
      await investmentsApi.updateSipStatus(sip.id, newStatus)
      await loadData()
    } catch (err) {
      console.error('Failed to update SIP status:', err)
      alert(err instanceof Error ? err.message : 'Failed to update SIP status.')
    }
  }

  // Filtered lists
  const filteredInvestments = (summary?.investments || []).filter((inv) => {
    const matchesSearch = inv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.assetClass.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesClass = assetClassFilter === 'All' || inv.assetClass === assetClassFilter
    return matchesSearch && matchesClass
  })

  const filteredSips = sips.filter((sip) => {
    return (
      sip.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sip.investmentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sip.coInvestorName && sip.coInvestorName.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  })

  const pendingReconciliationsCount = reconciliations.filter((r) => r.remainingDue > 0).length

  return (
    <div className="space-y-6">
      {/* Tier 1: Page Header */}
      <PageHeader
        title="Investments & Joint SIP Reconciliation"
        subtitle="Track personal portfolio assets, systematic investment schedules, and bilateral co-funded partner reconciliations."
        actionSlot={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddSipOpen(true)}
              className="text-xs"
            >
              <Calendar className="w-3.5 h-3.5 mr-1 text-indigo-500" />
              Setup SIP
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddInvestmentOpen(true)}
              className="text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Investment
            </Button>
          </div>
        }
      />

      {/* Tier 2: Metric Strip (4 Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Portfolio Valuation"
          value={formatINR(summary?.totalCurrentValuation ?? 0)}
          icon={<TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
          delta={
            summary
              ? {
                  value: `${summary.overallReturnPercentage >= 0 ? '+' : ''}${summary.overallReturnPercentage.toFixed(2)}%`,
                  isPositive: summary.overallReturnPercentage >= 0,
                }
              : undefined
          }
          subtext="Current market value"
        />

        <MetricCard
          label="Invested Capital"
          value={formatINR(summary?.totalInvestedAmount ?? 0)}
          icon={<Wallet className="w-5 h-5 text-slate-600 dark:text-slate-400" />}
          subtext={`${summary?.investments.length ?? 0} holdings tracked`}
        />

        <MetricCard
          label="Total Gains / Loss"
          value={`${(summary?.totalAbsoluteGainLoss ?? 0) >= 0 ? '+' : ''}${formatINR(summary?.totalAbsoluteGainLoss ?? 0)}`}
          icon={
            (summary?.totalAbsoluteGainLoss ?? 0) >= 0 ? (
              <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            )
          }
          delta={
            summary
              ? {
                  value: `${summary.overallReturnPercentage >= 0 ? '+' : ''}${summary.overallReturnPercentage.toFixed(2)}%`,
                  isPositive: summary.overallReturnPercentage >= 0,
                }
              : undefined
          }
          subtext="Net unrealized returns"
        />

        <MetricCard
          label="Partner Receivables Due"
          value={formatINR(jointSummary?.totalPartnerReceivableDue ?? 0)}
          icon={<HandCoins className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
          subtext={`${pendingReconciliationsCount} pending cycles`}
        />
      </div>

      {/* Tier 3: Action & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'portfolio'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            Portfolio Assets ({summary?.investments.length ?? 0})
          </button>

          <button
            onClick={() => setActiveTab('sips')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'sips'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            SIP Schedules ({sips.length})
          </button>

          <button
            onClick={() => setActiveTab('reconciliation')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'reconciliation'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Joint SIP Reconciliation
            {pendingReconciliationsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-rose-500 text-white text-[10px] rounded-full font-mono">
                {pendingReconciliationsCount}
              </span>
            )}
          </button>
        </div>

        {/* Search & Asset Filter */}
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              type="text"
              placeholder={
                activeTab === 'portfolio'
                  ? 'Search assets...'
                  : activeTab === 'sips'
                  ? 'Search SIPs...'
                  : 'Search cycles...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-xs"
            />
          </div>

          {activeTab === 'portfolio' && (
            <select
              value={assetClassFilter}
              onChange={(e) => setAssetClassFilter(e.target.value)}
              className="h-8 px-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="All">All Classes</option>
              <option value="Mutual Fund">Mutual Fund</option>
              <option value="Stock">Stock</option>
              <option value="Fixed Deposit">Fixed Deposit</option>
              <option value="Gold">Gold</option>
              <option value="PPF">PPF</option>
              <option value="Real Estate">Real Estate</option>
              <option value="Other">Other</option>
            </select>
          )}
        </div>
      </div>

      {/* Asset Class Allocation Bar (Shown on Portfolio Tab) */}
      {activeTab === 'portfolio' && summary && summary.assetAllocation.length > 0 && (
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <PieChart className="w-4 h-4 text-indigo-500" />
              Asset Allocation & Diversification
            </span>
            <span className="text-slate-500 font-mono text-[11px]">
              Total Value: {formatINR(summary.totalCurrentValuation)}
            </span>
          </div>

          {/* Allocation Progress Bar */}
          <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
            {summary.assetAllocation.map((alloc, idx) => {
              const colors = [
                'bg-indigo-500',
                'bg-emerald-500',
                'bg-sky-500',
                'bg-amber-500',
                'bg-violet-500',
                'bg-rose-500',
              ]
              const colorClass = colors[idx % colors.length]
              return (
                <div
                  key={alloc.assetClass}
                  className={`${colorClass} h-full transition-all`}
                  style={{ width: `${alloc.allocationPercentage}%` }}
                  title={`${alloc.assetClass}: ${alloc.allocationPercentage.toFixed(1)}% (${formatINR(alloc.totalValuation)})`}
                />
              )
            })}
          </div>

          {/* Allocation Chips */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {summary.assetAllocation.map((alloc, idx) => {
              const dotColors = [
                'bg-indigo-500',
                'bg-emerald-500',
                'bg-sky-500',
                'bg-amber-500',
                'bg-violet-500',
                'bg-rose-500',
              ]
              const dotColor = dotColors[idx % dotColors.length]
              return (
                <div key={alloc.assetClass} className="flex items-center gap-1.5 text-xs">
                  <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
                  <span className="text-slate-600 dark:text-slate-300 font-medium">
                    {alloc.assetClass}
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    {alloc.allocationPercentage.toFixed(1)}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tier 4: Main Content Area */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-400">Loading investment records...</div>
      ) : activeTab === 'portfolio' ? (
        filteredInvestments.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl space-y-3">
            <PieChart className="w-10 h-10 mx-auto text-slate-400" />
            <h3 className="font-semibold text-slate-900 dark:text-white">No investments found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Start building your portfolio tracker by adding mutual funds, stocks, fixed deposits, or gold holdings.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddInvestmentOpen(true)}
              className="text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add First Investment
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInvestments.map((inv) => (
              <PortfolioCard
                key={inv.id}
                investment={inv}
                onUpdateValuation={(target) => setSelectedInvestmentForUpdate(target)}
              />
            ))}
          </div>
        )
      ) : activeTab === 'sips' ? (
        filteredSips.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl space-y-3">
            <Calendar className="w-10 h-10 mx-auto text-slate-400" />
            <h3 className="font-semibold text-slate-900 dark:text-white">No SIP schedules configured</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Schedule automated monthly personal or co-funded joint SIP investments debited from your bank accounts.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddSipOpen(true)}
              className="text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Setup First SIP
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSips.map((sip) => (
              <JointSipCard
                key={sip.id}
                sip={sip}
                onExecute={handleExecuteSip}
                onToggleStatus={handleToggleSipStatus}
              />
            ))}
          </div>
        )
      ) : (
        /* Joint SIP Reconciliation Tab */
        <div className="space-y-6">
          {/* Joint SIP Overview Banner */}
          {jointSummary && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/60 rounded-xl text-xs">
              <div>
                <span className="text-slate-500 block">Total Joint SIPs</span>
                <span className="font-mono text-base font-bold text-slate-900 dark:text-white">
                  {jointSummary.totalJointSipsCount} active plans
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Monthly Partner Commitment</span>
                <span className="font-mono text-base font-bold text-sky-600 dark:text-sky-400">
                  {formatINR(jointSummary.totalPartnerMonthlyShare)} / month
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Total Partner Receivables Due</span>
                <span className="font-mono text-base font-bold text-amber-600 dark:text-amber-400">
                  {formatINR(jointSummary.totalPartnerReceivableDue)}
                </span>
              </div>
            </div>
          )}

          <SipReconciliationTable
            reconciliations={reconciliations}
            onOpenRepayModal={(rec) => setSelectedReconciliationForRepay(rec)}
          />
        </div>
      )}

      {/* Tier 5: Modals */}
      <AddInvestmentModal
        isOpen={isAddInvestmentOpen}
        onClose={() => setIsAddInvestmentOpen(false)}
        onSuccess={loadData}
      />

      <UpdateValuationModal
        investment={selectedInvestmentForUpdate}
        isOpen={!!selectedInvestmentForUpdate}
        onClose={() => setSelectedInvestmentForUpdate(null)}
        onSuccess={loadData}
      />

      <AddSipModal
        investments={summary?.investments || []}
        isOpen={isAddSipOpen}
        onClose={() => setIsAddSipOpen(false)}
        onSuccess={loadData}
      />

      <RecordSipRepaymentModal
        reconciliation={selectedReconciliationForRepay}
        isOpen={!!selectedReconciliationForRepay}
        onClose={() => setSelectedReconciliationForRepay(null)}
        onSuccess={loadData}
      />
    </div>
  )
}
