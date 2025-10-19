"use client"

import { useState, useEffect } from "react"
import ProtectedRoute from "@/components/auth/ProtectedRoute"
import {
  AdsAnalyticsAPI,
  AdsOverview,
  CampaignPerformance,
  AdPerformance,
  CreativeLibraryItem,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatROAS
} from "@/lib/api/ads"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// import { useToast } from "@/components/ui/use-toast"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  Search,
  TrendingUp,
  Eye,
  MousePointer,
  DollarSign,
  Users,
  Target,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink
} from "lucide-react"

export default function AdsPage() {
  return (
    <ProtectedRoute>
      <AdsPageContent />
    </ProtectedRoute>
  )
}

function AdsPageContent() {
  // const { toast } = useToast()

  // Date filters (last 30 days by default)
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])

  // Filters
  const [platformFilter, setPlatformFilter] = useState<string>("")  // Empty string means "all" for API
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)

  // Data states
  const [overview, setOverview] = useState<AdsOverview | null>(null)
  const [campaigns, setCampaigns] = useState<CampaignPerformance[]>([])
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set())
  const [campaignAds, setCampaignAds] = useState<Map<string, AdPerformance[]>>(new Map())
  const [creatives, setCreatives] = useState<CreativeLibraryItem[]>([])

  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingCampaignAds, setIsLoadingCampaignAds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  // Active tab
  const [activeTab, setActiveTab] = useState("campaigns")

  // Fetch overview and campaigns
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const [overviewData, campaignsData] = await Promise.all([
          AdsAnalyticsAPI.getOverview({
            date_from: dateFrom,
            date_to: dateTo,
            platform: platformFilter || undefined
          }),
          AdsAnalyticsAPI.getCampaigns({
            date_from: dateFrom,
            date_to: dateTo,
            platform: platformFilter || undefined,
            sort: 'spend',
            limit: 100
          })
        ])

        setOverview(overviewData)
        setCampaigns(campaignsData.data)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load ads data"
        setError(errorMessage)
        console.error("Failed to load ads data:", err)
        // toast({
        //   title: "Error",
        //   description: errorMessage,
        //   variant: "destructive"
        // })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [dateFrom, dateTo, platformFilter])

  // Fetch creatives when switching to creatives tab
  useEffect(() => {
    if (activeTab === "creatives" && creatives.length === 0) {
      const fetchCreatives = async () => {
        try {
          const creativesData = await AdsAnalyticsAPI.getCreatives({
            date_from: dateFrom,
            date_to: dateTo,
            platform: 'facebook',
            has_image: true,
            sort: 'best_roas',
            limit: 50
          })
          setCreatives(creativesData.data)
        } catch (err) {
          console.error("Failed to fetch creatives:", err)
        }
      }
      fetchCreatives()
    }
  }, [activeTab, dateFrom, dateTo, creatives.length])

  // Toggle campaign expansion and fetch ads
  const toggleCampaign = async (campaignId: string, platform: string) => {
    const newExpanded = new Set(expandedCampaigns)

    if (newExpanded.has(campaignId)) {
      newExpanded.delete(campaignId)
      setExpandedCampaigns(newExpanded)
    } else {
      newExpanded.add(campaignId)
      setExpandedCampaigns(newExpanded)

      // Fetch ads if not already loaded
      if (!campaignAds.has(campaignId) && platform === 'facebook') {
        setIsLoadingCampaignAds(new Set(isLoadingCampaignAds).add(campaignId))

        try {
          const adsData = await AdsAnalyticsAPI.getAdsByCampaign(
            campaignId,
            {
              date_from: dateFrom,
              date_to: dateTo,
              platform: platform
            }
          )

          const newCampaignAds = new Map(campaignAds)
          newCampaignAds.set(campaignId, adsData.ads)
          setCampaignAds(newCampaignAds)
        } catch (err) {
          console.error("Failed to fetch campaign ads:", err)
        } finally {
          const newLoading = new Set(isLoadingCampaignAds)
          newLoading.delete(campaignId)
          setIsLoadingCampaignAds(newLoading)
        }
      }
    }
  }

  // Filter campaigns by search
  const filteredCampaigns = campaigns.filter(campaign => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      campaign.campaign_name?.toLowerCase().includes(query) ||
      campaign.campaign_id.toLowerCase().includes(query)
    )
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-muted-foreground">Loading ads analytics...</p>
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
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="w-8 h-8 text-blue-600" />
            Ads Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Детальная аналитика рекламных кампаний с креативами
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-40"
          />
          <span className="flex items-center text-muted-foreground">—</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-40"
          />

          <Select value={platformFilter || "all"} onValueChange={(val) => setPlatformFilter(val === "all" ? "" : val)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="google">Google</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview KPI Cards */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-red-600" />
                <p className="text-sm text-muted-foreground">Spend</p>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(overview.total_spend)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Eye className="w-4 h-4 text-purple-600" />
                <p className="text-sm text-muted-foreground">Impressions</p>
              </div>
              <p className="text-2xl font-bold">{formatNumber(overview.total_impressions)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <MousePointer className="w-4 h-4 text-orange-600" />
                <p className="text-sm text-muted-foreground">Clicks</p>
              </div>
              <p className="text-2xl font-bold">{formatNumber(overview.total_clicks)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-blue-600" />
                <p className="text-sm text-muted-foreground">CRM Leads</p>
              </div>
              <p className="text-2xl font-bold">{overview.crm_leads}</p>
              <p className="text-xs text-muted-foreground">
                {formatPercent(overview.match_rate)} match rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-green-600" />
                <p className="text-sm text-muted-foreground">Contracts</p>
              </div>
              <p className="text-2xl font-bold">{overview.contracts}</p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(overview.revenue)} revenue
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <p className="text-sm text-muted-foreground">ROAS</p>
              </div>
              <p className="text-2xl font-bold">{formatROAS(overview.roas)}</p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(overview.cpl || 0)} CPL
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="campaigns">
            Campaigns ({campaigns.length})
          </TabsTrigger>
          <TabsTrigger value="creatives">
            <ImageIcon className="w-4 h-4 mr-2" />
            Creative Library
          </TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="mt-6 space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="space-y-2">
            {filteredCampaigns.map((campaign) => (
              <Card key={campaign.campaign_id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Campaign Row */}
                  <div
                    className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => toggleCampaign(campaign.campaign_id, campaign.platform)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        {expandedCampaigns.has(campaign.campaign_id) ? (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        )}

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{campaign.campaign_name || campaign.campaign_id}</h3>
                            <Badge variant="outline">
                              {campaign.platform === 'facebook' ? 'Meta' : campaign.platform.toUpperCase()}
                            </Badge>
                            {campaign.ad_count && campaign.ad_count > 0 && (
                              <span className="text-sm text-muted-foreground">
                                {campaign.ad_count} ads
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-6 gap-4 text-center">
                          <div>
                            <div className="text-lg font-bold">{formatCurrency(campaign.spend)}</div>
                            <div className="text-xs text-muted-foreground">Spend</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold">{formatNumber(campaign.impressions)}</div>
                            <div className="text-xs text-muted-foreground">Impr.</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold">{campaign.crm_leads}</div>
                            <div className="text-xs text-muted-foreground">Leads</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold">{campaign.contracts}</div>
                            <div className="text-xs text-muted-foreground">Contracts</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold">{formatROAS(campaign.roas)}</div>
                            <div className="text-xs text-muted-foreground">ROAS</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold">{formatCurrency(campaign.cpl || 0)}</div>
                            <div className="text-xs text-muted-foreground">CPL</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Ads */}
                  {expandedCampaigns.has(campaign.campaign_id) && (
                    <div className="border-t bg-muted/20 p-4">
                      {isLoadingCampaignAds.has(campaign.campaign_id) ? (
                        <div className="text-center py-4">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                          <p className="text-sm text-muted-foreground">Loading ads...</p>
                        </div>
                      ) : campaign.platform === 'google' ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Ad-level details not available for Google campaigns
                        </p>
                      ) : campaignAds.get(campaign.campaign_id)?.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No ads found for this campaign
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {campaignAds.get(campaign.campaign_id)?.map((ad) => (
                            <div key={ad.ad_id} className="bg-background rounded-lg p-4 flex gap-4">
                              {/* Creative Image */}
                              {ad.creative?.media_image_src && (
                                <div className="flex-shrink-0">
                                  <img
                                    src={ad.creative.media_image_src}
                                    alt={ad.creative.title || ad.ad_name || 'Ad creative'}
                                    className="w-24 h-24 object-cover rounded"
                                    onError={(e) => {
                                      e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E'
                                    }}
                                  />
                                </div>
                              )}

                              {/* Ad Details */}
                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <h4 className="font-medium">{ad.ad_name || ad.ad_id}</h4>
                                    {ad.creative?.title && (
                                      <p className="text-sm text-muted-foreground mt-1">
                                        {ad.creative.title}
                                      </p>
                                    )}
                                  </div>
                                  {ad.creative?.permalink_url && (
                                    <Button size="sm" variant="ghost" asChild>
                                      <a href={ad.creative.permalink_url} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="w-4 h-4" />
                                      </a>
                                    </Button>
                                  )}
                                </div>

                                <div className="grid grid-cols-6 gap-2 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Spend:</span>
                                    <span className="ml-1 font-medium">{formatCurrency(ad.spend)}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Clicks:</span>
                                    <span className="ml-1 font-medium">{ad.clicks}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Leads:</span>
                                    <span className="ml-1 font-medium">{ad.crm_leads}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Contracts:</span>
                                    <span className="ml-1 font-medium">{ad.contracts}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">ROAS:</span>
                                    <span className="ml-1 font-medium">{formatROAS(ad.roas)}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">CPL:</span>
                                    <span className="ml-1 font-medium">{formatCurrency(ad.cpl || 0)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {filteredCampaigns.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No campaigns found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your filters or date range
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Creatives Tab */}
        <TabsContent value="creatives" className="mt-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {creatives.map((creative) => (
              <Card key={creative.ad_id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-video relative bg-muted">
                  {creative.media_image_src ? (
                    <img
                      src={creative.media_image_src}
                      alt={creative.title || creative.ad_name || 'Ad creative'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="20"%3ENo Image%3C/text%3E%3C/svg%3E'
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <ImageIcon className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <h4 className="font-medium text-sm mb-2 line-clamp-2">
                    {creative.title || creative.ad_name || 'Untitled'}
                  </h4>
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-1">
                    {creative.campaign_name}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-muted-foreground">Leads</div>
                      <div className="font-bold">{creative.crm_leads}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Contracts</div>
                      <div className="font-bold">{creative.contracts}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">ROAS</div>
                      <div className="font-bold">{formatROAS(creative.roas)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">CPL</div>
                      <div className="font-bold">{formatCurrency(creative.cpl || 0)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {creatives.length === 0 && (
              <div className="col-span-full text-center py-12">
                <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No creatives found</h3>
                <p className="text-muted-foreground">
                  Creatives with images will appear here
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
