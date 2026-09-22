export interface User {
  id: string
  email: string
  fullName: string
  role: 'Admin' | 'User'
  baseCurrency: string
  isLockedOut: boolean
}

export interface Session {
  id: string
  deviceName: string
  deviceType: 'Desktop' | 'Mobile' | 'Tablet'
  browser?: string | null
  ipAddress?: string | null
  lastActiveAtUtc: string
  expiresAtUtc: string
  isCurrent: boolean
}

export interface AuthResponse {
  accessToken: string
  expiresInMinutes: number
  user: User
  session: Session
}

export interface LoginCredentials {
  email: string
  password: string
  deviceName?: string
  deviceType?: string
  browser?: string
}

export interface RegisterCredentials {
  email: string
  password: string
  fullName: string
  currency?: string
}
