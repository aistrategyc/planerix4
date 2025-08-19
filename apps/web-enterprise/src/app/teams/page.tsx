"use client"

import { useState, useMemo } from "react"
import ProtectedRoute from "@/components/auth/ProtectedRoute"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"

import {
  Plus,
  Search,
  Users,
  User,
  Shield,
  Crown,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Activity,
  BarChart3,
  Target,
  Award,
  Clock,
  Settings
} from "lucide-react"

interface TeamMember {
  id: string
  name: string
  email: string
  role: 'admin' | 'manager' | 'member' | 'viewer'
  department: string
  position: string
  avatar?: string
  phone?: string
  location?: string
  joinDate: string
  status: 'active' | 'inactive' | 'pending'
  skills: string[]
  tasksCompleted: number
  projectsActive: number
}

interface Team {
  id: string
  name: string
  description: string
  department: string
  lead: string
  members: TeamMember[]
  projects: number
  created_at: string
}

// Mock data
const mockMembers: TeamMember[] = [
  {
    id: "1",
    name: "John Smith",
    email: "john@company.com",
    role: "admin",
    department: "Engineering",
    position: "CTO",
    avatar: "",
    phone: "+1-555-0123",
    location: "San Francisco, CA",
    joinDate: "2023-01-15",
    status: "active",
    skills: ["React", "Node.js", "AWS"],
    tasksCompleted: 47,
    projectsActive: 3
  },
  {
    id: "2",
    name: "Sarah Johnson",
    email: "sarah@company.com", 
    role: "manager",
    department: "Product",
    position: "Product Manager",
    avatar: "",
    phone: "+1-555-0456",
    location: "New York, NY",
    joinDate: "2023-03-20",
    status: "active",
    skills: ["Product Strategy", "Analytics", "UX Design"],
    tasksCompleted: 32,
    projectsActive: 2
  },
  {
    id: "3",
    name: "Mike Chen",
    email: "mike@company.com",
    role: "member",
    department: "Engineering",
    position: "Senior Developer",
    avatar: "",
    location: "Austin, TX", 
    joinDate: "2023-06-10",
    status: "active",
    skills: ["Python", "Django", "PostgreSQL"],
    tasksCompleted: 28,
    projectsActive: 2
  }
]

const mockTeams: Team[] = [
  {
    id: "1",
    name: "Engineering",
    description: "Core product development and infrastructure",
    department: "Technology",
    lead: "John Smith",
    members: mockMembers.filter(m => m.department === "Engineering"),
    projects: 5,
    created_at: "2023-01-01T00:00:00Z"
  },
  {
    id: "2", 
    name: "Product",
    description: "Product strategy, design, and user experience",
    department: "Product",
    lead: "Sarah Johnson",
    members: mockMembers.filter(m => m.department === "Product"),
    projects: 3,
    created_at: "2023-01-01T00:00:00Z"
  }
]

export default function TeamsPage() {
  return (
    <ProtectedRoute>
      <TeamsPageContent />
    </ProtectedRoute>
  )
}

function TeamsPageContent() {
  const { toast } = useToast()
  
  const [activeTab, setActiveTab] = useState<'teams' | 'members'>('teams')
  const [teams, setTeams] = useState<Team[]>(mockTeams)
  const [members, setMembers] = useState<TeamMember[]>(mockMembers)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterDepartment, setFilterDepartment] = useState<string>("all")
  const [filterRole, setFilterRole] = useState<string>("all")
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [showTeamDialog, setShowTeamDialog] = useState(false)
  const [showMemberDialog, setShowMemberDialog] = useState(false)
  const [showCreateTeamDialog, setShowCreateTeamDialog] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)

  const [newTeam, setNewTeam] = useState({
    name: "",
    description: "",
    department: "",
    lead: ""
  })

  const [inviteData, setInviteData] = useState({
    email: "",
    role: "member" as const,
    department: "",
    position: ""
  })

  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          member.department.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesDepartment = filterDepartment === "all" || member.department === filterDepartment
      const matchesRole = filterRole === "all" || member.role === filterRole
      
      return matchesSearch && matchesDepartment && matchesRole
    })
  }, [members, searchQuery, filterDepartment, filterRole])

  const getRoleColor = (role: TeamMember['role']) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'manager': return 'bg-blue-100 text-blue-800'
      case 'member': return 'bg-green-100 text-green-800'
      case 'viewer': return 'bg-gray-100 text-gray-600'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleIcon = (role: TeamMember['role']) => {
    switch (role) {
      case 'admin': return <Crown className="w-4 h-4" />
      case 'manager': return <Shield className="w-4 h-4" />
      case 'member': return <User className="w-4 h-4" />
      case 'viewer': return <User className="w-4 h-4" />
      default: return <User className="w-4 h-4" />
    }
  }

  const getStatusColor = (status: TeamMember['status']) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'inactive': return 'bg-gray-500'
      case 'pending': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  const handleCreateTeam = () => {
    if (!newTeam.name.trim()) {
      toast({ title: "Error", description: "Team name is required", variant: "destructive" })
      return
    }

    const team: Team = {
      id: Date.now().toString(),
      name: newTeam.name.trim(),
      description: newTeam.description.trim() || "",
      department: newTeam.department.trim() || "General",
      lead: newTeam.lead.trim() || "TBD",
      members: [],
      projects: 0,
      created_at: new Date().toISOString()
    }

    setTeams(prev => [team, ...prev])
    setNewTeam({ name: "", description: "", department: "", lead: "" })
    setShowCreateTeamDialog(false)
    toast({ title: "Success", description: "Team created successfully" })
  }

  const handleInviteMember = () => {
    if (!inviteData.email.trim()) {
      toast({ title: "Error", description: "Email is required", variant: "destructive" })
      return
    }

    // In real app, this would send an invitation email
    toast({ 
      title: "Invitation Sent", 
      description: `Invitation sent to ${inviteData.email}` 
    })

    setInviteData({ email: "", role: "member", department: "", position: "" })
    setShowInviteDialog(false)
  }

  const stats = useMemo(() => {
    const totalMembers = members.length
    const activeMembers = members.filter(m => m.status === 'active').length
    const totalTeams = teams.length
    const avgTasksCompleted = totalMembers > 0 ? 
      Math.round(members.reduce((sum, m) => sum + m.tasksCompleted, 0) / totalMembers) : 0

    return { totalMembers, activeMembers, totalTeams, avgTasksCompleted }
  }, [members, teams])

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-600" />
          <h1 className="text-3xl font-bold">Teams</h1>
          <Badge variant="outline" className="ml-2">
            Team Management
          </Badge>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search teams or members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-64"
            />
          </div>

          <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Mail className="w-4 h-4 mr-2" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>Send an invitation to join your team</DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={inviteData.email}
                    onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                    placeholder="colleague@company.com"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={inviteData.role}
                    onValueChange={(value: any) => setInviteData({ ...inviteData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={inviteData.department}
                    onChange={(e) => setInviteData({ ...inviteData, department: e.target.value })}
                    placeholder="e.g., Engineering"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    value={inviteData.position}
                    onChange={(e) => setInviteData({ ...inviteData, position: e.target.value })}
                    placeholder="e.g., Senior Developer"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleInviteMember}>
                  Send Invitation
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showCreateTeamDialog} onOpenChange={setShowCreateTeamDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Team
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Team</DialogTitle>
                <DialogDescription>Set up a new team for your organization</DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Team Name *</Label>
                  <Input
                    id="name"
                    value={newTeam.name}
                    onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                    placeholder="e.g., Engineering Team"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newTeam.description}
                    onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                    placeholder="Brief description of the team..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={newTeam.department}
                      onChange={(e) => setNewTeam({ ...newTeam, department: e.target.value })}
                      placeholder="e.g., Technology"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="lead">Team Lead</Label>
                    <Input
                      id="lead"
                      value={newTeam.lead}
                      onChange={(e) => setNewTeam({ ...newTeam, lead: e.target.value })}
                      placeholder="Team leader name"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateTeamDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTeam}>
                  Create Team
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
              <Users className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Members</p>
                <p className="text-2xl font-bold">{stats.totalMembers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Active Members</p>
                <p className="text-2xl font-bold">{stats.activeMembers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Teams</p>
                <p className="text-2xl font-bold">{stats.totalTeams}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Tasks Done</p>
                <p className="text-2xl font-bold">{stats.avgTasksCompleted}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="teams">
            <Target className="w-4 h-4 mr-2" />
            Teams ({teams.length})
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="w-4 h-4 mr-2" />
            Members ({members.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="teams" className="space-y-4">
          {/* Teams Grid */}
          <div className="grid gap-4">
            {teams.map((team) => (
              <Card 
                key={team.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  setSelectedTeam(team)
                  setShowTeamDialog(true)
                }}
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-semibold">{team.name}</h3>
                        <Badge variant="outline">{team.department}</Badge>
                      </div>
                      
                      {team.description && (
                        <p className="text-sm text-muted-foreground mb-4">
                          {team.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {team.members.length} members
                        </div>
                        <div className="flex items-center gap-1">
                          <BarChart3 className="w-4 h-4" />
                          {team.projects} projects
                        </div>
                        <div className="flex items-center gap-1">
                          <Crown className="w-4 h-4" />
                          Led by {team.lead}
                        </div>
                      </div>
                    </div>

                    <div className="flex -space-x-2 ml-4">
                      {team.members.slice(0, 4).map((member) => (
                        <Avatar key={member.id} className="w-8 h-8 border-2 border-white">
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback className="text-xs">
                            {getInitials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {team.members.length > 4 && (
                        <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs text-gray-600">
                          +{team.members.length - 4}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {teams.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No teams yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first team to get started organizing your members
                  </p>
                  <Button onClick={() => setShowCreateTeamDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Team
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-2">
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="Engineering">Engineering</SelectItem>
                <SelectItem value="Product">Product</SelectItem>
                <SelectItem value="Marketing">Marketing</SelectItem>
                <SelectItem value="Sales">Sales</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Members Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMembers.map((member) => (
              <Card 
                key={member.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  setSelectedMember(member)
                  setShowMemberDialog(true)
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback>
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div 
                        className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(member.status)}`}
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{member.name}</h3>
                        <Badge className={getRoleColor(member.role)} variant="outline">
                          {getRoleIcon(member.role)}
                          <span className="ml-1">{member.role.toUpperCase()}</span>
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground truncate">
                        {member.position} • {member.department}
                      </p>
                      
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Mail className="w-3 h-3" />
                        <span className="truncate">{member.email}</span>
                      </div>
                      
                      <div className="flex gap-4 mt-2 text-xs">
                        <span className="text-green-600">{member.tasksCompleted} tasks</span>
                        <span className="text-blue-600">{member.projectsActive} projects</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredMembers.length === 0 && (
              <div className="col-span-full">
                <Card>
                  <CardContent className="p-12 text-center">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No members found</h3>
                    <p className="text-muted-foreground mb-4">
                      {searchQuery || filterDepartment !== "all" || filterRole !== "all"
                        ? "Try adjusting your filters or search terms"
                        : "Invite your first team member to get started"}
                    </p>
                    <Button onClick={() => setShowInviteDialog(true)}>
                      <Mail className="w-4 h-4 mr-2" />
                      Invite Member
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Team Detail Dialog */}
      <Dialog open={showTeamDialog} onOpenChange={setShowTeamDialog}>
        <DialogContent className="sm:max-w-[700px]">
          {selectedTeam && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  {selectedTeam.name}
                  <Badge variant="outline">{selectedTeam.department}</Badge>
                </DialogTitle>
                <DialogDescription>
                  {selectedTeam.members.length} members • {selectedTeam.projects} projects
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {selectedTeam.description && (
                  <div>
                    <Label>Description</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedTeam.description}
                    </p>
                  </div>
                )}

                <div>
                  <Label>Team Lead</Label>
                  <p className="text-sm">{selectedTeam.lead}</p>
                </div>

                <div>
                  <Label>Members ({selectedTeam.members.length})</Label>
                  <div className="mt-2 space-y-2">
                    {selectedTeam.members.map((member) => (
                      <div key={member.id} className="flex items-center gap-3 p-2 border rounded-lg">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback className="text-xs">
                            {getInitials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{member.name}</span>
                            <Badge className={getRoleColor(member.role)} variant="outline">
                              {member.role}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {member.position}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={() => setShowTeamDialog(false)}>
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Member Detail Dialog */}
      <Dialog open={showMemberDialog} onOpenChange={setShowMemberDialog}>
        <DialogContent className="sm:max-w-[500px]">
          {selectedMember && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={selectedMember.avatar} />
                    <AvatarFallback>
                      {getInitials(selectedMember.name)}
                    </AvatarFallback>
                  </Avatar>
                  {selectedMember.name}
                  <Badge className={getRoleColor(selectedMember.role)} variant="outline">
                    {selectedMember.role.toUpperCase()}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  {selectedMember.position} • {selectedMember.department}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Email</Label>
                    <p className="text-sm">{selectedMember.email}</p>
                  </div>
                  {selectedMember.phone && (
                    <div>
                      <Label>Phone</Label>
                      <p className="text-sm">{selectedMember.phone}</p>
                    </div>
                  )}
                </div>

                {selectedMember.location && (
                  <div>
                    <Label>Location</Label>
                    <p className="text-sm">{selectedMember.location}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tasks Completed</Label>
                    <p className="text-sm">{selectedMember.tasksCompleted}</p>
                  </div>
                  <div>
                    <Label>Active Projects</Label>
                    <p className="text-sm">{selectedMember.projectsActive}</p>
                  </div>
                </div>

                <div>
                  <Label>Join Date</Label>
                  <p className="text-sm">{new Date(selectedMember.joinDate).toLocaleDateString()}</p>
                </div>

                {selectedMember.skills.length > 0 && (
                  <div>
                    <Label>Skills</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedMember.skills.map((skill) => (
                        <Badge key={skill} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-4 border-t">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </Button>
                  <Button size="sm" variant="outline">
                    <Settings className="w-4 h-4 mr-2" />
                    Manage
                  </Button>
                </div>
                <Button size="sm" onClick={() => setShowMemberDialog(false)}>
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