"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { Calendar as BigCalendar, Views, dateFnsLocalizer, type CalendarEvent } from "react-big-calendar"
import format from "date-fns/format"
import parse from "date-fns/parse"
import startOfWeek from "date-fns/startOfWeek"
import getDay from "date-fns/getDay"
import ru from "date-fns/locale/ru"
import "react-big-calendar/lib/css/react-big-calendar.css"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, CheckSquare, Clock, AlertTriangle, Target, Star, Search, RefreshCcw } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import axios from "axios"

interface CustomEvent extends CalendarEvent {
  id: string
  type: "meeting" | "deadline" | "call" | "holiday" | "task" | "goal"
  tags: string[]
  thumbnailUrl?: string
  description?: string
  priority?: "high" | "medium" | "low"
  status?: "pending" | "in-progress" | "completed"
  assignee?: string
  progress?: number
}

interface Objective {
  id: string
  title: string
  keyResults: string[]
}

const locales = { "ru": ru }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })

const allEventTypes = ["meeting", "deadline", "call", "holiday", "task", "goal"]
const allTags = ["urgent", "team", "external", "personal", "high", "medium", "low"]

export default function CalendarPage() {
  const { toast } = useToast()
  const [view, setView] = useState<keyof typeof Views>(Views.MONTH)
  const [selectedTypes, setSelectedTypes] = useState<string[]>(allEventTypes)
  const [selectedTags, setSelectedTags] = useState<string[]>(allTags)
  const [events, setEvents] = useState<CustomEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<CustomEvent | null>(null)
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium",
    assignee: "",
    deadline: "",
    type: "task",
  })
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [filterPriority, setFilterPriority] = useState<string>("all")
  const [objectives, setObjectives] = useState<Objective[]>([])
  const hasFetched = useRef(false)

  const fetchEvents = useCallback(async () => {
    if (hasFetched.current) return
    hasFetched.current = true
    try {
      setIsLoading(true)
      const token = localStorage.getItem("access_token")
      if (!token) {
        throw new Error("No auth token found. Please login.")
      }
      const config = { headers: { Authorization: `Bearer ${token}` }, timeout: 5000 }

      const tasksRes = await axios.get("/api/tasks", config)
      const tasksEvents = tasksRes.data.map((task: any) => ({
        id: task.id,
        title: task.title,
        start: new Date(task.deadline),
        end: new Date(task.deadline),
        type: "task",
        tags: [task.priority, task.status],
        description: task.description,
        priority: task.priority,
        status: task.status,
        assignee: task.assignee,
        progress: task.progress,
      }))

      const goalsRes = await axios.get("/api/okrs", config)
      const goalsEvents = goalsRes.data.map((goal: any) => ({
        id: goal.id,
        title: goal.title,
        start: new Date(goal.deadline),
        end: new Date(goal.deadline),
        type: "goal",
        tags: [goal.priority],
        description: `Progress: ${goal.progress}%`,
        progress: goal.progress,
      }))

      setEvents([...tasksEvents, ...goalsEvents])
      setObjectives(goalsRes.data.map((goal: any) => ({
        id: goal.id,
        title: goal.title,
        keyResults: goal.keyResults || [],
      })))
    } catch (err: any) {
      const errorMsg = err.message || "Failed to load events. Check backend connection."
      toast({ title: "Error", description: errorMsg, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const toggleType = useCallback((type: string) => {
    setSelectedTypes((prev) => prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type])
  }, [])

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])
  }, [])

  const resetFilters = useCallback(() => {
    setSelectedTypes(allEventTypes)
    setSelectedTags(allTags)
  }, [])

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const matchesSearch = ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ev.assignee || "").toLowerCase().includes(searchQuery.toLowerCase())
      const matchesPriority = filterPriority === "all" || ev.priority === filterPriority
      const typeMatch = selectedTypes.includes(ev.type)
      const tagsMatch = ev.tags.some((tag) => selectedTags.includes(tag))
      return matchesSearch && matchesPriority && typeMatch && tagsMatch
    })
  }, [events, searchQuery, filterPriority, selectedTypes, selectedTags])

  const eventPropGetter = useCallback((event: CustomEvent) => {
    let backgroundColor = "#3182ce"
    switch (event.type) {
      case "deadline": case "task": backgroundColor = event.priority === "high" ? "#e53e3e" : "#dd6b20"; break
      case "goal": backgroundColor = "#38a169"; break
      case "call": backgroundColor = "#dd6b20"; break
      case "holiday": backgroundColor = "#38a169"; break
    }
    return {
      style: {
        backgroundColor,
        borderRadius: "6px",
        opacity: event.status === "completed" ? 0.6 : 0.9,
        color: "white",
        border: "none",
        paddingLeft: event.thumbnailUrl ? 32 : 8,
        display: "flex",
        alignItems: "center",
        gap: "6px",
        fontSize: 12,
      },
    }
  }, [])

  const EventComponent = useCallback(({ event }: { event: CustomEvent }) => {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setSelectedEvent(event)}>
              {event.thumbnailUrl && <img src={event.thumbnailUrl} alt="" className="w-5 h-5 rounded-full" />}
              <span>{event.title}</span>
              {event.priority === "high" && <AlertTriangle className="w-4 h-4 text-yellow-300" />}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p><strong>{event.title}</strong></p>
            <p>Type: {event.type}</p>
            <p>Time: {format(event.start!, "PPp")}</p>
            {event.tags.length > 0 && <p>Tags: {event.tags.join(", ")}</p>}
            {event.progress !== undefined && <p>Progress: {event.progress}%</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }, [])

  const handleCreateTask = async () => {
    try {
      const token = localStorage.getItem("access_token")
      await axios.post("/api/tasks", newTask, { headers: { Authorization: `Bearer ${token}` } })
      toast({ title: "Success", description: "Task created" })
      setNewTask({ title: "", description: "", priority: "medium", assignee: "", deadline: "", type: "task" })
      hasFetched.current = false
      fetchEvents()
    } catch (error) {
      toast({ title: "Error", description: "Failed to create task", variant: "destructive" })
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Календарь</h1>
        <div className="flex gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Поиск событий..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-full sm:w-64"
            />
          </div>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Фильтр по приоритету" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все приоритеты</SelectItem>
              <SelectItem value="high">Высокий</SelectItem>
              <SelectItem value="medium">Средний</SelectItem>
              <SelectItem value="low">Низкий</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {objectives.map((obj) => (
            <Card key={obj.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="w-5 h-5 text-blue-600" /> {obj.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  {obj.keyResults.map((kr, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500" /> {kr}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-6 mb-6">
          <div>
            <h3 className="font-semibold mb-2 text-sm">Типы событий:</h3>
            <div className="flex flex-wrap gap-2">
              {allEventTypes.map((type) => (
                <Button key={type} variant={selectedTypes.includes(type) ? "default" : "outline"} size="sm" onClick={() => toggleType(type)} className="rounded-full">
                  {type}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2 text-sm">Теги/Приоритеты:</h3>
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <Button key={tag} variant={selectedTags.includes(tag) ? "secondary" : "outline"} size="sm" onClick={() => toggleTag(tag)} className="rounded-full">
                  {tag}
                </Button>
              ))}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={resetFilters} className="self-start">Скинути фільтри</Button>
        </div>

        <BigCalendar
          localizer={localizer}
          events={filteredEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 600 }}
          view={view}
          onView={setView}
          eventPropGetter={eventPropGetter}
          components={{ event: EventComponent }}
          popup
          className="rounded-md border"
        />

        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedEvent?.title}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-2">
              <p><strong>Описание:</strong> {selectedEvent?.description}</p>
              <p><strong>Тип:</strong> {selectedEvent?.type}</p>
              <p><strong>Приоритет:</strong> {selectedEvent?.priority}</p>
              <p><strong>Статус:</strong> {selectedEvent?.status}</p>
              <p><strong>Исполнитель:</strong> {selectedEvent?.assignee}</p>
              <p><strong>Прогресс:</strong> {selectedEvent?.progress}%</p>
            </div>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle>Добавить новую задачу</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                placeholder="Название задачи"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              />
              <Input
                placeholder="Исполнитель"
                value={newTask.assignee}
                onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })}
              />
              <Input
                type="date"
                value={newTask.deadline}
                onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
              />
              <Select
                value={newTask.priority}
                onValueChange={(value) => setNewTask({ ...newTask, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Приоритет" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Низкий</SelectItem>
                  <SelectItem value="medium">Средний</SelectItem>
                  <SelectItem value="high">Высокий</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreateTask} className="mt-4 bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> Создать задачу
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}