import { api } from './api'

export interface HealthData {
  status: string
  database: string
  version?: string
}

export async function fetchHealthVersion(): Promise<string | null> {
  const { data } = await api.get<{ success: boolean; data: HealthData }>('/health')
  return data.data?.version ?? null
}
