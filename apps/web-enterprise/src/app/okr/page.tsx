"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PlusCircle, Target, TrendingUp, Users, Calendar, Search, Filter, AlertCircle, MoreHorizontal } from 'lucide-react'
import { format } from 'date-fns'
import { ErrorBoundary } from '@/components/error-boundary'
import { useOKRs, useOKRStats } from './hooks/useOKRs'
import { OKRStatus, OKRTimeframe, type OKR } from '@/lib/api/okrs'
import { Skeleton } from '@/components/ui/skeleton'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

export default function OKRPage() {
  return (
    <ProtectedRoute>
      <ErrorBoundary>
        <OKRPageContent />
      </ErrorBoundary>
    </ProtectedRoute>
  )
}

function OKRPageContent() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<OKRStatus | 'all'>('all')
  const [timeframeFilter, setTimeframeFilter] = useState<OKRTimeframe | 'all'>('all')
  
  // Use real API hooks
  const { okrs, loading, error, actions } = useOKRs()
  const { stats, loading: statsLoading } = useOKRStats()
  
  // Filter OKRs based on search and filters
  const filteredOKRs = okrs.filter(okr => {
    const matchesSearch = !searchQuery || 
      okr.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      okr.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || okr.status === statusFilter
    const matchesTimeframe = timeframeFilter === 'all' || okr.timeframe === timeframeFilter
    return matchesSearch && matchesStatus && matchesTimeframe
  })

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-8 p-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
            </Card>
          ))}
        </div>
        
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-64" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }
  
  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle>Failed to load OKRs</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={actions.refetch} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Objectives & Key Results</h1>
          <p className="text-lg text-muted-foreground">
            Track and manage your objectives and measurable outcomes
          </p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create OKR
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total OKRs</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? '...' : stats?.total_okrs || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total objectives
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? '...' : stats?.active_okrs || 0}</div>
            <p className="text-xs text-muted-foreground">
              Currently in progress
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? '...' : stats?.completed_okrs || 0}</div>
            <p className="text-xs text-muted-foreground">
              Successfully achieved
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : `${stats?.completion_rate || 0}%`}
            </div>
            <p className="text-xs text-muted-foreground">
              Overall completion rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search OKRs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as OKRStatus | 'all')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value={OKRStatus.DRAFT}>Draft</SelectItem>
              <SelectItem value={OKRStatus.ACTIVE}>Active</SelectItem>
              <SelectItem value={OKRStatus.DONE}>Completed</SelectItem>
              <SelectItem value={OKRStatus.CANCELED}>Canceled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={timeframeFilter} onValueChange={(value) => setTimeframeFilter(value as OKRTimeframe | 'all')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Timeframes</SelectItem>
              <SelectItem value={OKRTimeframe.Q}>Quarterly</SelectItem>
              <SelectItem value={OKRTimeframe.H1}>H1</SelectItem>
              <SelectItem value={OKRTimeframe.H2}>H2</SelectItem>
              <SelectItem value={OKRTimeframe.Y}>Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* OKR List */}
      <div className="space-y-4">
        {filteredOKRs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Target className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No OKRs found</h3>
              <p className="text-gray-500 text-center max-w-md">
                {searchQuery || statusFilter !== "all" || timeframeFilter !== "all"
                  ? "Try adjusting your search or filters to find what you're looking for."
                  : "Get started by creating your first OKR to track objectives and key results."}
              </p>
              <Button className="mt-4">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create OKR
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredOKRs.map((okr) => (
            <OKRCard key={okr.id} okr={okr} onUpdate={actions.updateOKR} onDelete={actions.deleteOKR} />
          ))
        )}
      </div>
    </div>
  )
}

// OKR Card Component
function OKRCard({ 
  okr, 
  onUpdate, 
  onDelete 
}: { 
  okr: OKR
  onUpdate: (id: string, updates: any) => Promise<OKR | null>
  onDelete: (id: string) => Promise<boolean>
}) {
  const getStatusColor = (status: OKRStatus) => {
    switch (status) {
      case OKRStatus.ACTIVE:
        return "bg-blue-100 text-blue-800"
      case OKRStatus.DONE:
        return "bg-green-100 text-green-800"
      case OKRStatus.CANCELED:
        return "bg-red-100 text-red-800"
      case OKRStatus.DRAFT:
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getTimeframeLabel = (timeframe: OKRTimeframe) => {
    switch (timeframe) {
      case OKRTimeframe.Q:
        return "Quarterly"
      case OKRTimeframe.H1:
        return "H1"
      case OKRTimeframe.H2:
        return "H2"
      case OKRTimeframe.Y:
        return "Yearly"
      default:
        return timeframe
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{okr.title}</CardTitle>
              <Badge className={getStatusColor(okr.status)}>
                {okr.status}
              </Badge>
            </div>
            {okr.description && (
              <CardDescription className="text-sm">
                {okr.description}
              </CardDescription>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuItem 
                className="text-red-600"
                onClick={() => onDelete(okr.id)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-xs">
                {getTimeframeLabel(okr.timeframe)}
              </Badge>
              <div className="flex items-center text-muted-foreground">
                <Calendar className="mr-1 h-3 w-3" />
                {format(new Date(okr.created_at), 'MMM dd, yyyy')}
              </div>
            </div>
          </div>
          
          {okr.updated_at && (
            <div className="text-xs text-muted-foreground">
              Last updated: {format(new Date(okr.updated_at), 'MMM dd, yyyy HH:mm')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}