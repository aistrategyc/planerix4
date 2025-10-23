"use client"

/**
 * V9 DATA ANALYTICS PAGE - Comprehensive Dashboard with Contracts Focus
 * Features:
 * - Full marketing funnel with CONTRACT FOCUS
 * - Platform comparison by CONTRACTS
 * - Weekly/Monthly trends showing CONTRACTS
 * - Top performers by CONTRACT GENERATION
 * - Attribution breakdown to CONTRACTS
 * - Comprehensive filters (dates, platforms, campaigns)
 *
 * Key Insight: "Везде акцент именно на контракты! Это важней всего,
 * что бы видеть что реально дает успех в виде количества принесенных контрактов"
 *
 * Date: October 22, 2025
 * Version: V9 Final
 */

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  TrophyIcon,
  FunnelIcon,
  CalendarIcon,
  DocumentCheckIcon,
} from "@heroicons/react/24/outline"

// Types
interface FunnelPlatform {
  platform: string
  total_leads: number
  total_contracts: number
  total_revenue: number
  avg_contract_value: number
  conversion_rate: number
  avg_days_to_contract: number | null
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

interface DailyPlatform {
  dt: string
  platform: string
  leads: number
  contracts: number
  revenue: number
  conversion_rate: number
}

interface ContractByCampaign {
  platform: string
  campaign_name: string
  attribution_level: string
  contracts: number
  revenue: number
  avg_contract_value: number
  avg_days_to_close: number | null
  first_contract: string
  last_contract: string
}

interface AttributionSummary {
  attribution_level: string
  contracts: number
  revenue: number
  avg_contract_value: number
  avg_days_to_close: number
  percent_of_total: number
  percent_of_revenue: number
}

export default function DataAnalyticsV9Page() {
  const [loading, setLoading] = useState(true)
  const [funnel, setFunnel] = useState<{ platforms: FunnelPlatform[] }>({ platforms: [] })
  const [campaigns, setCampaigns] = useState<CampaignPerformance[]>([])
  const [dailyData, setDailyData] = useState<DailyPlatform[]>([])
  const [contractsByCampaign, setContractsByCampaign] = useState<ContractByCampaign[]>([])
  const [attributionSummary, setAttributionSummary] = useState<AttributionSummary[]>([])

  // Filters
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all")
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: "2025-01-01",
    end: new Date().toISOString().split("T")[0],
  })

  useEffect(() => {
    fetchData()
  }, [selectedPlatform, dateRange])

  const fetchData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("access_token")
      if (!token) throw new Error("No access token")

      // Fetch marketing funnel (complete overview)
      const funnelRes = await fetch(
        `/api/data-analytics/v9/funnel/complete`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (funnelRes.ok) {
        const data = await funnelRes.json()
        setFunnel(data)
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

      // Fetch daily platform data
      const dailyRes = await fetch(
        `/api/data-analytics/v9/platforms/daily?start_date=${dateRange.start}&end_date=${dateRange.end}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (dailyRes.ok) {
        const data = await dailyRes.json()
        setDailyData(data)
      }

      // Fetch contracts by campaign
      const byCampaignRes = await fetch(
        `/api/data-analytics/v9/contracts/by-campaign${selectedPlatform !== "all" ? `?platform=${selectedPlatform}` : ""}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (byCampaignRes.ok) {
        const data = await byCampaignRes.json()
        setContractsByCampaign(data)
      }

      // Fetch attribution summary
      const summaryRes = await fetch(
        `/api/data-analytics/v9/contracts/attribution-summary`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (summaryRes.ok) {
        const data = await summaryRes.json()
        setAttributionSummary(data)
      }

    } catch (error) {
      console.error("Error fetching V9 data analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate totals from funnel
  const totals = funnel.platforms.reduce(
    (acc, p) => ({
      leads: acc.leads + p.total_leads,
      contracts: acc.contracts + p.total_contracts,
      revenue: acc.revenue + p.total_revenue,
    }),
    { leads: 0, contracts: 0, revenue: 0 }
  )

  const totalConversionRate = totals.leads > 0 ? (totals.contracts / totals.leads) * 100 : 0
  const avgContractValue = totals.contracts > 0 ? totals.revenue / totals.contracts : 0

  // Calculate campaign totals
  const campaignTotals = campaigns.reduce(
    (acc, c) => ({
      spend: acc.spend + c.total_spend,
      clicks: acc.clicks + c.total_clicks,
      leads: acc.leads + c.leads,
      contracts: acc.contracts + c.contracts,
      revenue: acc.revenue + c.revenue,
    }),
    { spend: 0, clicks: 0, leads: 0, contracts: 0, revenue: 0 }
  )

  const totalROAS = campaignTotals.spend > 0 ? campaignTotals.revenue / campaignTotals.spend : null

  // Attribution quality badge
  const getAttributionBadge = (level: string) => {
    switch (level) {
      case "campaign_match": return <Badge className="bg-green-500">Campaign Match</Badge>
      case "utm_attribution": return <Badge className="bg-blue-500">UTM Attribution</Badge>
      case "utm_source_only": return <Badge className="bg-yellow-500">UTM Source</Badge>
      case "platform_inferred": return <Badge variant="secondary">Platform Inferred</Badge>
      case "unattributed": return <Badge variant="outline">Unattributed</Badge>
      default: return <Badge variant="outline">{level}</Badge>
    }
  }

  // Make campaign name readable (replace "Unknown Campaign" with platform-based description)
  const getReadableCampaignName = (campaignName: string, platform: string, attributionLevel: string) => {
    if (campaignName === "Unknown Campaign") {
      switch (attributionLevel) {
        case "platform_inferred":
          return `${platform.charAt(0).toUpperCase() + platform.slice(1)} (Inferred)`
        case "unattributed":
          return `Direct / Organic`
        default:
          return `${platform.charAt(0).toUpperCase() + platform.slice(1)} Traffic`
      }
    }
    return campaignName
  }

  // Aggregate daily data by week
  const getWeeklyData = () => {
    const weekly: { [key: string]: { leads: number; contracts: number; revenue: number } } = {}

    dailyData.forEach((day) => {
      const weekStart = getWeekStart(new Date(day.dt))
      const weekKey = weekStart.toISOString().split("T")[0]

      if (!weekly[weekKey]) {
        weekly[weekKey] = { leads: 0, contracts: 0, revenue: 0 }
      }

      weekly[weekKey].leads += day.leads
      weekly[weekKey].contracts += day.contracts
      weekly[weekKey].revenue += day.revenue
    })

    return Object.entries(weekly)
      .map(([week, data]) => ({ week, ...data }))
      .sort((a, b) => b.week.localeCompare(a.week))
      .slice(0, 12) // Last 12 weeks
  }

  const getWeekStart = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday start
    return new Date(d.setDate(diff))
  }

  const weeklyData = getWeeklyData()

  // Top campaigns by contracts
  const topCampaignsByContracts = [...campaigns]
    .sort((a, b) => b.contracts - a.contracts)
    .slice(0, 10)

  // Top campaigns by ROAS (with contracts > 0)
  const topCampaignsByROAS = [...campaigns]
    .filter((c) => c.contracts > 0 && c.roas !== null && c.roas > 0)
    .sort((a, b) => (b.roas || 0) - (a.roas || 0))
    .slice(0, 10)

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Data Analytics V9</h1>
          <p className="text-muted-foreground">
            Comprehensive dashboard with <span className="font-semibold text-green-600">CONTRACTS FOCUS</span>
          </p>
        </div>
        <div className="flex gap-4">
          <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="google">Google</SelectItem>
              <SelectItem value="direct">Direct</SelectItem>
              <SelectItem value="form">Form</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2 items-center">
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-[150px]"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-[150px]"
            />
          </div>
          <Button onClick={fetchData} variant="outline">
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Global Summary Cards - CONTRACT FOCUSED */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-[120px]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="border-green-500 border-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                <DocumentCheckIcon className="w-4 h-4 inline mr-1" />
                Total Contracts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{totals.contracts}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Primary Success Metric
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.revenue.toLocaleString()} UAH</div>
              <p className="text-xs text-muted-foreground">
                {totals.contracts} contracts
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Contract Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgContractValue.toLocaleString()} UAH</div>
              <p className="text-xs text-muted-foreground">
                Per contract
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Conversion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalConversionRate.toFixed(2)}%</div>
              <p className="text-xs text-muted-foreground">
                {totals.leads} leads → {totals.contracts} contracts
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
                {campaignTotals.spend.toLocaleString()} UAH spend
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="funnel" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="funnel">
            <FunnelIcon className="w-4 h-4 mr-2" />
            Funnel
          </TabsTrigger>
          <TabsTrigger value="platforms">
            <ChartBarIcon className="w-4 h-4 mr-2" />
            Platforms
          </TabsTrigger>
          <TabsTrigger value="campaigns">
            <TrophyIcon className="w-4 h-4 mr-2" />
            Top Campaigns
          </TabsTrigger>
          <TabsTrigger value="trends">
            <ArrowTrendingUpIcon className="w-4 h-4 mr-2" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="attribution">
            <DocumentCheckIcon className="w-4 h-4 mr-2" />
            Attribution
          </TabsTrigger>
          <TabsTrigger value="table">
            <CalendarIcon className="w-4 h-4 mr-2" />
            Full Table
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Marketing Funnel - CONTRACTS FOCUS */}
        <TabsContent value="funnel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Marketing Funnel by Platform - CONTRACT GENERATION FOCUS</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[400px]" />
              ) : (
                <div className="space-y-4">
                  {funnel.platforms
                    .sort((a, b) => b.total_contracts - a.total_contracts)
                    .map((platform, i) => {
                      const contractShare = totals.contracts > 0
                        ? (platform.total_contracts / totals.contracts) * 100
                        : 0

                      return (
                        <Card key={i} className="p-4 border-l-4 border-green-500">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-lg font-semibold">{platform.platform}</h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {platform.total_leads.toLocaleString()} leads → {" "}
                                <span className="font-bold text-green-600 text-lg">
                                  {platform.total_contracts} contracts
                                </span>
                                {" "}({contractShare.toFixed(1)}% of all contracts)
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold">{platform.total_revenue.toLocaleString()} UAH</p>
                              <p className="text-sm text-muted-foreground">Total Revenue</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-4 mt-4">
                            <div>
                              <p className="text-xs text-muted-foreground">Avg Contract Value</p>
                              <p className="font-semibold">{platform.avg_contract_value.toLocaleString()} UAH</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Conversion Rate</p>
                              <p className="font-semibold">{platform.conversion_rate.toFixed(2)}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Avg Days to Close</p>
                              <p className="font-semibold">
                                {platform.avg_days_to_contract !== null
                                  ? platform.avg_days_to_contract.toFixed(1) + " days"
                                  : "N/A"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Contract Share</p>
                              <p className="font-semibold text-green-600">{contractShare.toFixed(1)}%</p>
                            </div>
                          </div>
                          {/* Visual progress bar */}
                          <div className="mt-4">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-500 h-2 rounded-full transition-all"
                                style={{ width: `${contractShare}%` }}
                              />
                            </div>
                          </div>
                        </Card>
                      )
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Platform Comparison - CONTRACTS FOCUS */}
        <TabsContent value="platforms">
          <Card>
            <CardHeader>
              <CardTitle>Platform Comparison - Contracts Generated</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[400px]" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 text-sm font-medium">Platform</th>
                        <th className="text-right p-2 text-sm font-medium">Leads</th>
                        <th className="text-right p-2 text-sm font-medium bg-green-50">Contracts</th>
                        <th className="text-right p-2 text-sm font-medium">Revenue</th>
                        <th className="text-right p-2 text-sm font-medium">Avg Contract</th>
                        <th className="text-right p-2 text-sm font-medium">CVR %</th>
                        <th className="text-right p-2 text-sm font-medium">Contract Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {funnel.platforms
                        .sort((a, b) => b.total_contracts - a.total_contracts)
                        .map((platform, i) => {
                          const contractShare = totals.contracts > 0
                            ? (platform.total_contracts / totals.contracts) * 100
                            : 0

                          return (
                            <tr key={i} className="border-b hover:bg-gray-50">
                              <td className="p-2 text-sm">
                                <Badge variant="outline">{platform.platform}</Badge>
                              </td>
                              <td className="p-2 text-sm text-right">{platform.total_leads.toLocaleString()}</td>
                              <td className="p-2 text-sm text-right bg-green-50">
                                <span className="font-bold text-green-600 text-lg">
                                  {platform.total_contracts}
                                </span>
                              </td>
                              <td className="p-2 text-sm text-right font-semibold">
                                {platform.total_revenue.toLocaleString()}
                              </td>
                              <td className="p-2 text-sm text-right">
                                {platform.avg_contract_value.toLocaleString()}
                              </td>
                              <td className="p-2 text-sm text-right">{platform.conversion_rate.toFixed(2)}%</td>
                              <td className="p-2 text-sm text-right">
                                <Badge variant="secondary">{contractShare.toFixed(1)}%</Badge>
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Top Campaigns by CONTRACTS */}
        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>🏆 Top 10 Campaigns by Contracts Generated</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[400px]" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 text-sm font-medium">Rank</th>
                        <th className="text-left p-2 text-sm font-medium">Campaign</th>
                        <th className="text-left p-2 text-sm font-medium">Platform</th>
                        <th className="text-right p-2 text-sm font-medium bg-green-50">Contracts</th>
                        <th className="text-right p-2 text-sm font-medium">Revenue</th>
                        <th className="text-right p-2 text-sm font-medium">ROAS</th>
                        <th className="text-right p-2 text-sm font-medium">CVR %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topCampaignsByContracts.map((campaign, i) => (
                        <tr key={i} className="border-b hover:bg-gray-50">
                          <td className="p-2 text-sm">
                            {i === 0 && "🥇"}
                            {i === 1 && "🥈"}
                            {i === 2 && "🥉"}
                            {i > 2 && `#${i + 1}`}
                          </td>
                          <td className="p-2 text-sm">{campaign.campaign_name}</td>
                          <td className="p-2 text-sm">
                            <Badge variant="outline">{campaign.platform}</Badge>
                          </td>
                          <td className="p-2 text-sm text-right bg-green-50">
                            <span className="font-bold text-green-600 text-lg">
                              {campaign.contracts}
                            </span>
                          </td>
                          <td className="p-2 text-sm text-right font-semibold">
                            {campaign.revenue.toLocaleString()}
                          </td>
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

          <Card>
            <CardHeader>
              <CardTitle>💰 Top 10 Campaigns by ROAS (with Contracts)</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[400px]" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 text-sm font-medium">Rank</th>
                        <th className="text-left p-2 text-sm font-medium">Campaign</th>
                        <th className="text-left p-2 text-sm font-medium">Platform</th>
                        <th className="text-right p-2 text-sm font-medium">Spend</th>
                        <th className="text-right p-2 text-sm font-medium">Contracts</th>
                        <th className="text-right p-2 text-sm font-medium">Revenue</th>
                        <th className="text-right p-2 text-sm font-medium bg-green-50">ROAS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topCampaignsByROAS.map((campaign, i) => (
                        <tr key={i} className="border-b hover:bg-gray-50">
                          <td className="p-2 text-sm">
                            {i === 0 && "🥇"}
                            {i === 1 && "🥈"}
                            {i === 2 && "🥉"}
                            {i > 2 && `#${i + 1}`}
                          </td>
                          <td className="p-2 text-sm">{campaign.campaign_name}</td>
                          <td className="p-2 text-sm">
                            <Badge variant="outline">{campaign.platform}</Badge>
                          </td>
                          <td className="p-2 text-sm text-right">{campaign.total_spend.toLocaleString()}</td>
                          <td className="p-2 text-sm text-right font-semibold">{campaign.contracts}</td>
                          <td className="p-2 text-sm text-right font-semibold">
                            {campaign.revenue.toLocaleString()}
                          </td>
                          <td className="p-2 text-sm text-right bg-green-50">
                            <Badge variant="default" className="bg-green-600">
                              {campaign.roas ? campaign.roas.toFixed(2) : "N/A"}
                            </Badge>
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

        {/* Tab 4: Weekly Trends - CONTRACTS FOCUS */}
        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Trends - Contracts Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[400px]" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 text-sm font-medium">Week Start</th>
                        <th className="text-right p-2 text-sm font-medium">Leads</th>
                        <th className="text-right p-2 text-sm font-medium bg-green-50">Contracts</th>
                        <th className="text-right p-2 text-sm font-medium">Revenue</th>
                        <th className="text-right p-2 text-sm font-medium">CVR %</th>
                        <th className="text-right p-2 text-sm font-medium">Trend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weeklyData.map((week, i) => {
                        const cvr = week.leads > 0 ? (week.contracts / week.leads) * 100 : 0
                        const prevWeek = weeklyData[i + 1]
                        const trend = prevWeek ? week.contracts - prevWeek.contracts : 0

                        return (
                          <tr key={i} className="border-b hover:bg-gray-50">
                            <td className="p-2 text-sm">{new Date(week.week).toLocaleDateString()}</td>
                            <td className="p-2 text-sm text-right">{week.leads}</td>
                            <td className="p-2 text-sm text-right bg-green-50">
                              <span className="font-bold text-green-600">{week.contracts}</span>
                            </td>
                            <td className="p-2 text-sm text-right">{week.revenue.toLocaleString()}</td>
                            <td className="p-2 text-sm text-right">{cvr.toFixed(2)}%</td>
                            <td className="p-2 text-sm text-right">
                              {trend > 0 && (
                                <Badge variant="default" className="bg-green-500">
                                  +{trend}
                                </Badge>
                              )}
                              {trend < 0 && (
                                <Badge variant="destructive">
                                  {trend}
                                </Badge>
                              )}
                              {trend === 0 && <Badge variant="secondary">0</Badge>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Attribution - CONTRACTS BY SOURCE */}
        <TabsContent value="attribution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Attribution Quality - Contracts Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[400px]" />
              ) : (
                <div className="space-y-4">
                  {attributionSummary.map((item, i) => (
                    <Card key={i} className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          {getAttributionBadge(item.attribution_level)}
                          <p className="text-sm text-muted-foreground mt-2">
                            <span className="font-bold text-green-600 text-lg">{item.contracts} contracts</span>
                            {" "}({item.percent_of_total.toFixed(2)}% of total)
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">{item.revenue.toLocaleString()} UAH</p>
                          <p className="text-sm text-muted-foreground">
                            {item.percent_of_revenue.toFixed(2)}% of revenue
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Avg Contract Value</p>
                          <p className="font-semibold">{item.avg_contract_value.toLocaleString()} UAH</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Avg Days to Close</p>
                          <p className="font-semibold">{item.avg_days_to_close.toFixed(1)} days</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Contract Share</p>
                          <p className="font-semibold text-green-600">{item.percent_of_total.toFixed(2)}%</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contracts by Campaign and Attribution Level</CardTitle>
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
                        <th className="text-left p-2 text-sm font-medium">Platform</th>
                        <th className="text-left p-2 text-sm font-medium">Attribution</th>
                        <th className="text-right p-2 text-sm font-medium bg-green-50">Contracts</th>
                        <th className="text-right p-2 text-sm font-medium">Revenue</th>
                        <th className="text-right p-2 text-sm font-medium">Avg Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contractsByCampaign.slice(0, 50).map((item, i) => (
                        <tr key={i} className="border-b hover:bg-gray-50">
                          <td className="p-2 text-sm">
                            {getReadableCampaignName(item.campaign_name, item.platform, item.attribution_level)}
                          </td>
                          <td className="p-2 text-sm">
                            <Badge variant="outline">{item.platform}</Badge>
                          </td>
                          <td className="p-2 text-sm">
                            {getAttributionBadge(item.attribution_level)}
                          </td>
                          <td className="p-2 text-sm text-right bg-green-50">
                            <span className="font-bold text-green-600">{item.contracts}</span>
                          </td>
                          <td className="p-2 text-sm text-right font-semibold">{item.revenue.toLocaleString()}</td>
                          <td className="p-2 text-sm text-right">{item.avg_contract_value.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 6: Full Campaign Table with Contracts */}
        <TabsContent value="table">
          <Card>
            <CardHeader>
              <CardTitle>All Campaigns - Full Data Table</CardTitle>
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
                        <th className="text-left p-2 text-sm font-medium">Platform</th>
                        <th className="text-right p-2 text-sm font-medium">Spend</th>
                        <th className="text-right p-2 text-sm font-medium">Clicks</th>
                        <th className="text-right p-2 text-sm font-medium">Leads</th>
                        <th className="text-right p-2 text-sm font-medium bg-green-50">Contracts</th>
                        <th className="text-right p-2 text-sm font-medium">Revenue</th>
                        <th className="text-right p-2 text-sm font-medium">CPA</th>
                        <th className="text-right p-2 text-sm font-medium">ROAS</th>
                        <th className="text-right p-2 text-sm font-medium">CVR %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns
                        .sort((a, b) => b.contracts - a.contracts)
                        .map((campaign, i) => (
                          <tr key={i} className="border-b hover:bg-gray-50">
                            <td className="p-2 text-sm max-w-xs truncate">{campaign.campaign_name}</td>
                            <td className="p-2 text-sm">
                              <Badge variant="outline">{campaign.platform}</Badge>
                            </td>
                            <td className="p-2 text-sm text-right">{campaign.total_spend.toLocaleString()}</td>
                            <td className="p-2 text-sm text-right">{campaign.total_clicks.toLocaleString()}</td>
                            <td className="p-2 text-sm text-right">{campaign.leads}</td>
                            <td className="p-2 text-sm text-right bg-green-50">
                              <span className={`font-bold ${campaign.contracts > 0 ? "text-green-600" : "text-gray-400"}`}>
                                {campaign.contracts}
                              </span>
                            </td>
                            <td className="p-2 text-sm text-right font-semibold">
                              {campaign.revenue.toLocaleString()}
                            </td>
                            <td className="p-2 text-sm text-right">
                              {campaign.cpa !== null ? campaign.cpa.toLocaleString() : "-"}
                            </td>
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
      </Tabs>
    </div>
  )
}
