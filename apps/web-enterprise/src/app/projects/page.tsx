"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import {
  Plus,
  Search,
  FolderOpen,
  Calendar,
  Users,
  Target,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BarChart3,
  Settings,
  Eye,
  Edit3,
  Trash2,
  Filter,
  Loader2,
  Award,
  TrendingUp
} from "lucide-react"

import ProtectedRoute from "@/components/auth/ProtectedRoute"
import { useAuth } from "@/contexts/auth-context"
import { ProjectsAPI, type Project, type ProjectCreate, type ProjectUpdate, ProjectStatus, ProjectPriority } from "@/lib/api/projects"

interface ProjectsPageState {
  projects: Project[]
  loading: boolean
  selectedProject: Project | null
  showCreateDialog: boolean
  showDetailDialog: boolean
  searchQuery: string
  filterStatus: string
  filterPriority: string
  page: number
  totalPages: number
}

export default function ProjectsPage() {
  return (
    <ProtectedRoute requireAuth={true}>
      <ProjectsPageContent />
    </ProtectedRoute>
  )
}

function ProjectsPageContent() {
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()

  const [state, setState] = useState<ProjectsPageState>({
    projects: [],
    loading: true,
    selectedProject: null,
    showCreateDialog: false,
    showDetailDialog: false,
    searchQuery: "",
    filterStatus: "all",
    filterPriority: "all",
    page: 1,
    totalPages: 1
  })

  const [newProject, setNewProject] = useState<ProjectCreate>({
    name: "",
    description: "",
    status: ProjectStatus.DRAFT,
    priority: ProjectPriority.MEDIUM,
    start_date: "",
    end_date: "",
    budget: undefined,
    is_public: true,
    tags: [],
    member_ids: []
  })

  // Load projects
  const loadProjects = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }))
    try {
      const params: any = {
        page: state.page,
        page_size: 20
      }

      if (state.searchQuery) params.search = state.searchQuery
      if (state.filterStatus !== "all") params.status = state.filterStatus
      if (state.filterPriority !== "all") params.priority = state.filterPriority

      const response = await ProjectsAPI.list(params)

      setState(prev => ({
        ...prev,
        projects: response.items,
        totalPages: Math.ceil(response.total / response.page_size),
        loading: false
      }))
    } catch (error) {
      console.error("Failed to load projects:", error)
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive"
      })
      setState(prev => ({ ...prev, loading: false }))
    }
  }, [state.page, state.searchQuery, state.filterStatus, state.filterPriority, toast])

  // Load projects on mount and filter changes
  useEffect(() => {
    const timer = setTimeout(loadProjects, 300)
    return () => clearTimeout(timer)
  }, [loadProjects])

  // Create project
  const handleCreateProject = useCallback(async () => {
    if (!newProject.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Project name is required",
        variant: "destructive"
      })
      return
    }

    try {
      await ProjectsAPI.create({
        ...newProject,
        name: newProject.name.trim(),
        description: newProject.description?.trim() || undefined
      })

      toast({
        title: "Success",
        description: "Project created successfully"
      })

      setNewProject({
        name: "",
        description: "",
        status: ProjectStatus.DRAFT,
        priority: ProjectPriority.MEDIUM,
        start_date: "",
        end_date: "",
        budget: undefined,
        is_public: true,
        tags: [],
        member_ids: []
      })

      setState(prev => ({ ...prev, showCreateDialog: false }))
      loadProjects()
    } catch (error) {
      console.error("Failed to create project:", error)
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive"
      })
    }
  }, [newProject, toast, loadProjects])

  // Update project
  const handleUpdateProject = useCallback(async (id: string, updates: ProjectUpdate) => {
    try {
      await ProjectsAPI.update(id, updates)
      toast({
        title: "Success",
        description: "Project updated successfully"
      })
      loadProjects()
    } catch (error) {
      console.error("Failed to update project:", error)
      toast({
        title: "Error",
        description: "Failed to update project",
        variant: "destructive"
      })
    }
  }, [toast, loadProjects])

  // Delete project
  const handleDeleteProject = useCallback(async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return

    try {
      await ProjectsAPI.delete(id)
      toast({
        title: "Success",
        description: "Project deleted successfully"
      })
      setState(prev => ({ ...prev, showDetailDialog: false }))
      loadProjects()
    } catch (error) {
      console.error("Failed to delete project:", error)
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive"
      })
    }
  }, [toast, loadProjects])

  // Get status color
  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.DRAFT: return "bg-gray-100 text-gray-800"
      case ProjectStatus.ACTIVE: return "bg-blue-100 text-blue-800"
      case ProjectStatus.ON_HOLD: return "bg-yellow-100 text-yellow-800"
      case ProjectStatus.COMPLETED: return "bg-green-100 text-green-800"
      case ProjectStatus.CANCELLED: return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  // Get priority color
  const getPriorityColor = (priority: ProjectPriority) => {
    switch (priority) {
      case ProjectPriority.LOW: return "bg-green-500 text-white"
      case ProjectPriority.MEDIUM: return "bg-yellow-500 text-white"
      case ProjectPriority.HIGH: return "bg-orange-500 text-white"
      case ProjectPriority.URGENT: return "bg-red-500 text-white"
      default: return "bg-gray-500 text-white"
    }
  }

  // Get status icon
  const getStatusIcon = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.DRAFT: return <Clock className="w-4 h-4" />
      case ProjectStatus.ACTIVE: return <Target className="w-4 h-4" />
      case ProjectStatus.ON_HOLD: return <AlertTriangle className="w-4 h-4" />
      case ProjectStatus.COMPLETED: return <CheckCircle2 className="w-4 h-4" />
      case ProjectStatus.CANCELLED: return <AlertTriangle className="w-4 h-4" />
      default: return <FolderOpen className="w-4 h-4" />
    }
  }

  // Calculate completion percentage (mock for now)
  const getCompletionPercentage = (project: Project) => {
    // This would come from actual task data in a real implementation
    switch (project.status) {
      case ProjectStatus.COMPLETED: return 100
      case ProjectStatus.ACTIVE: return Math.floor(Math.random() * 60) + 20 // 20-80%
      case ProjectStatus.ON_HOLD: return Math.floor(Math.random() * 40) + 10 // 10-50%
      case ProjectStatus.CANCELLED: return Math.floor(Math.random() * 30) // 0-30%
      default: return 0
    }
  }

  // Get user initials
  const getInitials = (name?: string) => {
    if (!name) return "?"
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  // Statistics
  const stats = useMemo(() => {
    const total = state.projects.length
    const active = state.projects.filter(p => p.status === ProjectStatus.ACTIVE).length
    const completed = state.projects.filter(p => p.status === ProjectStatus.COMPLETED).length
    const onHold = state.projects.filter(p => p.status === ProjectStatus.ON_HOLD).length

    return { total, active, completed, onHold }
  }, [state.projects])

  if (state.loading && state.projects.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-6 h-6 text-blue-600" />
          <h1 className="text-3xl font-bold">Projects</h1>
          <Badge variant="outline" className="ml-2">
            Project Management
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={state.searchQuery}
              onChange={(e) => setState(prev => ({ ...prev, searchQuery: e.target.value }))}
              className="pl-8 w-64"
            />
          </div>

          <Select
            value={state.filterStatus}
            onValueChange={(value) => setState(prev => ({ ...prev, filterStatus: value }))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value={ProjectStatus.DRAFT}>Draft</SelectItem>
              <SelectItem value={ProjectStatus.ACTIVE}>Active</SelectItem>
              <SelectItem value={ProjectStatus.ON_HOLD}>On Hold</SelectItem>
              <SelectItem value={ProjectStatus.COMPLETED}>Completed</SelectItem>
              <SelectItem value={ProjectStatus.CANCELLED}>Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={state.filterPriority}
            onValueChange={(value) => setState(prev => ({ ...prev, filterPriority: value }))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value={ProjectPriority.LOW}>Low</SelectItem>
              <SelectItem value={ProjectPriority.MEDIUM}>Medium</SelectItem>
              <SelectItem value={ProjectPriority.HIGH}>High</SelectItem>
              <SelectItem value={ProjectPriority.URGENT}>Urgent</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={state.showCreateDialog} onOpenChange={(open) => setState(prev => ({ ...prev, showCreateDialog: open }))}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Start a new project to organize your work and collaborate with your team.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Project Name *</Label>
                  <Input
                    id="name"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    placeholder="Enter project name..."
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    placeholder="Brief project description..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={newProject.status}
                      onValueChange={(value) => setNewProject({ ...newProject, status: value as ProjectStatus })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ProjectStatus.DRAFT}>Draft</SelectItem>
                        <SelectItem value={ProjectStatus.ACTIVE}>Active</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={newProject.priority}
                      onValueChange={(value) => setNewProject({ ...newProject, priority: value as ProjectPriority })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ProjectPriority.LOW}>Low</SelectItem>
                        <SelectItem value={ProjectPriority.MEDIUM}>Medium</SelectItem>
                        <SelectItem value={ProjectPriority.HIGH}>High</SelectItem>
                        <SelectItem value={ProjectPriority.URGENT}>Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={newProject.start_date}
                      onChange={(e) => setNewProject({ ...newProject, start_date: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={newProject.end_date}
                      onChange={(e) => setNewProject({ ...newProject, end_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="budget">Budget ($)</Label>
                  <Input
                    id="budget"
                    type="number"
                    min="0"
                    step="100"
                    value={newProject.budget || ""}
                    onChange={(e) => setNewProject({
                      ...newProject,
                      budget: e.target.value ? parseFloat(e.target.value) : undefined
                    })}
                    placeholder="Project budget"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setState(prev => ({ ...prev, showCreateDialog: false }))}>
                  Cancel
                </Button>
                <Button onClick={handleCreateProject}>
                  Create Project
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Projects</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">On Hold</p>
                <p className="text-2xl font-bold">{stats.onHold}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {state.projects.map((project) => {
          const completion = getCompletionPercentage(project)

          return (
            <Card
              key={project.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setState(prev => ({ ...prev, selectedProject: project, showDetailDialog: true }))}
            >
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold truncate">{project.name}</h3>
                        <Badge className={getPriorityColor(project.priority)} variant="secondary">
                          {project.priority.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getStatusColor(project.status)} variant="outline">
                          {getStatusIcon(project.status)}
                          <span className="ml-1">{project.status.replace("_", " ").toUpperCase()}</span>
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span className="font-medium">{completion}%</span>
                    </div>
                    <Progress value={completion} className="h-2" />
                  </div>

                  {/* Meta Info */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>0 members</span>
                    </div>
                    {project.budget && (
                      <div className="flex items-center gap-1">
                        <BarChart3 className="w-4 h-4" />
                        <span>${project.budget.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Dates */}
                  {(project.start_date || project.end_date) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {project.start_date && (
                        <span>{new Date(project.start_date).toLocaleDateString()}</span>
                      )}
                      {project.start_date && project.end_date && <span>—</span>}
                      {project.end_date && (
                        <span>{new Date(project.end_date).toLocaleDateString()}</span>
                      )}
                    </div>
                  )}

                  {/* Owner */}
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={project.owner?.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {getInitials(project.owner?.full_name || project.owner?.username)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">
                      {project.owner?.full_name || project.owner?.username}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {state.projects.length === 0 && !state.loading && (
          <div className="col-span-full">
            <Card>
              <CardContent className="p-12 text-center">
                <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No projects found</h3>
                <p className="text-muted-foreground mb-4">
                  {state.searchQuery || state.filterStatus !== "all" || state.filterPriority !== "all"
                    ? "Try adjusting your filters or search terms"
                    : "Get started by creating your first project"}
                </p>
                <Button onClick={() => setState(prev => ({ ...prev, showCreateDialog: true }))}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Project
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Pagination */}
      {state.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={state.page <= 1}
            onClick={() => setState(prev => ({ ...prev, page: prev.page - 1 }))}
          >
            Previous
          </Button>
          <span className="flex items-center px-4">
            Page {state.page} of {state.totalPages}
          </span>
          <Button
            variant="outline"
            disabled={state.page >= state.totalPages}
            onClick={() => setState(prev => ({ ...prev, page: prev.page + 1 }))}
          >
            Next
          </Button>
        </div>
      )}

      {/* Project Detail Dialog */}
      <Dialog open={state.showDetailDialog} onOpenChange={(open) => setState(prev => ({ ...prev, showDetailDialog: open }))}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
          {state.selectedProject && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FolderOpen className="w-5 h-5" />
                  {state.selectedProject.name}
                  <Badge className={getPriorityColor(state.selectedProject.priority)} variant="secondary">
                    {state.selectedProject.priority.toUpperCase()}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  {state.selectedProject.status.replace("_", " ").toUpperCase()} •
                  Created {new Date(state.selectedProject.created_at).toLocaleDateString()}
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="members">Members (0)</TabsTrigger>
                  <TabsTrigger value="tasks">Tasks (0)</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid gap-4">
                    {state.selectedProject.description && (
                      <div>
                        <Label>Description</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          {state.selectedProject.description}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Status</Label>
                        <Badge className={getStatusColor(state.selectedProject.status)} variant="outline">
                          {getStatusIcon(state.selectedProject.status)}
                          <span className="ml-1">{state.selectedProject.status.replace("_", " ").toUpperCase()}</span>
                        </Badge>
                      </div>
                      <div>
                        <Label>Priority</Label>
                        <Badge className={getPriorityColor(state.selectedProject.priority)} variant="secondary">
                          {state.selectedProject.priority.toUpperCase()}
                        </Badge>
                      </div>
                    </div>

                    {(state.selectedProject.start_date || state.selectedProject.end_date) && (
                      <div className="grid grid-cols-2 gap-4">
                        {state.selectedProject.start_date && (
                          <div>
                            <Label>Start Date</Label>
                            <p className="text-sm">{new Date(state.selectedProject.start_date).toLocaleDateString()}</p>
                          </div>
                        )}
                        {state.selectedProject.end_date && (
                          <div>
                            <Label>End Date</Label>
                            <p className="text-sm">{new Date(state.selectedProject.end_date).toLocaleDateString()}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {state.selectedProject.budget && (
                      <div>
                        <Label>Budget</Label>
                        <p className="text-sm">${state.selectedProject.budget.toLocaleString()}</p>
                      </div>
                    )}

                    <div>
                      <Label>Owner</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={state.selectedProject.owner?.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {getInitials(state.selectedProject.owner?.full_name || state.selectedProject.owner?.username)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {state.selectedProject.owner?.full_name || state.selectedProject.owner?.username}
                        </span>
                      </div>
                    </div>

                    <div>
                      <Label>Progress</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={getCompletionPercentage(state.selectedProject)} className="flex-1" />
                        <span className="text-sm font-medium">{getCompletionPercentage(state.selectedProject)}%</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="members" className="space-y-4">
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4" />
                    <p>No members added yet</p>
                    <Button className="mt-4" variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Members
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="tasks" className="space-y-4">
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="w-12 h-12 mx-auto mb-4" />
                    <p>No tasks created yet</p>
                    <Button
                      className="mt-4"
                      variant="outline"
                      onClick={() => router.push('/tasks')}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Tasks
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-between pt-4 border-t">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteProject(state.selectedProject!.id, state.selectedProject!.name)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
                <Button size="sm" onClick={() => setState(prev => ({ ...prev, showDetailDialog: false }))}>
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}