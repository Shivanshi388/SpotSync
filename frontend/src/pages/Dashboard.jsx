import React, { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle, ArrowRight, ArrowUpRight, BarChart3,
  CarFront, CheckCircle2, Grid2X2, MapPin, Plus,
  ShieldAlert, Ticket, TrendingUp
} from 'lucide-react'
import { PageTitle, Card, StatCard, Status, Button, Table } from '../components/Shared'
import { getParkingOverview, getLiveParking } from '../services/staffApi'

export default function Dashboard({ go }) {
  const [parkingLots, setParkingLots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    let active = true
    let busy = false
    let firstLoad = true

    async function loadDashboard() {
      if (busy) return
      busy = true

      try {
        let data

        try {
          data = await getLiveParking()
          console.log("SPOTSYNC LIVE PARKING RESPONSE:", data)
        } catch {
          data = await getParkingOverview()
        }

        const lots = Array.isArray(data)
          ? data
          : data?.parking_lots || []

        console.log("SPOTSYNC DASHBOARD LOTS:", lots)

        if (!active) return

        setParkingLots(lots)
        setLastUpdated(new Date())
        setError('')
      } catch (err) {
        if (active) {
          setError(err.message || 'Unable to load parking information.')
        }
      } finally {
        if (firstLoad && active) {
          setLoading(false)
          firstLoad = false
        }
        busy = false
      }
    }

    loadDashboard()
    const timer = window.setInterval(loadDashboard, 3000)

    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [])

  const totals = useMemo(() => parkingLots.reduce((result, lot) => ({
    capacity: result.capacity + (Number(lot.total_slots) || 0),
    occupied: result.occupied + (Number(lot.occupied_slots) || 0),
    available: result.available + (Number(lot.available_slots) || 0),
  }), { capacity: 0, occupied: 0, available: 0 }), [parkingLots])

  const utilization = totals.capacity
    ? Math.round((totals.occupied / totals.capacity) * 100)
    : 0

  const unknown = Math.max(
    0,
    totals.capacity - totals.occupied - totals.available
  )

  const formatTime = lastUpdated
    ? lastUpdated.toLocaleTimeString()
    : 'Not updated'

  return (
    <>
      <PageTitle
        title="Dashboard"
        subtitle="A clear view of today's parking operations."
        action={
          <Button icon={Plus} onClick={() => go('/entry')}>
            New vehicle entry
          </Button>
        }
      />

      {error && (
        <Card title="Dashboard connection">
          <div style={{ padding: 12 }}>
            <p>{error}</p>
            <button className="text-action" onClick={() => window.location.reload()}>
              Retry <ArrowRight size={15} />
            </button>
          </div>
        </Card>
      )}

      <div className="stats-grid">
        <StatCard
          label="Total capacity"
          value={loading ? '...' : totals.capacity}
          change="Parking capacity reported by backend"
          icon={Grid2X2}
        />
        <StatCard
          label="Available"
          value={loading ? '...' : totals.available}
          change="Available slots reported by backend"
          icon={CheckCircle2}
          tone="green"
        />
        <StatCard
          label="Reserved"
          value="Ã¢â‚¬â€"
          change="Reservation summary not connected"
          icon={Ticket}
          tone="amber"
        />
        <StatCard
          label="Occupied"
          value={loading ? '...' : totals.occupied}
          change={loading ? 'Loading occupancy' : `${utilization}% reported utilization`}
          icon={CarFront}
          tone="blue"
        />
        <StatCard
          label="Unclassified"
          value={loading ? '...' : unknown}
          change="Capacity not classified as available or occupied"
          icon={ShieldAlert}
          tone="rose"
        />
      </div>

      <div className="dashboard-grid">
        <Card
          title="Parking overview"
          subtitle="Parking lot totals reported by the backend"
          action={
            <button className="text-action" onClick={() => go('/layout')}>
              View layout <ArrowRight size={15} />
            </button>
          }
        >
          {loading ? (
            <p>Loading parking information...</p>
          ) : parkingLots.length === 0 ? (
            <p>No parking lot information is currently available.</p>
          ) : (
            <div className="floor-list">
              {parkingLots.map((lot) => {
                const capacity = Number(lot.total_slots) || 0
                const occupied = Number(lot.occupied_slots) || 0
                const percent = capacity
                  ? Math.round((occupied / capacity) * 100)
                  : 0

                return (
                  <div className="floor-row" key={lot.id}>
                    <div className="floor-badge">
                      {String(lot.name || 'P').slice(0, 2)}
                    </div>
                    <div className="floor-info">
                      <div>
                        <b>{lot.name || `Parking lot ${lot.id}`}</b>
                        <span>{occupied} of {capacity} occupied</span>
                      </div>
                      <div className="progress">
                        <i style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                    <strong>{percent}%</strong>
                  </div>
                )
              })}
            </div>
          )}

          <div className="mini-legend">
            <span><i className="dot green" /> Available</span>
            <span><i className="dot rose" /> Occupied</span>
            <span><i className="dot gray" /> Unclassified</span>
          </div>
        </Card>

        <Card title="Operational snapshot" subtitle="Backend activity integration status">
          <div className="snapshot-grid">
            <div>
              <span>Vehicle entries</span>
              <b>Ã¢â‚¬â€</b>
              <small>Activity API not connected</small>
            </div>
            <div>
              <span>Vehicle exits</span>
              <b>Ã¢â‚¬â€</b>
              <small>Activity API not connected</small>
            </div>
            <div>
              <span>Avg. parking duration</span>
              <b>Ã¢â‚¬â€</b>
              <small>Session data unavailable</small>
            </div>
            <div>
              <span>Allocation success</span>
              <b>Ã¢â‚¬â€</b>
              <small>Analytics API required</small>
            </div>
          </div>
        </Card>

        <Card title="Recent activity" subtitle="Vehicle movement history">
          <p>Recent activity is not connected to a confirmed backend endpoint yet.</p>
          <button className="text-action" onClick={() => go('/history')}>
            View history <ArrowRight size={15} />
          </button>
        </Card>

        <Card title="Alerts & attention" subtitle="Operational incidents">
          <p>Live incident information will appear here after incident integration.</p>
          <button className="text-action" onClick={() => go('/mismatches')}>
            View mismatches <ArrowRight size={15} />
          </button>
        </Card>
      </div>

      <div className="quick-grid">
        <button onClick={() => go('/allocation')}>
          <div className="quick-icon"><TrendingUp /></div>
          <b>Smart allocation</b>
          <span>Review recommended parking bays</span>
          <ArrowRight />
        </button>
        <button onClick={() => go('/navigation')}>
          <div className="quick-icon"><MapPin /></div>
          <b>Mall navigation</b>
          <span>Explore floors, zones and routes</span>
          <ArrowRight />
        </button>
        <button onClick={() => go('/history')}>
          <div className="quick-icon"><BarChart3 /></div>
          <b>Parking analytics</b>
          <span>Review parking activity</span>
          <ArrowRight />
        </button>
      </div>

      <p style={{ fontSize: 12, color: '#777', marginTop: 12 }}>
        {loading ? 'Loading backend data...' : `Last updated: ${formatTime}`}
      </p>
    </>
  )
}
