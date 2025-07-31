"use client"

import { useState, useCallback, useMemo } from "react"
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, CheckSquare, Clock, AlertTriangle, Target, Star, Users, Search } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface Task {
  id: string
  title: string
  description?: string
  priority: "high" | "medium" | "low"
  assignee: string
  deadline: string
  status: "backlog" | "todo" | "inprogress" | "review" | "done"
  progress: number
  okrObjective?: string
  okrKeyResult?: string
}

interface Objective {
  id: string
  title: string
  keyResults: string[]
}

interface NewTask {
  title: string
  assignee: string
  deadline: string
  priority: "high" | "medium" | "low"
}

const columnsConfig = {
  backlog: { name: "Backlog", icon: <CheckSquare className="w-4 h-4" /> },
  todo: { name: "To Do", icon: <CheckSquare className="w-4 h-4" /> },
  inprogress: { name: "In Progress", icon: <Clock className="w-4 h-4" /> },
  review: { name: "Review", icon: <Star className="w-4 h-4" /> },
  done: { name: "Done", icon: <CheckSquare className="w-4 h-4" /> },
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "1",
      title: "Design landing page",
      description: "Create UI mockups",
      priority: "high",
      assignee: "Анна Смирнова",
      deadline: "2025-08-01",
      status: "inprogress",
      progress: 60,
      okrObjective: "Increase website traffic",
      okrKeyResult: "Achieve 20% more organic visits",
    },
    {
      id: "2",
      title: "Write marketing report",
      description: "Analyze Q2 data",
      priority: "medium",
      assignee: "Павел Кузнецов",
      deadline: "2025-07-31",
      status: "todo",
      progress: 0,
      okrObjective: "Boost marketing ROI",
      okrKeyResult: "Reach 250% ROI on campaigns",
    },
    {
      id: "3",
      title: "Fix bug in checkout",
      description: "Resolve payment issues",
      priority: "high",
      assignee: "Дмитрий Сидоров",
      deadline: "2025-07-29",
      status: "review",
      progress: 90,
      okrObjective: "Improve user retention",
      okrKeyResult: "Reduce cart abandonment by 15%",
    },
    {
      id: "4",
      title: "Plan team training",
      description: "Schedule new tool session",
      priority: "low",
      assignee: "Мария Петрова",
      deadline: "2025-08-05",
      status: "backlog",
      progress: 0,
      okrObjective: "Enhance team skills",
      okrKeyResult: "Train 100% of team on new tools",
    },
  ])

  const [objectives, setObjectives] = useState<Objective[]>([
    { id: "o1", title: "Increase website traffic", keyResults: ["Achieve 20% more organic visits", "Boost referral traffic by 10%"] },
    { id: "o2", title: "Boost marketing ROI", keyResults: ["Reach 250% ROI on campaigns", "Increase lead conversion by 30%"] },
    { id: "o3", title: "Improve user retention", keyResults: ["Reduce cart abandonment by 15%", "Increase repeat purchases by 25%"] },
    { id: "o4", title: "Enhance team skills", keyResults: ["Train 100% of team on new tools", "Certify 50% of team by Q4"] },
  ])

  const [newTask, setNewTask] = useState<NewTask>({ title: "", assignee: "", deadline: "", priority: "medium" })
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [filterPriority, setFilterPriority] = useState<string>("all")

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.assignee.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesPriority = filterPriority === "all" || task.priority === filterPriority
      return matchesSearch && matchesPriority
    })
  }, [tasks, searchQuery, filterPriority])

  const onDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return

    const newTasks = Array.from(tasks)
    const [movedTask] = newTasks.splice(result.source.index, 1)
    movedTask.status = result.destination.droppableId as Task["status"]
    newTasks.splice(result.destination.index, 0, movedTask)

    setTasks(newTasks)
    toast({
      title: "Задача перемещена",
      description: `Задача "${movedTask.title}" теперь в статусе "${columnsConfig[movedTask.status].name}"`,
    })
  }, [tasks])

  const addTask = useCallback(() => {
    if (!newTask.title || !newTask.assignee || !newTask.deadline) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive",
      })
      return
    }

    const id = (tasks.length + 1).toString()
    setTasks([
      ...tasks,
      {
        id,
        title: newTask.title,
        assignee: newTask.assignee,
        deadline: newTask.deadline,
        priority: newTask.priority,
        status: "backlog",
        progress: 0,
      },
    ])
    setNewTask({ title: "", assignee: "", deadline: "", priority: "medium" })
    toast({
      title: "Задача добавлена",
      description: `Задача "${newTask.title}" успешно создана`,
    })
  }, [newTask, tasks])

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800 border-red-300"
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-300"
      case "low": return "bg-green-100 text-green-800 border-green-300"
      default: return "bg-gray-100 text-gray-800 border-gray-300"
    }
  }

  const columns = useMemo(() => ({
    backlog: { name: columnsConfig.backlog.name, icon: columnsConfig.backlog.icon, tasks: filteredTasks.filter(t => t.status === "backlog") },
    todo: { name: columnsConfig.todo.name, icon: columnsConfig.todo.icon, tasks: filteredTasks.filter(t => t.status === "todo") },
    inprogress: { name: columnsConfig.inprogress.name, icon: columnsConfig.inprogress.icon, tasks: filteredTasks.filter(t => t.status === "inprogress") },
    review: { name: columnsConfig.review.name, icon: columnsConfig.review.icon, tasks: filteredTasks.filter(t => t.status === "review") },
    done: { name: columnsConfig.done.name, icon: columnsConfig.done.icon, tasks: filteredTasks.filter(t => t.status === "done") },
  }), [filteredTasks])

  const getWIPCount = (status: string) => {
    return filteredTasks.filter(t => t.status === status).length
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Задачи</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Поиск задач..."
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
          <Button onClick={addTask} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Добавить задачу
          </Button>
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

        <div className="flex gap-4 overflow-x-auto pb-4">
          <DragDropContext onDragEnd={onDragEnd}>
            {Object.entries(columns).map(([columnId, column]) => (
              <div key={columnId} className="min-w-[250px] flex-1">
                <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  {column.icon}
                  {column.name}
                  <Badge variant="outline" className="ml-2">
                    {getWIPCount(columnId)}
                  </Badge>
                </h2>
                <Droppable droppableId={columnId}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-2 min-h-[200px] p-2 bg-gray-50 rounded-lg"
                    >
                      {column.tasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="cursor-move hover:shadow-md transition-shadow border"
                            >
                              <CardContent className="p-4">
                                <h3 className="font-medium text-base">{task.title}</h3>
                                {task.description && (
                                  <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                                )}
                                <div className="flex justify-between items-center mt-2">
                                  <Badge className={getPriorityColor(task.priority)}>
                                    {task.priority === "high" ? "Высокий" : task.priority === "medium" ? "Средний" : "Низкий"}
                                  </Badge>
                                  <div className="text-sm text-gray-500 flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {task.deadline}
                                    {new Date(task.deadline) < new Date() && task.status !== "done" && (
                                      <AlertTriangle className="w-4 h-4 text-red-600 ml-1" />
                                    )}
                                  </div>
                                </div>
                                <div className="mt-2 text-sm text-gray-600 flex items-center gap-1">
                                  <Users className="w-4 h-4" />
                                  {task.assignee}
                                </div>
                                <div className="mt-2">
                                  <div className="flex justify-between text-xs text-gray-500">
                                    <span>Прогресс</span>
                                    <span>{task.progress}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                    <div
                                      className="bg-blue-600 h-2 rounded-full transition-all"
                                      style={{ width: `${task.progress}%` }}
                                    />
                                  </div>
                                </div>
                                {task.okrObjective && task.okrKeyResult && (
                                  <div className="mt-2 text-xs text-gray-500">
                                    OKR: {task.okrObjective} - {task.okrKeyResult}
                                  </div>
                                )}
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
                onValueChange={(value) => setNewTask({ ...newTask, priority: value as Task["priority"] })}
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
            <Button onClick={addTask} className="mt-4 bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> Создать задачу
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}