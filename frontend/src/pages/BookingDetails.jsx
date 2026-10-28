import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  ShieldCheck,
} from 'lucide-react'
import { getParkingOverview } from '../services/parkingService'
import { createBooking } from '../services/bookingService'
import { createVehicle, listVehicles } from '../services/vehicleService'
import '../styles/booking-purple.css'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const START_HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]

const durationOptions = [
  { value: 2, label: '2 hours', fee: 60 },
  { value: 4, label: '4 hours', fee: 120 },
  { value: 24, label: 'Full day', fee: 250 },
]

function pad(number) {
  return String(number).padStart(2, '0')
}

function hourLabel(hour) {
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const twelve = hour % 12 || 12
  return `${pad(twelve)}:00 ${suffix}`
}

function dateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function startOfToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export default function BookingDetails() {
  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const parkingId = Number(params.get('parkingId'))
  const slotId = Number(params.get('slotId'))
  const slot = params.get('slot') || 'A01'
  const parkingName = params.get('parking') || 'City Center Parking'

  const [lot, setLot] = useState({
    name: parkingName,
    address: '',
    available: null,
    total: null,
  })

  const today = useMemo(() => startOfToday(), [])
  const [month, setMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  )
  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedHour, setSelectedHour] = useState(null)
  const [selectedDuration, setSelectedDuration] = useState(2)
  const [vehicles, setVehicles] = useState([])
  const [vehicleLoadError, setVehicleLoadError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadBookingData() {
      const [overviewResult, vehiclesResult] = await Promise.allSettled([
        getParkingOverview(),
        listVehicles(),
      ])

      if (cancelled) return

      if (overviewResult.status === 'fulfilled') {
        const lots = overviewResult.value?.parking_lots ?? []
        const match = lots.find(
          (item) => (parkingId > 0 && Number(item.id) === parkingId) ||
            item.name === parkingName || String(item.id) === parkingName
        )

        if (match) {
          setLot({
            id: match.id,
            name: match.name || parkingName,
            address: match.address || '',
            available: Number(match.available_slots ?? 0),
            total: Number(match.total_slots ?? 0),
          })
        }
      } else {
        console.error('Failed to load parking details:', overviewResult.reason)
      }

      if (vehiclesResult.status === 'fulfilled') {
        setVehicles(vehiclesResult.value ?? [])
        setVehicleLoadError('')
      } else {
        setVehicleLoadError(vehiclesResult.reason?.response?.data?.detail || vehiclesResult.reason?.message || 'Could not load your vehicles.')
      }
    }

    loadBookingData()
    return () => { cancelled = true }
  }, [parkingId, parkingName])

  const selectedOption = durationOptions.find(
    (option) => option.value === selectedDuration
  )
  const parkingFee = selectedOption.fee
  const serviceFee = 10
  const total = parkingFee + serviceFee

  const isToday = dateKey(selectedDate) === dateKey(today)
  const currentHour = new Date().getHours()

  function hourDisabled(hour) {
    return isToday && hour <= currentHour
  }

  const calendarCells = useMemo(() => {
    const year = month.getFullYear()
    const monthIndex = month.getMonth()
    const leading = new Date(year, monthIndex, 1).getDay()
    const days = new Date(year, monthIndex + 1, 0).getDate()

    return [
      ...Array.from({ length: leading }, () => null),
      ...Array.from({ length: days }, (_, index) => index + 1),
    ]
  }, [month])

  const canGoBack =
    month.getFullYear() > today.getFullYear() ||
    month.getMonth() > today.getMonth()

  function changeMonth(step) {
    setMonth(new Date(month.getFullYear(), month.getMonth() + step, 1))
  }

  function pickDay(day) {
    const date = new Date(month.getFullYear(), month.getMonth(), day)
    if (date < today) return

    setSelectedDate(date)

    const stillOk =
      selectedHour != null &&
      !(dateKey(date) === dateKey(today) && selectedHour <= currentHour)
    if (!stillOk) setSelectedHour(null)
  }

  const timeSummary =
    selectedHour == null
      ? 'Select a time'
      : selectedDuration === 24
        ? `${hourLabel(selectedHour)} · 24 hours`
        : `${hourLabel(selectedHour)} – ${hourLabel(
            (selectedHour + selectedDuration) % 24
          )}`

  const dateText = selectedDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  function goBack() {
    window.history.back()
  }

  async function continueToPayment() {
    if (selectedHour == null || submitting) return

    if (!Number.isInteger(parkingId) || parkingId <= 0 || !Number.isInteger(slotId) || slotId <= 0) {
      window.alert('Please return to Parking Details and select a real available slot.')
      return
    }

    if (vehicleLoadError) {
      window.alert(vehicleLoadError)
      return
    }

    setSubmitting(true)
    try {
      let vehicleId = vehicles[0]?.id
      if (!vehicleId) {
        const registrationNumber = window.prompt('Enter your vehicle registration number to continue booking:')
        if (!registrationNumber || registrationNumber.trim().length < 2) return
        const vehicle = await createVehicle({
          registration_number: registrationNumber.trim().toUpperCase(),
          vehicle_type: 'Car',
        })
        vehicleId = vehicle.id
        setVehicles([vehicle])
      }

      const start = new Date(
        selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), selectedHour, 0, 0, 0
      )
      const end = new Date(start.getTime() + selectedDuration * 60 * 60 * 1000)
      const booking = await createBooking({
        vehicle_id: Number(vehicleId),
        parking_slot_id: slotId,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
      })

      const query = new URLSearchParams({
        bookingId: String(booking.id),
        parking: lot.name,
        slot,
        date: dateKey(selectedDate),
        time: `${pad(selectedHour)}:00`,
        duration: String(selectedDuration),
      })
      window.history.pushState({ bookingId: booking.id }, '', `/payment?${query.toString()}`)
      window.dispatchEvent(new PopStateEvent('popstate'))
    } catch (error) {
      window.alert(error.response?.data?.detail || error.message || 'Could not create your booking. Please refresh availability and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="bk-page">
      <div className="container">
        <button type="button" className="back-link" onClick={goBack}>
          <ArrowLeft size={17} />
          Back to parking
        </button>

        <div className="bk-grid">
          <aside className="bk-card bk-details">
            <h2>Booking Details</h2>

            <div className="bk-thumb">
              <Car size={30} />
            </div>

            <h3>{lot.name}</h3>
            {lot.address && (
              <p className="bk-muted">
                <MapPin size={13} /> {lot.address}
              </p>
            )}

            <div className="bk-row">
              <span>Your spot</span>
              <strong>{slot}</strong>
            </div>

            {lot.available != null && (
              <div className="bk-row">
                <span>Available slots</span>
                <strong>
                  {lot.available} / {lot.total}
                </strong>
              </div>
            )}

            <div className="bk-trust">
              <ShieldCheck size={16} />
              <span>Your spot is held while you check out.</span>
            </div>
          </aside>

          <section className="bk-card bk-calendar">
            <h2>Select Date &amp; Time</h2>

            <div className="bk-month">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                disabled={!canGoBack}
                aria-label="Previous month"
              >
                <ChevronLeft size={18} />
              </button>

              <strong>
                {month.toLocaleDateString('en-IN', {
                  month: 'long',
                  year: 'numeric',
                })}
              </strong>

              <button
                type="button"
                onClick={() => changeMonth(1)}
                aria-label="Next month"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="bk-weekdays">
              {WEEKDAYS.map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>

            <div className="bk-days">
              {calendarCells.map((day, index) => {
                if (day == null) return <span key={`blank-${index}`} />

                const date = new Date(month.getFullYear(), month.getMonth(), day)
                const past = date < today
                const active = dateKey(date) === dateKey(selectedDate)

                return (
                  <button
                    key={day}
                    type="button"
                    disabled={past}
                    className={active ? 'active' : ''}
                    onClick={() => pickDay(day)}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
          </section>

          <section className="bk-card bk-times">
            <h2>Time Slot</h2>

            <div className="bk-hours">
              {START_HOURS.map((hour) => (
                <button
                  key={hour}
                  type="button"
                  disabled={hourDisabled(hour)}
                  className={selectedHour === hour ? 'active' : ''}
                  onClick={() => setSelectedHour(hour)}
                >
                  {hourLabel(hour)}
                </button>
              ))}
            </div>

            <h4>Duration</h4>
            <div className="bk-durations">
              {durationOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selectedDuration === option.value}
                  className={selectedDuration === option.value ? 'active' : ''}
                  onClick={() => setSelectedDuration(option.value)}
                >
                  <Clock3 size={15} />
                  <span>
                    <strong>{option.label}</strong>
                    <small>₹{option.fee}</small>
                  </span>
                  {selectedDuration === option.value && <Check size={15} />}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="bk-bar">
          <div>
            <span className="bk-muted">
              {dateText} · {timeSummary}
            </span>
            <p>
              Parking ₹{parkingFee} + service fee ₹{serviceFee} ={' '}
              <strong>₹{total}</strong>
            </p>
          </div>

          <button
            type="button"
            className="bk-next"
            disabled={selectedHour == null || submitting}
            onClick={continueToPayment}
          >
            {selectedHour == null ? 'Select a time' : 'Next'}
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
    </main>
  )
}
