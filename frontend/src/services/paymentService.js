import api from './api'

export async function createPaymentOrder({ booking_id, amount, currency = 'INR' }) {
  const response = await api.post('/api/payments/create-order', {
    booking_id,
    amount,
    currency,
  })
  return response.data
}

export async function verifyPayment(payload) {
  const response = await api.post('/api/payments/verify', payload)
  return response.data
}
