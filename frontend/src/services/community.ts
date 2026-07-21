import { api, type ApiSuccess } from './api'

export interface CommunityMember {
  id: string
  name: string
  avatar: string | null
  score: number
  createdAt: string
  itemsCreated: number
  itemsReserved: number
  itemsCollected: number
  votesReceived: number
}

export async function fetchCommunity() {
  const { data } = await api.get<ApiSuccess<CommunityMember[]>>('/users')
  return data.data
}
