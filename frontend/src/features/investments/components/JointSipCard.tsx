import React, { useState } from 'react'
import {
  Users,
  User,
  Calendar,
  CreditCard,
  Play,
  Pause,
  TrendingUp,
  AlertCircle,
} from 'lucide-react'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { Sip } from '../types'
import { useCurrency } from '../../../context/CurrencyContext'

export interface JointSipCardProps {
  sip: Sip
  onExecute: (sip: Sip) => Promise<void>
  onToggleStatus: (sip: Sip, newStatus: 'Active' | 'Paused' | 'Stopped') => Promise<void>
}

export const JointSipCard: React.FC<JointSipCardProps> = ({
  sip,
  onExecute,
  onToggleStatus,
}) => {
  const { formatCurrency } = useCurrency()
  const formatINR = formatCurrency
  const [isExecuting, setIsExecuting] = useState(false)
  const [isToggling, setIsToggling] = useState(false)

  const handleExecute = async () => {
    try {
      setIsExecuting(true)
      await onExecute(sip)
    } finally {
      setIsExecuting(false)
    }
  }

  const handleToggle = async () => {
    try {
      setIsToggling(true)
      const nextStatus = sip.status === 'Active' ? 'Paused' : 'Active'
      await onToggleStatus(sip, nextStatus)
    } finally {
      setIsToggling(false)
    }
  }

  const userPercent = sip.amount > 0 ? Math.round((sip.userShare / sip.amount) * 100) : 50
  const partnerPercent = 100 - userPercent

  const statusVariant =
    sip.status === 'Active' ? 'emerald' : sip.status === 'Paused' ? 'amber' : 'rose'

  return (
    <Card className="hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200">
      <CardBody className="p-5 flex flex-col justify-between h-full space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 dark:text-white text-base leading-snug">
                {sip.name}
              </h3>
              <Badge variant={statusVariant} size="sm" dot>
                {sip.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Investing into <span className="font-medium text-slate-700 dark:text-slate-300">{sip.investmentName}</span>
            </p>
          </div>

          <div>
            {sip.isJoint ? (
              <Badge variant="indigo" size="sm" className="shrink-0 flex items-center gap-1">
                <Users className="w-3 h-3" />
                Joint with {sip.coInvestorName || 'Partner'}
              </Badge>
            ) : (
              <Badge variant="slate" size="sm" className="shrink-0 flex items-center gap-1">
                <User className="w-3 h-3" />
                Personal SIP
              </Badge>
            )}
          </div>
        </div>

        {/* Commitment & Bank strip */}
        <div className="grid grid-cols-2 gap-4 py-2 border-y border-slate-100 dark:border-slate-800/80">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Monthly Debit
            </span>
            <span className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {formatINR(sip.amount)}
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Schedule & Bank
            </span>
            <div className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              Day {sip.executionDay} of month
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
              <CreditCard className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">{sip.sourceAccountName}</span>
            </div>
          </div>
        </div>

        {/* Segmented Split Meter for Joint SIP */}
        {sip.isJoint && (
          <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-indigo-600 dark:text-indigo-400">
                You: {formatINR(sip.userShare)} ({userPercent}%)
              </span>
              <span className="text-sky-600 dark:text-sky-400">
                {sip.coInvestorName || 'Partner'}: {formatINR(sip.coInvestorShare)} ({partnerPercent}%)
              </span>
            </div>

            {/* Split Progress Meter */}
            <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
              <div
                className="bg-indigo-600 h-full transition-all duration-300"
                style={{ width: `${userPercent}%` }}
                title={`Your Share: ${userPercent}%`}
              />
              <div
                className="bg-sky-500 h-full transition-all duration-300"
                style={{ width: `${partnerPercent}%` }}
                title={`${sip.coInvestorName || 'Partner'} Share: ${partnerPercent}%`}
              />
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 leading-tight">
              <AlertCircle className="w-3 h-3 text-indigo-500 shrink-0" />
              Full debit from bank; partner's share automatically creates a Loan Receivable.
            </p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-1 gap-2">
          <div className="text-[11px] text-slate-400 dark:text-slate-500">
            Next: {new Date(sip.nextExecutionDate).toLocaleDateString('en-IN', {
              month: 'short',
              day: 'numeric',
            })}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggle}
              disabled={isToggling}
              className="text-xs"
            >
              {sip.status === 'Active' ? (
                <>
                  <Pause className="w-3 h-3 mr-1 text-amber-500" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 mr-1 text-emerald-500" />
                  Resume
                </>
              )}
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleExecute}
              disabled={isExecuting || sip.status === 'Stopped'}
              className="text-xs"
            >
              <TrendingUp className="w-3 h-3 mr-1" />
              {isExecuting ? 'Executing...' : 'Execute Now'}
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
