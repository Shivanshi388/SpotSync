import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Car,
  CheckCircle2,
  CreditCard,
  Landmark,
  Lock,
  MapPin,
  ShieldCheck,
  Smartphone,
  Wallet,
} from 'lucide-react'
import { getBooking } from '../services/bookingService'
import { createPaymentOrder, verifyPayment } from '../services/paymentService'
import '../styles/payment-purple.css'

const METHODS = [
  { id: 'upi', label: 'UPI', hint: 'Pay with any UPI app', icon: Smartphone },
  { id: 'card', label: 'Credit / Debit Card', hint: 'Visa, Mastercard, RuPay', icon: CreditCard },
  { id: 'wallet', label: 'Wallet', hint: 'Paytm, PhonePe and more', icon: Wallet },
  { id: 'razorpay', label: 'Razorpay', hint: 'Cards, netbanking, UPI', icon: Landmark },
]

function hourText(hour) {
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const twelve = hour % 12 || 12
  return `${String(twelve).padStart(2, '0')}:00 ${suffix}`
}

async function ensureRazorpayScript() {
  if (window.Razorpay) return
  await new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-spotsync-razorpay]')
    if (existing) {
      existing.addEventListener('load', resolve, { once: true })
      existing.addEventListener('error', reject, { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.dataset.spotsyncRazorpay = 'true'
    script.onload = resolve
    script.onerror = () => reject(new Error('Could not load secure payment checkout. Check your internet connection and try again.'))
    document.body.appendChild(script)
  })
}

function goToConfirmation(bookingId, method, details) {
  const query = new URLSearchParams({ booking: String(bookingId), method, parking: details.parkingName, slot: details.slot })
  if (details.date) query.set('date', details.date)
  if (details.time) query.set('time', details.time)
  if (details.duration) query.set('duration', String(details.duration))
  window.history.pushState({}, '', `/booking-confirmation?${query.toString()}`)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export default function Payment() {
  const params = useMemo(() => new URLSearchParams(window.location.search), [])

  const parkingName = params.get('parking') || 'City Center Parking'
  const slot = params.get('slot') || 'A01'
  const bookingId = Number(params.get('bookingId') || params.get('booking'))
  const [booking, setBooking] = useState(null)
  const [total, setTotal] = useState(Number(params.get('total')) || 70)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState('')
  const date = params.get('date')
  const time = params.get('time')
  const duration = Number(params.get('duration')) || null

  const serviceFee = 10
  const parkingFee = total - serviceFee

  const [method, setMethod] = useState('upi')

  useEffect(() => {
    let cancelled = false
    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      setNotice('No valid server booking was provided. Return to Parking Details and try again.')
      return () => { cancelled = true }
    }
    getBooking(bookingId)
      .then((result) => {
        if (cancelled) return
        setBooking(result)
        setTotal(Number(result.total_amount ?? 0))
        if (result.status !== 'pending') setNotice(`This booking is ${result.status}. Only pending bookings can be paid.`)
      })
      .catch((error) => {
        if (!cancelled) setNotice(error.response?.data?.detail || error.message || 'Could not load this booking.')
      })
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
          ? `${hourText(start)} – ${hourText((start + duration) % 24)}`
          : hourText(start)
  }

  const durationText = duration === 24 ? 'Full day' : duration ? `${duration} hours` : null

  function goBack() {
    window.history.back()
  }

  async function confirmPayment() {
    if (!booking || submitting) return
    if (booking.status !== 'pending') {
      setNotice(`This booking is ${booking.status}. Only pending bookings can be paid.`)
      return
    }

    setSubmitting(true)
    setNotice('Creating secure payment order...')
    try {
      const order = await createPaymentOrder({
        booking_id: booking.id,
        amount: Number(booking.total_amount),
        currency: 'INR',
      })

      if (order.mock_mode) {
        await verifyPayment({
          payment_id: order.payment_id,
          razorpay_order_id: order.razorpay_order_id,
          razorpay_payment_id: `mock_payment_${Date.now()}`,
          razorpay_signature: 'mock_signature_development_only',
        })
        goToConfirmation(booking.id, 'mock', { parkingName, slot, date, time, duration })
        return
      }

      if (!order.razorpay_key_id) throw new Error('Razorpay is not configured on the backend.')
      await ensureRazorpayScript()
      const checkout = new window.Razorpay({
        key: order.razorpay_key_id,
        amount: order.amount_paise,
        currency: order.currency || 'INR',
        name: 'SpotSync',
        description: `Parking booking #${booking.id}`,
        order_id: order.razorpay_order_id,
        notes: { booking_id: String(booking.id), preferred_method: method },
        handler: async (response) => {
          try {
            await verifyPayment({
              payment_id: order.payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })
            goToConfirmation(booking.id, method, { parkingName, slot, date, time, duration })
          } catch (error) {
            setNotice(error.response?.data?.detail || error.message || 'Payment verification failed. Contact support before retrying.')
          } finally {
            setSubmitting(false)
          }
        },
        modal: { ondismiss: () => { setSubmitting(false); setNotice('Checkout was closed. You can try again.') } },
      })
      checkout.on('payment.failed', (response) => {
        setSubmitting(false)
        setNotice(response?.error?.description || 'Payment failed. Please try again.')
      })
      checkout.open()
    } catch (error) {
      setNotice(error.response?.data?.detail || error.message || 'Could not start payment. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <main className="pay-page">
      <div className="container">
        <button type="button" className="back-link" onClick={goBack}>
          <ArrowLeft size={17} />
          Back to booking
        </button>

        <div className="pay-grid">
          <aside className="pay-card">
            <h2>Payment Summary</h2>

            <div className="pay-lot">
              <div className="pay-thumb">
                <Car size={22} />
              </div>
              <div>
                <strong>{parkingName}</strong>
                <span className="pay-muted">
                  <MapPin size={12} /> Slot {slot}
                </span>
              </div>
            </div>

            {dateText && (
              <div className="pay-row">
                <span>Booking time</span>
                <strong>
                  {dateText}
                  {timeText && `, ${timeText}`}
                </strong>
              </div>
            )}

            {durationText && (
              <div className="pay-row">
                <span>Duration</span>
                <strong>{durationText}</strong>
              </div>
            )}

            <div className="pay-row">
              <span>Parking fee</span>
              <strong>&#8377;{parkingFee}</strong>
            </div>

            <div className="pay-row">
              <span>Service fee</span>
              <strong>&#8377;{serviceFee}</strong>
            </div>

            <div className="pay-total">
              <span>Amount</span>
              <strong>&#8377;{total}</strong>
            </div>
          </aside>

          <section className="pay-card">
            <h2>Choose Payment Method</h2>

            <div className="pay-methods" role="radiogroup" aria-label="Payment method">
              {METHODS.map(({ id, label, hint, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={method === id}
                  className={`pay-method ${method === id ? 'selected' : ''}`}
                  onClick={() => setMethod(id)}
                >
                  <span className="pay-radio" />
                  <span className="pay-method-text">
                    <strong>{label}</strong>
                    <small>{hint}</small>
                  </span>
                  <Icon size={22} />
                  {method === id && <CheckCircle2 size={18} className="pay-tick" />}
                </button>
              ))}
            </div>

            <button type="button" className="pay-now" onClick={confirmPayment} disabled={!booking || booking.status !== 'pending' || submitting}>
              Pay Now &#8377;{total}
            </button>

            <p className="pay-secure">
              <Lock size={13} /> Secure payment
            </p>

            <div className="pay-demo">
              <ShieldCheck size={17} />
              <span role="status"><strong>Demo only - no real payment is made or charged.</strong>{' '}{notice || 'This checkout simulates payment for demonstration purposes only.'}</span>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}