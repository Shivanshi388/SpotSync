import api from './api'

export async function createBooking(payload) {
  const response = await api.post('/api/bookings', payload)
  return response.data
}

export async function listBookings() {
  const response = await api.get('/api/bookings')
  return response.data
}

export async function getBooking(bookingId) {
  const response = await api.get(`/api/bookings/${encodeURIComponent(bookingId)}`)
  return response.data
}

export async function cancelServerBooking(bookingId) {
  const response = await api.patch(`/api/bookings/${encodeURIComponent(bookingId)}/cancel`)
  return response.data
}
