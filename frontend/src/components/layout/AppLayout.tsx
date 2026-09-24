import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileNavDrawer } from './MobileNavDrawer'

export interface AppLayoutProps {
  children: React.ReactNode
  currentPath?: string
  isAdmin?: boolean
  userEmail?: string
  userRole?: string
  onNavigate?: (href: string) => void
  onLogout?: () => void
  className?: string
}

/**
 * Universal Master Shell enforcing the Universal Single Styling Layout Invariant across the entire application.
 * All feature pages (Personal Finance, Trips, Settings, Admin ERP) mount inside this layout.
 */
export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  currentPath = '/',
  isAdmin = false,
  userEmail = 'test@wealthflow.local',
  userRole = 'User',
  onNavigate,
  onLogout,
  className,
}) => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors overflow-x-hidden">
      {/* Desktop Sidebar (hidden on mobile) */}
      <Sidebar
        currentPath={currentPath}
        isAdmin={isAdmin}
        userEmail={userEmail}
        userRole={userRole}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      {/* Mobile Slide-Over Navigation Drawer */}
      <MobileNavDrawer
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        currentPath={currentPath}
        isAdmin={isAdmin}
        userEmail={userEmail}
        userRole={userRole}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <Header
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
          userEmail={userEmail}
          userRole={userRole}
          onLogout={onLogout}
          onNavigate={onNavigate}
        />

        {/* Universal Page Blueprint Container */}
        <main className={cn('flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6', className)}>
          {children}
        </main>
      </div>
    </div>
  )
}
