"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Plus,
  CheckSquare,
  Clock,
  AlertTriangle,
  Users,
  Search,
  Loader2,
  Eye,
  Star,
  PlayCircle,
  XCircle,
  Trash2,
  Calendar,
  MessageSquare,
  History
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useTasks, useUsers, useProjects } from "@/app/tasks/hooks/useTasks"
import { TaskStatus, TaskPriority, TaskType, TaskCreate, Task, TaskUpdate } from "@/lib/api/tasks"
import ProtectedRoute from "@/components/auth/ProtectedRoute"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface NewTaskForm extends TaskCreate {
  project_id: string
  assigned_to: string
}

// Column configuration mapping API statuses to UI
const columnsConfig = {
  [TaskStatus.TODO]: { 
    name: "To Do", 
    icon: <CheckSquare className="w-4 h-4" />,
    color: "bg-gray-100"
  },
  [TaskStatus.IN_PROGRESS]: { 
    name: "In Progress", 
    icon: <PlayCircle className="w-4 h-4" />,
    color: "bg-blue-100"
  },
  [TaskStatus.IN_REVIEW]: { 
    name: "In Review", 
    icon: <Eye className="w-4 h-4" />,
    color: "bg-yellow-100"
  },
  [TaskStatus.DONE]: { 
    name: "Done", 
    icon: <CheckSquare className="w-4 h-4" />,
    color: "bg-green-100"
  },
  [TaskStatus.CANCELLED]: { 
    name: "Cancelled", 
    icon: <XCircle className="w-4 h-4" />,
    color: "bg-red-100"
  },
}

function TasksPageContent() {
  const { toast } = useToast()
  const {
    tasks,
    loading: tasksLoading,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    updateFilters
  } = useTasks()
  const { users, loading: usersLoading } = useUsers()
  const { projects, loading: projectsLoading } = useProjects()

  const [searchQuery, setSearchQuery] = useState("")
  const [filterPriority, setFilterPriority] = useState<"all" | TaskPriority>("all")
  const [filterType, setFilterType] = useState<"all" | TaskType>("all")
  const [filterProject, setFilterProject] = useState<string>("all")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  // Push filters to server (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      const payload: any = {
        priority: filterPriority === "all" ? undefined : filterPriority,
        type: filterType === "all" ? undefined : filterType,
        project_id: filterProject === "all" ? undefined : filterProject,
      }
      if (searchQuery) payload.q = searchQuery
      updateFilters(payload)
    }, 300)
    return () => clearTimeout(t)
  }, [searchQuery, filterPriority, filterType, filterProject, updateFilters])

  // Task detail dialog state
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const selectedTask = useMemo(() => tasks.find(t => t.id === selectedTaskId) || null, [tasks, selectedTaskId])

  const openTask = useCallback((id: string) => {
    setSelectedTaskId(id)
    setIsDetailOpen(true)
  }, [])

  const [newTask, setNewTask] = useState<NewTaskForm>({
    title: "",
    description: "",
    priority: TaskPriority.MEDIUM,
    type: TaskType.FEATURE,
    project_id: "",
    assigned_to: "",
    due_date: "",
    estimated_hours: undefined,
  })

  // Filter tasks based on search and filters
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description?.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesPriority = filterPriority === "all" || task.priority === filterPriority
      const matchesType = filterType === "all" || task.type === filterType
      const matchesProject = filterProject === "all" || task.project_id === filterProject

      return matchesSearch && matchesPriority && matchesType && matchesProject
    })
  }, [tasks, searchQuery, filterPriority, filterType, filterProject])

  // Handle drag and drop
  const onDragEnd = useCallback(
    async (result: DropResult) => {
      if (!result.destination) return

      const taskId = result.draggableId
      const newStatus = result.destination.droppableId as TaskStatus
      
      // Optimistically update UI
      const task = tasks.find(t => t.id === taskId)
      if (!task) return

      // Update task status via API
      const success = await updateTaskStatus(taskId, newStatus)
      
      if (!success) {
        // Revert optimistic update on failure
        toast({
          title: "Error",
          description: "Failed to update task status",
          variant: "destructive",
        })
      }
    },
    [tasks, updateTaskStatus, toast]
  )

  // Create new task
  const handleCreateTask = useCallback(async () => {
    if (!newTask.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Task title is required",
        variant: "destructive",
      })
      return
    }

    const success = await createTask({
      ...newTask,
      title: newTask.title.trim(),
      description: newTask.description?.trim() || undefined,
      project_id: newTask.project_id || undefined,
      assigned_to: newTask.assigned_to || undefined,
      due_date: newTask.due_date || undefined,
    })

    if (success) {
      setNewTask({
        title: "",
        description: "",
        priority: TaskPriority.MEDIUM,
        type: TaskType.FEATURE,
        project_id: "",
        assigned_to: "",
        due_date: "",
        estimated_hours: undefined,
      })
      setShowCreateDialog(false)
    }
  }, [newTask, createTask, toast])

  // Delete task with confirmation
  const handleDeleteTask = useCallback(async (taskId: string, taskTitle: string) => {
    if (confirm(`Are you sure you want to delete "${taskTitle}"?`)) {
      await deleteTask(taskId)
    }
  }, [deleteTask])

  // Priority styling
  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.URGENT:
        return "bg-red-100 text-red-800 border-red-300"
      case TaskPriority.HIGH:
        return "bg-orange-100 text-orange-800 border-orange-300"
      case TaskPriority.MEDIUM:
        return "bg-yellow-100 text-yellow-800 border-yellow-300"
      case TaskPriority.LOW:
        return "bg-green-100 text-green-800 border-green-300"
      default:
        return "bg-gray-100 text-gray-800 border-gray-300"
    }
  }

  // Type styling
  const getTypeColor = (type: TaskType) => {
    switch (type) {
      case TaskType.BUG:
        return "bg-red-100 text-red-800"
      case TaskType.FEATURE:
        return "bg-blue-100 text-blue-800"
      case TaskType.IMPROVEMENT:
        return "bg-purple-100 text-purple-800"
      case TaskType.DOCUMENTATION:
        return "bg-gray-100 text-gray-800"
      case TaskType.TESTING:
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Group tasks by status
  const columns = useMemo(() => {
    const result: Record<TaskStatus, { name: string; icon: React.ReactNode; color: string; tasks: typeof filteredTasks }> = {} as any

    Object.values(TaskStatus).forEach(status => {
      result[status] = {
        ...columnsConfig[status],
        tasks: filteredTasks.filter(task => task.status === status)
      }
    })

    return result
  }, [filteredTasks])

  // Get user name by ID
  const getUserName = useCallback((userId?: string) => {
    if (!userId) return "Unassigned"
    const user = users.find(u => u.id === userId)
    return user?.username || "Unknown User"
  }, [users])

  // Get project name by ID
  const getProjectName = useCallback((projectId?: string) => {
    if (!projectId) return ""
    const project = projects.find(p => p.id === projectId)
    return project?.name || "Unknown Project"
  }, [projects])

  if (tasksLoading || usersLoading || projectsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading tasks...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <h1 className="text-3xl font-bold text-foreground">Tasks</h1>
        
        {/* Filters and Search */}
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          
          <Select value={filterPriority} onValueChange={(value) => setFilterPriority(value as "all" | TaskPriority)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value={TaskPriority.URGENT}>Urgent</SelectItem>
              <SelectItem value={TaskPriority.HIGH}>High</SelectItem>
              <SelectItem value={TaskPriority.MEDIUM}>Medium</SelectItem>
              <SelectItem value={TaskPriority.LOW}>Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={(value) => setFilterType(value as "all" | TaskType)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value={TaskType.FEATURE}>Feature</SelectItem>
              <SelectItem value={TaskType.BUG}>Bug</SelectItem>
              <SelectItem value={TaskType.IMPROVEMENT}>Improvement</SelectItem>
              <SelectItem value={TaskType.DOCUMENTATION}>Documentation</SelectItem>
              <SelectItem value={TaskType.TESTING}>Testing</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map(project => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" /> New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
                <DialogDescription>
                  Add a new task to your project workflow.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="Enter task title..."
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    placeholder="Task description..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={newTask.priority}
                      onValueChange={(value) => setNewTask({ ...newTask, priority: value as TaskPriority })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={TaskPriority.LOW}>Low</SelectItem>
                        <SelectItem value={TaskPriority.MEDIUM}>Medium</SelectItem>
                        <SelectItem value={TaskPriority.HIGH}>High</SelectItem>
                        <SelectItem value={TaskPriority.URGENT}>Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="type">Type</Label>
                    <Select
                      value={newTask.type}
                      onValueChange={(value) => setNewTask({ ...newTask, type: value as TaskType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={TaskType.FEATURE}>Feature</SelectItem>
                        <SelectItem value={TaskType.BUG}>Bug</SelectItem>
                        <SelectItem value={TaskType.IMPROVEMENT}>Improvement</SelectItem>
                        <SelectItem value={TaskType.DOCUMENTATION}>Documentation</SelectItem>
                        <SelectItem value={TaskType.TESTING}>Testing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="assigned_to">Assignee</Label>
                    <Select
                      value={newTask.assigned_to}
                      onValueChange={(value) => setNewTask({ ...newTask, assigned_to: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select assignee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Unassigned</SelectItem>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="project_id">Project</Label>
                    <Select
                      value={newTask.project_id}
                      onValueChange={(value) => setNewTask({ ...newTask, project_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No Project</SelectItem>
                        {projects.map(project => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Input
                      id="due_date"
                      type="date"
                      value={newTask.due_date}
                      onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="estimated_hours">Estimated Hours</Label>
                    <Input
                      id="estimated_hours"
                      type="number"
                      min="0"
                      step="0.5"
                      value={newTask.estimated_hours || ""}
                      onChange={(e) => setNewTask({ 
                        ...newTask, 
                        estimated_hours: e.target.value ? parseFloat(e.target.value) : undefined 
                      })}
                      placeholder="Hours"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTask}>
                  Create Task
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        <DragDropContext onDragEnd={onDragEnd}>
          {Object.entries(columns).map(([columnId, column]) => (
            <div key={columnId} className="min-w-[280px] flex-1">
              <div className={`rounded-lg p-3 mb-4 ${column.color}`}>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  {column.icon}
                  {column.name}
                  <Badge variant="secondary" className="ml-auto">
                    {column.tasks.length}
                  </Badge>
                </h2>
              </div>
              
              <Droppable droppableId={columnId}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-3 min-h-[400px] p-2 rounded-lg transition-colors ${
                      snapshot.isDraggingOver ? 'bg-muted/50' : 'bg-background'
                    }`}
                  >
                    {column.tasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => openTask(task.id)}
                            className={`cursor-move transition-all ${
                              snapshot.isDragging ? 'shadow-lg rotate-2' : 'hover:shadow-md'
                            }`}
                          >
                            <CardContent className="p-4">
                              {/* Task Header */}
                              <div className="flex justify-between items-start mb-2">
                                <h3 className="font-medium text-base line-clamp-2">
                                  {task.title}
                                </h3>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteTask(task.id, task.title)
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>

                              {/* Task Description */}
                              {task.description && (
                                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                  {task.description}
                                </p>
                              )}

                              {/* Priority and Type Badges */}
                              <div className="flex gap-2 mb-3">
                                <Badge className={getPriorityColor(task.priority)} variant="outline">
                                  {task.priority.toUpperCase()}
                                </Badge>
                                <Badge className={getTypeColor(task.type)} variant="outline">
                                  {task.type.replace('_', ' ').toUpperCase()}
                                </Badge>
                              </div>

                              {/* Project Info */}
                              {task.project_id && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                                  <Star className="w-3 h-3" />
                                  {getProjectName(task.project_id)}
                                </div>
                              )}

                              {/* Assignee */}
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                                <Users className="w-4 h-4" />
                                <span>{getUserName(task.assigned_to)}</span>
                              </div>

                              {/* Due Date */}
                              {task.due_date && (
                                <div className="flex items-center gap-2 text-sm mb-3">
                                  <Clock className="w-4 h-4" />
                                  <span className={`${
                                    new Date(task.due_date) < new Date() && task.status !== TaskStatus.DONE
                                      ? 'text-destructive font-medium'
                                      : 'text-muted-foreground'
                                  }`}>
                                    {new Date(task.due_date).toLocaleDateString()}
                                  </span>
                                  {new Date(task.due_date) < new Date() && task.status !== TaskStatus.DONE && (
                                    <AlertTriangle className="w-4 h-4 text-destructive" />
                                  )}
                                </div>
                              )}

                              {/* Estimated Hours */}
                              {task.estimated_hours && (
                                <div className="text-xs text-muted-foreground">
                                  Estimated: {task.estimated_hours}h
                                  {task.actual_hours && (
                                    <span> | Actual: {task.actual_hours}h</span>
                                  )}
                                </div>
                              )}

                              {/* Task Metadata */}
                              <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                                <div>Created: {new Date(task.created_at).toLocaleDateString()}</div>
                                {task.updated_at !== task.created_at && (
                                  <div>Updated: {new Date(task.updated_at).toLocaleDateString()}</div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </DragDropContext>
      </div>

      {/* Task Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Task Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(columns).map(([status, column]) => (
              <div key={status} className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  {column.tasks.length}
                </div>
                <div className="text-sm text-muted-foreground">
                  {column.name}
                </div>
              </div>
            ))}
          </div>
          
          {/* Additional Stats */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border">
            <div className="text-center">
              <div className="text-lg font-semibold text-foreground">
                {tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== TaskStatus.DONE).length}
              </div>
              <div className="text-sm text-destructive">Overdue</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-foreground">
                {tasks.filter(t => t.assigned_to).length}
              </div>
              <div className="text-sm text-muted-foreground">Assigned</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-foreground">
                {tasks.filter(t => t.priority === TaskPriority.HIGH || t.priority === TaskPriority.URGENT).length}
              </div>
              <div className="text-sm text-orange-600">High Priority</div>
            </div>
          </div>
        </CardContent>
      </Card>
      <TaskDetailDialog
        task={selectedTask}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onUpdate={updateTask}
        users={users.map(u => ({ id: u.id, username: u.username }))}
        projects={projects.map(p => ({ id: p.id, name: p.name }))}
      />
    </div>
  )
}

function TaskDetailDialog({
  task,
  open,
  onOpenChange,
  onUpdate,
  users,
  projects,
}: {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (taskId: string, updates: TaskUpdate) => Promise<Task | null>
  users: Array<{ id: string; username: string }>
  projects: Array<{ id: string; name: string }>
}) {
  const { toast } = useToast()
  const [isUpdating, setIsUpdating] = useState(false)
  const [editedTask, setEditedTask] = useState<TaskUpdate>({})

  useEffect(() => {
    if (task && open) {
      setEditedTask({
        title: task.title,
        description: task.description,
        priority: task.priority,
        type: task.type,
        status: task.status,
        assigned_to: task.assigned_to,
        project_id: task.project_id,
        due_date: task.due_date,
        estimated_hours: task.estimated_hours,
        actual_hours: task.actual_hours,
      })
    }
  }, [task, open])

  const handleUpdate = useCallback(async () => {
    if (!task) return
    setIsUpdating(true)
    try {
      const res = await onUpdate(task.id, editedTask)
      if (res) {
        toast({ title: "Task Updated", description: "Changes saved successfully." })
        onOpenChange(false)
      }
    } catch {
      toast({ title: "Error", description: "Failed to update task", variant: "destructive" })
    } finally {
      setIsUpdating(false)
    }
  }, [task, editedTask, onUpdate, toast, onOpenChange])

  const getStatusColor = (status: TaskStatus) => {
    const map: Record<TaskStatus, string> = {
      [TaskStatus.TODO]: "bg-gray-100 text-gray-800",
      [TaskStatus.IN_PROGRESS]: "bg-blue-100 text-blue-800",
      [TaskStatus.IN_REVIEW]: "bg-yellow-100 text-yellow-800",
      [TaskStatus.DONE]: "bg-green-100 text-green-800",
      [TaskStatus.CANCELLED]: "bg-red-100 text-red-800",
    }
    return map[status]
  }

  const getPriorityColor = (priority: TaskPriority) => {
    const map: Record<TaskPriority, string> = {
      [TaskPriority.URGENT]: "bg-red-100 text-red-800",
      [TaskPriority.HIGH]: "bg-orange-100 text-orange-800",
      [TaskPriority.MEDIUM]: "bg-yellow-100 text-yellow-800",
      [TaskPriority.LOW]: "bg-green-100 text-green-800",
    }
    return map[priority]
  }

  if (!task) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Task Details
            <Badge className={getStatusColor(task.status)} variant="outline">
              {task.status.replace("_", " ").toUpperCase()}
            </Badge>
          </DialogTitle>
          <DialogDescription>View and update this task</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input
                value={editedTask.title || ""}
                onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea
                value={editedTask.description || ""}
                onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={(editedTask.status as TaskStatus) || undefined}
                  onValueChange={(value) => setEditedTask({ ...editedTask, status: value as TaskStatus })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.values(TaskStatus).map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.replace("_", " ").toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select
                  value={(editedTask.priority as TaskPriority) || undefined}
                  onValueChange={(value) => setEditedTask({ ...editedTask, priority: value as TaskPriority })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.values(TaskPriority).map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {priority.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Type</Label>
                <Select
                  value={(editedTask.type as TaskType) || undefined}
                  onValueChange={(value) => setEditedTask({ ...editedTask, type: value as TaskType })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.values(TaskType).map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Assignee</Label>
                <Select
                  value={editedTask.assigned_to || ""}
                  onValueChange={(value) => setEditedTask({ ...editedTask, assigned_to: value || undefined })}
                >
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Project</Label>
                <Select
                  value={editedTask.project_id || ""}
                  onValueChange={(value) => setEditedTask({ ...editedTask, project_id: value || undefined })}
                >
                  <SelectTrigger><SelectValue placeholder="No Project" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Project</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={editedTask.due_date || ""}
                  onChange={(e) => setEditedTask({ ...editedTask, due_date: e.target.value || undefined })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Estimated Hours</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={editedTask.estimated_hours ?? ""}
                  onChange={(e) => setEditedTask({
                    ...editedTask,
                    estimated_hours: e.target.value ? parseFloat(e.target.value) : undefined,
                  })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Actual Hours</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={editedTask.actual_hours ?? ""}
                  onChange={(e) => setEditedTask({
                    ...editedTask,
                    actual_hours: e.target.value ? parseFloat(e.target.value) : undefined,
                  })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg text-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Created: {new Date(task.created_at).toLocaleString()}</div>
                <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> Updated: {new Date(task.updated_at).toLocaleString()}</div>
              </div>
              <div className="space-y-2">
                <div>Task ID: {task.id}</div>
                <div>Created by: {task.created_by}</div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="comments" className="py-6 text-center text-muted-foreground">
            <MessageSquare className="w-10 h-10 mx-auto mb-2" />
            Comments coming soon...
          </TabsContent>

          <TabsContent value="history" className="py-6 text-center text-muted-foreground">
            <History className="w-10 h-10 mx-auto mb-2" />
            History coming soon...
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleUpdate} disabled={isUpdating}>
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function TasksPage() {
  return (
    <ProtectedRoute requireAuth={true}>
      <TasksPageContent />
    </ProtectedRoute>
  )
}