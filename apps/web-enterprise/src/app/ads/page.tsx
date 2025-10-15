"use client"

import { useState, useEffect, useMemo } from "react"
import ProtectedRoute from "@/components/auth/ProtectedRoute"
import { AdsAPI, Ad as RealAd, AdStatsResponse } from "@/lib/api/ads"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

import {
  Search,
  Target,
  Eye,
  MousePointer,
  DollarSign,
  Globe,
  Users,
  Megaphone,
  Loader2,
  AlertCircle
} from "lucide-react"

export default function AdsPage() {
  return (
    <ProtectedRoute>
      <AdsPageContent />
    </ProtectedRoute>
  )
}

function AdsPageContent() {
  const { toast } = useToast()

  const [ads, setAds] = useState<RealAd[]>([])
  const [stats, setStats] = useState<AdStatsResponse | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterPlatform, setFilterPlatform] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch ads and stats on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Get last 30 days of ads
        const today = new Date()
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(today.getDate() - 30)

        const date_from = thirtyDaysAgo.toISOString().split('T')[0]
        const date_to = today.toISOString().split('T')[0]

        const [adsData, statsData] = await Promise.all([
          AdsAPI.getAds({ date_from, date_to, platform: filterPlatform === "all" ? undefined : filterPlatform, limit: 50 }),
          AdsAPI.getStats({ date_from, date_to })
        ])

        setAds(adsData)
        setStats(statsData)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load ads data"
        setError(errorMessage)
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [filterPlatform, toast])

  const filteredAds = useMemo(() => {
    return ads.filter(ad => {
      const matchesSearch =
        ad.ad_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ad.campaign_name && ad.campaign_name.toLowerCase().includes(searchQuery.toLowerCase()))

      return matchesSearch
    })
  }, [ads, searchQuery])

  const getStatusColor = (status: RealAd['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'expired': return 'bg-gray-100 text-gray-600'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPlatformIcon = (platform: RealAd['platform']) => {
    switch (platform) {
      case 'google': return <Globe className="w-4 h-4" />
      case 'meta': return <Users className="w-4 h-4" />
      default: return <Globe className="w-4 h-4" />
    }
  }

  const getPlatformColor = (platform: RealAd['platform']) => {
    switch (platform) {
      case 'google': return 'bg-blue-100 text-blue-800'
      case 'meta': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-muted-foreground">Loading ads data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <h3 className="font-semibold">Error Loading Data</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-blue-600" />
          <h1 className="text-3xl font-bold">Ads Manager</h1>
          <Badge variant="outline" className="ml-2">
            Real Data from ITstep
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search ads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-64"
            />
          </div>

          <Select value={filterPlatform} onValueChange={setFilterPlatform}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="google">Google</SelectItem>
              <SelectItem value="meta">Meta</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Ads</p>
                  <p className="text-2xl font-bold">{stats.total_ads}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-purple-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Campaigns</p>
                  <p className="text-2xl font-bold">{stats.total_campaigns}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-red-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Spent</p>
                  <p className="text-2xl font-bold">₴{stats.total_spend.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-purple-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Impressions</p>
                  <p className="text-2xl font-bold">{stats.total_impressions.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <MousePointer className="w-4 h-4 text-orange-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Clicks</p>
                  <p className="text-2xl font-bold">{stats.total_clicks.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div>
                <p className="text-sm text-muted-foreground">Avg CTR</p>
                <p className="text-2xl font-bold">{stats.avg_ctr.toFixed(2)}%</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div>
                <p className="text-sm text-muted-foreground">Avg CPC</p>
                <p className="text-2xl font-bold">₴{stats.avg_cpc.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Ads Grid */}
      <div className="grid gap-4">
        {filteredAds.map((ad) => (
          <Card key={ad.ad_id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getPlatformIcon(ad.platform)}
                      <h3 className="text-lg font-semibold">{ad.ad_name}</h3>
                      <Badge className={getStatusColor(ad.status)} variant="outline">
                        {ad.status.toUpperCase()}
                      </Badge>
                      <Badge className={getPlatformColor(ad.platform)} variant="outline">
                        {ad.platform.toUpperCase()}
                      </Badge>
                    </div>

                    {ad.campaign_name && (
                      <p className="text-sm text-muted-foreground mb-2">
                        Campaign: {ad.campaign_name}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div>
                        {new Date(ad.date_start).toLocaleDateString()} - {new Date(ad.date_stop).toLocaleDateString()}
                      </div>
                      <div>
                        {ad.type.toUpperCase()}
                      </div>
                    </div>
                  </div>

                  <div className="text-right ml-4">
                    <div className="text-2xl font-bold text-red-600">
                      ₴{ad.metrics.spend.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Total Spend
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-4 pt-3 border-t">
                  <div className="text-center">
                    <div className="text-lg font-bold">{ad.metrics.impressions.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Impressions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">{ad.metrics.clicks.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Clicks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">{ad.metrics.ctr.toFixed(2)}%</div>
                    <div className="text-xs text-muted-foreground">CTR</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">₴{ad.metrics.cpc.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">CPC</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">{ad.metrics.conversions || 0}</div>
                    <div className="text-xs text-muted-foreground">Conversions</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredAds.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No ads found</h3>
              <p className="text-muted-foreground">
                {searchQuery || filterPlatform !== "all"
                  ? "Try adjusting your filters or search terms"
                  : "No advertising data available for the selected period"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
