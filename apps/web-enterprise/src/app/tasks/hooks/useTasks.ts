// hooks/useTasks.ts - Enhanced task management hooks
import { useState, useEffect, useCallback, useRef } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { 
  TasksAPI, 
  UsersAPI, 
  ProjectsAPI, 
  Task, 
  TaskCreate, 
  TaskUpdate, 
  TaskStatus, 
  TaskType,
  TaskPriority,
  TaskFilters, 
  User, 
  Project,
  TaskStats,
} from '@/lib/api/tasks'
import { errorToMessage } from '@/lib/ui/errorToMessage'

// Enhanced filter interface - separate from TaskFilters to support 'all' values
export interface EnhancedTaskFilters {
  status?: TaskStatus | 'all'
  priority?: TaskPriority | 'all'
  type?: TaskType | 'all'
  assignee?: string | 'all'
  project_id?: string | 'all'
  search?: string
  date_range?: {
    start?: string
    end?: string
  }
  page?: number
  page_size?: number
}

export interface TaskMetrics {
  total_tasks: number
  completed_tasks: number
  in_progress_tasks: number
  todo_tasks: number
  overdue_tasks: number
  completion_rate: number
  avg_completion_time?: number
}



// Main hook for task management
export const useTasks = (initialFilters?: EnhancedTaskFilters) => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<EnhancedTaskFilters>({
    status: 'all' as const,
    priority: 'all' as const, 
    type: 'all' as const,
    assignee: 'all' as const,
    project_id: 'all' as const,
    page: 1,
    page_size: 20,
    ...initialFilters
  })
  const { toast } = useToast()
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Fetch tasks with enhanced filtering
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Convert enhanced filters to API format
      const apiFilters: TaskFilters = {
        page: filters.page,
        per_page: filters.page_size,
        status: filters.status === 'all' ? undefined : filters.status,
        priority: filters.priority === 'all' ? undefined : filters.priority,
        task_type: filters.type === 'all' ? undefined : filters.type,
        assignee_id: filters.assignee === 'all' ? undefined : filters.assignee,
        project_id: filters.project_id === 'all' ? undefined : filters.project_id,
        search: filters.search,
      }
      
      const fetchedTasks = await TasksAPI.getTasks(apiFilters)
      if (mountedRef.current) {
        setTasks(Array.isArray(fetchedTasks) ? fetchedTasks : (fetchedTasks as any)?.items || [])
      }
    } catch (err: any) {
      const errorMessage = errorToMessage(err)
      if (mountedRef.current) {
        setError(errorMessage)
        console.error('Failed to fetch tasks:', err)
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [filters])

  // Create task
  const createTask = useCallback(async (taskData: TaskCreate): Promise<Task | null> => {
    try {
      setError(null)
      const newTask = await TasksAPI.createTask(taskData)
      if (mountedRef.current) {
        setTasks(prev => [newTask, ...prev])
        toast({
          title: 'Task Created',
          description: `Task "${newTask.title}" has been created successfully`,
        })
      }
      return newTask
    } catch (err: any) {
      const errorMessage = errorToMessage(err)
      if (mountedRef.current) {
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
      }
      return null
    }
  }, [toast])

  // Update task
  const updateTask = useCallback(async (taskId: string, taskData: TaskUpdate): Promise<Task | null> => {
    try {
      setError(null)
      const updatedTask = await TasksAPI.updateTask(taskId, taskData)
      if (mountedRef.current) {
        setTasks(prev => prev.map(task => 
          task.id === taskId ? updatedTask : task
        ))
        toast({
          title: 'Task Updated',
          description: `Task "${updatedTask.title}" has been updated`,
        })
      }
      return updatedTask
    } catch (err: any) {
      const errorMessage = errorToMessage(err)
      if (mountedRef.current) {
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
      }
      return null
    }
  }, [toast])

  // Update task status (for drag & drop)
  const updateTaskStatus = useCallback(async (taskId: string, newStatus: TaskStatus): Promise<boolean> => {
    try {
      setError(null)
      const updatedTask = await TasksAPI.updateTaskStatus(taskId, newStatus)
      if (mountedRef.current) {
        setTasks(prev => prev.map(task => 
          task.id === taskId ? updatedTask : task
        ))
        toast({
          title: 'Task Moved',
          description: `Task moved to ${newStatus.replace('_', ' ')}`,
        })
      }
      return true
    } catch (err: any) {
      const errorMessage = errorToMessage(err)
      if (mountedRef.current) {
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
      }
      return false
    }
  }, [toast])

  // Delete task
  const deleteTask = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      setError(null)
      await TasksAPI.deleteTask(taskId)
      if (mountedRef.current) {
        setTasks(prev => prev.filter(task => task.id !== taskId))
        toast({
          title: 'Task Deleted',
          description: 'Task has been deleted successfully',
        })
      }
      return true
    } catch (err: any) {
      const errorMessage = errorToMessage(err)
      if (mountedRef.current) {
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
      }
      return false
    }
  }, [toast])

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<EnhancedTaskFilters>) => {
    setFilters(prev => ({
      ...prev, 
      ...newFilters,
      // Reset page when other filters change
      ...(Object.keys(newFilters).some(key => key !== 'page') && { page: 1 })
    }))
  }, [])

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({
      status: 'all' as const,
      priority: 'all' as const,
      type: 'all' as const, 
      assignee: 'all' as const,
      project_id: 'all' as const,
      search: '',
      page: 1,
      page_size: 20
    })
  }, [])

  // Bulk update tasks
  const bulkUpdateTasks = useCallback(async (taskIds: string[], updates: Partial<TaskUpdate>): Promise<boolean> => {
    try {
      setError(null)
      const promises = taskIds.map(id => TasksAPI.updateTask(id, updates))
      const updatedTasks = await Promise.all(promises)
      
      if (mountedRef.current) {
        setTasks(prev => prev.map(task => {
          const updated = updatedTasks.find(ut => ut.id === task.id)
          return updated || task
        }))
        toast({
          title: 'Tasks Updated',
          description: `${taskIds.length} tasks have been updated successfully`,
        })
      }
      return true
    } catch (err: any) {
      const errorMessage = errorToMessage(err)
      if (mountedRef.current) {
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
      }
      return false
    }
  }, [toast])

  // Initial fetch
  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  return {
    tasks,
    loading,
    error,
    filters,
    actions: {
      createTask,
      updateTask,
      updateTaskStatus,
      deleteTask,
      bulkUpdateTasks,
      updateFilters,
      clearFilters,
      refetch: fetchTasks,
    }
  }
}

// Hook for single task details
export const useTask = (taskId: string | null) => {
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const fetchTask = useCallback(async () => {
    if (!taskId) return
    
    try {
      setLoading(true)
      setError(null)
      const fetchedTask = await TasksAPI.getTask(taskId)
      if (mountedRef.current) {
        setTask(fetchedTask)
      }
    } catch (err) {
      const errorMessage = errorToMessage(err)
      if (mountedRef.current) {
        setError(errorMessage)
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [taskId])

  useEffect(() => {
    fetchTask()
  }, [fetchTask])

  return { task, loading, error, refetch: fetchTask }
}

// Hook for managing users (for assignee dropdown)
export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const fetchedUsers = await UsersAPI.getUsers()
      if (mountedRef.current) {
        setUsers(fetchedUsers)
      }
    } catch (err: any) {
      const errorMessage = errorToMessage(err)
      if (mountedRef.current) {
        setError(errorMessage)
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  return { users, loading, error, refetch: fetchUsers }
}

// Hook for managing projects
export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await ProjectsAPI.getProjects()
      if (mountedRef.current) {
        setProjects(response.items || response as any) // Handle both ProjectListResponse and Project[]
      }
    } catch (err: any) {
      const errorMessage = errorToMessage(err)
      if (mountedRef.current) {
        setError(errorMessage)
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  return { projects, loading, error, refetch: fetchProjects }
}

// Hook for task statistics and metrics
export const useTaskStats = () => {
  const [stats, setStats] = useState<TaskStats | null>(null)
  const [metrics, setMetrics] = useState<TaskMetrics | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch task stats
      const taskStats = await TasksAPI.getTaskStats()
      
      // Calculate additional metrics
      const allTasks = await TasksAPI.getTasks({ per_page: 1000 })
      const tasks = Array.isArray(allTasks) ? allTasks : (allTasks as any)?.items || []
      
      if (mountedRef.current) {
        setStats(taskStats)
        
        const total = tasks.length
        const completed = tasks.filter((t: Task) => t.status === TaskStatus.DONE).length
        const inProgress = tasks.filter((t: Task) => t.status === TaskStatus.IN_PROGRESS).length
        const todo = tasks.filter((t: Task) => t.status === TaskStatus.TODO).length
        
        // Calculate overdue tasks
        const now = new Date()
        const overdue = tasks.filter((t: Task) => 
          t.status !== TaskStatus.DONE && 
          t.due_date && 
          new Date(t.due_date) < now
        ).length
        
        const completion_rate = total > 0 ? Math.round((completed / total) * 100) : 0
        
        setMetrics({
          total_tasks: total,
          completed_tasks: completed,
          in_progress_tasks: inProgress,
          todo_tasks: todo,
          overdue_tasks: overdue,
          completion_rate
        })
      }
    } catch (err: any) {
      const errorMessage = errorToMessage(err)
      if (mountedRef.current) {
        setError(errorMessage)
        // Set fallback metrics
        setMetrics({
          total_tasks: 0,
          completed_tasks: 0,
          in_progress_tasks: 0,
          todo_tasks: 0,
          overdue_tasks: 0,
          completion_rate: 0
        })
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { stats, metrics, loading, error, refetch: fetchStats }
}

// Hook for task filtering and search
export const useTaskFilters = (initialFilters?: Partial<EnhancedTaskFilters>) => {
  const [filters, setFilters] = useState<EnhancedTaskFilters>({
    status: 'all' as const,
    priority: 'all' as const,
    type: 'all' as const,
    assignee: 'all' as const,
    project_id: 'all' as const,
    search: '',
    page: 1,
    page_size: 20,
    ...initialFilters
  })

  const updateFilter = useCallback((key: keyof EnhancedTaskFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      // Reset page when other filters change
      ...(key !== 'page' && { page: 1 })
    }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({
      status: 'all' as const,
      priority: 'all' as const,
      type: 'all' as const,
      assignee: 'all' as const,
      project_id: 'all' as const,
      search: '',
      page: 1,
      page_size: 20,
      ...initialFilters
    })
  }, [initialFilters])

  const hasActiveFilters = filters.status !== 'all' ||
                          filters.priority !== 'all' ||
                          filters.type !== 'all' ||
                          filters.assignee !== 'all' ||
                          filters.project_id !== 'all' ||
                          (filters.search && filters.search.length > 0)

  return {
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters
  }
}

export default {
  useTasks,
  useTask,
  useUsers,
  useProjects,
  useTaskStats,
  useTaskFilters
}