"use client"

import { useState, useCallback, useMemo } from "react"
import ProtectedRoute from "@/components/auth/ProtectedRoute"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"

import {
  Plus,
  Target,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Users,
  BarChart3,
  Search,
  Filter,
  Eye,
  Edit3,
  Trash2,
  Award,
  Zap,
  Clock
} from "lucide-react"

interface Objective {
  id: string
  title: string
  description?: string
  progress: number
  status: 'draft' | 'active' | 'completed' | 'at_risk' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'critical'
  owner: string
  team?: string
  startDate: string
  endDate: string
  keyResults: KeyResult[]
  created_at: string
  updated_at: string
}

interface KeyResult {
  id: string
  title: string
  description?: string
  progress: number
  target: number
  current: number
  unit: string
  status: 'not_started' | 'on_track' | 'at_risk' | 'completed'
  owner?: string
}

// Mock data for demonstration
const mockObjectives: Objective[] = [
  {
    id: "1",
    title: "Increase Monthly Revenue by 25%",
    description: "Drive revenue growth through improved sales processes and customer acquisition",
    progress: 68,
    status: 'active',
    priority: 'high',
    owner: "John Smith",
    team: "Sales",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-15T10:30:00Z",
    keyResults: [
      {
        id: "kr1",
        title: "Achieve $2.5M in monthly revenue",
        progress: 70,
        target: 2500000,
        current: 1750000,
        unit: "$",
        status: 'on_track'
      },
      {
        id: "kr2", 
        title: "Increase customer acquisition by 40%",
        progress: 65,
        target: 140,
        current: 91,
        unit: "customers",
        status: 'on_track'
      }
    ]
  },
  {
    id: "2",
    title: "Improve Product Quality & User Experience",
    description: "Enhance product reliability and user satisfaction metrics",
    progress: 45,
    status: 'at_risk',
    priority: 'critical',
    owner: "Sarah Johnson",
    team: "Product",
    startDate: "2024-02-01", 
    endDate: "2024-06-30",
    created_at: "2024-02-01T00:00:00Z",
    updated_at: "2024-02-10T14:20:00Z",
    keyResults: [
      {
        id: "kr3",
        title: "Reduce bug reports by 50%",
        progress: 30,
        target: 50,
        current: 15,
        unit: "%",
        status: 'at_risk'
      },
      {
        id: "kr4",
        title: "Increase user satisfaction score to 4.5/5",
        progress: 60,
        target: 4.5,
        current: 4.2,
        unit: "★",
        status: 'on_track'
      }
    ]
  }
]

export default function OKRPage() {
  return (
    <ProtectedRoute>
      <OKRPageContent />
    </ProtectedRoute>
  )
}

function OKRPageContent() {
  const { toast } = useToast()
  
  const [objectives, setObjectives] = useState<Objective[]>(mockObjectives)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterPriority, setFilterPriority] = useState<string>("all")
  const [selectedObjective, setSelectedObjective] = useState<Objective | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDetailDialog, setShowDetailDialog] = useState(false)

  const [newObjective, setNewObjective] = useState({
    title: "",
    description: "",
    priority: "medium" as const,
    owner: "",
    team: "",
    startDate: "",
    endDate: ""
  })

  const filteredObjectives = useMemo(() => {
    return objectives.filter(obj => {
      const matchesSearch = obj.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          obj.description?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = filterStatus === "all" || obj.status === filterStatus
      const matchesPriority = filterPriority === "all" || obj.priority === filterPriority
      
      return matchesSearch && matchesStatus && matchesPriority
    })
  }, [objectives, searchQuery, filterStatus, filterPriority])

  const getStatusColor = (status: Objective['status']) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'active': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'at_risk': return 'bg-red-100 text-red-800'
      case 'cancelled': return 'bg-gray-100 text-gray-600'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: Objective['priority']) => {
    switch (priority) {
      case 'critical': return 'bg-red-500 text-white'
      case 'high': return 'bg-orange-500 text-white'
      case 'medium': return 'bg-yellow-500 text-white'
      case 'low': return 'bg-green-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const getKRStatusColor = (status: KeyResult['status']) => {
    switch (status) {
      case 'not_started': return 'bg-gray-100 text-gray-800'
      case 'on_track': return 'bg-green-100 text-green-800'
      case 'at_risk': return 'bg-red-100 text-red-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleCreateObjective = useCallback(() => {
    if (!newObjective.title.trim()) {
      toast({ title: "Error", description: "Objective title is required", variant: "destructive" })
      return
    }

    const newObj: Objective = {
      id: Date.now().toString(),
      title: newObjective.title.trim(),
      description: newObjective.description?.trim() || undefined,
      progress: 0,
      status: 'draft',
      priority: newObjective.priority,
      owner: newObjective.owner.trim() || "Unassigned",
      team: newObjective.team?.trim() || undefined,
      startDate: newObjective.startDate,
      endDate: newObjective.endDate,
      keyResults: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    setObjectives(prev => [...prev, newObj])
    setNewObjective({
      title: "",
      description: "",
      priority: "medium",
      owner: "",
      team: "",
      startDate: "",
      endDate: ""
    })
    setShowCreateDialog(false)
    
    toast({ title: "Success", description: "Objective created successfully" })
  }, [newObjective, toast])

  const stats = useMemo(() => {
    const total = objectives.length
    const active = objectives.filter(obj => obj.status === 'active').length
    const completed = objectives.filter(obj => obj.status === 'completed').length
    const atRisk = objectives.filter(obj => obj.status === 'at_risk').length
    const avgProgress = total > 0 ? objectives.reduce((sum, obj) => sum + obj.progress, 0) / total : 0

    return { total, active, completed, atRisk, avgProgress }
  }, [objectives])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-2">
          <Target className="w-6 h-6 text-blue-600" />
          <h1 className="text-3xl font-bold">OKRs</h1>
          <Badge variant="outline" className="ml-2">
            Objectives & Key Results
          </Badge>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search objectives..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-64"
            />
          </div>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="at_risk">At Risk</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Objective
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Objective</DialogTitle>
                <DialogDescription>Define a new strategic objective with measurable key results</DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Objective Title *</Label>
                  <Input
                    id="title"
                    value={newObjective.title}
                    onChange={(e) => setNewObjective({ ...newObjective, title: e.target.value })}
                    placeholder="e.g., Increase customer satisfaction by 20%"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newObjective.description}
                    onChange={(e) => setNewObjective({ ...newObjective, description: e.target.value })}
                    placeholder="Brief description of the objective..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={newObjective.priority}
                      onValueChange={(value: any) => setNewObjective({ ...newObjective, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="owner">Owner</Label>
                    <Input
                      id="owner"
                      value={newObjective.owner}
                      onChange={(e) => setNewObjective({ ...newObjective, owner: e.target.value })}
                      placeholder="Objective owner"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="team">Team</Label>
                    <Input
                      id="team"
                      value={newObjective.team}
                      onChange={(e) => setNewObjective({ ...newObjective, team: e.target.value })}
                      placeholder="Team or department"
                    />
                  </div>
                  <div></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={newObjective.startDate}
                      onChange={(e) => setNewObjective({ ...newObjective, startDate: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={newObjective.endDate}
                      onChange={(e) => setNewObjective({ ...newObjective, endDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateObjective}>
                  Create Objective
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total OKRs</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-green-600" />
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
              <AlertCircle className="w-4 h-4 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">At Risk</p>
                <p className="text-2xl font-bold">{stats.atRisk}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Progress</p>
                <p className="text-2xl font-bold">{Math.round(stats.avgProgress)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Objectives Grid */}
      <div className="grid gap-4">
        {filteredObjectives.map((objective) => (
          <Card 
            key={objective.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => {
              setSelectedObjective(objective)
              setShowDetailDialog(true)
            }}
          >
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold truncate">{objective.title}</h3>
                      <Badge className={getPriorityColor(objective.priority)} variant="secondary">
                        {objective.priority.toUpperCase()}
                      </Badge>
                      <Badge className={getStatusColor(objective.status)} variant="outline">
                        {objective.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    {objective.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {objective.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="text-right min-w-0 ml-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {objective.progress}%
                    </div>
                    <Progress value={objective.progress} className="w-20" />
                  </div>
                </div>

                {/* Meta info */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {objective.owner}
                  </div>
                  {objective.team && (
                    <div className="flex items-center gap-1">
                      <Target className="w-4 h-4" />
                      {objective.team}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(objective.startDate).toLocaleDateString()} - {new Date(objective.endDate).toLocaleDateString()}
                  </div>
                </div>

                {/* Key Results Summary */}
                {objective.keyResults.length > 0 && (
                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium">Key Results</h4>
                      <Badge variant="outline" className="text-xs">
                        {objective.keyResults.length} KRs
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      {objective.keyResults.slice(0, 2).map((kr) => (
                        <div key={kr.id} className="flex items-center justify-between text-sm">
                          <span className="flex-1 truncate">{kr.title}</span>
                          <div className="flex items-center gap-2">
                            <Badge className={getKRStatusColor(kr.status)} variant="outline">
                              {kr.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                            <span className="text-xs text-muted-foreground min-w-0">
                              {kr.progress}%
                            </span>
                          </div>
                        </div>
                      ))}
                      {objective.keyResults.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{objective.keyResults.length - 2} more key results
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredObjectives.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No objectives found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || filterStatus !== "all" || filterPriority !== "all"
                  ? "Try adjusting your filters or search terms"
                  : "Get started by creating your first objective"}
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Objective
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Objective Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
          {selectedObjective && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  {selectedObjective.title}
                  <Badge className={getPriorityColor(selectedObjective.priority)} variant="secondary">
                    {selectedObjective.priority.toUpperCase()}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  {selectedObjective.status.replace('_', ' ').toUpperCase()} • {selectedObjective.progress}% Complete
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="key-results">Key Results ({selectedObjective.keyResults.length})</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid gap-4">
                    {selectedObjective.description && (
                      <div>
                        <Label>Description</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedObjective.description}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Owner</Label>
                        <p className="text-sm">{selectedObjective.owner}</p>
                      </div>
                      {selectedObjective.team && (
                        <div>
                          <Label>Team</Label>
                          <p className="text-sm">{selectedObjective.team}</p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Start Date</Label>
                        <p className="text-sm">{new Date(selectedObjective.startDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <Label>End Date</Label>
                        <p className="text-sm">{new Date(selectedObjective.endDate).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div>
                      <Label>Overall Progress</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={selectedObjective.progress} className="flex-1" />
                        <span className="text-sm font-medium">{selectedObjective.progress}%</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="key-results" className="space-y-4">
                  {selectedObjective.keyResults.length > 0 ? (
                    <div className="space-y-4">
                      {selectedObjective.keyResults.map((kr) => (
                        <Card key={kr.id}>
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <h4 className="font-medium">{kr.title}</h4>
                                  {kr.description && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {kr.description}
                                    </p>
                                  )}
                                </div>
                                <Badge className={getKRStatusColor(kr.status)} variant="outline">
                                  {kr.status.replace('_', ' ').toUpperCase()}
                                </Badge>
                              </div>

                              <div className="flex items-center justify-between text-sm">
                                <span>Progress: {kr.current.toLocaleString()}{kr.unit} / {kr.target.toLocaleString()}{kr.unit}</span>
                                <span className="font-medium">{kr.progress}%</span>
                              </div>

                              <Progress value={kr.progress} />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Key Results</h3>
                      <p className="text-muted-foreground mb-4">
                        Add measurable key results to track progress on this objective.
                      </p>
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Key Result
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="activity" className="space-y-4">
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-4" />
                    <p>Activity tracking coming soon...</p>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-between pt-4 border-t">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button size="sm" variant="outline">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
                <Button size="sm" onClick={() => setShowDetailDialog(false)}>
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