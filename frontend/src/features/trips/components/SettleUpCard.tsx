import React from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { CheckCircle2, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react'
import type { SettlementInstruction } from '../types'
import { useCurrency } from '../../../context/CurrencyContext'

export interface SettleUpCardProps {
  instructions: SettlementInstruction[]
  onSettleUp: (instruction: SettlementInstruction) => void
  readOnly?: boolean
}

export const SettleUpCard: React.FC<SettleUpCardProps> = ({
  instructions,
  onSettleUp,
  readOnly = false,
}) => {
  const { formatCurrency } = useCurrency()
  const formatINR = formatCurrency
  if (instructions.length === 0) {
    return (
      <Card className="p-8 text-center border border-slate-200 dark:border-slate-800 bg-emerald-50/20 dark:bg-emerald-950/10">
        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
          All Balances Settled
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          No pending debts or repayments between members. Everyone is squared away!
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Notice regarding Pure Bookkeeping */}
      <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 flex items-start gap-2.5 text-xs text-indigo-900 dark:text-indigo-200">
        <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Greedy Debt Simplification & Pure Bookkeeping:</span> Debts
          are minimized into the fewest possible direct transactions. Recording a settlement updates
          the internal trip ledger only; WealthFlow does not invoke payment gateways or banking apps.
        </div>
      </div>

      {/* Grid of settlement instructions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {instructions.map((inst, index) => (
          <Card
            key={`${inst.fromMemberId}-${inst.toMemberId}-${index}`}
            className="p-5 border border-slate-200 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-shadow"
          >
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  Suggested Repayment #{index + 1}
                </span>
                <span className="font-mono text-[11px] text-slate-400">Direct Settlement</span>
              </div>

              <div className="flex items-center justify-between gap-2 py-3 border-y border-slate-100 dark:border-slate-800">
                <div className="space-y-0.5">
                  <span className="text-[11px] uppercase tracking-wider text-rose-600 dark:text-rose-400 font-bold">
                    Debtor
                  </span>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {inst.fromMemberName}
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-0.5">
                    {formatINR(inst.amount)}
                  </span>
                  <div className="flex items-center gap-1 text-slate-400">
                    <div className="w-8 h-0.5 bg-slate-300 dark:bg-slate-700" />
                    <ArrowRight className="w-4 h-4 text-indigo-500" />
                  </div>
                </div>

                <div className="space-y-0.5 text-right">
                  <span className="text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold">
                    Creditor
                  </span>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {inst.toMemberName}
                  </div>
                </div>
              </div>
            </div>

            {!readOnly && (
              <div className="pt-4 flex items-center justify-end">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => onSettleUp(inst)}
                  className="w-full sm:w-auto"
                >
                  Record Settle Up
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
