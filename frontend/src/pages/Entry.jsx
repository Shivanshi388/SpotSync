
import React, { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import {
  CarFront,
  CheckCircle2,
  RefreshCw,
  Ticket,
  AlertCircle,
  Zap,
  Accessibility,
  DoorOpen
} from 'lucide-react'
import { PageTitle, Card, Button, Status } from '../components/Shared'
import { api } from '../services/api'

const registrationPattern =
  /^(?:[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}|\d{2}BH\d{4}[A-Z]{1,2})$/

function normalizeRegistration(value) {
  return value.toUpperCase().replace(/[\s-]/g, '')
}

function getList(response, key) {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.[key])) return response[key]
  return []
}

export default function Entry({ onCreate }) {
  const [vehicles, setVehicles] = useState([])
  const [slots, setSlots] = useState([])
  const [registration, setRegistration] = useState('')
  const [vehicleType, setVehicleType] = useState('Car')
  const [selectedSlot, setSelectedSlot] = useState('')
  const [preferences, setPreferences] = useState({
    nearEntrance: false,
    evCharging: false,
    accessible: false
  })

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [created, setCreated] = useState(null)
  const [ticketError, setTicketError] = useState('')

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const [vehicleResponse, slotResponse] = await Promise.all([
        api.vehicles.list(),
        api.parking.slots({ availableOnly: true })
      ])

      const vehicleList = getList(vehicleResponse, 'vehicles')
      const slotList = getList(slotResponse, 'slots').filter(slot => {
        const code = String(slot.display_code || slot.slot_number || '').toUpperCase()
        const status = String(slot.status || '').toUpperCase()
        return status !== 'OUT_OF_SERVICE'
      })

      setVehicles(vehicleList)
      setSlots(slotList)

      setSelectedSlot(previous => {
        const stillAvailable = slotList.some(
          slot => String(slot.id) === String(previous)
        )
        return stillAvailable
          ? String(previous)
          : slotList.length
            ? String(slotList[0].id)
            : ''
      })
    } catch (err) {
      setError(
        err.message ||
        'Unable to load registered vehicles and available parking bays.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function togglePreference(key) {
    setPreferences(previous => ({
      ...previous,
      [key]: !previous[key]
    }))
  }

  function saveDriverTicket(ticket) {
    sessionStorage.setItem(
      `spotsync_driver_ticket_${ticket.token}`,
      JSON.stringify(ticket)
    )
  }

  async function retryTicket() {
    if (!created?.sessionId || submitting) return

    setTicketError('')
    setNotice('Generating your digital ticket...')

    try {
      const ticketResponse = await api.tickets.createForSession(
        created.sessionId
      )

      const driverTicket = {
        ...created,
        token: ticketResponse.token,
        expiresAt: ticketResponse.expires_at
      }

      saveDriverTicket(driverTicket)
      setCreated(driverTicket)
      setNotice('Digital ticket generated successfully.')
    } catch (err) {
      setTicketError(
        err.message || 'Ticket generation failed. Please try again.'
      )
      setNotice('')
    }
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    setTicketError('')
    setCreated(null)

    const vehicleNumber = normalizeRegistration(registration)

    if (!vehicleNumber) {
      setError('Please enter the vehicle registration number.')
      return
    }

    if (!registrationPattern.test(vehicleNumber)) {
      setError(
        'Enter a valid Indian registration number, e.g. UP14AB1234 or 22BH1234AA.'
      )
      return
    }

    if (!selectedSlot) {
      setError('Please select an available parking bay.')
      return
    }

    const selectedBay = slots.find(
      slot => String(slot.id) === String(selectedSlot)
    )

    if (!selectedBay) {
      setError(
        'The selected parking bay is no longer available. Refresh the list.'
      )
      return
    }

    setSubmitting(true)
    let sessionCreated = false

    try {
      let vehicle = vehicles.find(item => {
        const existingNumber = normalizeRegistration(
          item.vehicle_number || item.registration_number || ''
        )
        return existingNumber === vehicleNumber
      })

      if (!vehicle) {
        const vehicleResponse = await api.vehicles.create({
          registration_number: vehicleNumber,
          vehicle_type: vehicleType
        })

        vehicle = vehicleResponse.vehicle || vehicleResponse

        if (!vehicle?.id) {
          throw new Error(
            'The vehicle was saved, but its ID was not returned by the server.'
          )
        }

        setVehicles(previous => [...previous, vehicle])
      } else {
        setNotice(
          `Existing vehicle record found. Reusing ${vehicleNumber}.`
        )
      }

      if (!vehicle?.id) {
        throw new Error(
          'A valid vehicle ID was not returned by the server.'
        )
      }

      const sessionResponse = await api.sessions.start({
        parking_slot_id: Number(selectedBay.id),
        vehicle_id: Number(vehicle.id)
      })

      const session = sessionResponse.session || sessionResponse

      if (!session?.id) {
        throw new Error(
          'The session request returned no session ID. Please verify the session before retrying.'
        )
      }

      sessionCreated = true

      const bay =
        selectedBay.display_code ||
        selectedBay.slot_number ||
        `Bay ${selectedBay.id}`

      const entryTime = new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })

      const localSession = {
        ticket: `SESSION-${session.id}`,
        sessionId: session.id,
        vehicle: vehicleNumber,
        bay,
        entry: entryTime,
        status: session.status || 'ACTIVE',
        customer: 'Signed-in user'
      }

      setCreated({
        ...localSession,
        token: '',
        expiresAt: ''
      })

      if (onCreate) {
        onCreate(localSession)
      }

      setNotice('Parking session created successfully.')

      // Refresh available bays after the backend creates the session.
      try {
        const updatedSlots = await api.parking.slots({
          availableOnly: true
        })

        const updatedList = getList(updatedSlots, 'slots').filter(slot => {
          const code = String(slot.display_code || slot.slot_number || '').toUpperCase()
          const status = String(slot.status || '').toUpperCase()
          return status !== 'OUT_OF_SERVICE'
        })
        setSlots(updatedList)
        setSelectedSlot(
          updatedList.length ? String(updatedList[0].id) : ''
        )
      } catch {
        // Do not undo a successfully created session if refresh fails.
      }

      // Preserve the existing backend ticket-generation workflow.
      try {
        const ticketResponse = await api.tickets.createForSession(
          session.id
        )

        const driverTicket = {
          ...localSession,
          token: ticketResponse.token,
          expiresAt: ticketResponse.expires_at
        }

        saveDriverTicket(driverTicket)
        setCreated(driverTicket)
        setNotice(
          'Parking session and digital ticket created successfully.'
        )
      } catch (err) {
        setTicketError(
          err.message ||
          'The session was created, but ticket generation failed. You can retry below.'
        )
      }

      setRegistration('')
    } catch (err) {
      if (sessionCreated) {
        setNotice(
          'Your parking session was created. Please check the ticket section.'
        )
      } else {
        setError(
          err.message || 'Unable to create the parking session.'
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  const preferenceOptions = [
    {
      key: 'nearEntrance',
      label: 'Near entrance',
      description: 'Prefer a bay closer to the entrance',
      Icon: DoorOpen
    },
    {
      key: 'evCharging',
      label: 'EV charging',
      description: 'I need an electric vehicle charging bay',
      Icon: Zap
    },
    {
      key: 'accessible',
      label: 'Accessible parking',
      description: 'I need an accessible parking bay',
      Icon: Accessibility
    }
  ]

  return (
    <>
      <PageTitle
        title="New vehicle entry"
        subtitle="Register a vehicle, choose an available bay and create a parking session."
      />

      <div className="two-col">
        <Card
          title="Vehicle information"
          subtitle="Enter vehicle details and select your parking requirements."
        >
          <form className="form-grid" onSubmit={submit}>
            <label className="span-2">
              Vehicle registration
              <input
                value={registration}
                onChange={event => {
                  setRegistration(event.target.value.toUpperCase())
                  setError('')
                }}
                placeholder="e.g. UP14 AB 1234"
                autoComplete="off"
                disabled={submitting}
                maxLength={15}
              />
              <small className="muted">
                Indian registration format. Spaces and hyphens are accepted.
              </small>
            </label>

            <label>
              Vehicle type
              <select
                value={vehicleType}
                onChange={event => setVehicleType(event.target.value)}
                disabled={submitting}
              >
                <option value="Car">Car</option>
                <option value="SUV">SUV</option>
                <option value="Bike">Bike</option>
                <option value="EV">EV</option>
              </select>
            </label>

            <label>
              Available parking bay
              <select
                value={selectedSlot}
                onChange={event => setSelectedSlot(event.target.value)}
                disabled={loading || submitting || slots.length === 0}
              >
                {slots.length === 0 && (
                  <option value="">No available bays</option>
                )}

                {slots.map(slot => (
                  <option key={slot.id} value={String(slot.id)}>
                    {slot.display_code || slot.slot_number || `Bay ${slot.id}`}
                    {slot.slot_type ? ` — ${slot.slot_type}` : ''}
                  </option>
                ))}
              </select>
            </label>

            <div className="span-2">
              <b>Parking preferences</b>
              <p className="muted">
                Select any requirements for this parking visit.
              </p>

              <div style={{
                display: 'grid',
                gap: 10,
                marginTop: 10
              }}>
                {preferenceOptions.map(({ key, label, description, Icon }) => (
                  <label
                    key={key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 12,
                      border: '1px solid #dbe2ea',
                      borderRadius: 9,
                      cursor: submitting ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={preferences[key]}
                      onChange={() => togglePreference(key)}
                      disabled={submitting}
                    />
                    <Icon size={19} />
                    <span>
                      <b>{label}</b>
                      <small
                        className="muted"
                        style={{ display: 'block' }}
                      >
                        {description}
                      </small>
                    </span>
                  </label>
                ))}
              </div>

              <p className="muted" style={{ fontSize: 12 }}>
                Preferences are recorded in this form only. Backend
                preference-based allocation is not connected yet.
              </p>
            </div>

            {loading && (
              <p className="muted span-2">
                Loading registered vehicles and available bays...
              </p>
            )}

            {error && (
              <p className="form-error span-2">
                <AlertCircle size={15} /> {error}
              </p>
            )}

            {notice && (
              <p className="success-note span-2">
                <CheckCircle2 size={15} /> {notice}
              </p>
            )}

            <div className="span-2">
              <Button
                type="submit"
                icon={CheckCircle2}
                disabled={loading || submitting || !slots.length}
              >
                {submitting
                  ? 'Creating parking session...'
                  : 'Create parking session'}
              </Button>
            </div>

            <div className="span-2">
              <Button
                type="button"
                variant="outline"
                icon={RefreshCw}
                onClick={loadData}
                disabled={loading || submitting}
              >
                Refresh vehicles and bays
              </Button>
            </div>
          </form>
        </Card>

        <Card
          title="Entry confirmation"
          subtitle="Your backend-created parking session and digital ticket."
        >
          {created ? (
            <div className="ticket-preview">
              <div className="ticket-top">
                <span>SPOTSYNC PARKING SESSION</span>
                <Status value={created.status} />
              </div>

              <div className="ticket-details">
                <div>
                  <small>VEHICLE</small>
                  <b>{created.vehicle}</b>
                </div>

                <div>
                  <small>ASSIGNED BAY</small>
                  <b>{created.bay}</b>
                </div>

                <div>
                  <small>SESSION ID</small>
                  <b>{created.sessionId}</b>
                </div>

                <div>
                  <small>ENTRY TIME</small>
                  <b>{created.entry}</b>
                </div>
              </div>

              <div className="ticket-top">
                <span>
                  <Ticket size={16} /> DIGITAL TICKET
                </span>
              </div>

              {created.token ? (
                <>
                  <p className="muted">
                    Your digital parking ticket has been generated. Show this QR code to staff when leaving.
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'center', padding: '16px', background: '#fff', borderRadius: '12px', margin: '12px 0' }}>
                    <QRCodeSVG
                      value={`${(import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin).replace(/\/+$/, '')}/driver/${encodeURIComponent(created.token)}`}
                      size={220}
                      level="M"
                      includeMargin
                      title="SpotSync parking exit ticket"
                    />
                  </div>

                  <p className="muted">
                    This ticket token expires at{' '}
                    {created.expiresAt
                      ? new Date(created.expiresAt).toLocaleString('en-IN')
                      : 'the time specified by the server'}.
                  </p>

                  <a href={`/driver/${encodeURIComponent(created.token)}`}>
                    Open Driver Ticket
                  </a>
                </>
              ) : (
                <>
                  <p className="muted">
                    Your parking session is saved. The digital ticket
                    has not been generated yet.
                  </p>

                  {ticketError && (
                    <p className="form-error">{ticketError}</p>
                  )}

                  <Button
                    type="button"
                    icon={RefreshCw}
                    onClick={retryTicket}
                    disabled={submitting}
                  >
                    Retry ticket generation
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <CarFront size={28} />
              <b>Entry confirmation will appear here</b>
              <span>
                Complete the vehicle details to create a parking session.
              </span>
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
