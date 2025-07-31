"use client"

import { useState, useCallback, useEffect } from "react"
import axios from "axios"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

import { AlertTriangle, Award, Building2, Calendar, Camera, CheckSquare, Clock, Edit3, Globe, Linkedin, Mail, MapPin, Phone, Save, Star, Target, TrendingUp, Twitter, User, Users, X, Github } from "lucide-react"

// API Base URL (замени на реальный URL твоего backend, например, http://localhost:8000/api)
const API_BASE = "http://localhost:8000/api"  // <--- Замени здесь на реальный URL, чтобы избежать Network Error

interface TeamMember {
  id: string
  username: string
  role: string
  position: string
  email: string
  status: "online" | "offline" | "away"
}

interface Metric {
  id: string
  name: string
  value: number | string
  change: number
  icon: any
  color: string
}

interface Goal {
  id: string
  title: string
  progress: number
  deadline: string
  priority: "high" | "medium" | "low"
}

interface Achievement {
  id: string
  title: string
  description: string
  date: string
  icon: any
}

interface Task {
  id: string
  title: string
  assignedTo: TeamMember
  progress: number
  deadline: string
  status: "pending" | "in-progress" | "completed"
  priority: "high" | "medium" | "low"
}

interface Integration {
  id: number
  name: string
  connected: boolean
  token: string
}

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [department, setDepartment] = useState("")
  const [role, setRole] = useState("")
  const [bio, setBio] = useState("")
  const [skills, setSkills] = useState<string[]>([])
  const [avatarUrl, setAvatarUrl] = useState("")
  const [team, setTeam] = useState<TeamMember[]>([])
  const [companyName, setCompanyName] = useState("")
  const [companyAddress, setCompanyAddress] = useState("")
  const [companyWebsite, setCompanyWebsite] = useState("")
  const [companyDescription, setCompanyDescription] = useState("")
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [integrations, setIntegrations] = useState<Integration[]>([
    { id: 1, name: "Facebook Ads", connected: false, token: "" },
    { id: 2, name: "Google Ads", connected: false, token: "" },
    { id: 3, name: "Google Analytics", connected: false, token: "" },
  ])
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("employee")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch current user profile
        const profileRes = await axios.get(`${API_BASE}/users/me`)
        const userData = profileRes.data
        setName(userData.username || "")
        setEmail(userData.email || "")
        setPhone(userData.phone || "")
        setAddress(userData.address || "")
        setDepartment(userData.department || "")
        setRole(userData.role || "")
        setBio(userData.bio || "")
        setSkills(userData.skills || [])
        setAvatarUrl(userData.avatarUrl || "https://api.dicebear.com/7.x/initials/svg?seed=" + (userData.username ? userData.username[0] : "U"))

        // Fetch team
        const teamRes = await axios.get(`${API_BASE}/clients/${userData.client_id}/team`)
        setTeam(teamRes.data.map((member: any) => ({
          ...member,
          status: "offline" // Placeholder, can be fetched or real-time
        })))

        // Fetch company
        const companyRes = await axios.get(`${API_BASE}/clients/${userData.client_id}`)
        const companyData = companyRes.data
        setCompanyName(companyData.name || "")
        setCompanyAddress(companyData.address || "")
        setCompanyWebsite(companyData.website || "")
        setCompanyDescription(companyData.description || "")

        // Fetch projects, tasks, okrs, kpis
        const projectsRes = await axios.get(`${API_BASE}/clients/${userData.client_id}/projects`)
        setGoals(projectsRes.data.map((proj: any) => ({
          id: proj.id,
          title: proj.name,
          progress: 0, // Calculate based on tasks
          deadline: proj.deadline || "2025-12-31",
          priority: "medium"
        })))

        const tasksRes = await axios.get(`${API_BASE}/clients/${userData.client_id}/tasks`)
        setTasks(tasksRes.data.map((task: any) => ({
          ...task,
          assignedTo: teamRes.data.find((m: any) => m.id === task.assignee_id) || { username: "Unknown", role: "" },
          status: task.status || "pending",
          priority: task.priority || "medium"
        })))

        const okrsRes = await axios.get(`${API_BASE}/clients/${userData.client_id}/okrs`)
        setAchievements(okrsRes.data.map((okr: any) => ({
          id: okr.id,
          title: okr.objective,
          description: okr.key_results,
          date: okr.created_at,
          icon: Award
        })))

        const kpisRes = await axios.get(`${API_BASE}/clients/${userData.client_id}/kpis`)
        setMetrics(kpisRes.data.map((kpi: any) => ({
          id: kpi.id,
          name: kpi.name,
          value: kpi.current_value,
          change: ((kpi.current_value - kpi.target_value) / kpi.target_value) * 100,
          icon: TrendingUp,
          color: "text-green-600"
        })))

        // Integrations from company
        const newIntegrations = [...integrations]
        if (companyData.facebook_ads_token) newIntegrations[0] = { ...newIntegrations[0], connected: true, token: companyData.facebook_ads_token }
        if (companyData.google_ads_client_id) newIntegrations[1] = { ...newIntegrations[1], connected: true, token: companyData.google_ads_client_id }
        if (companyData.google_analytics_id) newIntegrations[2] = { ...newIntegrations[2], connected: true, token: companyData.google_analytics_id }
        setIntegrations(newIntegrations)
      } catch (err) {
        setError("Error fetching data. Check if backend is running.")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "bg-green-500"
      case "away": return "bg-yellow-500"
      case "offline": return "bg-gray-400"
      default: return "bg-gray-400"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800"
      case "medium": return "bg-yellow-100 text-yellow-800"
      case "low": return "bg-green-100 text-green-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500"
      case "in-progress": return "bg-blue-500"
      case "pending": return "bg-yellow-500"
      default: return "bg-gray-400"
    }
  }

  const handleSave = useCallback(async () => {
    setIsEditing(false)
    // Update user profile
    await axios.put(`${API_BASE}/users/me`, { username: name, email, phone, address, department, role, bio, skills })
    // Update company
    await axios.put(`${API_BASE}/clients/current`, { name: companyName, address: companyAddress, website: companyWebsite, description: companyDescription })
  }, [name, email, phone, address, department, role, bio, skills, companyName, companyAddress, companyWebsite, companyDescription])

  const handleConnectIntegration = async (id: number, token: string) => {
    const int = integrations[id - 1]
    const field = int.name.toLowerCase().replace(/ /g, '_') + '_token'
    await axios.put(`${API_BASE}/clients/current/integrations`, { [field]: token })
    setIntegrations(integrations.map(i => i.id === id ? { ...i, connected: true, token } : i))
  }

  const handleInvite = async () => {
    await axios.post(`${API_BASE}/clients/current/invite`, { email: inviteEmail, role: inviteRole })
    setInviteEmail("")
    setInviteRole("employee")
  }

  if (loading) return <div>Загрузка...</div>
  if (error) return <div>{error}</div>

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Профиль пользователя</h1>
          <p className="text-gray-600 mt-1">Управляйте своей информацией, компанией, задачами и интеграциями</p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                <Save className="w-4 h-4 mr-2" /> Сохранить
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                <X className="w-4 h-4 mr-2" /> Отмена
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)} variant="outline">
              <Edit3 className="w-4 h-4 mr-2" /> Редактировать
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="profile">Профиль</TabsTrigger>
          <TabsTrigger value="team">Команда</TabsTrigger>
          <TabsTrigger value="company">Компания</TabsTrigger>
          <TabsTrigger value="metrics">Метрики</TabsTrigger>
          <TabsTrigger value="tasks">Задачи</TabsTrigger>
          <TabsTrigger value="integrations">Интеграции</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <Avatar className="w-32 h-32">
                      <AvatarImage src={avatarUrl} />
                      <AvatarFallback className="text-2xl">{name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                    </Avatar>
                    {isEditing && (
                      <Button size="sm" className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0" variant="secondary">
                        <Camera className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <div className="text-center">
                    <h2 className="text-2xl font-bold">{name}</h2>
                    <p className="text-gray-600">{role}</p>
                    <p className="text-sm text-gray-500">{department}</p>
                  </div>
                </div>
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="flex items-center gap-2">
                        <User className="w-4 h-4" /> Имя
                      </Label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!isEditing} className="mt-1" />
                    </div>
                    <div>
                      <Label className="flex items-center gap-2">
                        <Mail className="w-4 h-4" /> Email
                      </Label>
                      <Input value={email} onChange={(e) => setEmail(e.target.value)} disabled={!isEditing} className="mt-1" />
                    </div>
                    <div>
                      <Label className="flex items-center gap-2">
                        <Phone className="w-4 h-4" /> Телефон
                      </Label>
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!isEditing} className="mt-1" />
                    </div>
                    <div>
                      <Label className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" /> Департамент
                      </Label>
                      <Input value={department} onChange={(e) => setDepartment(e.target.value)} disabled={!isEditing} className="mt-1" />
                    </div>
                  </div>
                  <div>
                    <Label className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> Адрес
                    </Label>
                    <Input value={address} onChange={(e) => setAddress(e.target.value)} disabled={!isEditing} className="mt-1" />
                  </div>
                  <div>
                    <Label>О себе</Label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      disabled={!isEditing}
                      className="mt-1 w-full p-2 border rounded-md resize-none h-20 disabled:bg-gray-50"
                      placeholder="Расскажите о себе..."
                    />
                  </div>
                  <div>
                    <Label>Навыки</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {skills.map((skill, index) => (
                        <Badge key={index} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Социальные сети</Label>
                    <div className="flex gap-4 mt-2">
                      <a href="https://linkedin.com/in/ivan" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors">
                        <Linkedin className="w-5 h-5" />
                        <span className="text-sm">LinkedIn</span>
                      </a>
                      <a href="https://twitter.com/ivan" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sky-500 hover:text-sky-700 transition-colors">
                        <Twitter className="w-5 h-5" />
                        <span className="text-sm">Twitter</span>
                      </a>
                      <a href="https://github.com/ivan" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors">
                        <Github className="w-5 h-5" />
                        <span className="text-sm">GitHub</span>
                      </a>
                      <a href="https://ivan.example.com" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-green-600 hover:text-green-800 transition-colors">
                        <Globe className="w-5 h-5" />
                        <span className="text-sm">Сайт</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" /> Достижения
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {achievements.map((achievement) => {
                  const Icon = achievement.icon
                  return (
                    <div key={achievement.id} className="flex items-start gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex-shrink-0 w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                        <Icon className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{achievement.title}</h4>
                        <p className="text-xs text-gray-600 mt-1">{achievement.description}</p>
                        <p className="text-xs text-gray-500 mt-2">{achievement.date}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" /> Команда и коллеги
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {team.map((member) => (
                  <div key={member.id} className="flex flex-col items-center space-y-3 p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="relative">
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={member.avatarUrl} />
                        <AvatarFallback>{member.username.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(member.status)}`} />
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-sm">{member.username}</div>
                      <div className="text-xs text-gray-600">{member.role}</div>
                      <Badge variant="outline" className="mt-2 text-xs">
                        {member.status === "online" ? "В сети" : member.status === "away" ? "Отошел" : "Не в сети"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" /> Приглашение сотрудников
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="invite-email">Email для приглашения</Label>
                  <Input id="invite-email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email@example.com" />
                </div>
                <div>
                  <Label htmlFor="invite-role">Роль</Label>
                  <select id="invite-role" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="w-full p-2 border rounded-md">
                    <option value="employee">Сотрудник</option>
                    <option value="teamlead">Тимлид</option>
                  </select>
                </div>
                <Button onClick={handleInvite} className="w-full">
                  <Mail className="w-4 h-4 mr-2" /> Отправить приглашение
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <Label className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Название компании
                  </Label>
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} disabled={!isEditing} className="mt-1" />
                </div>
                <div>
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Адрес компании
                  </Label>
                  <Input value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} disabled={!isEditing} className="mt-1" />
                </div>
                <div>
                  <Label className="flex items-center gap-2">
                    <Globe className="w-4 h-4" /> Веб-сайт
                  </Label>
                  <Input value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} disabled={!isEditing} className="mt-1" />
                </div>
                <div>
                  <Label>Описание компании</Label>
                  <textarea
                    value={companyDescription}
                    onChange={(e) => setCompanyDescription(e.target.value)}
                    disabled={!isEditing}
                    className="mt-1 w-full p-2 border rounded-md resize-none h-20 disabled:bg-gray-50"
                    placeholder="Расскажите о компании..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" /> Цели компании
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {goals.map((goal) => (
                <div key={goal.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <h4 className="font-medium">{goal.title}</h4>
                      <Badge className={getPriorityColor(goal.priority)}>
                        {goal.priority === "high" ? "Высокий" : goal.priority === "medium" ? "Средний" : "Низкий"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      {goal.deadline}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Прогресс</span>
                      <span className="font-medium">{goal.progress}%</span>
                    </div>
                    <Progress value={goal.progress} className="h-2" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((metric) => {
              const Icon = metric.icon
              return (
                <Card key={metric.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-gray-100">
                          <Icon className={`w-5 h-5 ${metric.color}`} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">{metric.name}</p>
                          <p className="text-2xl font-bold">{metric.value}</p>
                        </div>
                      </div>
                      <div className={`text-sm font-medium ${metric.change > 0 ? "text-green-600" : "text-red-600"}`}>
                        {metric.change > 0 ? "+" : ""}{metric.change}%
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5" /> Задачи
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {tasks.map((task) => (
                <div key={task.id} className="space-y-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={task.assignedTo.avatarUrl} />
                        <AvatarFallback>{task.assignedTo.username.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium">{task.title}</h4>
                        <p className="text-sm text-gray-600">{task.assignedTo.username} ({task.assignedTo.role})</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority === "high" ? "Высокий" : task.priority === "medium" ? "Средний" : "Низкий"}
                      </Badge>
                      <div className={`w-3 h-3 rounded-full ${getTaskStatusColor(task.status)}`} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Прогресс</span>
                      <span className="font-medium">{task.progress}%</span>
                    </div>
                    <Progress value={task.progress} className="h-2" />
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      {task.deadline}
                      {new Date(task.deadline) < new Date() && task.status !== "completed" && (
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Интеграции</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {integrations.map((int) => (
                  <div key={int.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5" />
                      <span>{int.name}</span>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant={int.connected ? "secondary" : "default"}>
                          {int.connected ? "Подключено" : "Подключить"}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Подключить {int.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Label>API Token</Label>
                          <Input placeholder="Введите токен" onChange={(e) => handleConnectIntegration(int.id, e.target.value)} />
                          <Button onClick={() => handleConnectIntegration(int.id, 'token')} className="w-full">
                            Подключить
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}