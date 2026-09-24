import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Menu, Search, Sun, Moon, LogOut } from 'lucide-react'
import { SyncPill } from '@/features/sync/components/SyncPill'
import { NotificationPopover } from './NotificationPopover'
import { GlobalSearchModal } from './GlobalSearchModal'
import { useTheme } from '../../context/ThemeContext'

export interface HeaderProps {
  onOpenMobileNav: () => void
  userEmail?: string
  userRole?: string
  onLogout?: () => void
  onNavigate?: (href: string) => void
  className?: string
}

/**
 * Top Header component featuring mobile hamburger button, interactive global search shortcut (Ctrl+K),
 * dark/light mode toggle, live notification popover, and offline synchronization status pill.
 */
export const Header: React.FC<HeaderProps> = ({
  onOpenMobileNav,
  userEmail = 'test@wealthflow.local',
  userRole = 'User',
  onLogout,
  onNavigate,
  className,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()

  // Global Ctrl+K / Cmd+K keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsSearchOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
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
            onClick={() => setIsSearchOpen(true)}
            aria-label="Open global search command palette"
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-lg hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-slate-600 dark:hover:text-slate-200 transition-colors w-64 justify-between cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
              <span>Search transactions, accounts...</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-500 dark:text-slate-300">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Right Slot: Sync Status Pill, Theme Toggle, Notifications, & User Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Offline Sync Status Pill */}
          <div className="hidden sm:flex">
            <SyncPill />
          </div>

          {/* Theme Toggle Button (Light / Dark Mode) */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 focus:outline-none transition-colors"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 hover:text-amber-300 transition-transform duration-200 hover:rotate-45" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600 hover:text-indigo-500 transition-transform duration-200 hover:-rotate-12" />
            )}
          </button>

          {/* Notification Bell with interactive popover */}
          <NotificationPopover />

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

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                title="Sign Out"
                aria-label="Sign Out"
                className="p-1.5 ml-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Global Command Palette / Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={onNavigate}
      />
    </>
  )
}
