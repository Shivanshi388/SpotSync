import api from './api'

export async function listVehicles() {
  const response = await api.get('/api/vehicles')
  return response.data?.vehicles ?? []
}

export async function createVehicle(payload) {
  const response = await api.post('/api/vehicles', payload)
  return response.data
}
