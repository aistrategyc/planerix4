"use client"

/**
 * V9 ADS PAGE - Enhanced with Facebook Creative Previews
 * Features:
 * - Full funnel tracking (Spend → ROAS)
 * - Facebook ad creative previews (images, texts, CTAs)
 * - Multi-level contract attribution
 * - Creative performance analysis
 *
 * Date: October 22, 2025
 * Version: V9 Final
 */

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import {
  ChartBarIcon,
  PhotoIcon,
  CursorArrowRaysIcon,
  TrophyIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline"

// Types
interface FacebookCreative {
  ad_id: string
  ad_name: string
  ad_creative_id: string
  creative_name: string | null
  campaign_name: string
  adset_name: string | null
  title: string | null
  body: string | null
  media_image_src: string | null
  cta_type: string | null
  object_type: string | null
  spend: number
  impressions: number
  clicks: number
  leads: number
  contracts: number
  revenue: number
  cpc: number | null
  cpl: number | null
  cpa: number | null
  roas: number | null
  ctr: number | null
  first_date: string | null
  last_date: string | null
}

interface CreativeType {
  object_type: string
  unique_creatives: number
  total_spend: number
  total_leads: number
  total_contracts: number
  total_revenue: number
  avg_roas: number | null
  avg_ctr: number | null
}

interface CampaignPerformance {
  platform: string
  campaign_name: string
  total_spend: number
  total_clicks: number
  leads: number
  contracts: number
  revenue: number
  cpl: number | null
  cpa: number | null
  roas: number | null
  conversion_rate: number | null
}

export default function AdsV9Page() {
  const [loading, setLoading] = useState(true)
  const [creatives, setCreatives] = useState<FacebookCreative[]>([])
  const [creativeTypes, setCreativeTypes] = useState<CreativeType[]>([])
  const [campaigns, setCampaigns] = useState<CampaignPerformance[]>([])
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("revenue")

  useEffect(() => {
    fetchData()
  }, [selectedPlatform])

  const fetchData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("access_token")
      if (!token) throw new Error("No access token")

      // Fetch Facebook creatives with performance
      const creativesRes = await fetch(
        `/api/data-analytics/v9/facebook/creatives?with_performance=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (creativesRes.ok) {
        const data = await creativesRes.json()
        setCreatives(data)
      }

      // Fetch creative types analysis
      const typesRes = await fetch(
        `/api/data-analytics/v9/facebook/creative-types`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (typesRes.ok) {
        const data = await typesRes.json()
        setCreativeTypes(data)
      }

      // Fetch campaign performance
      const campaignsRes = await fetch(
        `/api/data-analytics/v9/campaigns/performance${selectedPlatform !== "all" ? `?platform=${selectedPlatform}` : ""}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (campaignsRes.ok) {
        const data = await campaignsRes.json()
        setCampaigns(data)
      }

    } catch (error) {
      console.error("Error fetching V9 ads data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate totals
  const totals = campaigns.reduce(
    (acc, c) => ({
      spend: acc.spend + c.total_spend,
      clicks: acc.clicks + c.total_clicks,
      leads: acc.leads + c.leads,
      contracts: acc.contracts + c.contracts,
      revenue: acc.revenue + c.revenue,
    }),
    { spend: 0, clicks: 0, leads: 0, contracts: 0, revenue: 0 }
  )

  const totalROAS = totals.spend > 0 ? totals.revenue / totals.spend : null

  // Sort creatives
  const sortedCreatives = [...creatives].sort((a, b) => {
    if (sortBy === "revenue") return (b.revenue || 0) - (a.revenue || 0)
    if (sortBy === "roas") return (b.roas || 0) - (a.roas || 0)
    if (sortBy === "spend") return (b.spend || 0) - (a.spend || 0)
    if (sortBy === "contracts") return (b.contracts || 0) - (a.contracts || 0)
    return 0
  })

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Ads Performance V9</h1>
          <p className="text-muted-foreground">Enhanced with creative previews and full funnel tracking</p>
        </div>
        <div className="flex gap-4">
          <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="google">Google</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchData} variant="outline">
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[120px]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Spend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.spend.toLocaleString()} UAH</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Clicks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.clicks.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.leads.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Contracts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.contracts.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Revenue: {totals.revenue.toLocaleString()} UAH
              </p>
            </CardContent>
          </Card>
          <Card className={totalROAS && totalROAS > 1 ? "border-green-500" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">ROAS</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totalROAS && totalROAS > 1 ? "text-green-600" : "text-red-600"}`}>
                {totalROAS ? totalROAS.toFixed(2) : "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">
                {totalROAS && totalROAS > 1 ? "Profitable ✅" : "Loss"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="creatives" className="space-y-4">
        <TabsList>
          <TabsTrigger value="creatives">
            <PhotoIcon className="w-4 h-4 mr-2" />
            Creative Previews
          </TabsTrigger>
          <TabsTrigger value="campaigns">
            <ChartBarIcon className="w-4 h-4 mr-2" />
            Campaign Performance
          </TabsTrigger>
          <TabsTrigger value="types">
            <TrophyIcon className="w-4 h-4 mr-2" />
            Creative Types
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Creative Previews */}
        <TabsContent value="creatives" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Facebook Ad Creatives ({sortedCreatives.length})</CardTitle>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">Sort by Revenue</SelectItem>
                  <SelectItem value="roas">Sort by ROAS</SelectItem>
                  <SelectItem value="spend">Sort by Spend</SelectItem>
                  <SelectItem value="contracts">Sort by Contracts</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-[400px]" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sortedCreatives.slice(0, 50).map((creative) => (
                    <Card key={creative.ad_id} className="overflow-hidden">
                      {/* Image Preview */}
                      {creative.media_image_src ? (
                        <div className="relative h-48 bg-gray-100">
                          <Image
                            src={creative.media_image_src}
                            alt={creative.title || creative.ad_name}
                            fill
                            className="object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none"
                            }}
                          />
                        </div>
                      ) : (
                        <div className="h-48 bg-gray-200 flex items-center justify-center">
                          <PhotoIcon className="w-12 h-12 text-gray-400" />
                        </div>
                      )}

                      {/* Content */}
                      <div className="p-4 space-y-2">
                        <div>
                          <h3 className="font-semibold text-sm line-clamp-2">
                            {creative.title || creative.ad_name}
                          </h3>
                          {creative.body && (
                            <p className="text-xs text-muted-foreground line-clamp-3 mt-1">
                              {creative.body}
                            </p>
                          )}
                        </div>

                        {/* Campaign Info */}
                        <div className="flex gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {creative.campaign_name}
                          </Badge>
                          {creative.cta_type && (
                            <Badge variant="secondary" className="text-xs">
                              {creative.cta_type}
                            </Badge>
                          )}
                        </div>

                        {/* Performance Metrics */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-muted-foreground">Spend</p>
                            <p className="font-semibold">{creative.spend.toLocaleString()} UAH</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Clicks</p>
                            <p className="font-semibold">{creative.clicks.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Leads</p>
                            <p className="font-semibold">{creative.leads}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Contracts</p>
                            <p className="font-semibold">{creative.contracts}</p>
                          </div>
                        </div>

                        {/* ROAS Badge */}
                        {creative.roas !== null && (
                          <div className="pt-2 border-t">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">ROAS</span>
                              <Badge variant={creative.roas > 1 ? "default" : "destructive"}>
                                {creative.roas.toFixed(2)}
                              </Badge>
                            </div>
                            {creative.revenue > 0 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Revenue: {creative.revenue.toLocaleString()} UAH
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Campaign Performance */}
        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance - Full Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[400px]" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 text-sm font-medium">Campaign</th>
                        <th className="text-right p-2 text-sm font-medium">Platform</th>
                        <th className="text-right p-2 text-sm font-medium">Spend</th>
                        <th className="text-right p-2 text-sm font-medium">Clicks</th>
                        <th className="text-right p-2 text-sm font-medium">Leads</th>
                        <th className="text-right p-2 text-sm font-medium">Contracts</th>
                        <th className="text-right p-2 text-sm font-medium">Revenue</th>
                        <th className="text-right p-2 text-sm font-medium">ROAS</th>
                        <th className="text-right p-2 text-sm font-medium">CVR %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map((campaign, i) => (
                        <tr key={i} className="border-b hover:bg-gray-50">
                          <td className="p-2 text-sm">{campaign.campaign_name}</td>
                          <td className="p-2 text-sm text-right">
                            <Badge variant="outline">{campaign.platform}</Badge>
                          </td>
                          <td className="p-2 text-sm text-right">{campaign.total_spend.toLocaleString()}</td>
                          <td className="p-2 text-sm text-right">{campaign.total_clicks.toLocaleString()}</td>
                          <td className="p-2 text-sm text-right">{campaign.leads}</td>
                          <td className="p-2 text-sm text-right font-semibold">{campaign.contracts}</td>
                          <td className="p-2 text-sm text-right font-semibold">{campaign.revenue.toLocaleString()}</td>
                          <td className="p-2 text-sm text-right">
                            {campaign.roas !== null && (
                              <Badge variant={campaign.roas > 1 ? "default" : "destructive"}>
                                {campaign.roas.toFixed(2)}
                              </Badge>
                            )}
                          </td>
                          <td className="p-2 text-sm text-right">
                            {campaign.conversion_rate !== null ? campaign.conversion_rate.toFixed(2) + "%" : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Creative Types Analysis */}
        <TabsContent value="types">
          <Card>
            <CardHeader>
              <CardTitle>Creative Types Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[300px]" />
              ) : (
                <div className="space-y-4">
                  {creativeTypes.map((type, i) => (
                    <Card key={i} className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-lg">{type.object_type}</h3>
                          <p className="text-sm text-muted-foreground">
                            {type.unique_creatives} creatives
                          </p>
                        </div>
                        <Badge variant="outline">
                          ROAS: {type.avg_roas ? type.avg_roas.toFixed(2) : "N/A"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Spend</p>
                          <p className="font-semibold">{type.total_spend.toLocaleString()} UAH</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Leads</p>
                          <p className="font-semibold">{type.total_leads}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Contracts</p>
                          <p className="font-semibold">{type.total_contracts}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Revenue</p>
                          <p className="font-semibold">{type.total_revenue.toLocaleString()} UAH</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Avg CTR</p>
                          <p className="font-semibold">{type.avg_ctr ? type.avg_ctr.toFixed(2) + "%" : "N/A"}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
