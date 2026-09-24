import React, { useState } from 'react'
import {
  Building2,
  Wallet,
  Smartphone,
  CreditCard,
  PiggyBank,
  Landmark,
  RefreshCw,
  MoreVertical,
  Edit2,
  Archive,
  ArchiveRestore,
  Trash2,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { Account, AccountType } from '../types'

export interface AccountCardProps {
  account: Account
  onEdit: (account: Account) => void
  onReconcile: (account: Account) => Promise<void>
  onToggleArchive: (account: Account) => Promise<void>
  onDelete: (account: Account) => void | Promise<void>
  isReconciling?: boolean
}

const getAccountIcon = (type: AccountType) => {
  switch (type) {
    case 'Bank':
      return <Building2 className="w-5 h-5" />
    case 'Cash':
      return <Wallet className="w-5 h-5" />
    case 'Wallet':
      return <Smartphone className="w-5 h-5" />
    case 'CreditCard':
      return <CreditCard className="w-5 h-5" />
    case 'Savings':
      return <PiggyBank className="w-5 h-5" />
    default:
      return <Landmark className="w-5 h-5" />
  }
}

import { useCurrency } from '../../../context/CurrencyContext'

export const AccountCard: React.FC<AccountCardProps> = ({
  account,
  onEdit,
  onReconcile,
  onToggleArchive,
  onDelete,
  isReconciling = false,
}) => {
  const { formatCurrency } = useCurrency()
  const formatINR = formatCurrency
  const [menuOpen, setMenuOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)

  const accentColor = account.colorTag || '#4F46E5'

  const handleToggleArchive = async () => {
    setIsArchiving(true)
    try {
      await onToggleArchive(account)
    } finally {
      setIsArchiving(false)
      setMenuOpen(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await onDelete(account)
    } finally {
      setIsDeleting(false)
      setMenuOpen(false)
    }
  }

  return (
    <div
      className={`relative flex flex-col justify-between p-5 rounded-xl bg-white dark:bg-slate-900 border transition-all duration-200 shadow-sm hover:shadow-md ${
        account.isActive
          ? 'border-slate-200 dark:border-slate-800'
          : 'border-slate-200/60 dark:border-slate-800/60 opacity-70 bg-slate-50/50 dark:bg-slate-950/40'
      }`}
    >
      {/* Top Color Accent Line */}
      <div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
        style={{ backgroundColor: accentColor }}
      />

      {/* Header: Icon, Name, Mask & Dropdown */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="p-2.5 rounded-lg flex items-center justify-center shrink-0"
              style={{
                backgroundColor: `${accentColor}18`,
                color: accentColor,
              }}
            >
              {getAccountIcon(account.accountType)}
            </div>

            <div className="min-w-0">
              <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100 truncate">
                {account.name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {account.accountType}
                </span>
                {account.accountNumberMask && (
                  <span className="font-mono text-xs text-slate-400 dark:text-slate-500 tracking-wider">
                    {account.accountNumberMask}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Account options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 mt-1 w-44 z-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      onEdit(account)
                    }}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                    Edit Details
                  </button>

                  <button
                    type="button"
                    disabled={isArchiving}
                    onClick={handleToggleArchive}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60"
                  >
                    {account.isActive ? (
                      <>
                        <Archive className="w-3.5 h-3.5 text-amber-500" />
                        Archive Account
                      </>
                    ) : (
                      <>
                        <ArchiveRestore className="w-3.5 h-3.5 text-emerald-500" />
                        Activate Account
                      </>
                    )}
                  </button>

                  <div className="border-t border-slate-100 dark:border-slate-700 my-1" />

                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleDelete}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Account
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Status Badge */}
        {!account.isActive && (
          <div className="mt-2.5">
            <Badge variant="amber" size="sm">
              Archived
            </Badge>
          </div>
        )}
      </div>

      {/* Balance Section */}
      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Current Balance
          </span>
          <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
            Open: {formatINR(account.openingBalance)}
          </span>
        </div>

        <div className="mt-1 flex items-center justify-between">
          <div className="font-mono text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 tabular-nums">
            {formatINR(account.currentBalance)}
          </div>

          <Button
            variant="ghost"
            size="sm"
            disabled={isReconciling || !account.isActive}
            onClick={() => onReconcile(account)}
            title="Reconcile balance against ledger"
            leftIcon={
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isReconciling ? 'animate-spin text-indigo-600' : 'text-slate-500'
                }`}
              />
            }
          >
            Reconcile
          </Button>
        </div>
      </div>
    </div>
  )
}
