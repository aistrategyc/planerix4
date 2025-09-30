// src/lib/api/tasks.ts
import { api } from "@/lib/api/config"

// ------------ Types matching backend exactly ------------
export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  task_type: TaskType
  project_id?: string
  assignee_id?: string
  parent_task_id?: string
  created_by: string
  created_at: string
  updated_at: string
  due_date?: string
  start_date?: string
  estimated_hours?: number
  actual_hours?: number
  story_points?: number
  tags?: string[]
  custom_fields?: Record<string, any>
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
  TASK = "task",
  BUG = "bug", 
  FEATURE = "feature",
  IMPROVEMENT = "improvement",
  RESEARCH = "research",
}

export interface TaskCreate {
  title: string
  description?: string
  priority?: TaskPriority
  task_type?: TaskType
  assignee_id?: string
  due_date?: string
  start_date?: string
  estimated_hours?: number
  story_points?: number
  tags?: string[]
  custom_fields?: Record<string, any>
  project_id?: string
  parent_task_id?: string
  status?: TaskStatus
}

export interface TaskUpdate {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  task_type?: TaskType
  project_id?: string
  assignee_id?: string
  due_date?: string
  start_date?: string
  estimated_hours?: number
  actual_hours?: number
  story_points?: number
  tags?: string[]
  custom_fields?: Record<string, any>
}

export interface TaskFilters {
  page?: number
  per_page?: number
  status?: TaskStatus
  priority?: TaskPriority
  task_type?: TaskType
  project_id?: string
  assignee_id?: string
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
    const url = q ? `tasks/?${q}` : "tasks/"

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
    const { data } = await api.post("tasks/", taskData)
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

  static async updateTaskAssignment(taskId: string, assigneeId: string): Promise<Task> {
    const { data } = await api.patch(`tasks/${taskId}/assignment`, {
      assignee_id: assigneeId,
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
    const { data } = await api.get("tasks/stats")
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
    const { data } = await api.get("users/")
    return Array.isArray(data) ? data : data?.items ?? data?.results ?? []
  }

  static async searchUsers(query: string): Promise<User[]> {
    const { data } = await api.get(`users/search?q=${encodeURIComponent(query)}`)
    return Array.isArray(data) ? data : data?.items ?? data?.results ?? []
  }
}

// ------------ Projects API import ------------
// Note: Full Projects API moved to @/lib/api/projects.ts
// This is a minimal interface for task-project relationships
export interface ProjectBasic {
  id: string
  name: string
  status: string
}

export class TaskProjectsAPI {
  static async getProjectsForTasks(): Promise<ProjectBasic[]> {
    const { data } = await api.get("projects/")
    return Array.isArray(data) ? data : data?.items ?? data?.results ?? []
  }
}
