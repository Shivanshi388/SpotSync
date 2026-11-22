import React, { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  AlertCircle, CheckCircle2, Loader2, MapPin,
  Navigation as NavigationIcon, RefreshCw, Car, Clock
} from 'lucide-react'
const API_URL = `${(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api').replace(/\/+$/, '')}/tickets/driver`

export default function PublicNavigation({ token: suppliedToken } = {}) {
  const params = useParams()
  const token = suppliedToken || params.token
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)

  const loadNavigation = useCallback(async (signal) => {
    if (!token || token.length < 8) {
      setData(null)
      setError('This navigation link is invalid.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        `${API_URL}/${encodeURIComponent(token)}`,
        {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal
        }
      )

      let result = {}
      try {
        result = await response.json()
      } catch {
        result = {}
      }

      if (!response.ok) {
        if (response.status === 401 || response.status === 403 || response.status === 404) {
          throw new Error('This ticket is invalid, expired, revoked, or unavailable.')
        }
        if (response.status === 410) {
          throw new Error('This parking ticket has expired or is no longer active.')
        }
        if (response.status >= 500) {
          throw new Error('The navigation service is temporarily unavailable. Please try again.')
        }
        throw new Error(result.detail || result.message || 'Unable to verify this navigation link.')
      }

      if (result.valid === false || result.is_valid === false) {
        throw new Error(result.message || 'This navigation link is no longer valid.')
      }

      setData(result)
    } catch (err) {
      if (err.name !== 'AbortError') {
        setData(null)
        setError(err.message || 'Unable to load navigation details.')
      }
    } finally {
      if (!signal.aborted) setLoading(false)
    }
  }, [token])

  useEffect(() => {
    const controller = new AbortController()
    loadNavigation(controller.signal)
    return () => controller.abort()
  }, [loadNavigation, retryCount])

  const vehicle = data?.vehicle || {}
  const slot = data?.slot || data?.parking_slot || {}
  const route = data?.route || data?.path || []
  const steps = Array.isArray(route)
    ? route
    : route?.steps || route?.nodes || []

  const read = (object, ...keys) => {
    for (const key of keys) {
      const value = object?.[key]
      if (value !== undefined && value !== null && String(value).trim()) {
        return String(value)
      }
    }
    return ''
  }

  const vehicleNumber = read(
    vehicle, 'registration_number', 'vehicle_number', 'registration', 'number'
  ) || read(data, 'registration_number', 'vehicle_number')

  const slotName = read(
    slot, 'slot_number', 'name', 'label', 'slot_code'
  ) || read(data, 'slot_name', 'slot_label')

  const floor = read(slot, 'floor_name', 'floor', 'level')
    || read(data, 'floor_name', 'floor', 'level')

  const status = read(data, 'status', 'session_status') || 'ACTIVE'
  const mapPoints = steps.map((step, index) => {
    if (!step || typeof step !== 'object') return null
    const x = Number(step.x ?? step.position_x ?? step.map_x)
    const y = Number(step.y ?? step.position_y ?? step.map_y)
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null
    return { x, y, label: read(step, 'name', 'label', 'instruction') || `Point ${index + 1}` }
  }).filter(Boolean)

  const mapReady = mapPoints.length >= 2
  const minX = mapReady ? Math.min(...mapPoints.map(point => point.x)) : 0
  const maxX = mapReady ? Math.max(...mapPoints.map(point => point.x)) : 100
  const minY = mapReady ? Math.min(...mapPoints.map(point => point.y)) : 0
  const maxY = mapReady ? Math.max(...mapPoints.map(point => point.y)) : 100
  const plotPoints = mapReady ? mapPoints.map(point => ({
    ...point,
    px: 24 + ((point.x - minX) / Math.max(1, maxX - minX)) * 252,
    py: 24 + ((point.y - minY) / Math.max(1, maxY - minY)) * 152
  })) : []
  const floorChanges = steps.reduce((changes, step, index) => {
    if (!step || typeof step !== 'object') return changes
    const currentFloor = read(step, 'floor', 'floor_name', 'level')
    const previousFloor = index > 0 && steps[index - 1] && typeof steps[index - 1] === 'object'
      ? read(steps[index - 1], 'floor', 'floor_name', 'level')
      : ''
    if (currentFloor && previousFloor && currentFloor !== previousFloor) {
      changes.push({ index, from: previousFloor, to: currentFloor })
    }
    return changes
  }, [])

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div style={styles.brand}>
          <div style={styles.brandIcon}><NavigationIcon size={21} /></div>
          <div>
            <strong>SpotSync</strong>
            <span>Driver navigation</span>
          </div>
        </div>
        <span style={styles.publicLabel}>PUBLIC TICKET</span>
      </header>

      <section style={styles.container}>
        {loading ? (
          <div style={styles.stateCard}>
            <Loader2 size={38} style={{ animation: 'spotsync-spin 1s linear infinite' }} />
            <h2>Verifying your ticket</h2>
            <p>Please wait while we securely retrieve your parking details.</p>
          </div>
        ) : error ? (
          <div style={styles.stateCard}>
            <AlertCircle size={42} color="#dc2626" />
            <h2>Navigation unavailable</h2>
            <p>{error}</p>
            <button
              type="button"
              style={styles.primaryButton}
              onClick={() => setRetryCount(value => value + 1)}
            >
              <RefreshCw size={17} /> Try again
            </button>
          </div>
        ) : data ? (
          <>
            <div style={styles.successBanner}>
              <CheckCircle2 size={20} />
              <span>Ticket verified successfully</span>
            </div>

            <section style={styles.card}>
              <div style={styles.cardHeading}>
                <div>
                  <span style={styles.eyebrow}>YOUR PARKING DETAILS</span>
                  <h1>Welcome to your parking spot</h1>
                </div>
                <Car size={29} color="#2563eb" />
              </div>

              <div className="spotsync-detail-grid" style={styles.detailGrid}>
                <div style={styles.detail}>
                  <span>Vehicle</span>
                  <strong>{vehicleNumber || 'Not provided'}</strong>
                </div>
                <div style={styles.detail}>
                  <span>Parking bay</span>
                  <strong>{slotName || 'Not assigned'}</strong>
                </div>
                <div style={styles.detail}>
                  <span>Floor</span>
                  <strong>{floor || 'Not provided'}</strong>
                </div>
                <div style={styles.detail}>
                  <span>Session status</span>
                  <strong>{status}</strong>
                </div>
              </div>
            </section>

            <section style={styles.card}>
              <div style={styles.routeTitle}>
                <MapPin size={21} color="#2563eb" />
                <div>
                  <h2>Navigation instructions</h2>
                  <p>Follow the available directions to your assigned bay.</p>
                </div>
              </div>

              {mapReady && (
                <div className="spotsync-map-panel" style={styles.mapPanel}>
                  <div style={styles.mapHeader}>
                    <strong>Indoor route map</strong>
                    <span>{mapPoints.length} waypoints</span>
                  </div>
                  <svg viewBox="0 0 300 200" role="img"
                    aria-label="Indoor parking route map"
                    style={{ width: '100%', display: 'block' }}>
                    <defs>
                      <pattern id="spotsync-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e8edf5" strokeWidth="1" />
                      </pattern>
                    </defs>
                    <rect width="300" height="200" rx="12" fill="#f8fafc" />
                    <rect width="300" height="200" rx="12" fill="url(#spotsync-grid)" />
                    <polyline
                      points={plotPoints.map(point => `${point.px},${point.py}`).join(' ')}
                      fill="none" stroke="#2563eb" strokeWidth="5"
                      strokeLinecap="round" strokeLinejoin="round"
                    />
                    {plotPoints.map((point, index) => (
                      <g key={index}>
                        <circle cx={point.px} cy={point.py} r="8"
                          fill={index === 0 ? '#16a34a' : index === plotPoints.length - 1 ? '#dc2626' : '#2563eb'}
                          stroke="#fff" strokeWidth="3" />
                        <text x={point.px} y={Math.max(13, point.py - 13)}
                          textAnchor="middle" fontSize="9" fill="#334155">
                          {index === 0 ? 'START' : index === plotPoints.length - 1 ? 'BAY' : index + 1}
                        </text>
                      </g>
                    ))}
                  </svg>
                  <p style={styles.mapCaption}>
                    Route visualization uses waypoint coordinates supplied by the navigation API.
                  </p>
                </div>
              )}
              {steps.length > 0 ? (
                <ol style={styles.steps}>
                  {steps.map((step, index) => {
                    const instruction = typeof step === 'string'
                      ? step
                      : read(step, 'instruction', 'description', 'name', 'label', 'action')
                        || `Proceed to waypoint ${index + 1}`

                    return (
                      <li key={step?.id ?? index} style={styles.step}>
                        <span style={styles.stepNumber}>{index + 1}</span>
                        <span>{instruction}</span>
                      </li>
                    )
                  })}
                </ol>
              ) : (
                <div style={styles.noRoute}>
                  <MapPin size={22} />
                  <span>
                    Your ticket is verified, but detailed route instructions
                    are not currently available.
                  </span>
                </div>
              )}

              {floorChanges.length > 0 && (
                <div style={styles.floorChanges}>
                  <strong>Floor changes</strong>
                  {floorChanges.map(change => (
                    <div key={change.index}>
                      <span>Step {change.index + 1}</span>
                      <b>{change.from} → {change.to}</b>
                    </div>
                  ))}
                </div>
              )}
              {slotName && (
                <div style={styles.destination}>
                  <MapPin size={19} />
                  <div>
                    <span>DESTINATION</span>
                    <strong>{slotName}{floor ? ` · ${floor}` : ''}</strong>
                  </div>
                </div>
              )}
            </section>

            <div style={styles.footerNote}>
              <Clock size={15} />
              <span>
                This is a read-only navigation link. Keep your original
                parking ticket for exit and staff verification.
              </span>
            </div>

            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => setRetryCount(value => value + 1)}
            >
              <RefreshCw size={16} /> Refresh navigation
            </button>
          </>
        ) : null}
      </section>

      <footer style={styles.footer}>SpotSync · Smart Parking Management</footer>

      <style>{`
        @keyframes spotsync-spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        button { font: inherit; cursor: pointer; }
        @media (max-width: 520px) {
          .spotsync-detail-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f3f6fb',
    color: '#172033',
    fontFamily: 'Inter, system-ui, sans-serif'
  },
  header: {
    minHeight: 72,
    padding: '14px max(20px, calc((100% - 850px) / 2))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#fff',
    borderBottom: '1px solid #e5eaf1'
  },
  brand: { display: 'flex', alignItems: 'center', gap: 11 },
  brandIcon: {
    width: 42, height: 42, borderRadius: 12,
    display: 'grid', placeItems: 'center',
    color: '#fff', background: '#2563eb'
  },
  brandName: { fontWeight: 750 },
  publicLabel: {
    fontSize: 10, fontWeight: 750, letterSpacing: 1,
    color: '#2563eb', background: '#eff6ff',
    padding: '7px 10px', borderRadius: 20
  },
  container: {
    width: 'min(100% - 32px, 760px)',
    margin: '34px auto',
    display: 'grid',
    gap: 17
  },
  stateCard: {
    background: '#fff', border: '1px solid #e5eaf1',
    borderRadius: 17, padding: '48px 24px',
    display: 'grid', justifyItems: 'center',
    gap: 13, textAlign: 'center'
  },
  successBanner: {
    display: 'flex', alignItems: 'center', gap: 9,
    padding: '13px 16px', borderRadius: 11,
    background: '#ecfdf5', color: '#047857',
    fontSize: 13, fontWeight: 650
  },
  card: {
    padding: 23, borderRadius: 16,
    background: '#fff', border: '1px solid #e5eaf1',
    boxShadow: '0 3px 12px rgba(15,23,42,.035)'
  },
  cardHeading: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', gap: 12, marginBottom: 22
  },
  eyebrow: {
    fontSize: 10, fontWeight: 750,
    letterSpacing: 1.1, color: '#64748b'
  },
  detailGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12
  },
  detail: {
    display: 'grid', gap: 7, padding: 14,
    background: '#f8fafc', borderRadius: 10,
    minWidth: 0, overflowWrap: 'anywhere'
  },
  routeTitle: {
    display: 'flex', alignItems: 'center',
    gap: 12, marginBottom: 18
  },
  steps: {
    listStyle: 'none', margin: 0, padding: 0,
    display: 'grid', gap: 13
  },
  step: {
    display: 'flex', alignItems: 'flex-start',
    gap: 13, fontSize: 14, lineHeight: 1.6
  },
  stepNumber: {
    flex: '0 0 27px', height: 27, borderRadius: '50%',
    display: 'grid', placeItems: 'center',
    background: '#eff6ff', color: '#2563eb',
    fontSize: 12, fontWeight: 750
  },
  noRoute: {
    display: 'flex', gap: 10, alignItems: 'center',
    padding: 15, borderRadius: 10,
    background: '#f8fafc', color: '#64748b',
    fontSize: 13, lineHeight: 1.5
  },
  mapPanel: {
    marginBottom: 18, padding: 13, borderRadius: 12,
    border: '1px solid #e5eaf1', background: '#fff'
  },
  mapHeader: {
    display: 'flex', justifyContent: 'space-between',
    gap: 10, marginBottom: 10, fontSize: 12, color: '#334155'
  },
  mapCaption: {
    margin: '8px 0 0', fontSize: 11,
    color: '#94a3b8', lineHeight: 1.5
  },
  floorChanges: {
    display: 'grid', gap: 9, marginTop: 15,
    padding: 14, borderRadius: 10,
    background: '#fffbeb', color: '#92400e', fontSize: 12
  },
  floorChangeRow: { display: 'flex', justifyContent: 'space-between' },  destination: {
    display: 'flex', gap: 11, alignItems: 'center',
    marginTop: 20, padding: 15,
    borderRadius: 11, background: '#eff6ff',
    color: '#1d4ed8'
  },
  footerNote: {
    display: 'flex', alignItems: 'flex-start',
    gap: 9, color: '#64748b',
    fontSize: 12, lineHeight: 1.6
  },
  primaryButton: {
    display: 'inline-flex', alignItems: 'center',
    gap: 9, padding: '11px 18px',
    border: 0, borderRadius: 9,
    background: '#2563eb', color: '#fff',
    fontWeight: 650
  },
  secondaryButton: {
    justifySelf: 'center', display: 'inline-flex',
    alignItems: 'center', gap: 8,
    padding: '10px 15px', borderRadius: 9,
    border: '1px solid #dbe3ed',
    background: '#fff', color: '#334155'
  },
  footer: {
    padding: 22, textAlign: 'center',
    color: '#94a3b8', fontSize: 12
  }
}


