/**
 * Common user profile type for navigation and session state.
 */
export interface CurrentUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'Admin' | 'User'
  currencyCode: string
}

/**
 * Metric KPI data structure for the 4-card metric strip.
 */
export interface MetricKpi {
  id: string
  label: string
  value: string
  delta?: {
    value: string
    isPositive: boolean
  }
  subtext?: string
  variant?: 'brand' | 'inflow' | 'outflow' | 'warning' | 'neutral'
}

/**
 * Navigation item for desktop sidebar and mobile navigation drawer.
 */
export interface NavItem {
  name: string
  path: string
  icon: string
  badge?: string
  isAdminOnly?: boolean
}
