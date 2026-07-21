import { api, type ApiSuccess } from './api'

export interface Reservation {
  id: string
  user: { id: string; name: string; avatar: string | null }
  expiresAt: string
}

export async function reserveItem(itemId: string) {
  const { data } = await api.post<ApiSuccess<Reservation>>('/reservations', { itemId })
  return data.data
}

export async function cancelReservation(reservationId: string) {
  const { data } = await api.post<ApiSuccess<{ success: boolean }>>(`/reservations/${reservationId}/cancel`)
  return data.data
}
