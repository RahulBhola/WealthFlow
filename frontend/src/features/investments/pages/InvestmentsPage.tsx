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
  ArrowUpRight,
  ShieldCheck,
  Coins,
  Landmark,
  Layers,
  Activity,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
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
  const [addInvestmentInitialClass, setAddInvestmentInitialClass] = useState('Mutual Fund')
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

  const handleOpenAddWithClass = (cls: string) => {
    setAddInvestmentInitialClass(cls)
    setIsAddInvestmentOpen(true)
  }

  // Filtered lists
  const filteredInvestments = (summary?.investments || []).filter((inv) => {
    const matchesSearch =
      inv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
    <div className="space-y-6 animate-in fade-in duration-200">
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
              className="text-xs bg-slate-900/60 hover:bg-slate-800 border-slate-700/80 text-indigo-300 hover:text-white transition-all shadow-sm"
            >
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
              Setup SIP
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setAddInvestmentInitialClass('Mutual Fund')
                setIsAddInvestmentOpen(true)
              }}
              className="text-xs bg-gradient-to-r from-indigo-500 via-indigo-600 to-teal-500 hover:from-indigo-600 hover:to-teal-600 text-white shadow-lg shadow-indigo-500/25 border-none transition-all"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Investment
            </Button>
          </div>
        }
      />

      {/* Tier 2: Metric Strip (4 High-Performance Glassmorphic Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Portfolio Valuation */}
        <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800/80 hover:border-indigo-500/30 transition-all duration-200 shadow-xl group">
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Portfolio Valuation
            </span>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 group-hover:scale-105 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-mono text-white tracking-tight tabular-nums block">
              {formatINR(summary?.totalCurrentValuation ?? 0)}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-800/60">
            <span className="text-slate-400">Current market value</span>
            {summary && summary.totalInvestedAmount > 0 && (
              <span
                className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium ${
                  summary.overallReturnPercentage >= 0
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {summary.overallReturnPercentage >= 0 ? '+' : ''}
                {summary.overallReturnPercentage.toFixed(2)}%
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Invested Capital */}
        <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800/80 hover:border-sky-500/30 transition-all duration-200 shadow-xl group">
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Invested Capital
            </span>
            <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 group-hover:scale-105 transition-transform">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-mono text-white tracking-tight tabular-nums block">
              {formatINR(summary?.totalInvestedAmount ?? 0)}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-800/60">
            <span className="text-slate-400">
              {summary?.investments.length ?? 0} holdings tracked
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-sky-400">
              <Layers className="w-3 h-3" />
              Capital Cost
            </span>
          </div>
        </div>

        {/* Card 3: Total Gains / Loss */}
        <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800/80 hover:border-emerald-500/30 transition-all duration-200 shadow-xl group">
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Gains / Loss
            </span>
            <div
              className={`p-2.5 rounded-xl border group-hover:scale-105 transition-transform ${
                (summary?.totalAbsoluteGainLoss ?? 0) >= 0
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}
            >
              {(summary?.totalAbsoluteGainLoss ?? 0) >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
            </div>
          </div>
          <div className="mt-3">
            <span
              className={`text-2xl font-bold font-mono tracking-tight tabular-nums block ${
                (summary?.totalAbsoluteGainLoss ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {(summary?.totalAbsoluteGainLoss ?? 0) >= 0 ? '+' : ''}
              {formatINR(summary?.totalAbsoluteGainLoss ?? 0)}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-800/60">
            <span className="text-slate-400">Net unrealized returns</span>
            {summary && summary.totalInvestedAmount > 0 && (
              <span
                className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium ${
                  summary.overallReturnPercentage >= 0
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {summary.overallReturnPercentage >= 0 ? '+' : ''}
                {summary.overallReturnPercentage.toFixed(2)}%
              </span>
            )}
          </div>
        </div>

        {/* Card 4: Partner Receivables Due */}
        <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800/80 hover:border-amber-500/30 transition-all duration-200 shadow-xl group">
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Partner Receivables Due
            </span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:scale-105 transition-transform">
              <HandCoins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-mono text-white tracking-tight tabular-nums block">
              {formatINR(jointSummary?.totalPartnerReceivableDue ?? 0)}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-800/60">
            <span className="text-slate-400">
              {pendingReconciliationsCount} pending cycles
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-400">
              <Activity className="w-3 h-3" />
              Shared Split
            </span>
          </div>
        </div>
      </div>

      {/* Tier 3: Sleek Tab Navigation & Filtering Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-2 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-xl">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab('portfolio')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'portfolio'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            <span>Portfolio Assets ({summary?.investments.length ?? 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sips')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'sips'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>SIP Schedules ({sips.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reconciliation')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'reconciliation'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Joint SIP Reconciliation</span>
            {pendingReconciliationsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-rose-500 text-white text-[10px] rounded-full font-mono">
                {pendingReconciliationsCount}
              </span>
            )}
          </button>
        </div>

        {/* Search & Asset Filter */}
        <div className="flex items-center gap-2.5">
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
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
              className="pl-9 h-9 text-xs bg-slate-950/70 border-slate-800 focus:border-indigo-500/50 rounded-xl text-slate-200 placeholder-slate-500"
            />
          </div>

          {activeTab === 'portfolio' && (
            <select
              value={assetClassFilter}
              onChange={(e) => setAssetClassFilter(e.target.value)}
              className="h-9 px-3 text-xs bg-slate-950/70 border border-slate-800 rounded-xl text-slate-300 focus:border-indigo-500/50 focus:outline-none cursor-pointer"
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

      {/* Asset Class Allocation Bar (Shown on Portfolio Tab when investments exist) */}
      {activeTab === 'portfolio' && summary && summary.assetAllocation.length > 0 && (
        <div className="p-5 bg-gradient-to-b from-slate-900/80 to-slate-950/80 border border-slate-800/80 rounded-2xl shadow-xl space-y-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-indigo-400" />
              Asset Allocation & Diversification
            </span>
            <span className="text-slate-400 font-mono text-[11px]">
              Total Value: {formatINR(summary.totalCurrentValuation)}
            </span>
          </div>

          {/* Allocation Progress Bar */}
          <div className="w-full h-3 bg-slate-800/80 rounded-full overflow-hidden flex p-0.5 gap-0.5">
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
                  className={`${colorClass} h-full rounded-sm transition-all`}
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
                <div
                  key={alloc.assetClass}
                  className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs"
                >
                  <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                  <span className="text-slate-300 font-medium">{alloc.assetClass}</span>
                  <span className="text-indigo-400 font-mono text-[11px] font-semibold">
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
        <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <span className="text-xs font-medium">Loading investment records...</span>
        </div>
      ) : activeTab === 'portfolio' ? (
        filteredInvestments.length === 0 ? (
          /* High-Value Empty State & Portfolio Launchpad */
          <div className="space-y-6">
            <div className="p-8 sm:p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-gradient-to-b from-slate-900/40 to-slate-950/60 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(99,102,241,0.15)]">
                <PieChart className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white tracking-tight">No investments found</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Start building your portfolio tracker by adding mutual funds, stocks, fixed deposits, or gold holdings.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setAddInvestmentInitialClass('Mutual Fund')
                    setIsAddInvestmentOpen(true)
                  }}
                  className="text-xs px-5 py-2.5 bg-gradient-to-r from-indigo-500 via-indigo-600 to-teal-500 hover:from-indigo-600 hover:to-teal-600 shadow-lg shadow-indigo-500/25 border-none font-semibold"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Add First Investment
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddSipOpen(true)}
                  className="text-xs px-4 py-2.5 bg-slate-900/80 hover:bg-slate-800 border-slate-700/80 text-slate-300 hover:text-white"
                >
                  <Calendar className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
                  Setup Systematic SIP
                </Button>
              </div>
            </div>

            {/* Asset Class Starter Launchers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Mutual Funds */}
              <div
                onClick={() => handleOpenAddWithClass('Mutual Fund')}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-sky-500/40 transition-all duration-200 cursor-pointer group shadow-lg flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors">
                      Mutual Funds & SIPs
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Index funds, Flexi-cap, and recurring monthly co-funded SIP plans.
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-sky-400 font-medium">
                  <span>Track Mutual Fund</span>
                  <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </div>

              {/* Equity Stocks */}
              <div
                onClick={() => handleOpenAddWithClass('Stock')}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/40 transition-all duration-200 cursor-pointer group shadow-lg flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                      Equity Stocks
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Direct equities with unit holdings, purchase price, and valuation tracking.
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-emerald-400 font-medium">
                  <span>Track Stocks</span>
                  <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </div>

              {/* Sovereign Gold */}
              <div
                onClick={() => handleOpenAddWithClass('Gold')}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-amber-500/40 transition-all duration-200 cursor-pointer group shadow-lg flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                      Gold & Sovereign Bonds
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      SGB bonds, digital gold, and hedge assets with appreciation gains.
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-amber-400 font-medium">
                  <span>Track Gold</span>
                  <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </div>

              {/* Fixed Deposits & PPF */}
              <div
                onClick={() => handleOpenAddWithClass('Fixed Deposit')}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/40 transition-all duration-200 cursor-pointer group shadow-lg flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                      Fixed Deposits & PPF
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Guaranteed interest deposits, lock-in tenures, and tax-saving accounts.
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-indigo-400 font-medium">
                  <span>Track Deposits</span>
                  <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </div>
            </div>

            {/* Financial Accounting Invariant Advisory Banner */}
            <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-900/40 text-xs text-indigo-200/90 flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold text-white block">
                  Zero Double-Counting Invariant & Reciprocal Accounting
                </span>
                <p className="text-slate-400 leading-relaxed">
                  Monthly investment transfers are classified as asset allocations (capital movements) rather than consumer expenses, keeping your monthly budget clean while accurately expanding your total Net Worth.
                </p>
              </div>
            </div>
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
          <div className="p-8 sm:p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-gradient-to-b from-slate-900/40 to-slate-950/60 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(99,102,241,0.15)]">
              <Calendar className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white tracking-tight">No SIP schedules configured</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Schedule automated monthly personal or co-funded joint SIP investments debited from your bank accounts.
              </p>
            </div>
            <div className="pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAddSipOpen(true)}
                className="text-xs px-5 py-2.5 bg-gradient-to-r from-indigo-500 via-indigo-600 to-teal-500 hover:from-indigo-600 hover:to-teal-600 shadow-lg shadow-indigo-500/25 border-none font-semibold"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Setup First SIP
              </Button>
            </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 bg-gradient-to-b from-indigo-950/30 to-slate-900/60 border border-indigo-900/50 rounded-2xl shadow-xl text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 block font-medium">Total Joint SIPs</span>
                <span className="font-mono text-lg font-bold text-white">
                  {jointSummary.totalJointSipsCount} active plans
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 block font-medium">Monthly Partner Commitment</span>
                <span className="font-mono text-lg font-bold text-sky-400">
                  {formatINR(jointSummary.totalPartnerMonthlyShare)} / month
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 block font-medium">Total Partner Receivables Due</span>
                <span className="font-mono text-lg font-bold text-amber-400">
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
        initialAssetClass={addInvestmentInitialClass}
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
