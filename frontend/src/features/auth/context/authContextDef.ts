import { createContext } from 'react'
import type { User, Session, LoginCredentials, RegisterCredentials } from '../types'

export interface AuthContextType {
  user: User | null
  session: Session | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  register: (credentials: RegisterCredentials) => Promise<void>
  logout: () => Promise<void>
  refreshSessions: () => Promise<Session[]>
  revokeSession: (sessionId: string) => Promise<void>
  revokeAllOtherSessions: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)
