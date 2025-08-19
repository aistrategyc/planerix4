"use client"

import { useState, useMemo } from "react"
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
  Search,
  Filter,
  Target,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Calendar,
  Mail,
  MessageCircle,
  Share2,
  Eye,
  Edit3,
  Trash2,
  BarChart3,
  Activity,
  Zap,
  Globe,
  Heart,
  MousePointer,
  Megaphone,
  PieChart
} from "lucide-react"

interface Campaign {
  id: string
  name: string
  description?: string
  type: 'email' | 'social' | 'ppc' | 'content' | 'seo' | 'influencer'
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled'
  budget: number
  spent: number
  startDate: string
  endDate: string
  targetAudience: string
  goals: string[]
  metrics: {
    impressions: number
    clicks: number
    conversions: number
    ctr: number
    cpc: number
    cpa: number
    roas: number
  }
  created_at: string
  updated_at: string
}

interface Lead {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  source: string
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
  score: number
  lastActivity: string
  created_at: string
}

// Mock data
const mockCampaigns: Campaign[] = [
  {
    id: "1",
    name: "Q1 Product Launch Campaign",
    description: "Comprehensive marketing campaign for new product launch targeting enterprise customers",
    type: "content",
    status: "active",
    budget: 50000,
    spent: 32000,
    startDate: "2024-01-01",
    endDate: "2024-03-31",
    targetAudience: "Enterprise CTOs and Tech Leaders",
    goals: ["Brand Awareness", "Lead Generation", "Product Adoption"],
    metrics: {
      impressions: 245000,
      clicks: 12250,
      conversions: 486,
      ctr: 5.0,
      cpc: 2.61,
      cpa: 65.84,
      roas: 3.2
    },
    created_at: "2023-12-15T00:00:00Z",
    updated_at: "2024-01-15T10:30:00Z"
  },
  {
    id: "2",
    name: "Social Media Engagement Drive",
    description: "Increase brand presence and engagement across social platforms",
    type: "social",
    status: "active",
    budget: 15000,
    spent: 8500,
    startDate: "2024-01-15",
    endDate: "2024-04-15",
    targetAudience: "Small Business Owners",
    goals: ["Social Engagement", "Brand Awareness"],
    metrics: {
      impressions: 125000,
      clicks: 5500,
      conversions: 78,
      ctr: 4.4,
      cpc: 1.55,
      cpa: 109.0,
      roas: 2.1
    },
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-10T14:20:00Z"
  }
]

const mockLeads: Lead[] = [
  {
    id: "1",
    name: "Alex Johnson",
    email: "alex@techcorp.com",
    phone: "+1-555-0123",
    company: "TechCorp Solutions",
    source: "Q1 Product Launch Campaign",
    status: "qualified",
    score: 85,
    lastActivity: "2024-01-15",
    created_at: "2024-01-10T00:00:00Z"
  },
  {
    id: "2", 
    name: "Sarah Williams",
    email: "sarah@startup.io",
    company: "Startup.io",
    source: "Social Media Engagement Drive",
    status: "new",
    score: 72,
    lastActivity: "2024-01-14",
    created_at: "2024-01-12T00:00:00Z"
  }
]

export default function MarketingPage() {
  return (
    <ProtectedRoute>
      <MarketingPageContent />
    </ProtectedRoute>
  )
}

function MarketingPageContent() {
  const { toast } = useToast()
  
  const [activeTab, setActiveTab] = useState<'campaigns' | 'leads' | 'analytics'>('campaigns')
  const [campaigns, setCampaigns] = useState<Campaign[]>(mockCampaigns)
  const [leads, setLeads] = useState<Lead[]>(mockLeads)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("all")
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [showCampaignDialog, setShowCampaignDialog] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const [newCampaign, setNewCampaign] = useState({
    name: "",
    description: "",
    type: "content" as const,
    budget: "",
    startDate: "",
    endDate: "",
    targetAudience: ""
  })

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(campaign => {
      const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          campaign.description?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = filterStatus === "all" || campaign.status === filterStatus
      const matchesType = filterType === "all" || campaign.type === filterType
      
      return matchesSearch && matchesStatus && matchesType
    })
  }, [campaigns, searchQuery, filterStatus, filterType])

  const getStatusColor = (status: Campaign['status']) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'active': return 'bg-green-100 text-green-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type: Campaign['type']) => {
    switch (type) {
      case 'email': return <Mail className="w-4 h-4" />
      case 'social': return <Share2 className="w-4 h-4" />
      case 'ppc': return <MousePointer className="w-4 h-4" />
      case 'content': return <Edit3 className="w-4 h-4" />
      case 'seo': return <Globe className="w-4 h-4" />
      case 'influencer': return <Heart className="w-4 h-4" />
      default: return <Megaphone className="w-4 h-4" />
    }
  }

  const getLeadStatusColor = (status: Lead['status']) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800'
      case 'contacted': return 'bg-yellow-100 text-yellow-800'
      case 'qualified': return 'bg-green-100 text-green-800'
      case 'converted': return 'bg-purple-100 text-purple-800'
      case 'lost': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleCreateCampaign = () => {
    if (!newCampaign.name.trim()) {
      toast({ title: "Error", description: "Campaign name is required", variant: "destructive" })
      return
    }

    const campaign: Campaign = {
      id: Date.now().toString(),
      name: newCampaign.name.trim(),
      description: newCampaign.description?.trim() || undefined,
      type: newCampaign.type,
      status: 'draft',
      budget: parseInt(newCampaign.budget) || 0,
      spent: 0,
      startDate: newCampaign.startDate,
      endDate: newCampaign.endDate,
      targetAudience: newCampaign.targetAudience.trim() || "",
      goals: [],
      metrics: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        ctr: 0,
        cpc: 0,
        cpa: 0,
        roas: 0
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    setCampaigns(prev => [campaign, ...prev])
    setNewCampaign({
      name: "",
      description: "",
      type: "content",
      budget: "",
      startDate: "",
      endDate: "",
      targetAudience: ""
    })
    setShowCreateDialog(false)
    toast({ title: "Success", description: "Campaign created successfully" })
  }

  const stats = useMemo(() => {
    const totalCampaigns = campaigns.length
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length
    const totalBudget = campaigns.reduce((sum, c) => sum + c.budget, 0)
    const totalSpent = campaigns.reduce((sum, c) => sum + c.spent, 0)
    const totalLeads = leads.length
    const qualifiedLeads = leads.filter(l => l.status === 'qualified').length
    const avgLeadScore = leads.length > 0 ? leads.reduce((sum, l) => sum + l.score, 0) / leads.length : 0
    const totalImpressions = campaigns.reduce((sum, c) => sum + c.metrics.impressions, 0)
    const totalClicks = campaigns.reduce((sum, c) => sum + c.metrics.clicks, 0)
    const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0

    return {
      totalCampaigns,
      activeCampaigns,
      totalBudget,
      totalSpent,
      totalLeads,
      qualifiedLeads,
      avgLeadScore,
      totalImpressions,
      totalClicks,
      avgCTR
    }
  }, [campaigns, leads])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-blue-600" />
          <h1 className="text-3xl font-bold">Marketing</h1>
          <Badge variant="outline" className="ml-2">
            Campaign Management
          </Badge>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-64"
            />
          </div>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Campaign</DialogTitle>
                <DialogDescription>Launch a new marketing campaign</DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Campaign Name *</Label>
                  <Input
                    id="name"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                    placeholder="e.g., Q2 Product Launch"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newCampaign.description}
                    onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                    placeholder="Campaign description..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="type">Type</Label>
                    <Select
                      value={newCampaign.type}
                      onValueChange={(value: any) => setNewCampaign({ ...newCampaign, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email Marketing</SelectItem>
                        <SelectItem value="social">Social Media</SelectItem>
                        <SelectItem value="ppc">PPC Advertising</SelectItem>
                        <SelectItem value="content">Content Marketing</SelectItem>
                        <SelectItem value="seo">SEO</SelectItem>
                        <SelectItem value="influencer">Influencer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="budget">Budget ($)</Label>
                    <Input
                      id="budget"
                      type="number"
                      value={newCampaign.budget}
                      onChange={(e) => setNewCampaign({ ...newCampaign, budget: e.target.value })}
                      placeholder="10000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={newCampaign.startDate}
                      onChange={(e) => setNewCampaign({ ...newCampaign, startDate: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={newCampaign.endDate}
                      onChange={(e) => setNewCampaign({ ...newCampaign, endDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="targetAudience">Target Audience</Label>
                  <Input
                    id="targetAudience"
                    value={newCampaign.targetAudience}
                    onChange={(e) => setNewCampaign({ ...newCampaign, targetAudience: e.target.value })}
                    placeholder="e.g., Enterprise CTOs"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateCampaign}>
                  Create Campaign
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Campaigns</p>
                <p className="text-2xl font-bold">{stats.totalCampaigns}</p>
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
                <p className="text-2xl font-bold">{stats.activeCampaigns}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Budget</p>
                <p className="text-2xl font-bold">${stats.totalBudget.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Leads</p>
                <p className="text-2xl font-bold">{stats.totalLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-indigo-600" />
              <div>
                <p className="text-sm text-muted-foreground">Impressions</p>
                <p className="text-2xl font-bold">{stats.totalImpressions.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MousePointer className="w-4 h-4 text-teal-600" />
              <div>
                <p className="text-sm text-muted-foreground">Avg CTR</p>
                <p className="text-2xl font-bold">{stats.avgCTR.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="campaigns">
            <Target className="w-4 h-4 mr-2" />
            Campaigns ({campaigns.length})
          </TabsTrigger>
          <TabsTrigger value="leads">
            <Users className="w-4 h-4 mr-2" />
            Leads ({leads.length})
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="social">Social Media</SelectItem>
                <SelectItem value="ppc">PPC</SelectItem>
                <SelectItem value="content">Content</SelectItem>
                <SelectItem value="seo">SEO</SelectItem>
                <SelectItem value="influencer">Influencer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Campaigns Grid */}
          <div className="grid gap-4">
            {filteredCampaigns.map((campaign) => (
              <Card 
                key={campaign.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  setSelectedCampaign(campaign)
                  setShowCampaignDialog(true)
                }}
              >
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getTypeIcon(campaign.type)}
                          <h3 className="text-lg font-semibold">{campaign.name}</h3>
                          <Badge className={getStatusColor(campaign.status)} variant="outline">
                            {campaign.status.toUpperCase()}
                          </Badge>
                        </div>
                        
                        {campaign.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {campaign.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(campaign.startDate).toLocaleDateString()} - {new Date(campaign.endDate).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {campaign.targetAudience}
                          </div>
                        </div>
                      </div>

                      <div className="text-right ml-4">
                        <div className="text-2xl font-bold text-green-600">
                          ${campaign.spent.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          of ${campaign.budget.toLocaleString()}
                        </div>
                        <Progress 
                          value={(campaign.spent / campaign.budget) * 100} 
                          className="w-20 mt-1" 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 pt-3 border-t">
                      <div className="text-center">
                        <div className="text-lg font-bold">{campaign.metrics.impressions.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">Impressions</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold">{campaign.metrics.clicks.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">Clicks</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold">{campaign.metrics.conversions}</div>
                        <div className="text-xs text-muted-foreground">Conversions</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold">{campaign.metrics.ctr.toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground">CTR</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredCampaigns.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No campaigns found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery || filterStatus !== "all" || filterType !== "all"
                      ? "Try adjusting your filters or search terms"
                      : "Create your first marketing campaign to get started"}
                  </p>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Campaign
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="leads" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leads.map((lead) => (
              <Card key={lead.id}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold">{lead.name}</h4>
                        <p className="text-sm text-muted-foreground">{lead.email}</p>
                        {lead.company && (
                          <p className="text-sm text-muted-foreground">{lead.company}</p>
                        )}
                      </div>
                      <Badge className={getLeadStatusColor(lead.status)} variant="outline">
                        {lead.status.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span>Score: {lead.score}/100</span>
                      <Progress value={lead.score} className="w-20" />
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Source: {lead.source}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Last activity: {new Date(lead.lastActivity).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {leads.length === 0 && (
              <div className="col-span-full">
                <Card>
                  <CardContent className="p-12 text-center">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No leads yet</h3>
                    <p className="text-muted-foreground">
                      Leads will appear here as your campaigns generate interest
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Campaign Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {campaigns.slice(0, 3).map((campaign) => (
                    <div key={campaign.id} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{campaign.name}</div>
                        <div className="text-sm text-muted-foreground">
                          ROAS: {campaign.metrics.roas.toFixed(1)}x
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{campaign.metrics.conversions}</div>
                        <div className="text-sm text-muted-foreground">conversions</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Lead Quality
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {stats.avgLeadScore.toFixed(0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Average Lead Score</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-center text-sm">
                    <div>
                      <div className="text-lg font-bold text-green-600">{stats.qualifiedLeads}</div>
                      <div className="text-muted-foreground">Qualified</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold">{stats.totalLeads}</div>
                      <div className="text-muted-foreground">Total</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Campaign Detail Dialog */}
      <Dialog open={showCampaignDialog} onOpenChange={setShowCampaignDialog}>
        <DialogContent className="sm:max-w-[700px]">
          {selectedCampaign && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getTypeIcon(selectedCampaign.type)}
                  {selectedCampaign.name}
                  <Badge className={getStatusColor(selectedCampaign.status)} variant="outline">
                    {selectedCampaign.status.toUpperCase()}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  {selectedCampaign.type.toUpperCase()} Campaign • Budget: ${selectedCampaign.budget.toLocaleString()}
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="metrics">Metrics</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid gap-4">
                    {selectedCampaign.description && (
                      <div>
                        <Label>Description</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedCampaign.description}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Target Audience</Label>
                        <p className="text-sm">{selectedCampaign.targetAudience}</p>
                      </div>
                      <div>
                        <Label>Duration</Label>
                        <p className="text-sm">
                          {new Date(selectedCampaign.startDate).toLocaleDateString()} - {new Date(selectedCampaign.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Budget Utilization</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress value={(selectedCampaign.spent / selectedCampaign.budget) * 100} className="flex-1" />
                          <span className="text-sm">
                            {((selectedCampaign.spent / selectedCampaign.budget) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          ${selectedCampaign.spent.toLocaleString()} / ${selectedCampaign.budget.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {selectedCampaign.goals.length > 0 && (
                      <div>
                        <Label>Goals</Label>
                        <div className="flex gap-1 mt-1">
                          {selectedCampaign.goals.map((goal) => (
                            <Badge key={goal} variant="outline" className="text-xs">
                              {goal}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="metrics" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold">{selectedCampaign.metrics.impressions.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">Impressions</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold">{selectedCampaign.metrics.clicks.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">Clicks</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold">{selectedCampaign.metrics.conversions}</div>
                        <div className="text-sm text-muted-foreground">Conversions</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold">{selectedCampaign.metrics.ctr.toFixed(1)}%</div>
                        <div className="text-sm text-muted-foreground">CTR</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold">${selectedCampaign.metrics.cpc.toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">CPC</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold">{selectedCampaign.metrics.roas.toFixed(1)}x</div>
                        <div className="text-sm text-muted-foreground">ROAS</div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="w-12 h-12 mx-auto mb-4" />
                    <p>Campaign settings management coming soon...</p>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={() => setShowCampaignDialog(false)}>
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