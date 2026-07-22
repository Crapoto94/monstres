import { api, type ApiSuccess } from './api'

export interface PublicSettings {
  pwaEnabled: boolean
}

export async function fetchPublicSettings(): Promise<PublicSettings> {
  const { data } = await api.get<ApiSuccess<PublicSettings>>('/settings/public')
  return data.data
}
