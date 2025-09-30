import { api } from './config'

export interface OKR {
  id: string
  title: string
  description?: string
  progress: number
  status: 'draft' | 'active' | 'completed' | 'at_risk' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'critical'
  owner: string
  team?: string
  start_date: string
  end_date: string
  key_results: KeyResult[]
  created_at: string
  updated_at: string
  user_id: string
}

export interface KeyResult {
  id: string
  title: string
  description?: string
  progress: number
  target: number
  current: number
  unit: string
  status: 'not_started' | 'on_track' | 'at_risk' | 'completed'
  owner?: string
}

export interface OKRCreate {
  title: string
  description?: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  owner: string
  team?: string
  start_date: string
  end_date: string
  key_results?: Omit<KeyResult, 'id'>[]
}

export interface OKRUpdate {
  title?: string
  description?: string
  priority?: 'low' | 'medium' | 'high' | 'critical'
  owner?: string
  team?: string
  start_date?: string
  end_date?: string
  progress?: number
  status?: 'draft' | 'active' | 'completed' | 'at_risk' | 'cancelled'
}

export class OKRsAPI {
  static async list(): Promise<OKR[]> {
    const response = await api.get<OKR[]>('/okrs')

    // Transform API response to frontend format
    return response.data.map(okr => ({
      ...okr,
      key_results: okr.key_results || [],
      // Calculate progress based on key results if available
      progress: okr.key_results?.length > 0
        ? Math.round(okr.key_results.reduce((sum, kr) => sum + kr.progress, 0) / okr.key_results.length)
        : okr.progress || 0
    }))
  }

  static async get(id: string): Promise<OKR> {
    const response = await api.get<OKR>(`/okrs/${id}`)
    return {
      ...response.data,
      key_results: response.data.key_results || [],
      progress: response.data.key_results?.length > 0
        ? Math.round(response.data.key_results.reduce((sum, kr) => sum + kr.progress, 0) / response.data.key_results.length)
        : response.data.progress || 0
    }
  }

  static async create(data: OKRCreate): Promise<OKR> {
    const response = await api.post<OKR>('/okrs', {
      ...data,
      // Set initial progress and status
      progress: 0,
      status: 'draft'
    })
    return {
      ...response.data,
      key_results: response.data.key_results || []
    }
  }

  static async update(id: string, data: OKRUpdate): Promise<OKR> {
    const response = await api.put<OKR>(`/okrs/${id}`, data)
    return {
      ...response.data,
      key_results: response.data.key_results || []
    }
  }

  static async delete(id: string): Promise<void> {
    await api.delete(`/okrs/${id}`)
  }

  static async updateProgress(id: string, progress: number): Promise<OKR> {
    return this.update(id, { progress })
  }

  static async updateStatus(id: string, status: OKR['status']): Promise<OKR> {
    return this.update(id, { status })
  }
}