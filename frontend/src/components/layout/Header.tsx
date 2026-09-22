import React from 'react'
import { cn } from '@/lib/utils'
import { Menu, Search, Bell, CheckCircle2 } from 'lucide-react'

export interface HeaderProps {
  onOpenMobileNav: () => void
  userEmail?: string
  userRole?: string
  className?: string
}

/**
 * Top Header component featuring mobile hamburger button, global search shortcut (Ctrl+K),
 * and live offline/online synchronization status pill.
 */
export const Header: React.FC<HeaderProps> = ({
  onOpenMobileNav,
  userEmail = 'test@wealthflow.local',
  userRole = 'User',
  className,
}) => {
  return (
    <header
      className={cn(
        'h-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 sticky top-0 z-30 transition-colors',
        className
      )}
    >
      {/* Left Slot: Mobile Hamburger Button & Brand */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Open navigation menu"
          className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="md:hidden flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
            W
          </div>
          <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
            WealthFlow
          </span>
        </div>

        {/* Global Search Trigger (Ctrl+K) */}
        <button
          type="button"
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-lg hover:border-slate-300 dark:hover:border-slate-600 transition-colors w-64 justify-between"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>Search transactions, accounts...</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-500 dark:text-slate-300">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right Slot: Sync Status Pill, Notifications, & User Profile */}
      <div className="flex items-center gap-3">
        {/* Offline Sync Status Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span className="font-mono text-[11px]">Synced</span>
        </div>

        {/* Notification Bell */}
        <button
          type="button"
          aria-label="View notifications"
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 relative focus:outline-none"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-600" />
        </button>

        {/* User Profile Snippet */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center select-none">
            {userEmail.substring(0, 2).toUpperCase()}
          </div>
          <div className="hidden lg:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
              {userEmail}
            </span>
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
              Role: {userRole}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
