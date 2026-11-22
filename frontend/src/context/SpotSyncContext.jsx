
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getStaffIncidents, getStaffNotifications } from '../services/staffApi'
import { api } from '../services/api'

const SpotSyncContext = createContext(null)

const SENSOR_TO_BAY = {
  SENSOR_001: 'B1-A1',
  SENSOR_002: 'B1-A2',
  SENSOR_003: 'B1-A3',
  SENSOR_004: 'B2-A1',
  SENSOR_005: 'B2-A2',
  SENSOR_006: 'B2-A3',
  SENSOR_007: 'B2-A4',
}

const PARKING_SENSOR_IDS = Object.keys(SENSOR_TO_BAY)
const ENTRANCE_SENSOR_ID = 'SENSOR_008'
const EXPECTED_SENSOR_IDS = [...PARKING_SENSOR_IDS, ENTRANCE_SENSOR_ID]

const BAY_FLOOR = bay =>
  String(bay || '').startsWith('B1-') ? 'Basement 1' : 'Basement 2'

function mapSensor(reading, sensorId) {
  const id = reading?.sensor_id || sensorId
  const isEntrance = id === ENTRANCE_SENSOR_ID
  const bayCode = isEntrance ? null : SENSOR_TO_BAY[id]

  const location = isEntrance
    ? 'Entrance / Ramp'
    : BAY_FLOOR(bayCode)

  if (!reading) {
    return {
      id,
      sensor_id: id,
      space: isEntrance ? 'Entrance / Ramp' : (bayCode || 'Unassigned bay'),
      bayCode,
      slot_number: null,
      location,
      status: 'Unknown',
      occupancy: 'UNKNOWN',
      readingStatus: 'UNKNOWN',
      distance_cm: null,
      lastSeen: null,
      timestamp: null,
      is_online: false,
      slotId: null,
    }
  }

  const rawStatus = String(reading.status || 'UNKNOWN').toUpperCase()
  const timestamp = reading.timestamp || null
  const ageMs = timestamp ? Date.now() - new Date(timestamp).getTime() : Infinity

  const isFresh =
    Number.isFinite(ageMs) && ageMs >= -300000 && ageMs <= 120000

  const isOnline =
    reading.is_online === true &&
    isFresh &&
    rawStatus !== 'SENSOR_OFFLINE'

  let displayStatus = 'Unknown'

  if (rawStatus === 'FAULT') {
    displayStatus = 'Fault'
  } else if (rawStatus === 'BLOCKED') {
    displayStatus = 'Blocked'
  } else if (rawStatus === 'UNEXPECTED_OCCUPANCY') {
    displayStatus = 'Unexpected occupancy'
  } else if (rawStatus === 'SENSOR_OFFLINE' || reading.is_online === false) {
    displayStatus = 'Offline'
  } else if (!isFresh) {
    displayStatus = timestamp ? 'Stale' : 'Unknown'
  } else if (isOnline) {
    displayStatus = 'Online'
  }

  const safeOccupancy =
    isOnline && ['AVAILABLE', 'OCCUPIED'].includes(rawStatus)
      ? rawStatus
      : 'UNKNOWN'

  return {
    id,
    sensor_id: id,
    space: isEntrance ? 'Entrance / Ramp' : (bayCode || 'Unassigned bay'),
    bayCode,
    slot_number: reading.slot_number || null,
    location,
    status: displayStatus,
    occupancy: safeOccupancy,
    readingStatus: rawStatus,
    distance_cm: reading.distance_cm ?? null,
    lastSeen: timestamp,
    timestamp,
    is_online: isOnline,
    slotId: reading.slot_id ?? null,
  }
}

function mapIncident(item) {
  return {
    id: item.id,
    space: item.slot_number || item.parking_slot_number || 'Unassigned bay',
    sensor: item.sensor_id || '—',
    expected: item.expected_status || '—',
    detected: item.detected_status || item.event_type || item.incident_type || '—',
    type: item.incident_type || item.type || 'Parking incident',
    priority: item.severity || 'Medium',
    status: item.status || 'Open',
    time: item.created_at || null,
    description: item.description || '',
  }
}

function mapNotification(item) {
  return {
    ...item,
    id: item.id,
    title: item.title || item.subject || item.type || 'SpotSync notification',
    message: item.message || item.body || item.description || '',
    detail: item.message || item.body || item.description || '',
    category: item.category || item.type || 'System',
    type: item.priority || item.severity || 'Info',
    priority: item.priority || item.severity || 'Low',
    time: item.created_at || item.timestamp || null,
    read: Boolean(item.is_read ?? item.read_at ?? item.read),
  }
}

export function SpotSyncProvider({ children }) {
  const [sensors, setSensors] = useState([])
  const [mismatches, setMismatches] = useState([])
  const [notifications, setNotifications] = useState([])
  const [lastSync, setLastSync] = useState(null)
  const [liveError, setLiveError] = useState('')

  useEffect(() => {
    let active = true
    let busy = false

    const load = async () => {
      if (busy) return
      if (!localStorage.getItem('spotsync_access_token')) {
        if (active) setLiveError('Session expired. Please log in again.')
        return
      }

      busy = true

      try {
        const results = await Promise.allSettled([
          api.sensors.latest(),
          getStaffIncidents(),
          getStaffNotifications(),
        ])

        if (!active) return

        const [sensorResult, incidentResult, notificationResult] = results

        // Update sensors independently of incidents and notifications.
        if (sensorResult.status === 'fulfilled') {
          const sensorData = sensorResult.value

          const readings = Array.isArray(sensorData)
            ? sensorData
            : (sensorData?.readings || [])

          const byId = new Map(
            readings.map(reading => [String(reading.sensor_id || '').trim().toUpperCase(), reading])
          )

          setSensors(
            EXPECTED_SENSOR_IDS.map(id => mapSensor(byId.get(id), id))
          )

          setLastSync(new Date())
          setLiveError('')
        } else {
          console.error('Sensor API error:', sensorResult.reason)
          setSensors(EXPECTED_SENSOR_IDS.map(id => mapSensor(null, id)))
          setLiveError(
            sensorResult.reason?.message || 'Sensor data unavailable'
          )
        }

        if (incidentResult.status === 'fulfilled') {
          setMismatches(
            (incidentResult.value || []).map(mapIncident)
          )
        } else {
          console.error('Incident API error:', incidentResult.reason)
        }

        if (notificationResult.status === 'fulfilled') {
          setNotifications(
            (notificationResult.value || []).map(mapNotification)
          )
        } else {
          console.error('Notification API error:', notificationResult.reason)
        }
      } finally {
        busy = false
      }
    }

    load()

    const timer = window.setInterval(load, 5000)

    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [])

  const updateMismatchStatus = () => {
    /* Incident state is server-owned; resolve through its API. */
  }

  const markNotificationRead = () => {
    /* Notification state is server-owned. */
  }

  const markAllNotificationsRead = () => {
    /* Notification state is server-owned. */
  }

  const value = useMemo(
    () => ({
      sensors,
      mismatches,
      notifications,
      lastSync,
      liveError,
      updateMismatchStatus,
      markNotificationRead,
      markAllNotificationsRead,
    }),
    [sensors, mismatches, notifications, lastSync, liveError]
  )

  return (
    <SpotSyncContext.Provider value={value}>
      {children}
    </SpotSyncContext.Provider>
  )
}

export function useSpotSync() {
  const context = useContext(SpotSyncContext)

  if (!context) {
    throw new Error('useSpotSync must be used inside SpotSyncProvider')
  }

  return context
}
