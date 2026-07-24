import { api, type ApiSuccess } from './api'

export interface PublicSettings {
  pwaEnabled: boolean
  facebookShareEnabled: boolean
  facebookGroupUrl: string
  betaModeEnabled: boolean
  geoExplanationContent: string
}

export async function fetchPublicSettings(): Promise<PublicSettings> {
  const { data } = await api.get<ApiSuccess<PublicSettings>>('/settings/public')
  return data.data
}
