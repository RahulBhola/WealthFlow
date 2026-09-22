import React from 'react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ReceiptText,
  Landmark,
  PiggyBank,
  CreditCard,
  TrendingUp,
  HandCoins,
  Palmtree,
  BarChart3,
  Settings,
  ShieldAlert,
  Smartphone
} from 'lucide-react'

export interface NavItemConfig {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  isAdminOnly?: boolean
}

export const navigationItems: NavItemConfig[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Transactions', href: '/transactions', icon: ReceiptText },
  { name: 'Accounts', href: '/accounts', icon: Landmark },
  { name: 'Budgets', href: '/budgets', icon: PiggyBank },
  { name: 'Credit Cards', href: '/credit-cards', icon: CreditCard },
  { name: 'Investments', href: '/investments', icon: TrendingUp },
  { name: 'Loans & Gifts', href: '/loans', icon: HandCoins },
  { name: 'Trips Workspace', href: '/trips', icon: Palmtree },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Device Sessions', href: '/settings/sessions', icon: Smartphone },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Admin Command', href: '/admin', icon: ShieldAlert, isAdminOnly: true },
]

export interface SidebarProps {
  currentPath?: string
  isAdmin?: boolean
  onNavigate?: (href: string) => void
  className?: string
}

/**
 * Desktop Sidebar component with active link indicators, role filtering, and dark surface aesthetics.
 */
export const Sidebar: React.FC<SidebarProps> = ({
  currentPath = '/',
  isAdmin = false,
  onNavigate,
  className,
}) => {
  const visibleItems = navigationItems.filter(item => !item.isAdminOnly || isAdmin)

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0 h-screen sticky top-0',
        className
      )}
    >
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
          W
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
            WealthFlow
          </span>
          <span className="text-[10px] uppercase font-semibold tracking-wider text-indigo-600 dark:text-indigo-400">
            Enterprise ERP
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive = currentPath === item.href
          const Icon = item.icon

          return (
            <button
              key={item.name}
              type="button"
              onClick={() => onNavigate?.(item.href)}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left select-none',
                isActive
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    'w-4 h-4 shrink-0',
                    isActive
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-400 dark:text-slate-500'
                  )}
                />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Footer / System Status */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[11px]">Online & Synced</span>
          </div>
          <span className="font-mono text-[10px]">v1.0.0</span>
        </div>
      </div>
    </aside>
  )
}
