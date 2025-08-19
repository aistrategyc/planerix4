// components/tasks/TaskDetailDialog.tsx
"use client"

import { useState, useCallback, useEffect } from "react"
import {
  Task, TaskUpdate, TaskPriority, TaskType, TaskStatus
} from "@/lib/api/tasks"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Clock, Users, Star, MessageSquare, History, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface TaskDetailDialogProps {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (taskId: string, updates: TaskUpdate) => Promise<Task | null>
  users: Array<{ id: string; username: string }>
  projects: Array<{ id: string; name: string }>
}

export function TaskDetailDialog({
  task,
  open,
  onOpenChange,
  onUpdate,
  users,
  projects,
}: TaskDetailDialogProps) {
  const { toast } = useToast()
  const [isUpdating, setIsUpdating] = useState(false)
  const [editedTask, setEditedTask] = useState<TaskUpdate>({})

  // При открытии диалога заполняем поля из task
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
      const updated = await onUpdate(task.id, editedTask)
      if (updated) {
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
    const map = {
      todo: "bg-gray-100 text-gray-800",
      in_progress: "bg-blue-100 text-blue-800",
      in_review: "bg-yellow-100 text-yellow-800",
      done: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    }
    return map[status] || ""
  }

  const getPriorityColor = (priority: TaskPriority) => {
    const map = {
      urgent: "bg-red-100 text-red-800",
      high: "bg-orange-100 text-orange-800",
      medium: "bg-yellow-100 text-yellow-800",
      low: "bg-green-100 text-green-800",
    }
    return map[priority] || ""
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

          {/* MAIN CONTENT */}
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
              {/* Status */}
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={editedTask.status || task.status}
                  onValueChange={(value) =>
                    setEditedTask({ ...editedTask, status: value as TaskStatus })
                  }
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

              {/* Priority */}
              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select
                  value={editedTask.priority || task.priority}
                  onValueChange={(value) =>
                    setEditedTask({ ...editedTask, priority: value as TaskPriority })
                  }
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

              {/* Type */}
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select
                  value={editedTask.type || task.type}
                  onValueChange={(value) =>
                    setEditedTask({ ...editedTask, type: value as TaskType })
                  }
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
              {/* Assignee */}
              <div className="grid gap-2">
                <Label>Assignee</Label>
                <Select
                  value={editedTask.assigned_to ?? task.assigned_to ?? ""}
                  onValueChange={(value) =>
                    setEditedTask({ ...editedTask, assigned_to: value || undefined })
                  }
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

              {/* Project */}
              <div className="grid gap-2">
                <Label>Project</Label>
                <Select
                  value={editedTask.project_id ?? task.project_id ?? ""}
                  onValueChange={(value) =>
                    setEditedTask({ ...editedTask, project_id: value || undefined })
                  }
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

            {/* Dates and Hours */}
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={editedTask.due_date || ""}
                  onChange={(e) =>
                    setEditedTask({ ...editedTask, due_date: e.target.value || undefined })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Estimated Hours</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={editedTask.estimated_hours !== undefined ? String(editedTask.estimated_hours) : ""}
                  onChange={(e) =>
                    setEditedTask({
                      ...editedTask,
                      estimated_hours: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Actual Hours</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={editedTask.actual_hours !== undefined ? String(editedTask.actual_hours) : ""}
                  onChange={(e) =>
                    setEditedTask({
                      ...editedTask,
                      actual_hours: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                />
              </div>
            </div>

            {/* Metadata */}
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

          {/* TODO: Comments & History placeholders */}
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