
import api from './api'

export const getParkingOverview = async () => {
  const response = await api.get('/api/parking/overview')
  return response.data
}

export const getParkingSlots = async (options = {}) => {
  const params = {}

  if (options.parkingLotId != null) {
    params.parking_lot_id = options.parkingLotId
  }

  if (options.availableOnly != null) {
    params.available_only = options.availableOnly
  }

  const response = await api.get('/api/parking/slots', { params })
  return response.data
}

export const getLiveParking = async () => {
  const response = await api.get('/api/parking/live')
  return response.data
}

export default {
  getParkingOverview,
  getParkingSlots,
  getLiveParking,
}
