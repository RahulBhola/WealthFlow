import React, { useState, useEffect, useMemo } from 'react'
import { Users, Percent, Divide, Scale, CheckCircle2, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import type { TripMember, SplitInput } from '../types'
import { useCurrency } from '../../../context/CurrencyContext'

export interface SplitEditorProps {
  members: TripMember[]
  totalAmount: number
  initialSplitType?: 'Equal' | 'Unequal' | 'Percentage' | 'Shares'
  initialSplits?: SplitInput[]
  onChange: (splitType: string, splits: SplitInput[], isValid: boolean) => void
}

export const SplitEditor: React.FC<SplitEditorProps> = ({
  members,
  totalAmount,
  initialSplitType = 'Equal',
  initialSplits,
  onChange,
}) => {
  const { formatCurrency } = useCurrency()
  const formatINR = formatCurrency
  const [splitType, setSplitType] = useState<'Equal' | 'Unequal' | 'Percentage' | 'Shares'>(
    initialSplitType
  )

  // Included members for Equal split
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(() => {
    if (initialSplits && initialSplits.length > 0) {
      return new Set(initialSplits.map((s) => s.memberId))
    }
    return new Set(members.map((m) => m.id))
  })

  // Per-member inputs
  const [unequalAmounts, setUnequalAmounts] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    if (initialSplits && initialSplitType === 'Unequal') {
      initialSplits.forEach((s) => {
        if (s.allocatedAmount !== undefined && s.allocatedAmount !== null) {
          map[s.memberId] = s.allocatedAmount.toString()
        }
      })
    }
    return map
  })

  const [percentages, setPercentages] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    if (initialSplits && initialSplitType === 'Percentage') {
      initialSplits.forEach((s) => {
        if (s.allocatedPercentage !== undefined && s.allocatedPercentage !== null) {
          map[s.memberId] = s.allocatedPercentage.toString()
        }
      })
    }
    return map
  })

  const [shares, setShares] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    if (initialSplits && initialSplitType === 'Shares') {
      initialSplits.forEach((s) => {
        if (s.allocatedShares !== undefined && s.allocatedShares !== null) {
          map[s.memberId] = s.allocatedShares.toString()
        }
      })
    } else {
      members.forEach((m) => {
        map[m.id] = '1'
      })
    }
    return map
  })

  // Toggle member inclusion for Equal split
  const handleToggleMember = (memberId: string) => {
    const next = new Set(selectedMemberIds)
    if (next.has(memberId)) {
      if (next.size > 1) {
        next.delete(memberId)
      }
    } else {
      next.add(memberId)
    }
    setSelectedMemberIds(next)
  }

  // Calculate validity and splits payload
  const { splits, isValid, validationMessage } = useMemo(() => {
    if (totalAmount <= 0) {
      return { splits: [], isValid: false, validationMessage: 'Enter an amount greater than 0' }
    }

    if (splitType === 'Equal') {
      const activeIds = Array.from(selectedMemberIds)
      if (activeIds.length === 0) {
        return { splits: [], isValid: false, validationMessage: 'Select at least one member' }
      }

      const totalCents = Math.round(totalAmount * 100)
      const baseCents = Math.floor(totalCents / activeIds.length)
      const remainderCents = totalCents % activeIds.length

      const result: SplitInput[] = activeIds.map((memberId, idx) => {
        const cents = baseCents + (idx < remainderCents ? 1 : 0)
        return {
          memberId,
          allocatedAmount: cents / 100,
        }
      })

      const baseAmount = baseCents / 100
      let msg = `${activeIds.length} members split ${formatINR(totalAmount)} (~${formatINR(baseAmount)} each)`
      if (remainderCents > 0) {
        msg += ` (${remainderCents} member(s) pay ${formatINR(0.01)} extra for cent-perfection)`
      }

      return { splits: result, isValid: true, validationMessage: msg }
    }

    if (splitType === 'Unequal') {
      let sum = 0
      const result: SplitInput[] = []
      members.forEach((m) => {
        const val = parseFloat(unequalAmounts[m.id] || '0')
        if (val > 0) {
          sum += val
          result.push({ memberId: m.id, allocatedAmount: val })
        }
      })

      const diff = Math.round((totalAmount - sum) * 100) / 100
      if (Math.abs(diff) < 0.01) {
        return {
          splits: result,
          isValid: true,
          validationMessage: `Exactly balanced at ${formatINR(sum)}`,
        }
      }

      if (diff > 0) {
        return {
          splits: result,
          isValid: false,
          validationMessage: `${formatINR(diff)} remaining to be allocated`,
        }
      }

      return {
        splits: result,
        isValid: false,
        validationMessage: `${formatINR(Math.abs(diff))} over total expense amount`,
      }
    }

    if (splitType === 'Percentage') {
      let sumPct = 0
      const result: SplitInput[] = []
      members.forEach((m) => {
        const pct = parseFloat(percentages[m.id] || '0')
        if (pct > 0) {
          sumPct += pct
          const amt = Math.round(((pct / 100) * totalAmount) * 100) / 100
          result.push({
            memberId: m.id,
            allocatedPercentage: pct,
            allocatedAmount: amt,
          })
        }
      })

      const diff = Math.round((100 - sumPct) * 100) / 100
      if (Math.abs(diff) < 0.01) {
        return {
          splits: result,
          isValid: true,
          validationMessage: '100% allocated across members',
        }
      }

      return {
        splits: result,
        isValid: false,
        validationMessage: `Total is ${sumPct.toFixed(1)}% (${diff > 0 ? `${diff.toFixed(1)}% remaining` : `${Math.abs(diff).toFixed(1)}% over 100%`})`,
      }
    }

    if (splitType === 'Shares') {
      let totalShares = 0
      const shareMap: { memberId: string; shares: number }[] = []

      members.forEach((m) => {
        const s = parseInt(shares[m.id] || '0', 10)
        if (s > 0) {
          totalShares += s
          shareMap.push({ memberId: m.id, shares: s })
        }
      })

      if (totalShares === 0) {
        return {
          splits: [],
          isValid: false,
          validationMessage: 'Assign at least 1 share to one member',
        }
      }

      const totalCents = Math.round(totalAmount * 100)
      let allocatedCents = 0
      const result: SplitInput[] = shareMap.map((item, idx) => {
        let cents: number
        if (idx === shareMap.length - 1) {
          cents = totalCents - allocatedCents
        } else {
          cents = Math.floor((item.shares / totalShares) * totalCents)
          allocatedCents += cents
        }
        return {
          memberId: item.memberId,
          allocatedShares: item.shares,
          allocatedAmount: cents / 100,
        }
      })

      return {
        splits: result,
        isValid: true,
        validationMessage: `${totalShares} total shares allocated across ${shareMap.length} members`,
      }
    }

    return { splits: [], isValid: false, validationMessage: '' }
  }, [splitType, totalAmount, selectedMemberIds, unequalAmounts, percentages, shares, members])

  // Emit update to parent
  useEffect(() => {
    onChange(splitType, splits, isValid)
  }, [splitType, splits, isValid, onChange])

  return (
    <div className="space-y-4">
      {/* Mode Selector Tabs */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
        <button
          type="button"
          onClick={() => setSplitType('Equal')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all ${
            splitType === 'Equal'
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Divide className="w-3.5 h-3.5" />
          <span>Equal</span>
        </button>

        <button
          type="button"
          onClick={() => setSplitType('Unequal')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all ${
            splitType === 'Unequal'
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>Unequal</span>
        </button>

        <button
          type="button"
          onClick={() => setSplitType('Percentage')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all ${
            splitType === 'Percentage'
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Percent className="w-3.5 h-3.5" />
          <span>Percent</span>
        </button>

        <button
          type="button"
          onClick={() => setSplitType('Shares')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all ${
            splitType === 'Shares'
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Shares</span>
        </button>
      </div>

      {/* Validation / Status Indicator */}
      <div
        className={`p-2.5 rounded-lg flex items-center gap-2 text-xs ${
          isValid
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
            : 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400'
        }`}
      >
        {isValid ? (
          <CheckCircle2 className="w-4 h-4 shrink-0" />
        ) : (
          <AlertCircle className="w-4 h-4 shrink-0" />
        )}
        <span className="font-medium">{validationMessage}</span>
      </div>

      {/* Member rows based on split type */}
      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {members.map((member) => {
          if (splitType === 'Equal') {
            const isSelected = selectedMemberIds.has(member.id)
            return (
              <div
                key={member.id}
                onClick={() => handleToggleMember(member.id)}
                className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 opacity-60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}} // handled by parent div
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 pointer-events-none"
                  />
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {member.guestName}
                  </span>
                </div>
                {isSelected && totalAmount > 0 && selectedMemberIds.size > 0 && (
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    {formatINR(totalAmount / selectedMemberIds.size)}
                  </span>
                )}
              </div>
            )
          }

          if (splitType === 'Unequal') {
            return (
              <div
                key={member.id}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
              >
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 shrink-0">
                  {member.guestName}
                </span>
                <div className="w-32">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={unequalAmounts[member.id] || ''}
                    onChange={(e) =>
                      setUnequalAmounts({ ...unequalAmounts, [member.id]: e.target.value })
                    }
                    className="text-right text-xs py-1"
                  />
                </div>
              </div>
            )
          }

          if (splitType === 'Percentage') {
            const pctVal = parseFloat(percentages[member.id] || '0')
            const computedAmt = !isNaN(pctVal) && totalAmount > 0 ? (pctVal / 100) * totalAmount : 0

            return (
              <div
                key={member.id}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
              >
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 shrink-0">
                  {member.guestName}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">{formatINR(computedAmt)}</span>
                  <div className="w-20">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder="0%"
                      value={percentages[member.id] || ''}
                      onChange={(e) =>
                        setPercentages({ ...percentages, [member.id]: e.target.value })
                      }
                      className="text-right text-xs py-1"
                    />
                  </div>
                </div>
              </div>
            )
          }

          if (splitType === 'Shares') {
            const shareVal = parseInt(shares[member.id] || '0', 10)
            const totalS = Object.values(shares).reduce((a, b) => a + (parseInt(b, 10) || 0), 0)
            const computedAmt =
              totalS > 0 && totalAmount > 0 && shareVal > 0
                ? (shareVal / totalS) * totalAmount
                : 0

            return (
              <div
                key={member.id}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
              >
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 shrink-0">
                  {member.guestName}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">{formatINR(computedAmt)}</span>
                  <div className="w-20">
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="1 share"
                      value={shares[member.id] || ''}
                      onChange={(e) =>
                        setShares({ ...shares, [member.id]: e.target.value })
                      }
                      className="text-right text-xs py-1"
                    />
                  </div>
                </div>
              </div>
            )
          }

          return null
        })}
      </div>
    </div>
  )
}
