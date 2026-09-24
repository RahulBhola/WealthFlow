import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { TripsListPage } from './pages/TripsListPage'
import { TripWorkspacePage } from './pages/TripWorkspacePage'
import { GuestTripViewPage } from './pages/GuestTripViewPage'
import { tripsApi } from './api/tripsApi'
import type { Trip, TripDetail, GuestTripView } from './types'

vi.mock('./api/tripsApi', () => ({
  tripsApi: {
    getTrips: vi.fn(),
    getTrip: vi.fn(),
    createTrip: vi.fn(),
    updateTrip: vi.fn(),
    addMember: vi.fn(),
    createGuestLink: vi.fn(),
    revokeGuestLink: vi.fn(),
    getExpenses: vi.fn(),
    addExpense: vi.fn(),
    getAdvances: vi.fn(),
    addAdvance: vi.fn(),
    getSummary: vi.fn(),
    executeSettlement: vi.fn(),
    getGuestTripView: vi.fn(),
    addGuestExpense: vi.fn(),
  },
}))

// Mock useTripHub hook
vi.mock('./hooks/useTripHub', () => ({
  useTripHub: vi.fn(),
}))

// Mock SignalR
vi.mock('@microsoft/signalr', () => ({
  HubConnectionBuilder: class {
    withUrl() {
      return this
    }
    withAutomaticReconnect() {
      return this
    }
    configureLogging() {
      return this
    }
    build() {
      return {
        start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
        on: vi.fn(),
        invoke: vi.fn().mockResolvedValue(undefined),
        state: 'Connected',
      }
    }
  },
  HttpTransportType: {
    WebSockets: 1,
    LongPolling: 4,
  },
  LogLevel: {
    Warning: 2,
  },
}))

const mockTrips: Trip[] = [
  {
    id: 'trip-1',
    hostUserId: 'user-1',
    name: 'Goa Summer Retreat',
    destination: 'Goa, India',
    startDate: '2026-10-01T00:00:00Z',
    endDate: '2026-10-05T00:00:00Z',
    budget: 60000,
    status: 'Active',
    totalExpenses: 24000,
    memberCount: 3,
    createdAtUtc: '2026-09-01T00:00:00Z',
  },
  {
    id: 'trip-2',
    hostUserId: 'user-1',
    name: 'Manali Trek',
    destination: 'Manali, HP',
    startDate: '2026-11-10T00:00:00Z',
    endDate: '2026-11-15T00:00:00Z',
    budget: 40000,
    status: 'Planning',
    totalExpenses: 5000,
    memberCount: 2,
    createdAtUtc: '2026-09-10T00:00:00Z',
  },
]

const mockTripDetail: TripDetail = {
  trip: mockTrips[0],
  members: [
    {
      id: 'm-1',
      tripId: 'trip-1',
      guestName: 'Rahul (Host)',
      registeredUserId: 'user-1',
      canAddExpenses: true,
      hasActiveGuestToken: false,
      createdAtUtc: '2026-09-01T00:00:00Z',
    },
    {
      id: 'm-2',
      tripId: 'trip-1',
      guestName: 'Priya',
      canAddExpenses: true,
      hasActiveGuestToken: true,
      tokenExpiresAtUtc: '2026-11-01T00:00:00Z',
      createdAtUtc: '2026-09-01T00:00:00Z',
    },
    {
      id: 'm-3',
      tripId: 'trip-1',
      guestName: 'Vikram',
      canAddExpenses: true,
      hasActiveGuestToken: false,
      createdAtUtc: '2026-09-01T00:00:00Z',
    },
  ],
  expenses: [
    {
      id: 'exp-1',
      tripId: 'trip-1',
      payerMemberId: 'm-1',
      payerName: 'Rahul (Host)',
      amount: 24000,
      expenseDate: '2026-10-02T00:00:00Z',
      description: 'Villa Booking',
      splitType: 'Equal',
      splits: [
        { id: 's-1', memberId: 'm-1', memberName: 'Rahul (Host)', allocatedAmount: 8000 },
        { id: 's-2', memberId: 'm-2', memberName: 'Priya', allocatedAmount: 8000 },
        { id: 's-3', memberId: 'm-3', memberName: 'Vikram', allocatedAmount: 8000 },
      ],
      createdAtUtc: '2026-10-02T00:00:00Z',
    },
  ],
  advances: [
    {
      id: 'adv-1',
      tripId: 'trip-1',
      giverMemberId: 'm-2',
      giverName: 'Priya',
      receiverMemberId: 'm-1',
      receiverName: 'Rahul (Host)',
      amount: 3000,
      advanceDate: '2026-09-25T00:00:00Z',
      notes: 'Initial cash deposit',
      createdAtUtc: '2026-09-25T00:00:00Z',
    },
  ],
  settlements: [
    {
      id: 'set-1',
      tripId: 'trip-1',
      payerMemberId: 'm-2',
      payerName: 'Priya',
      receiverMemberId: 'm-1',
      receiverName: 'Rahul (Host)',
      amount: 1000,
      settledAtUtc: '2026-10-03T00:00:00Z',
      settlementMethod: 'UPI',
      notes: 'Partial payment',
      isConfirmed: true,
    },
  ],
  summary: {
    tripId: 'trip-1',
    totalGroupSpending: 24000,
    budget: 60000,
    budgetUtilizationPercentage: 40,
    memberSummaries: [
      {
        memberId: 'm-1',
        memberName: 'Rahul (Host)',
        totalPaid: 24000,
        fairShare: 8000,
        advancesGiven: 0,
        advancesReceived: 3000,
        settlementsPaid: 0,
        settlementsReceived: 1000,
        netBalance: 12000,
        isSettled: false,
      },
      {
        memberId: 'm-2',
        memberName: 'Priya',
        totalPaid: 0,
        fairShare: 8000,
        advancesGiven: 3000,
        advancesReceived: 0,
        settlementsPaid: 1000,
        settlementsReceived: 0,
        netBalance: -4000,
        isSettled: false,
      },
      {
        memberId: 'm-3',
        memberName: 'Vikram',
        totalPaid: 0,
        fairShare: 8000,
        advancesGiven: 0,
        advancesReceived: 0,
        settlementsPaid: 0,
        settlementsReceived: 0,
        netBalance: -8000,
        isSettled: false,
      },
    ],
    simplifiedRepayments: [
      {
        fromMemberId: 'm-3',
        fromMemberName: 'Vikram',
        toMemberId: 'm-1',
        toMemberName: 'Rahul (Host)',
        amount: 8000,
      },
      {
        fromMemberId: 'm-2',
        fromMemberName: 'Priya',
        toMemberId: 'm-1',
        toMemberName: 'Rahul (Host)',
        amount: 4000,
      },
    ],
  },
}

const mockGuestView: GuestTripView = {
  trip: mockTrips[0],
  currentMember: mockTripDetail.members[1], // Priya
  members: mockTripDetail.members,
  expenses: mockTripDetail.expenses,
  advances: mockTripDetail.advances,
  settlements: mockTripDetail.settlements,
  summary: mockTripDetail.summary,
}

describe('Milestone 7: Trips Workspace & Settlement Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders TripsListPage with metrics and list of trips', async () => {
    vi.mocked(tripsApi.getTrips).mockResolvedValue(mockTrips)

    render(
      <MemoryRouter>
        <TripsListPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Trips Workspace')).toBeInTheDocument()
      expect(screen.getByText('Goa Summer Retreat')).toBeInTheDocument()
      expect(screen.getByText('Manali Trek')).toBeInTheDocument()
    })

    // Verify Metric strip
    expect(screen.getByText('Active Trips')).toBeInTheDocument()
    expect(screen.getByText('Total Group Spending')).toBeInTheDocument()
  })

  it('filters trips by search input and status tabs', async () => {
    vi.mocked(tripsApi.getTrips).mockResolvedValue(mockTrips)

    render(
      <MemoryRouter>
        <TripsListPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Goa Summer Retreat')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(/search by trip name/i)
    fireEvent.change(searchInput, { target: { value: 'Manali' } })

    expect(screen.queryByText('Goa Summer Retreat')).not.toBeInTheDocument()
    expect(screen.getByText('Manali Trek')).toBeInTheDocument()
  })

  it('renders TripWorkspacePage with 5 tabs and financial matrix', async () => {
    vi.mocked(tripsApi.getTrip).mockResolvedValue(mockTripDetail)

    render(
      <MemoryRouter initialEntries={['/trips/trip-1']}>
        <Routes>
          <Route path="/trips/:tripId" element={<TripWorkspacePage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Goa Summer Retreat')).toBeInTheDocument()
      expect(screen.getByText('Participant Financial Matrix')).toBeInTheDocument()
      expect(screen.getByText(/Ledger Balanced/i)).toBeInTheDocument()
    })

    // Check members in financial matrix
    expect(screen.getAllByText('Rahul (Host)').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Priya').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Vikram').length).toBeGreaterThan(0)

    // Check greedy debt minimization repayment instructions
    expect(screen.getByText(/Suggested Greedy Settlements/i)).toBeInTheDocument()
    expect(screen.getByText('Suggested Repayment #1')).toBeInTheDocument()
    expect(screen.getByText('Suggested Repayment #2')).toBeInTheDocument()

    // Switch to Expenses tab
    fireEvent.click(screen.getByRole('button', { name: /Expenses/i }))
    expect(screen.getByText('Villa Booking')).toBeInTheDocument()

    // Switch to Advances tab and verify Travel Advance Invariant notice
    fireEvent.click(screen.getByRole('button', { name: /Travel Advances/i }))
    expect(screen.getByText(/Travel Advance Invariant/i)).toBeInTheDocument()
    expect(screen.getByText(/Initial cash deposit/)).toBeInTheDocument()

    // Switch to Participants tab
    fireEvent.click(screen.getByRole('button', { name: /Participants/i }))
    expect(screen.getByText('Trip Participants (3)')).toBeInTheDocument()

    // Switch to Settlement History tab
    fireEvent.click(screen.getByRole('button', { name: /Settlement History/i }))
    expect(screen.getByText('Confirmed Settle-Up History (1)')).toBeInTheDocument()
    expect(screen.getByText(/Partial payment/)).toBeInTheDocument()
  }, 15000)

  it('opens Settle Up modal and executes pure informational settlement', async () => {
    vi.mocked(tripsApi.getTrip).mockResolvedValue(mockTripDetail)
    vi.mocked(tripsApi.executeSettlement).mockResolvedValue({
      id: 'set-new',
      tripId: 'trip-1',
      payerMemberId: 'm-3',
      payerName: 'Vikram',
      receiverMemberId: 'm-1',
      receiverName: 'Rahul (Host)',
      amount: 8000,
      settledAtUtc: new Date().toISOString(),
      settlementMethod: 'UPI',
      notes: undefined,
      isConfirmed: true,
    })

    render(
      <MemoryRouter initialEntries={['/trips/trip-1']}>
        <Routes>
          <Route path="/trips/:tripId" element={<TripWorkspacePage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getAllByText('Record Settle Up').length).toBeGreaterThan(0)
    })

    // Click first Settle Up button
    const settleBtns = screen.getAllByRole('button', { name: /Record Settle Up/i })
    fireEvent.click(settleBtns[0])

    await waitFor(() => {
      expect(screen.getByText(/Pure Bookkeeping Record/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Confirm Settle Up/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Confirm Settle Up/i }))

    await waitFor(() => {
      expect(tripsApi.executeSettlement).toHaveBeenCalledWith(
        'trip-1',
        expect.objectContaining({
          payerMemberId: 'm-3',
          receiverMemberId: 'm-1',
          amount: 8000,
        })
      )
    })
  })

  it('renders GuestTripViewPage with cryptographic token isolation', async () => {
    vi.mocked(tripsApi.getGuestTripView).mockResolvedValue(mockGuestView)

    render(
      <MemoryRouter initialEntries={['/trip/trip-1/guest/test-crypto-token-64']}>
        <Routes>
          <Route path="/trip/:tripId/guest/:token" element={<GuestTripViewPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Trip Companion')).toBeInTheDocument()
      expect(screen.getByText(/Cryptographically Isolated Guest View/i)).toBeInTheDocument()
      expect(screen.getByText('Goa Summer Retreat')).toBeInTheDocument()
      expect(screen.getAllByText('Priya').length).toBeGreaterThan(0)
    })

    expect(tripsApi.getGuestTripView).toHaveBeenCalledWith('trip-1', 'test-crypto-token-64')
  })
})
