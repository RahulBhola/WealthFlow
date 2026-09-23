import { apiClient } from '@/lib/api'
import type {
  Trip,
  TripDetail,
  TripMember,
  TripExpense,
  TripAdvance,
  TripSettlement,
  TripSummary,
  GuestTripView,
  CreateTripPayload,
  UpdateTripPayload,
  AddTripMemberPayload,
  CreateGuestLinkPayload,
  CreateGuestLinkResponse,
  CreateTripExpensePayload,
  CreateTripAdvancePayload,
  ExecuteSettlementPayload,
} from '../types'

export const tripsApi = {
  async getTrips(): Promise<Trip[]> {
    return apiClient<Trip[]>('/api/v1/trips')
  },

  async getTrip(id: string): Promise<TripDetail> {
    return apiClient<TripDetail>(`/api/v1/trips/${id}`)
  },

  async createTrip(payload: CreateTripPayload): Promise<Trip> {
    return apiClient<Trip>('/api/v1/trips', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async updateTrip(id: string, payload: UpdateTripPayload): Promise<Trip> {
    return apiClient<Trip>(`/api/v1/trips/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  async addMember(tripId: string, payload: AddTripMemberPayload): Promise<TripMember> {
    return apiClient<TripMember>(`/api/v1/trips/${tripId}/members`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async createGuestLink(
    tripId: string,
    memberId: string,
    payload: CreateGuestLinkPayload = { canAddExpenses: true, expiryDays: 30 }
  ): Promise<CreateGuestLinkResponse> {
    return apiClient<CreateGuestLinkResponse>(`/api/v1/trips/${tripId}/members/${memberId}/guest-link`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async revokeGuestLink(tripId: string, memberId: string): Promise<{ success: boolean }> {
    return apiClient<{ success: boolean }>(`/api/v1/trips/${tripId}/members/${memberId}/revoke-guest-link`, {
      method: 'POST',
    })
  },

  async getExpenses(tripId: string): Promise<TripExpense[]> {
    return apiClient<TripExpense[]>(`/api/v1/trips/${tripId}/expenses`)
  },

  async addExpense(tripId: string, payload: CreateTripExpensePayload): Promise<TripExpense> {
    return apiClient<TripExpense>(`/api/v1/trips/${tripId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async getAdvances(tripId: string): Promise<TripAdvance[]> {
    return apiClient<TripAdvance[]>(`/api/v1/trips/${tripId}/advances`)
  },

  async addAdvance(tripId: string, payload: CreateTripAdvancePayload): Promise<TripAdvance> {
    return apiClient<TripAdvance>(`/api/v1/trips/${tripId}/advances`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async getSummary(tripId: string): Promise<TripSummary> {
    return apiClient<TripSummary>(`/api/v1/trips/${tripId}/summary`)
  },

  async executeSettlement(tripId: string, payload: ExecuteSettlementPayload): Promise<TripSettlement> {
    return apiClient<TripSettlement>(`/api/v1/trips/${tripId}/settlement/execute`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  // Anonymous Guest Link Endpoints
  async getGuestTripView(tripId: string, token: string): Promise<GuestTripView> {
    return apiClient<GuestTripView>(`/api/v1/trips/${tripId}/guest/${encodeURIComponent(token)}`, {
      skipAuth: true,
    })
  },

  async addGuestExpense(
    tripId: string,
    token: string,
    payload: CreateTripExpensePayload
  ): Promise<TripExpense> {
    return apiClient<TripExpense>(`/api/v1/trips/${tripId}/guest/${encodeURIComponent(token)}/expenses`, {
      method: 'POST',
      body: JSON.stringify(payload),
      skipAuth: true,
    })
  },
}
