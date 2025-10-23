"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  RefreshCcw,
  Target,
  TrendingUp,
  Eye,
  MousePointer,
  DollarSign,
  Users,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  ExternalLink
} from "lucide-react"
import * as dataAnalyticsApi from "@/lib/api/data-analytics"
import ProtectedRoute from "@/components/auth/ProtectedRoute"

export default function AdsPage() {
  return (
    <ProtectedRoute>
      <AdsPageContent />
    </ProtectedRoute>
  )
}

function AdsPageContent() {
  // Filters
  const [dateFrom, setDateFrom] = useState("2025-09-10")
  const [dateTo, setDateTo] = useState("2025-10-19")
  const [platformFilter, setPlatformFilter] = useState<string>("") // "" = all

  // Data states
  const [facebookWeekly, setFacebookWeekly] = useState<any[]>([])
  const [googleWeekly, setGoogleWeekly] = useState<any[]>([])
  const [contractsWithCreatives, setContractsWithCreatives] = useState<any[]>([])
  const [campaignsPerformance, setCampaignsPerformance] = useState<any[]>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("campaigns")

  // Fetch data
  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const results = await Promise.allSettled([
        dataAnalyticsApi.getV9FacebookWeekly(dateFrom, dateTo),
        dataAnalyticsApi.getV9GoogleWeekly(dateFrom, dateTo),
        dataAnalyticsApi.getV9ContractsEnriched(dateFrom, dateTo),
        dataAnalyticsApi.getV9CampaignsPerformance(dateFrom, dateTo, platformFilter || undefined),
      ])

      if (results[0].status === "fulfilled") setFacebookWeekly(results[0].value)
      if (results[1].status === "fulfilled") setGoogleWeekly(results[1].value)
      if (results[2].status === "fulfilled") setContractsWithCreatives(results[2].value)
      if (results[3].status === "fulfilled") setCampaignsPerformance(results[3].value)

      const failed = results.filter((r) => r.status === "rejected")
      if (failed.length > 0) {
        console.warn("Some ads endpoints failed:", failed)
      }
    } catch (err: any) {
      console.error("Ads data fetch failed:", err)
      setError(err.message || "Failed to load ads data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [dateFrom, dateTo, platformFilter])

  // Calculate totals from weekly data
  const facebookTotals = facebookWeekly.reduce(
    (acc, week) => ({
      leads: acc.leads + (week.leads || 0),
      contracts: acc.contracts + (week.contracts || 0),
      revenue: acc.revenue + (week.revenue || 0),
    }),
    { leads: 0, contracts: 0, revenue: 0 }
  )

  const googleTotals = googleWeekly.reduce(
    (acc, week) => ({
      leads: acc.leads + (week.leads || 0),
      contracts: acc.contracts + (week.contracts || 0),
      revenue: acc.revenue + (week.revenue || 0),
    }),
    { leads: 0, contracts: 0, revenue: 0 }
  )

  const metaCreatives = contractsWithCreatives.filter(
    (c) => (c.platform === "facebook" || c.platform === "instagram" || c.platform === "meta") && c.media_image_src
  )

  if (loading && contractsWithCreatives.length === 0) {
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
              <h3 className="font-semibold">Error Loading Ads Data</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchData}>Retry</Button>
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
            Ads Analytics V9
          </h1>
          <p className="text-muted-foreground mt-1">
            Детальная аналитика рекламных кампаний, групп объявлений и креативов
          </p>
        </div>

        <Button onClick={fetchData} disabled={loading} variant="outline" size="sm">
          <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">From Date</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">To Date</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Platform</label>
              <div className="flex gap-2 mt-2">
                {["all", "meta", "google"].map((platform) => (
                  <Button
                    key={platform}
                    size="sm"
                    variant={platformFilter === (platform === "all" ? "" : platform) ? "default" : "outline"}
                    onClick={() => setPlatformFilter(platform === "all" ? "" : platform)}
                  >
                    {platform === "all" ? "All" : platform === "meta" ? "Meta (FB/IG)" : "Google"}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-blue-600" />
              <p className="text-sm text-muted-foreground">Facebook Leads</p>
            </div>
            <p className="text-2xl font-bold">{facebookTotals.leads.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-green-600" />
              <p className="text-sm text-muted-foreground">Facebook Contracts</p>
            </div>
            <p className="text-2xl font-bold">{facebookTotals.contracts.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-red-600" />
              <p className="text-sm text-muted-foreground">Google Leads</p>
            </div>
            <p className="text-2xl font-bold">{googleTotals.leads.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-orange-600" />
              <p className="text-sm text-muted-foreground">Google Contracts</p>
            </div>
            <p className="text-2xl font-bold">{googleTotals.contracts.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Campaigns, Creatives, Weekly Performance */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns Performance</TabsTrigger>
          <TabsTrigger value="creatives">Creative Library ({metaCreatives.length})</TabsTrigger>
          <TabsTrigger value="weekly">Weekly Trends</TabsTrigger>
        </TabsList>

        {/* Tab 1: Campaigns Performance */}
        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance</CardTitle>
              <p className="text-sm text-muted-foreground">
                All campaigns with contracts and revenue
              </p>
            </CardHeader>
            <CardContent>
              {campaignsPerformance.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No campaigns data available</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Platform</TableHead>
                        <TableHead>Campaign Name</TableHead>
                        <TableHead>Attribution Level</TableHead>
                        <TableHead className="text-right">Contracts</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaignsPerformance.map((campaign, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Badge variant="outline">{campaign.platform || "unknown"}</Badge>
                          </TableCell>
                          <TableCell className="font-medium max-w-xs truncate">
                            {campaign.campaign_name || "Unknown Campaign"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{campaign.attribution_level || "none"}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {campaign.contracts || 0}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-green-600">
                            ${(campaign.revenue || 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Creative Library */}
        <TabsContent value="creatives" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Creative Library - Meta Ads
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                All creatives with images and contract results
              </p>
            </CardHeader>
            <CardContent>
              {metaCreatives.length === 0 ? (
                <div className="text-center py-12">
                  <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No creatives with images found</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    Try adjusting date range or platform filter
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {metaCreatives.map((creative, idx) => (
                    <Card key={idx} className="overflow-hidden">
                      <div className="aspect-video w-full bg-gray-100 relative">
                        {creative.media_image_src ? (
                          <img
                            src={creative.media_image_src}
                            alt={creative.creative_title || "Creative"}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none"
                            }}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4 space-y-2">
                        <div>
                          <p className="font-semibold text-sm line-clamp-2">
                            {creative.creative_title || creative.ad_name || "Untitled Creative"}
                          </p>
                          {creative.creative_body && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {creative.creative_body}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {creative.campaign_name ? creative.campaign_name.substring(0, 30) + "..." : "No campaign"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="text-xs">
                            <span className="text-muted-foreground">Revenue:</span>
                            <span className="ml-1 font-semibold text-green-600">
                              ${(creative.revenue || 0).toLocaleString()}
                            </span>
                          </div>
                          {creative.cta_type && (
                            <Badge variant="secondary" className="text-xs">
                              {creative.cta_type}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Weekly Trends */}
        <TabsContent value="weekly" className="space-y-4">
          {/* Facebook Weekly */}
          <Card>
            <CardHeader>
              <CardTitle>Facebook Weekly Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {facebookWeekly.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No Facebook data</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Week Start</TableHead>
                        <TableHead className="text-right">Leads</TableHead>
                        <TableHead className="text-right">Contracts</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">WoW Leads %</TableHead>
                        <TableHead className="text-right">WoW Contracts %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {facebookWeekly.map((week, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">
                            {new Date(week.period_start).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">{week.leads || 0}</TableCell>
                          <TableCell className="text-right">{week.contracts || 0}</TableCell>
                          <TableCell className="text-right text-green-600">
                            ${(week.revenue || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {week.leads_growth_pct != null ? (
                              <span className={week.leads_growth_pct > 0 ? "text-green-600" : "text-red-600"}>
                                {week.leads_growth_pct > 0 ? "+" : ""}
                                {week.leads_growth_pct.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {week.contracts_growth_pct != null ? (
                              <span className={week.contracts_growth_pct > 0 ? "text-green-600" : "text-red-600"}>
                                {week.contracts_growth_pct > 0 ? "+" : ""}
                                {week.contracts_growth_pct.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Google Weekly */}
          <Card>
            <CardHeader>
              <CardTitle>Google Weekly Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {googleWeekly.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No Google data</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Week Start</TableHead>
                        <TableHead className="text-right">Leads</TableHead>
                        <TableHead className="text-right">Contracts</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">WoW Leads %</TableHead>
                        <TableHead className="text-right">WoW Contracts %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {googleWeekly.map((week, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">
                            {new Date(week.period_start).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">{week.leads || 0}</TableCell>
                          <TableCell className="text-right">{week.contracts || 0}</TableCell>
                          <TableCell className="text-right text-green-600">
                            ${(week.revenue || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {week.leads_growth_pct != null ? (
                              <span className={week.leads_growth_pct > 0 ? "text-green-600" : "text-red-600"}>
                                {week.leads_growth_pct > 0 ? "+" : ""}
                                {week.leads_growth_pct.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {week.contracts_growth_pct != null ? (
                              <span className={week.contracts_growth_pct > 0 ? "text-green-600" : "text-red-600"}>
                                {week.contracts_growth_pct > 0 ? "+" : ""}
                                {week.contracts_growth_pct.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
