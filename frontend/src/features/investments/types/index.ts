export type AssetClassType = 'Mutual Fund' | 'Stock' | 'Fixed Deposit' | 'Gold' | 'PPF' | 'Real Estate' | 'Other'

export interface Investment {
  id: string
  name: string
  assetClass: string
  investedAmount: number
  currentValuation: number
  units: number
  absoluteGainLoss: number
  returnPercentage: number
  lastValuationDate: string | null
  createdAtUtc: string
}

export interface AssetAllocation {
  assetClass: string
  totalInvested: number
  totalValuation: number
  allocationPercentage: number
}

export interface InvestmentSummary {
  totalInvestedAmount: number
  totalCurrentValuation: number
  totalAbsoluteGainLoss: number
  overallReturnPercentage: number
  assetAllocation: AssetAllocation[]
  investments: Investment[]
}

export interface CreateInvestmentPayload {
  name: string
  assetClass: string
  investedAmount: number
  currentValuation: number
  units?: number
  valuationDate?: string
}

export interface UpdateValuationPayload {
  currentValuation: number
  units: number
  valuationDate: string
}

export interface Sip {
  id: string
  investmentId: string
  investmentName: string
  sourceAccountId: string
  sourceAccountName: string
  name: string
  amount: number
  executionDay: number
  startDate: string
  endDate?: string | null
  status: 'Active' | 'Paused' | 'Stopped'
  isJoint: boolean
  userShare: number
  coInvestorShare: number
  coInvestorName?: string | null
  nextExecutionDate: string
  createdAtUtc: string
}

export interface CreateSipPayload {
  investmentId: string
  sourceAccountId: string
  name: string
  amount: number
  executionDay: number
  startDate: string
  endDate?: string | null
  isJoint?: boolean
  userShare?: number
  coInvestorShare?: number
  coInvestorName?: string | null
}

export interface ExecuteSipResponse {
  sipId: string
  transactionId: string
  investmentId: string
  sourceAccountId: string
  totalDebited: number
  userEquityShare: number
  coInvestorReceivableShare: number
  linkedLoanId?: string | null
  reconciliationId?: string | null
  executedDateUtc: string
}

export interface JointSipReconciliation {
  id: string
  sipId: string
  sipName: string
  month: number
  year: number
  executionDateUtc: string
  totalAmount: number
  userShare: number
  coInvestorShare: number
  amountSettled: number
  remainingDue: number
  settlementStatus: 'Pending' | 'PartiallySettled' | 'Settled'
  settlementDateUtc?: string | null
  notes?: string | null
}

export interface JointSipDetail {
  sip: Sip
  totalPartnerDueAcrossCycles: number
  totalPartnerSettledAcrossCycles: number
  pendingCyclesCount: number
  reconciliations: JointSipReconciliation[]
}

export interface JointSipSummary {
  totalJointSipsCount: number
  totalMonthlyCommitment: number
  totalUserMonthlyShare: number
  totalPartnerMonthlyShare: number
  totalPartnerReceivableDue: number
  jointSips: JointSipDetail[]
}

export interface SipRepaymentPayload {
  destinationAccountId?: string | null
  amount: number
  paymentDate: string
  paymentMode?: string
  isMutualDebtOffset: boolean
  offsetNotes?: string | null
  notes?: string | null
}

export interface SipRepaymentResponse {
  reconciliationId: string
  amountSettled: number
  remainingDue: number
  status: string
  isSettled: boolean
  updatedAccountBalance?: number | null
}
