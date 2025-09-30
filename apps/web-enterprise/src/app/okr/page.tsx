"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import ProtectedRoute from "@/components/auth/ProtectedRoute"
import { useOkrs } from "./hooks/useOkrs"

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

import { type OKR, type OKRCreate } from "@/lib/api/okr"


export default function OKRPage() {
  return (
    <ProtectedRoute>
      <OKRPageContent />
    </ProtectedRoute>
  )
}

function OKRPageContent() {
  const { toast } = useToast()
  const { okrs, loading, error, loadOkrs, createOkr, updateOkr, deleteOkr } = useOkrs()

  const [objectives, setObjectives] = useState<OKR[]>([])

  // Load OKRs on component mount
  useEffect(() => {
    loadOkrs()
  }, [loadOkrs])

  // Update local state when okrs change
  useEffect(() => {
    setObjectives(okrs)
  }, [okrs])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterPriority, setFilterPriority] = useState<string>("all")
  const [selectedObjective, setSelectedObjective] = useState<OKR | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDetailDialog, setShowDetailDialog] = useState(false)

  const [newObjective, setNewObjective] = useState<Partial<OKRCreate>>({
    title: "",
    description: "",
    priority: "medium" as const,
    owner: "",
    team: "",
    start_date: "",
    end_date: ""
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

  const getStatusColor = (status: OKR['status']) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'active': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'at_risk': return 'bg-red-100 text-red-800'
      case 'cancelled': return 'bg-gray-100 text-gray-600'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: OKR['priority']) => {
    switch (priority) {
      case 'critical': return 'bg-red-500 text-white'
      case 'high': return 'bg-orange-500 text-white'
      case 'medium': return 'bg-yellow-500 text-white'
      case 'low': return 'bg-green-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const getKRStatusColor = (status: OKR['key_results'][0]['status']) => {
    switch (status) {
      case 'not_started': return 'bg-gray-100 text-gray-800'
      case 'on_track': return 'bg-green-100 text-green-800'
      case 'at_risk': return 'bg-red-100 text-red-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleCreateObjective = useCallback(async () => {
    if (!newObjective.title?.trim()) {
      toast({ title: "Error", description: "Objective title is required", variant: "destructive" })
      return
    }

    if (!newObjective.owner?.trim()) {
      toast({ title: "Error", description: "Owner is required", variant: "destructive" })
      return
    }

    if (!newObjective.start_date || !newObjective.end_date) {
      toast({ title: "Error", description: "Start and end dates are required", variant: "destructive" })
      return
    }

    const createData: OKRCreate = {
      title: newObjective.title.trim(),
      description: newObjective.description?.trim() || undefined,
      priority: newObjective.priority || 'medium',
      owner: newObjective.owner.trim(),
      team: newObjective.team?.trim() || undefined,
      start_date: newObjective.start_date,
      end_date: newObjective.end_date
    }

    const success = await createOkr(createData)

    if (success) {
      setNewObjective({
        title: "",
        description: "",
        priority: "medium",
        owner: "",
        team: "",
        start_date: "",
        end_date: ""
      })
      setShowCreateDialog(false)
      toast({ title: "Success", description: "Objective created successfully" })
    } else {
      toast({ title: "Error", description: error || "Failed to create objective", variant: "destructive" })
    }
  }, [newObjective, createOkr, error, toast])

  const stats = useMemo(() => {
    const total = objectives.length
    const active = objectives.filter(obj => obj.status === 'active').length
    const completed = objectives.filter(obj => obj.status === 'completed').length
    const atRisk = objectives.filter(obj => obj.status === 'at_risk').length
    const avgProgress = total > 0 ? objectives.reduce((sum, obj) => sum + obj.progress, 0) / total : 0

    return { total, active, completed, atRisk, avgProgress }
  }, [objectives])

  // Show loading state
  if (loading && objectives.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading OKRs...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Error Message */}
      {error && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

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
                <DialogDescription>Define a new strategic objective with clear ownership and timeline. You can add key results after creating the objective.</DialogDescription>
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
                    <Label htmlFor="owner">Owner *</Label>
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
                    <Label htmlFor="startDate">Start Date *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={newObjective.start_date || ""}
                      onChange={(e) => setNewObjective({ ...newObjective, start_date: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="endDate">End Date *</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={newObjective.end_date || ""}
                      onChange={(e) => setNewObjective({ ...newObjective, end_date: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateObjective} disabled={loading}>
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    "Create Objective"
                  )}
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
                    {new Date(objective.start_date).toLocaleDateString()} - {new Date(objective.end_date).toLocaleDateString()}
                  </div>
                </div>

                {/* Key Results Summary */}
                {objective.key_results && objective.key_results.length > 0 && (
                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium">Key Results</h4>
                      <Badge variant="outline" className="text-xs">
                        {objective.key_results.length} KRs
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      {objective.key_results.slice(0, 2).map((kr: any) => (
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
                      {objective.key_results.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{objective.key_results.length - 2} more key results
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
              <h3 className="text-lg font-medium mb-2">
                {searchQuery || filterStatus !== "all" || filterPriority !== "all"
                  ? "No objectives found"
                  : "Welcome to OKRs!"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || filterStatus !== "all" || filterPriority !== "all"
                  ? "Try adjusting your filters or search terms to find what you're looking for."
                  : "OKRs (Objectives & Key Results) help you set and track ambitious goals. Start by creating your first strategic objective with measurable key results."}
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {objectives.length === 0 ? "Create Your First Objective" : "Create Objective"}
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
                  <TabsTrigger value="key-results">Key Results ({selectedObjective.key_results?.length || 0})</TabsTrigger>
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
                        <p className="text-sm">{new Date(selectedObjective.start_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <Label>End Date</Label>
                        <p className="text-sm">{new Date(selectedObjective.end_date).toLocaleDateString()}</p>
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
                  {selectedObjective.key_results && selectedObjective.key_results.length > 0 ? (
                    <div className="space-y-4">
                      {selectedObjective.key_results.map((kr: any) => (
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