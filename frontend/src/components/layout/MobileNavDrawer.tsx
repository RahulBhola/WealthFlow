import React from 'react'
import { cn } from '@/lib/utils'
import { navigationItems } from './navItems'
import { X, LogOut, CheckCircle2 } from 'lucide-react'

export interface MobileNavDrawerProps {
  isOpen: boolean
  onClose: () => void
  currentPath?: string
  isAdmin?: boolean
  userEmail?: string
  userRole?: string
  onNavigate?: (href: string) => void
  onLogout?: () => void
}

/**
 * Mobile slide-over navigation drawer.
 * Enforces Invariant 3: Eliminates bottom navigation bars and preserves 100% of mobile viewport
 * height for financial data and ledger inspection.
 */
export const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({
  isOpen,
  onClose,
  currentPath = '/',
  isAdmin = false,
  userEmail = 'test@wealthflow.local',
  userRole = 'User',
  onNavigate,
  onLogout,
}) => {
  const visibleItems = navigationItems.filter(item => !item.isAdminOnly || isAdmin)

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out md:hidden border-r border-slate-200 dark:border-slate-800',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
              W
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
                WealthFlow
              </span>
              <span className="text-[10px] uppercase font-semibold text-indigo-600 dark:text-indigo-400">
                ERP Navigation
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Profile Snippet */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-sm">
              {userEmail.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {userEmail}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="px-1.5 py-0.2 text-[10px] font-semibold rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  Role: {userRole}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">INR (₹)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Scroll Area */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => {
            const isActive = currentPath === item.href
            const Icon = item.icon

            return (
              <button
                key={item.name}
                type="button"
                onClick={() => {
                  onNavigate?.(item.href)
                  onClose()
                }}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      'w-4 h-4 shrink-0',
                      isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'
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

        {/* Footer: Online Status & Logout */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span className="font-mono text-[11px]">Synced Offline Cache</span>
            </div>
            <span className="font-mono text-[10px]">v1.0.0</span>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  )
}
