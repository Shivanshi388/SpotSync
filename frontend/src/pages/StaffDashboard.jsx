import { useNavigate } from 'react-router-dom'
import '../styles/staff-dashboard.css'
import {
  CarFront,
  CircleParking,
  Activity,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Bell,
  MapPin,
  TrendingUp,
} from 'lucide-react'
import { useSpotSync } from '../context/SpotSyncContext'

const sensorBayMap = {
  SENSOR_001: 'B1-A1',
  SENSOR_002: 'B1-A2',
  SENSOR_003: 'B1-A3',
  SENSOR_004: 'B2-A1',
  SENSOR_005: 'B2-A2',
  SENSOR_006: 'B2-A3',
  SENSOR_007: 'B2-A4',
}

const statusLabels = {
  AVAILABLE: 'Free',
  OCCUPIED: 'Occupied',
  RESERVED: 'Reserved',
  UNKNOWN: 'Needs attention',
  OUT_OF_SERVICE: 'Out of service',
}

// Official parking capacity
const FLOOR_CAPACITY = {
  B1: 3,
  B2: 4,
}

function StaffDashboard({ spaces = [], sessions = [], alerts = [] }) {
  const navigate = useNavigate()
  const { sensors, mismatches, notifications } = useSpotSync()

  // Keep only the official 7 parking spaces.
  // B1 = 3 spaces, B2 = 4 spaces.
  const dashboardSpaces = ['B1', 'B2'].flatMap(floor => {
    return spaces
      .filter(space => space.floor === floor)
      .slice(0, FLOOR_CAPACITY[floor])
  })

  const total = dashboardSpaces.length

  const available = dashboardSpaces.filter(
    s => s.status === 'AVAILABLE'
  ).length

  const occupied = dashboardSpaces.filter(
    s => s.status === 'OCCUPIED'
  ).length

  const reserved = dashboardSpaces.filter(
    s => s.status === 'RESERVED'
  ).length

  // Count each sensor once, even when it is both offline and stale.
  const sensorWarnings = sensors.filter(
    s => ['Offline', 'Stale', 'Fault', 'Unknown'].includes(s.status)
  ).length

  const unresolvedMismatches = mismatches.filter(
    m => m.status !== 'Resolved'
  ).length

  const unreadNotifications = notifications.filter(
    n => !n.read
  ).length

  // Count an unreliable sensor once, rather than counting
  // both its warning and the UNKNOWN status of its parking bay.
  const unreliableSensorBayIds = new Set(
    sensors
      .filter(s => ['Offline', 'Stale', 'Fault', 'Unknown'].includes(s.status))
      .map(s => sensorBayMap[s.id])
      .filter(Boolean)
  )

  const unmonitoredUnknownSpaces = dashboardSpaces.filter(
    s =>
      ['UNKNOWN', 'OUT_OF_SERVICE'].includes(s.status) &&
      !unreliableSensorBayIds.has(s.id)
  ).length

  const attention =
    sensorWarnings +
    unmonitoredUnknownSpaces +
    unresolvedMismatches

  const inUse = occupied + reserved
  const occupancy = total
    ? Math.round((inUse / total) * 100)
    : 0

  const floorData = ['B1', 'B2'].map(id => {
    const floorSpaces = dashboardSpaces.filter(
      s => s.floor === id
    )

    const used = floorSpaces.filter(s =>
      ['OCCUPIED', 'RESERVED'].includes(s.status)
    ).length

    return {
      id,
      name: `Basement ${id.slice(1)}`,
      spaces: floorSpaces,
      used,
      total: floorSpaces.length,
      percentage: floorSpaces.length
        ? Math.round((used / floorSpaces.length) * 100)
        : 0,
    }
  })

  const busiestFloor = [...floorData].sort(
    (a, b) => b.used - a.used
  )[0]

  const recommendedSpace = dashboardSpaces.find(
    s => s.status === 'AVAILABLE'
  )

  const recentSessions = sessions.slice(0, 3)

  const cards = [
    {
      title: 'Total parking spaces',
      value: total,
      subtitle: '3 spaces in B1 · 4 spaces in B2',
      icon: CircleParking,
      color: 'purple',
    },
    {
      title: 'Available now',
      value: available,
      subtitle: 'Ready for allocation',
      icon: CheckCircle2,
      color: 'green',
    },
    {
      title: 'Occupied',
      value: occupied,
      subtitle: 'Vehicles detected',
      icon: CarFront,
      color: 'blue',
    },
    {
      title: 'Needs attention',
      value: attention,
      subtitle: 'Issues and sensor warnings',
      icon: AlertTriangle,
      color: 'orange',
    },
  ]

  return (
    <div className="staff-dashboard">
      <section className="dashboard-welcome">
        <div>
          <span className="dashboard-eyebrow">
            OPERATIONS OVERVIEW
          </span>
          <h2>Good morning, Staff 2041</h2>
          <p>Here's how your car park is moving right now.</p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className="dashboard-primary-button"
            onClick={() => navigate('/entry')}
          >
            + New entry
          </button>
          <button
            className="dashboard-primary-button"
            onClick={() => navigate('/ticket-scanner')}
          >
            Scan exit QR
          </button>
        </div>
      </section>

      <section className="dashboard-summary-grid">
        {cards.map(card => {
          const Icon = card.icon

          return (
            <article
              className="dashboard-stat-card"
              key={card.title}
              style={
                card.color === 'purple'
                  ? { color: '#FFFFFF' }
                  : {}
              }
            >
              <div className="dashboard-stat-top">
                <span
                  style={
                    card.color === 'purple'
                      ? { color: '#FFFFFF' }
                      : {}
                  }
                >
                  {card.title}
                </span>

                <div className={`dashboard-stat-icon ${card.color}`}>
                  <Icon size={20} />
                </div>
              </div>

              <h2
                style={
                  card.color === 'purple'
                    ? { color: '#FFFFFF' }
                    : {}
                }
              >
                {card.value}
              </h2>

              <p
                style={
                  card.color === 'purple'
                    ? { color: '#FFFFFF' }
                    : {}
                }
              >
                {card.subtitle}
              </p>
            </article>
          )
        })}
      </section>

      <section className="dashboard-main-grid">
        <article className="dashboard-panel floor-plan-panel">
          <div className="dashboard-section-heading">
            <div>
              <h2>Live floor plan</h2>
              <p>Tap a bay to inspect its status.</p>
            </div>

            <button
              className="dashboard-text-button"
              onClick={() => navigate('/layout')}
            >
              View layout <ArrowRight size={15} />
            </button>
          </div>

          {floorData.map(floor => (
            <div className="dashboard-floor" key={floor.id}>
              <span className="dashboard-floor-label">
                {floor.name} ({floor.total} spaces)
              </span>

              <div className="dashboard-bay-grid">
                {floor.spaces.map(space => {
                  const sensor = sensors.find(
                    s => sensorBayMap[s.id] === space.id
                  )

                  const isReserved =
                    String(space.status).toUpperCase() === 'RESERVED'

                  const hasReliableOccupancy =
                    sensor?.is_online === true &&
                    ['AVAILABLE', 'OCCUPIED'].includes(sensor.readingStatus)

                  // Preserve reservations; otherwise require a reliable sensor
                  // before displaying the backend's confirmed bay status.
                  const displayStatus = isReserved
                    ? 'RESERVED'
                    : hasReliableOccupancy
                      ? space.status
                      : 'UNKNOWN'

                  const cssStatus = displayStatus.toLowerCase()

                  const distanceDisplay =
                    sensor?.distance_cm == null
                      ? 'No distance reading'
                      : Number.isFinite(Number(sensor.distance_cm))
                        ? Number(sensor.distance_cm) < 0
                          ? `NO ECHO (${sensor.distance_cm} cm)`
                          : `${Number(sensor.distance_cm).toFixed(2)} cm`
                        : String(sensor.distance_cm)

                  const sensorDisplay = sensor
                    ? `${sensor.status} · Event: ${sensor.readingStatus}`
                    : 'Unknown · No reading'

                  return (
                    <button
                      type="button"
                      key={space.id}
                      className={`dashboard-bay ${cssStatus}`}
                      onClick={() => navigate('/layout')}
                    >
                      <strong>{space.id}</strong>

                      <span>
                        {statusLabels[displayStatus] || displayStatus}
                      </span>

                      <small className="dashboard-bay-reading">
                        Distance: {distanceDisplay}
                      </small>

                      <small className="dashboard-bay-sensor">
                        {sensorDisplay}
                      </small>

                      {displayStatus === 'OCCUPIED' && (
                        <CarFront size={19} />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          <div className="floor-legend">
            <span>
              <i className="legend-dot available" /> Free
            </span>
            <span>
              <i className="legend-dot occupied" /> Occupied
            </span>
            <span>
              <i className="legend-dot reserved" /> Reserved
            </span>
            <span>
              <i className="legend-dot unknown" /> Attention
            </span>
          </div>
        </article>

        <article className="dashboard-panel attention-panel">
          <div className="dashboard-section-heading">
            <div>
              <h2>Attention needed</h2>
              <p>Resolve issues before the next rush.</p>
            </div>

            <Bell size={20} className="panel-heading-icon" />
          </div>

          <div className="dashboard-alert mismatch-alert">
            <div>
              <span className="alert-tag">MISMATCH</span>

              <strong>
                {unresolvedMismatches > 0
                  ? `${unresolvedMismatches} unresolved mismatch(es)`
                  : 'No unresolved mismatches'}
              </strong>

              <p>Review parking occupancy discrepancies.</p>

              <button onClick={() => navigate('/mismatches')}>
                Review mismatch <ArrowRight size={14} />
              </button>
            </div>
          </div>

          <div className="dashboard-alert warning-alert">
            <div>
              <span className="alert-tag">SENSOR STATUS</span>

              <strong>
                {sensorWarnings} sensor warning(s)
              </strong>

              <p>
                Includes offline, stale, faulty and unknown sensors. SENSOR_008 monitors the entrance/ramp separately.
              </p>

              <button onClick={() => navigate('/system-health')}>
                Check system health <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </article>
      </section>

      <section className="dashboard-lower-grid">
        <article className="dashboard-panel">
          <div className="dashboard-section-heading">
            <div>
              <h2>Recent activity</h2>
              <p>Latest vehicle sessions.</p>
            </div>

            <Activity size={20} className="panel-heading-icon" />
          </div>

          <div className="activity-list">
            {recentSessions.map((item, index) => (
              <div className="activity-item" key={item.ticket}>
                <div
                  className={`activity-icon ${
                    index === 0 ? 'success' : 'purple'
                  }`}
                >
                  <CarFront size={19} />
                </div>

                <div className="activity-details">
                  <strong>{item.vehicle}</strong>
                  <span>{item.status}</span>
                </div>

                <div className="activity-slot">
                  <strong>{item.bay}</strong>
                  <time>{item.entry}</time>
                </div>
              </div>
            ))}

            {recentSessions.length === 0 && (
              <p>No recent sessions.</p>
            )}
          </div>
        </article>

        <div className="dashboard-right-stack">
          <article className="dashboard-panel smart-allocation-panel">
            <div className="dashboard-section-heading">
              <div>
                <h2>Smart allocation</h2>
                <p>Recommended bay for the next arrival.</p>
              </div>

              <Sparkles size={20} className="panel-heading-icon" />
            </div>

            <div className="allocation-recommendation">
              <div className="recommended-bay">
                <MapPin size={24} />
                <strong>{recommendedSpace?.id || 'N/A'}</strong>
              </div>

              <div>
                <strong>
                  {recommendedSpace
                    ? 'Available bay'
                    : 'No free bay'}
                </strong>

                <p>Based on current parking status.</p>

                <span className="match-score">
                  Availability-based suggestion
                </span>
              </div>
            </div>

            <button
              className="dashboard-text-button"
              onClick={() => navigate('/allocation')}
            >
              View allocation <ArrowRight size={15} />
            </button>
          </article>

          <article className="dashboard-panel analytics-panel">
            <div className="dashboard-section-heading">
              <div>
                <h2>Analytics · Today</h2>
                <p>Current parking overview.</p>
              </div>

              <TrendingUp size={20} className="panel-heading-icon" />
            </div>

            <div className="analytics-occupancy">
              <strong>{occupancy}%</strong>
              <span>Occupancy</span>
            </div>

            <div className="analytics-progress">
              <div
                className="analytics-progress-fill"
                style={{ width: `${occupancy}%` }}
              />
            </div>

            <div className="analytics-details">
              <div>
                <span>Peak hours</span>
                <strong>Not available</strong>
              </div>

              <div>
                <span>Busiest floor</span>
                <strong>{busiestFloor?.name || 'N/A'}</strong>
              </div>
            </div>
          </article>
        </div>
      </section>

      <p className="dashboard-demo-note">
        {unreadNotifications} unread notification(s). Occupancy is calculated from the parking-space data currently supplied to the dashboard.
      </p>

      <style>{`
        .dashboard-right-stack {
          display: flex;
          flex-direction: column;
          gap: 18px;
          min-width: 0;
        }

        .analytics-panel {
          min-width: 0;
        }

        .analytics-occupancy {
          display: flex;
          align-items: baseline;
          gap: 9px;
          margin: 12px 0 8px;
        }

        .analytics-occupancy strong {
          font-size: 36px;
          line-height: 1;
          color: #281044;
          font-weight: 800;
        }

        .analytics-occupancy span {
          color: #777087;
          font-size: 13px;
        }

        .analytics-progress {
          height: 9px;
          width: 100%;
          border-radius: 20px;
          overflow: hidden;
          background: #eee8f7;
          margin-bottom: 16px;
        }

        .analytics-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #5422a5, #8b5bd1);
        }

        .analytics-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .analytics-details div {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .analytics-details span {
          color: #81798d;
          font-size: 11px;
        }

        .analytics-details strong {
          color: #34234b;
          font-size: 13px;
        }

        @media (max-width: 600px) {
          .analytics-details {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}

export default StaffDashboard