import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Menu, Search } from 'lucide-react'
import { SyncPill } from '@/features/sync/components/SyncPill'
import { NotificationPopover } from './NotificationPopover'
import { CurrencySelector } from './CurrencySelector'
import { GlobalSearchModal } from './GlobalSearchModal'

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
 * offline synchronization status pill, notification bell popover, and currency selector.
 * Matches exact high-fidelity design specifications (Image 2).
 */
export const Header: React.FC<HeaderProps> = ({
  onOpenMobileNav,
  onNavigate,
  className,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false)

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
          'h-16 px-4 sm:px-6 lg:px-8 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between gap-4 sticky top-0 z-30 transition-colors',
          className
        )}
      >
        {/* Left Slot: Mobile Hamburger Button & Brand */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileNav}
            aria-label="Open navigation menu"
            className="md:hidden p-2 rounded-lg text-slate-300 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="md:hidden flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
              W
            </div>
            <span className="font-bold text-sm tracking-tight text-white">
              WealthFlow
            </span>
          </div>

          {/* Global Search Trigger (Ctrl+K) matching reference design */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            aria-label="Open global search command palette"
            className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 text-xs text-slate-400 bg-slate-900/90 border border-slate-800 rounded-lg hover:border-slate-700 hover:text-slate-200 transition-colors w-72 justify-between cursor-pointer group shadow-inner"
          >
            <div className="flex items-center gap-2.5">
              <Search className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition-colors" />
              <span>Search Search...</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-800 border border-slate-700 rounded text-slate-400">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Right Slot: [ 🟢 Synced ] [ 🔔 ] [ 🇮🇳 INR ₹  ⌵ ] matching reference design in Image 2 */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Offline Sync Status Pill */}
          <SyncPill />

          {/* Notification Bell with interactive popover */}
          <NotificationPopover />

          {/* Base Currency Selector with country flag & dropdown */}
          <CurrencySelector />
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
