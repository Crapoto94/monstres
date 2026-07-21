import { api, type ApiSuccess } from './api'

export interface Subscription {
  id: string
  name: string
  latitude: number
  longitude: number
  radius: number
  active: boolean
  createdAt: string
}

export async function fetchSubscriptions() {
  const { data } = await api.get<ApiSuccess<Subscription[]>>('/subscriptions')
  return data.data
}

export async function createSubscription(payload: {
  name: string
  latitude: number
  longitude: number
  radius: number
}) {
  const { data } = await api.post<ApiSuccess<Subscription>>('/subscriptions', payload)
  return data.data
}

export async function deleteSubscription(id: string) {
  await api.delete(`/subscriptions/${id}`)
}
