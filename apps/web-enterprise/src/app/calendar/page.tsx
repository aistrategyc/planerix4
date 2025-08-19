"use client"

import { useState, useCallback, useMemo } from "react"
import { Calendar, Views, dateFnsLocalizer } from "react-big-calendar"
import { format, parse, startOfWeek, getDay } from "date-fns"
import { enUS } from "date-fns/locale"
import "react-big-calendar/lib/css/react-big-calendar.css"

import { useCalendar, useCalendarStats, useUpcomingDeadlines, useOverdueEvents, useEventFilters } from "@/app/calendar/hooks/useCalendar"
import ProtectedRoute from "@/components/auth/ProtectedRoute"
import { CalendarEvent, EventType, EventStatus, CreateEventRequest } from "@/lib/api/calendar"
import { TaskPriority } from "@/lib/api/tasks"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"

import {
  Plus,
  Search,
  Filter,
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  Target,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  Edit3,
  Trash2,
  BarChart3,
  TrendingUp
} from "lucide-react"

// Calendar localization
const locales = { 'en-US': enUS }
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

export default function CalendarPage() {
  return (
    <ProtectedRoute>
      <CalendarPageContent />
    </ProtectedRoute>
  )
}

function CalendarPageContent() {
  const { toast } = useToast()

  const { events, loading, createEvent, updateEvent, deleteEvent, updateEventStatus } = useCalendar()
  const { stats } = useCalendarStats()
  const { deadlines } = useUpcomingDeadlines(7)
  const { overdueEvents } = useOverdueEvents()
  const {
    filteredEvents,
    searchQuery,
    setSearchQuery,
    selectedTypes,
    selectedPriorities,
    toggleType,
    togglePriority,
    resetFilters
  } = useEventFilters(events)

  const [view, setView] = useState<typeof Views[keyof typeof Views]>(Views.MONTH)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEventDialog, setShowEventDialog] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const [newEvent, setNewEvent] = useState<CreateEventRequest>({
    title: "",
    start: "",
    end: "",
    type: EventType.TASK,
    description: "",
    priority: TaskPriority.MEDIUM,
    assignee: "",
    allDay: true
  })

  const handleCreateEvent = useCallback(async () => {
    if (!newEvent.title.trim() || !newEvent.start || !newEvent.end) {
      toast({ title: 'Validation Error', description: 'Fill all required fields', variant: 'destructive' })
      return
    }

    setIsCreating(true)
    const success = await createEvent(newEvent)

    if (success) {
      setNewEvent({
        title: "",
        start: "",
        end: "",
        type: EventType.TASK,
        description: "",
        priority: TaskPriority.MEDIUM,
        assignee: "",
        allDay: true
      })
      setShowCreateDialog(false)
    }

    setIsCreating(false)
  }, [newEvent, createEvent, toast])

  // Остальная логика UI (рендер календаря, модалок, карточек задач и т.д.)
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">📅 Calendar</h1>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Event
        </Button>
      </div>
      <Calendar
        localizer={localizer}
        events={filteredEvents}
        startAccessor="start"
        endAccessor="end"
        views={[Views.MONTH, Views.WEEK, Views.DAY]}
        view={view}
        onView={setView}
        style={{ height: 700 }}
        eventPropGetter={(event) => {
          return {
            style: {
              backgroundColor: event.priority === 'high' ? '#ef4444' : '#3b82f6',
              color: 'white',
              borderRadius: '4px',
              fontSize: '12px',
              padding: '4px'
            }
          }
        }}
        components={{
          event: ({ event }) => (
            <div
              className="cursor-pointer truncate"
              onClick={() => {
                setSelectedEvent(event)
                setShowEventDialog(true)
              }}
            >
              {event.title}
            </div>
          )
        }}
      />
    </div>
  )
}