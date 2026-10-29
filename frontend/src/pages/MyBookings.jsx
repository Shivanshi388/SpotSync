import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarCheck,
  Car,
  LayoutDashboard,
  LogOut,
  Settings,
  User,
} from 'lucide-react'
import { cancelServerBooking, listBookings } from '../services/bookingService'
import { getParkingOverview, getParkingSlots } from '../services/parkingService'
import '../styles/mybookings-purple.css'

const TABS = [
  ['all', 'All'],
  ['upcoming', 'Upcoming'],
  ['completed', 'Completed'],
  ['cancelled', 'Cancelled'],
]

function go(path) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
  window.scrollTo({ top: 0 })
}

function logout() {
  localStorage.removeItem('spotsync_logged_in')
  localStorage.removeItem('spotsync_token')
  localStorage.removeItem('spotsync_user_name')
  localStorage.removeItem('spotsync_user_role')
  go('/login')
}

function clock(ms) {
  return new Date(ms)
    .toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    .toUpperCase()
}

function whenText(booking) {
  const day = new Date(booking.startsAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  if (booking.duration === 24) return `${day}, ${clock(booking.startsAt)} · 24 hours`
  return `${day}, ${clock(booking.startsAt)} - ${clock(booking.endsAt)}`
}

function statusFor(booking, now = Date.now()) {
  if (booking.serverStatus === 'cancelled') return 'cancelled'
  if (booking.serverStatus === 'completed' || booking.endsAt <= now) return 'completed'
  return 'upcoming'
}

export default function MyBookings() {
  const [bookings, setBookings] = useState([])
  const [tab, setTab] = useState('all')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [cancellingId, setCancellingId] = useState(null)
  const userName = localStorage.getItem('spotsync_user_name') || ''

  const refresh = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [bookingResult, overviewResult, slotsResult] = await Promise.allSettled([
        listBookings(),
        getParkingOverview(),
        getParkingSlots({ availableOnly: false }),
      ])
      if (bookingResult.status !== 'fulfilled') throw bookingResult.reason

      const lots = overviewResult.status === 'fulfilled' ? (overviewResult.value?.parking_lots ?? []) : []
      const slots = slotsResult.status === 'fulfilled' ? (slotsResult.value?.slots ?? []) : []
      const slotMap = new Map(slots.map((item) => [Number(item.id), item]))
      const lotMap = new Map(lots.map((item) => [Number(item.id), item]))
      const mapped = (bookingResult.value ?? []).map((item) => {
        const slotItem = slotMap.get(Number(item.parking_slot_id))
        const lot = slotItem ? lotMap.get(Number(slotItem.parking_lot_id)) : null
        const startsAt = new Date(item.start_time).getTime()
        const endsAt = new Date(item.end_time).getTime()
        return {
          id: item.id,
          parking: lot?.name || 'Parking location',
          slot: slotItem?.slot_number || `Slot ${item.parking_slot_id}`,
          total: Number(item.total_amount || 0),
          duration: Math.round((endsAt - startsAt) / 3600000),
          startsAt,
          endsAt,
          serverStatus: item.status,
        }
      })
      setBookings(mapped)
    } catch (error) {
      setLoadError(error.response?.data?.detail || error.message || 'Could not load your bookings from SpotSync.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const withStatus = useMemo(
    () => bookings.map((item) => ({ ...item, status: statusFor(item) })),
    [bookings]
  )

  const counts = useMemo(
    () => ({
      all: withStatus.length,
      upcoming: withStatus.filter((item) => item.status === 'upcoming').length,
      completed: withStatus.filter((item) => item.status === 'completed').length,
      cancelled: withStatus.filter((item) => item.status === 'cancelled').length,
    }),
    [withStatus]
  )

  const shown = withStatus
    .filter((item) => tab === 'all' || item.status === tab)
    .sort((a, b) => b.startsAt - a.startsAt)

  async function handleCancel(id) {
    if (!window.confirm('DEMO ONLY: Cancel this booking? Any mock payment will be marked as refunded for demonstration. No real payment or refund will occur.')) return
    setCancellingId(id)
    try {
      const result = await cancelServerBooking(id)
      await refresh()
      window.alert(result?.message || 'Demo cancellation completed. No real payment or refund occurred.')
    } catch (error) {
      window.alert(error.response?.data?.detail || error.message || 'Could not cancel this booking.')
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <div className="mb-wrap">
      <aside className="mb-side">
        <div className="mb-user">
          <span className="mb-avatar">
            {(userName || 'U').charAt(0).toUpperCase()}
          </span>
          <strong>{userName || 'Guest'}</strong>
        </div>

        <nav>
          <button type="button" onClick={() => go('/home')}>
            <LayoutDashboard size={17} /> Dashboard
          </button>
          <button type="button" className="active">
            <CalendarCheck size={17} /> My Bookings
          </button>
          <button type="button" onClick={() => go('/vehicles')}>
            <Car size={17} /> My Vehicles
          </button>
          <button type="button" onClick={() => go('/profile')}>
            <User size={17} /> Profile
          </button>
          <button type="button" onClick={() => go('/settings')}>
            <Settings size={17} /> Settings
          </button>
        </nav>

        <button type="button" className="mb-logout" onClick={logout}>
          <LogOut size={17} /> Logout
        </button>
      </aside>

      <section className="mb-main">
        <div className="mb-card">
          <h1>My Bookings</h1>

          <div className="mb-tabs">
            {TABS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={tab === key ? 'active' : ''}
                onClick={() => setTab(key)}
              >
                {label} <span>{counts[key]}</span>
              </button>
            ))}
          </div>

          {shown.length === 0 ? (
            <div className="mb-empty">
              <CalendarCheck size={34} />
              <h3>{loading ? 'Loading bookings...' : loadError ? 'Could not load bookings' : bookings.length === 0 ? 'No bookings yet' : 'Nothing in this tab'}</h3>
              <p>
                {loadError || (bookings.length === 0
                  ? 'Book a parking spot and it will show up here.'
                  : 'Try another tab.')}
              </p>
              <button type="button" className="mb-primary" onClick={() => go('/parking')}>
                Find Parking
              </button>
            </div>
          ) : (
            <div className="mb-list">
              {shown.map((item) => (
                <article className="mb-row" key={item.id}>
                  <div className="mb-thumb">
                    <Car size={22} />
                  </div>

                  <div className="mb-info">
                    <strong>{item.parking}</strong>
                    <span>{whenText(item)}</span>
                    <small>
                      Slot {item.slot} · #{item.id}
                    </small>
                  </div>

                  <div className="mb-end">
                    <span className={`mb-badge ${item.status}`}>
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </span>
                    <strong>&#8377;{item.total}.00</strong>
                    {item.status === 'upcoming' && (
                      <button
                        type="button"
                        className="mb-cancel"
                        onClick={() => handleCancel(item.id)} disabled={cancellingId === item.id}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}