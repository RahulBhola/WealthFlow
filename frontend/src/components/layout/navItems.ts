import React from 'react'
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
  { name: 'Transactions Ledger', href: '/transactions', icon: ReceiptText },
  { name: 'Accounts', href: '/accounts', icon: Landmark },
  { name: 'Budgets', href: '/budgets', icon: PiggyBank },
  { name: 'Credit Cards', href: '/credit-cards', icon: CreditCard },
  { name: 'Investments & Joint SIPs', href: '/investments', icon: TrendingUp },
  { name: 'Trips Workspace', href: '/trips', icon: Palmtree },
  { name: 'Loans & Gifts', href: '/loans', icon: HandCoins },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Device Sessions', href: '/settings/sessions', icon: Smartphone },
  { name: 'Admin ERP', href: '/admin', icon: ShieldAlert, badge: 'ERP', isAdminOnly: true },
]
