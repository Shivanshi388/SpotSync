import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, CarFront, CircleCheck, CircleX, Zap } from 'lucide-react'
import { getParkingOverview, getParkingSlots } from '../services/parkingService'
import '../styles/availability-purple.css'

const REFRESH_MS = 15000

function statusOf(slot) {
  if (typeof slot.status === 'string') {
    const text = slot.status.toLowerCase()
    if (text.includes('occup')) return 'occupied'
    if (text.includes('reserv')) return 'reserved'
    if (text.includes('unavail') || text.includes('maint')) return 'unavailable'
    return 'available'
  }
  if (slot.is_occupied != null) return slot.is_occupied ? 'occupied' : 'available'
  if (slot.occupied != null) return slot.occupied ? 'occupied' : 'available'
  if (slot.is_available != null) return slot.is_available ? 'available' : 'occupied'
  return 'available'
}

function normalizeSlots(data) {
  const list = Array.isArray(data) ? data : data?.slots ?? data?.parking_slots ?? []

  return list.map((slot, index) => ({
    id: slot.id ?? index,
    lotId: slot.parking_lot_id ?? slot.lot_id ?? slot.parking_lot?.id ?? null,
    label: String(
      slot.slot_number ?? slot.number ?? slot.slot_name ?? slot.name ?? slot.label ?? index + 1
    ),
    status: statusOf(slot),
    ev:
      Boolean(slot.ev_charging ?? slot.is_ev ?? slot.ev) ||
      String(slot.slot_type ?? '').toLowerCase().includes('ev'),
  }))
}

function pad(value) {
  return String(value).padStart(2, '0')
}

export default function LiveAvailability() {
  const [overview, setOverview] = useState(null)
  const [slots, setSlots] = useState([])
  const [lotId, setLotId] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [updated, setUpdated] = useState(null)

  const load = useCallback(async () => {
    try {
      const data = await getParkingOverview()
      setOverview(data)
      setError('')
      setUpdated(new Date())
      setLotId((current) => current ?? data?.parking_lots?.[0]?.id ?? null)
    } catch (err) {
      setError(err.message || 'Could not load live availability. Check that the backend is running.')
    } finally {
      setLoading(false)
    }

    try {
      setSlots(normalizeSlots(await getParkingSlots({ availableOnly: false })))
    } catch {
      setSlots([])
    }
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => clearInterval(timer)
  }, [load])

  const lots = overview?.parking_lots ?? []
  const lot = lots.find((item) => item.id === lotId) ?? lots[0]

  const cells = useMemo(() => {
    if (!lot) return []

    const real = slots.filter((slot) => slot.lotId === lot.id)
    if (real.length > 0 && real.length >= Number(lot.total_slots ?? 0)) {
      return real.map((slot) => ({ ...slot, label: slot.label }))
    }

    // No complete per-slot data: draw the grid from the lot's real counts.
    const total = Number(lot.total_slots ?? 0)
    const occupied = Number(lot.occupied_slots ?? 0)
    return Array.from({ length: total }, (_, index) => ({
      id: index,
      label: pad(index + 1),
      status: index < occupied ? 'occupied' : 'available',
      ev: false,
    }))
  }, [lot, slots])

  const lotTotal = Number(lot?.total_slots ?? 0)
  const usingRealSlots =
    lot && lotTotal > 0
      ? slots.filter((slot) => slot.lotId === lot.id).length >= lotTotal
      : false
  const evCount = cells.filter((cell) => cell.ev).length

  return (
    <main className="la-page">
      <section className="la-hero">
        <div className="container">
          <h1>
            <Activity size={22} /> Live Parking Availability
          </h1>

          {lots.length > 1 && (
            <div className="la-lots">
              {lots.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={lot?.id === item.id ? 'active' : ''}
                  onClick={() => setLotId(item.id)}
                >
                  {item.name}
                </button>
              ))}
            </div>
          )}

          {loading && <p className="la-note">Loading live availability...</p>}
          {!loading && error && <p className="la-note" role="alert">{error}</p>}

          {lot && (
            <div className="la-stats">
              <div className="la-stat">
                <CarFront size={18} />
                <span>Total Slots</span>
                <strong>{lot.total_slots}</strong>
              </div>
              <div className="la-stat green">
                <CircleCheck size={18} />
                <span>Available</span>
                <strong>{lot.available_slots}</strong>
              </div>
              <div className="la-stat red">
                <CircleX size={18} />
                <span>Occupied</span>
                <strong>{lot.occupied_slots}</strong>
              </div>
              <div className="la-stat violet">
                <Zap size={18} />
                <span>EV Charging</span>
                <strong>{usingRealSlots ? evCount : '-'}</strong>
              </div>
            </div>
          )}
        </div>
      </section>

      {lot && (
        <div className="container">
          <section className="la-card">
            <div className="la-card-head">
              <h2>{lot.name}</h2>
              {updated && (
                <small>
                  Updated {updated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </small>
              )}
            </div>

            <div className="la-grid">
              {cells.map((cell) => (
                <span
                  key={cell.id}
                  className={`la-cell ${cell.status} ${cell.ev ? 'ev' : ''}`}
                  title={`Slot ${cell.label}: ${cell.status}`}
                >
                  {cell.label}
                </span>
              ))}
            </div>

            <div className="la-legend">
              <span><i className="available" /> Available</span>
              <span><i className="occupied" /> Occupied</span>
              <span><i className="ev" /> EV Charging</span>
              <span><i className="unavailable" /> Unavailable</span>
            </div>

            {!usingRealSlots && (
              <p className="la-foot">
                The counts above are live. Slot positions in this grid are illustrative, because
                the backend does not send a status for each individual slot.
              </p>
            )}
          </section>
        </div>
      )}
    </main>
  )
}
