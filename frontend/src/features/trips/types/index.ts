export interface Trip {
  id: string
  hostUserId: string
  name: string
  destination: string
  startDate: string
  endDate: string
  budget?: number | null
  status: 'Planning' | 'Active' | 'Completed' | 'Archived' | string
  totalExpenses: number
  memberCount: number
  createdAtUtc: string
}

export interface TripMember {
  id: string
  tripId: string
  guestName: string
  registeredUserId?: string | null
  canAddExpenses: boolean
  hasActiveGuestToken: boolean
  tokenExpiresAtUtc?: string | null
  createdAtUtc: string
}

export interface TripExpenseSplit {
  id: string
  memberId: string
  memberName: string
  allocatedAmount: number
  allocatedPercentage?: number | null
  allocatedShares?: number | null
}

export interface SplitInput {
  memberId: string
  allocatedAmount?: number | null
  allocatedPercentage?: number | null
  allocatedShares?: number | null
}

export interface TripExpense {
  id: string
  tripId: string
  payerMemberId: string
  payerName: string
  amount: number
  expenseDate: string
  description: string
  categoryId?: string | null
  splitType: 'Equal' | 'Unequal' | 'Percentage' | 'Shares' | string
  splits: TripExpenseSplit[]
  createdAtUtc: string
}

export interface TripAdvance {
  id: string
  tripId: string
  giverMemberId: string
  giverName: string
  receiverMemberId: string
  receiverName: string
  amount: number
  advanceDate: string
  notes?: string | null
  createdAtUtc: string
}

export interface TripSettlement {
  id: string
  tripId: string
  payerMemberId: string
  payerName: string
  receiverMemberId: string
  receiverName: string
  amount: number
  settledAtUtc: string
  settlementMethod: string
  notes?: string | null
  isConfirmed: boolean
}

export interface MemberSpendingSummary {
  memberId: string
  memberName: string
  totalPaid: number
  fairShare: number
  advancesGiven: number
  advancesReceived: number
  settlementsPaid: number
  settlementsReceived: number
  netBalance: number
  isSettled: boolean
}

export interface SettlementInstruction {
  fromMemberId: string
  fromMemberName: string
  toMemberId: string
  toMemberName: string
  amount: number
}

export interface TripSummary {
  tripId: string
  totalGroupSpending: number
  budget?: number | null
  budgetUtilizationPercentage?: number | null
  memberSummaries: MemberSpendingSummary[]
  simplifiedRepayments: SettlementInstruction[]
}

export interface TripDetail {
  trip: Trip
  members: TripMember[]
  expenses: TripExpense[]
  advances: TripAdvance[]
  settlements: TripSettlement[]
  summary: TripSummary
}

export interface GuestTripView {
  trip: Trip
  currentMember: TripMember
  members: TripMember[]
  expenses: TripExpense[]
  advances: TripAdvance[]
  settlements: TripSettlement[]
  summary: TripSummary
}

export interface CreateTripPayload {
  name: string
  destination: string
  startDate: string
  endDate: string
  budget?: number | null
}

export interface UpdateTripPayload {
  name: string
  destination: string
  startDate: string
  endDate: string
  budget?: number | null
  status?: string | null
}

export interface AddTripMemberPayload {
  guestName: string
  registeredUserId?: string | null
  canAddExpenses?: boolean
}

export interface CreateGuestLinkPayload {
  canAddExpenses?: boolean
  expiryDays?: number
}

export interface CreateGuestLinkResponse {
  memberId: string
  guestName: string
  rawToken: string
  guestUrl: string
  expiresAtUtc: string
}

export interface CreateTripExpensePayload {
  payerMemberId: string
  amount: number
  expenseDate: string
  description: string
  categoryId?: string | null
  splitType?: 'Equal' | 'Unequal' | 'Percentage' | 'Shares'
  splits?: SplitInput[] | null
}

export interface CreateTripAdvancePayload {
  giverMemberId: string
  receiverMemberId: string
  amount: number
  advanceDate: string
  notes?: string | null
}

export interface ExecuteSettlementPayload {
  payerMemberId: string
  receiverMemberId: string
  amount: number
  settledDate: string
  paymentMethod?: string
  notes?: string | null
}
