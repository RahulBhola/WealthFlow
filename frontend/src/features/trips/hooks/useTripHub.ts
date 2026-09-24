import { useEffect, useRef } from 'react'
import * as signalR from '@microsoft/signalr'

const API_BASE_URL = import.meta.env.VITE_API_URL !== undefined 
  ? import.meta.env.VITE_API_URL 
  : (import.meta.env.PROD ? '' : 'http://localhost:5000')

interface UseTripHubOptions {
  tripId?: string
  onUpdate?: () => void
  enabled?: boolean
}

export function useTripHub({ tripId, onUpdate, enabled = true }: UseTripHubOptions) {
  const connectionRef = useRef<signalR.HubConnection | null>(null)
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  useEffect(() => {
    if (!enabled || !tripId) return

    const hubUrl = `${API_BASE_URL}/hubs/trip`
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    connectionRef.current = connection

    const handleEvent = () => {
      if (onUpdateRef.current) {
        onUpdateRef.current()
      }
    }

    connection.on('ExpenseAdded', handleEvent)
    connection.on('AdvanceRecorded', handleEvent)
    connection.on('SettlementExecuted', handleEvent)
    connection.on('TripSummaryUpdated', handleEvent)
    connection.on('MemberJoined', handleEvent)

    async function start() {
      try {
        await connection.start()
        await connection.invoke('JoinTrip', tripId)
      } catch (err) {
        console.warn('Trip SignalR connection unavailable, relying on standard polling/refresh:', err)
      }
    }

    start()

    return () => {
      if (connection.state === signalR.HubConnectionState.Connected) {
        connection.invoke('LeaveTrip', tripId).catch(() => {})
      }
      connection.stop().catch(() => {})
      connectionRef.current = null
    }
  }, [tripId, enabled])

  return connectionRef.current
}
