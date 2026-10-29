import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { getBooking } from '../services/bookingService'
import { getParkingOverview, getParkingSlots } from '../services/parkingService'
import '../styles/confirmation-purple.css'

function hourText(hour) {
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const twelve = hour % 12 || 12
  return `${String(twelve).padStart(2, '0')}:00 ${suffix}`
}

function go(path) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
  window.scrollTo({ top: 0 })
}

export default function BookingConfirmation() {
  const params = useMemo(() => new URLSearchParams(window.location.search), [])

  const bookingId = Number(params.get('booking') || params.get('bookingId'))
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [serverParkingName, setServerParkingName] = useState(params.get('parking') || 'City Center Parking')
  const [serverSlot, setServerSlot] = useState(params.get('slot') || 'A01')
  const parkingName = serverParkingName
  const slot = serverSlot
  const total = Number(booking?.total_amount ?? params.get('total') ?? 0)
  const date = params.get('date')
  const time = params.get('time')
  const duration = Number(params.get('duration')) || null
  const method = params.get('method') || ''

  const reference = booking?.id ?? (bookingId > 0 ? bookingId : '—')

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!Number.isInteger(bookingId) || bookingId <= 0) {
        setError('No valid server booking reference was provided.')
        setLoading(false)
        return
      }
      try {
        const result = await getBooking(bookingId)
        if (cancelled) return
        setBooking(result)
        const [overviewResult, slotsResult] = await Promise.allSettled([
          getParkingOverview(),
          getParkingSlots({ availableOnly: false }),
        ])
        if (cancelled) return
        if (overviewResult.status === 'fulfilled' && slotsResult.status === 'fulfilled') {
          const slotItem = (slotsResult.value?.slots ?? []).find((item) => Number(item.id) === Number(result.parking_slot_id))
          if (slotItem) {
            setServerSlot(String(slotItem.slot_number))
            const lot = (overviewResult.value?.parking_lots ?? []).find((item) => Number(item.id) === Number(slotItem.parking_lot_id))
            if (lot?.name) setServerParkingName(lot.name)
          }
        }
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.detail || err.message || 'Could not verify this booking with the server.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [bookingId])

  const dateText = date
    ? new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null

  let timeText = null
  if (time) {
    const start = Number(time.split(':')[0])
    timeText =
      duration === 24
        ? `${hourText(start)} · 24 hours`
        : duration
          ? `${hourText(start)} - ${hourText((start + duration) % 24)}`
          : hourText(start)
  }

  const whenText = [timeText, dateText].filter(Boolean).join(', ')

  return (
    <main className="cf-page">
      <div className="container">
        <section className="cf-card">
          <div className="cf-check">
            <CheckCircle2 size={44} />
          </div>

          <h1>{loading ? 'Verifying booking…' : booking?.status === 'confirmed' ? 'Booking Confirmed!' : 'Booking Not Confirmed'}</h1>
          <p className="cf-sub">{loading ? 'Checking the booking status with SpotSync.' : error || (booking?.status === 'confirmed' ? (method === 'mock' ? 'Development payment simulated; no money was charged.' : 'Your parking slot has been successfully booked.') : 'Payment has not been verified for this booking yet.')}</p>

          <div className="cf-details">
            <div>
              <span>Booking ID</span>
              <strong>#{reference}</strong>
            </div>

            <div>
              <span>Facility</span>
              <strong>{parkingName}</strong>
            </div>

            <div>
              <span>Parking slot</span>
              <strong>{slot}</strong>
            </div>

            {whenText && (
              <div>
                <span>Time</span>
                <strong>{whenText}</strong>
              </div>
            )}

            <div>
              <span>Amount</span>
              <strong>&#8377;{total.toFixed(2)}</strong>
            </div>
          </div>

          <div className="cf-actions">
            <button type="button" className="cf-primary" onClick={() => go('/bookings')}>
              View My Bookings
            </button>

            <button type="button" className="cf-outline" onClick={() => go('/home')}>
              Go to Home
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}