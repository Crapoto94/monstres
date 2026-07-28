import { api, type ApiSuccess } from './api'

export interface CommunityMember {
  id: string
  name: string
  avatar: string | null
  role: string
  score: number
  createdAt: string
  itemsCreated: number
  itemsReserved: number
  itemsCollected: number
  votesReceived: number
}

export async function fetchCommunity(search?: string) {
  const params: Record<string, string> = {}
  if (search) params.search = search
  const { data } = await api.get<ApiSuccess<CommunityMember[]>>('/users', { params })
  return data.data
}
