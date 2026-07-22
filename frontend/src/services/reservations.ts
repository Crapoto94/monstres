import { api, type ApiSuccess } from './api'

export interface ToggleInterestResult {
  interested: boolean
  interestedCount: number
}

/** Bascule l'intérêt de l'utilisateur connecté pour un Monstre (toggle, comme les votes). */
export async function toggleInterest(itemId: string) {
  const { data } = await api.post<ApiSuccess<ToggleInterestResult>>('/reservations', { itemId })
  return data.data
}
