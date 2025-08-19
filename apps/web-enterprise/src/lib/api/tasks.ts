// src/lib/api/tasks.ts
import api from '@/lib/api/axios'

// ------------ Types ------------
export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  type: TaskType
  project_id?: string
  assigned_to?: string
  created_by: string
  created_at: string
  updated_at: string
  due_date?: string
  estimated_hours?: number
  actual_hours?: number
}

export enum TaskStatus {
  TODO = "todo",
  IN_PROGRESS = "in_progress",
  IN_REVIEW = "in_review",
  DONE = "done",
  CANCELLED = "cancelled",
}

export enum TaskPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

export enum TaskType {
  FEATURE = "feature",
  BUG = "bug",
  IMPROVEMENT = "improvement",
  DOCUMENTATION = "documentation",
  TESTING = "testing",
}

export interface TaskCreate {
  title: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  type?: TaskType
  project_id?: string
  assigned_to?: string
  due_date?: string
  estimated_hours?: number
}

export interface TaskUpdate {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  type?: TaskType
  project_id?: string
  assigned_to?: string
  due_date?: string
  estimated_hours?: number
  actual_hours?: number
}

export interface TaskFilters {
  page?: number
  per_page?: number
  status?: TaskStatus
  priority?: TaskPriority
  type?: TaskType
  project_id?: string
  assigned_to?: string
  created_by?: string
  search?: string
}

export interface TaskStats {
  total_tasks: number
  completed_tasks: number
  in_progress_tasks: number
  overdue_tasks: number
  completion_rate: number
}

// ------------ Tasks API ------------
export class TasksAPI {
  // list with filters
  static async getTasks(filters?: TaskFilters): Promise<Task[]> {
  const params = new URLSearchParams()
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value))
      }
    })
  }

  const q = params.toString()
  const url = q ? `tasks/?${q}` : 'tasks/'

  const { data } = await api.get(url)

  // 🔧 Нормализуем ответ в массив
  const items = Array.isArray(data)
    ? data
    : data?.items ?? data?.results ?? data?.tasks ?? []

  return items as Task[]
}

  static async getTask(taskId: string): Promise<Task> {
    const { data } = await api.get(`tasks/${taskId}`)
    return data
  }

  static async createTask(taskData: TaskCreate): Promise<Task> {
    const { data } = await api.post('tasks/', taskData)
    return data
  }

  static async updateTask(taskId: string, taskData: TaskUpdate): Promise<Task> {
    const { data } = await api.patch(`tasks/${taskId}`, taskData)
    return data
  }

  static async deleteTask(taskId: string): Promise<void> {
    await api.delete(`tasks/${taskId}`)
  }

  static async updateTaskStatus(taskId: string, status: TaskStatus): Promise<Task> {
    const { data } = await api.patch(`tasks/${taskId}/status`, { status })
    return data
  }

  static async updateTaskAssignment(taskId: string, assignedTo: string): Promise<Task> {
    const { data } = await api.patch(`tasks/${taskId}/assignment`, {
      assigned_to: assignedTo,
    })
    return data
  }

  static async getTaskComments(taskId: string) {
    const { data } = await api.get(`tasks/${taskId}/comments`)
    return data
  }

  static async addTaskComment(taskId: string, content: string) {
    const { data } = await api.post(`tasks/${taskId}/comments`, { content })
    return data
  }

  static async getTaskStats(): Promise<TaskStats> {
    const { data } = await api.get('tasks/stats')
    return data
  }
}

// ------------ Users API (для списка исполнителей) ------------
export interface User {
  id: string
  username: string
  email: string
}

export class UsersAPI {
  static async getUsers(): Promise<User[]> {
    // ❗ было 'users/users/' — исправлено
    const { data } = await api.get('users/')
    return data
  }

  static async searchUsers(query: string): Promise<User[]> {
    // ❗ было 'users/users/search' — исправлено
    const { data } = await api.get(`users/search?q=${encodeURIComponent(query)}`)
    return data
  }
}

// ------------ Projects API (для выбора проекта) ------------
export interface Project {
  id: string
  name: string
  description?: string
  status: string
}

export class ProjectsAPI {
  static async getProjects(): Promise<Project[]> {
    // ❗ было 'projects/projects/' — исправлено
    const { data } = await api.get('projects/')
    return data
  }
}