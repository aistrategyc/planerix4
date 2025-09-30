import { api } from './config'

export const ProjectStatus = {
  ACTIVE: 'active' as const,
  INACTIVE: 'inactive' as const,
  COMPLETED: 'completed' as const,
  ON_HOLD: 'on_hold' as const,
  DRAFT: 'draft' as const,
  CANCELLED: 'cancelled' as const
} as const

export const ProjectPriority = {
  LOW: 'low' as const,
  MEDIUM: 'medium' as const,
  HIGH: 'high' as const,
  CRITICAL: 'critical' as const,
  URGENT: 'urgent' as const
} as const

export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus]
export type ProjectPriority = (typeof ProjectPriority)[keyof typeof ProjectPriority]

export interface Project {
  id: string
  name: string
  description?: string
  status: ProjectStatus
  priority: ProjectPriority
  start_date?: string
  end_date?: string
  budget?: number
  progress: number
  manager_id: string
  team_members?: string[]
  tags?: string[]
  is_public: boolean
  created_at: string
  updated_at: string
  user_id: string
}

export interface ProjectCreate {
  name: string
  description?: string
  status?: ProjectStatus
  priority?: ProjectPriority
  start_date?: string
  end_date?: string
  budget?: number
  manager_id?: string
  member_ids?: string[]
  team_members?: string[]
  tags?: string[]
  is_public?: boolean
}

export interface ProjectUpdate {
  name?: string
  description?: string
  status?: ProjectStatus
  priority?: ProjectPriority
  start_date?: string
  end_date?: string
  budget?: number
  progress?: number
  manager_id?: string
  member_ids?: string[]
  team_members?: string[]
  tags?: string[]
  is_public?: boolean
}

interface ProjectsListResponse {
  items: Project[]
  total: number
  page: number
  page_size: number
  pages: number
}

export class ProjectsAPI {
  static async list(params?: any): Promise<ProjectsListResponse> {
    const response = await api.get<ProjectsListResponse>('/projects', { params })
    return response.data
  }

  static async get(id: string): Promise<Project> {
    const response = await api.get<Project>(`/projects/${id}`)
    return response.data
  }

  static async create(data: ProjectCreate): Promise<Project> {
    const response = await api.post<Project>('/projects', {
      ...data,
      progress: 0,
      status: data.status || 'active',
      priority: data.priority || 'medium',
      is_public: data.is_public || false
    })
    return response.data
  }

  static async update(id: string, data: ProjectUpdate): Promise<Project> {
    const response = await api.put<Project>(`/projects/${id}`, data)
    return response.data
  }

  static async delete(id: string): Promise<void> {
    await api.delete(`/projects/${id}`)
  }

  static async updateProgress(id: string, progress: number): Promise<Project> {
    return this.update(id, { progress })
  }

  static async updateStatus(id: string, status: Project['status']): Promise<Project> {
    return this.update(id, { status })
  }
}