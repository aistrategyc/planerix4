"use client"

/**
 * V9 CONTRACTS PAGE - Enhanced Attribution & Full Funnel
 * Features:
 * - Multi-level attribution (campaign_match → UTM → platform)
 * - Contract-to-campaign linkage
 * - ROAS tracking by campaign
 * - Attribution quality breakdown
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
import {
  DocumentCheckIcon,
  ChartBarSquareIcon,
  TrophyIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline"

// Types
interface Contract {
  contract_source_id: number
  client_id: number
  contract_date: string
  contract_amount: number
  lead_day: string | null
  days_to_contract: number | null
  dominant_platform: string
  unified_platform: string
  unified_campaign_name: string
  attribution_level: string
  campaign_name: string | null
  ad_name: string | null
  utm_source: string | null
  utm_campaign: string | null
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

export default function ContractsV9Page() {
  const [loading, setLoading] = useState(true)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [attributionSummary, setAttributionSummary] = useState<AttributionSummary[]>([])
  const [contractsByCampaign, setContractsByCampaign] = useState<ContractByCampaign[]>([])
  const [campaignPerformance, setCampaignPerformance] = useState<CampaignPerformance[]>([])
  const [selectedAttribution, setSelectedAttribution] = useState<string>("all")
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all")

  useEffect(() => {
    fetchData()
  }, [selectedAttribution, selectedPlatform])

  const fetchData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("access_token")
      if (!token) throw new Error("No access token")

      // Fetch contracts with attribution
      const contractsParams = new URLSearchParams()
      if (selectedAttribution !== "all") {
        contractsParams.append("attribution_level", selectedAttribution)
      }
      const contractsRes = await fetch(
        `/api/data-analytics/v9/contracts/attribution?${contractsParams.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (contractsRes.ok) {
        const data = await contractsRes.json()
        setContracts(data)
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

      // Fetch contracts by campaign
      const campaignParams = new URLSearchParams()
      if (selectedPlatform !== "all") {
        campaignParams.append("platform", selectedPlatform)
      }
      const byCampaignRes = await fetch(
        `/api/data-analytics/v9/contracts/by-campaign?${campaignParams.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (byCampaignRes.ok) {
        const data = await byCampaignRes.json()
        setContractsByCampaign(data)
      }

      // Fetch campaign performance (full funnel)
      const perfRes = await fetch(
        `/api/data-analytics/v9/campaigns/performance${selectedPlatform !== "all" ? `?platform=${selectedPlatform}` : ""}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (perfRes.ok) {
        const data = await perfRes.json()
        setCampaignPerformance(data)
      }

    } catch (error) {
      console.error("Error fetching V9 contracts data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate totals
  const totals = {
    contracts: contracts.length,
    revenue: contracts.reduce((sum, c) => sum + c.contract_amount, 0),
    avgContract: contracts.length > 0
      ? contracts.reduce((sum, c) => sum + c.contract_amount, 0) / contracts.length
      : 0,
    avgDays: contracts.filter(c => c.days_to_contract !== null).length > 0
      ? contracts.filter(c => c.days_to_contract !== null).reduce((sum, c) => sum + (c.days_to_contract || 0), 0) / contracts.filter(c => c.days_to_contract !== null).length
      : 0,
  }

  // Attribution quality badge color
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Contracts Analytics V9</h1>
          <p className="text-muted-foreground">Multi-level attribution with full funnel tracking</p>
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
          <Select value={selectedAttribution} onValueChange={setSelectedAttribution}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Attribution Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="campaign_match">Campaign Match</SelectItem>
              <SelectItem value="utm_attribution">UTM Attribution</SelectItem>
              <SelectItem value="platform_inferred">Platform Inferred</SelectItem>
              <SelectItem value="unattributed">Unattributed</SelectItem>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Contracts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.contracts}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.revenue.toLocaleString()} UAH</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Contract Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.avgContract.toLocaleString()} UAH</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Days to Close</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.avgDays.toFixed(1)} days</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="attribution" className="space-y-4">
        <TabsList>
          <TabsTrigger value="attribution">
            <FunnelIcon className="w-4 h-4 mr-2" />
            Attribution Breakdown
          </TabsTrigger>
          <TabsTrigger value="campaigns">
            <ChartBarSquareIcon className="w-4 h-4 mr-2" />
            By Campaign
          </TabsTrigger>
          <TabsTrigger value="funnel">
            <TrophyIcon className="w-4 h-4 mr-2" />
            Full Funnel (ROAS)
          </TabsTrigger>
          <TabsTrigger value="list">
            <DocumentCheckIcon className="w-4 h-4 mr-2" />
            Contracts List
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Attribution Breakdown */}
        <TabsContent value="attribution">
          <Card>
            <CardHeader>
              <CardTitle>Attribution Quality Breakdown</CardTitle>
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
                            {item.contracts} contracts ({item.percent_of_total.toFixed(2)}%)
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">{item.revenue.toLocaleString()} UAH</p>
                          <p className="text-sm text-muted-foreground">
                            {item.percent_of_revenue.toFixed(2)}% of revenue
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Avg Contract Value</p>
                          <p className="font-semibold">{item.avg_contract_value.toLocaleString()} UAH</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Avg Days to Close</p>
                          <p className="font-semibold">{item.avg_days_to_close.toFixed(1)} days</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: By Campaign */}
        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle>Contracts by Campaign ({contractsByCampaign.length})</CardTitle>
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
                        <th className="text-right p-2 text-sm font-medium">Contracts</th>
                        <th className="text-right p-2 text-sm font-medium">Revenue</th>
                        <th className="text-right p-2 text-sm font-medium">Avg Value</th>
                        <th className="text-right p-2 text-sm font-medium">Avg Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contractsByCampaign.map((item, i) => (
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
                          <td className="p-2 text-sm text-right font-semibold">{item.contracts}</td>
                          <td className="p-2 text-sm text-right font-semibold">{item.revenue.toLocaleString()}</td>
                          <td className="p-2 text-sm text-right">{item.avg_contract_value.toLocaleString()}</td>
                          <td className="p-2 text-sm text-right">
                            {item.avg_days_to_close !== null ? item.avg_days_to_close.toFixed(1) : "-"}
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

        {/* Tab 3: Full Funnel with ROAS */}
        <TabsContent value="funnel">
          <Card>
            <CardHeader>
              <CardTitle>Full Funnel: Spend → Clicks → Leads → Contracts → Revenue → ROAS</CardTitle>
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
                        <th className="text-right p-2 text-sm font-medium">Contracts</th>
                        <th className="text-right p-2 text-sm font-medium">Revenue</th>
                        <th className="text-right p-2 text-sm font-medium">ROAS</th>
                        <th className="text-right p-2 text-sm font-medium">CPA</th>
                        <th className="text-right p-2 text-sm font-medium">CVR %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaignPerformance.filter(c => c.contracts > 0).map((campaign, i) => (
                        <tr key={i} className="border-b hover:bg-gray-50">
                          <td className="p-2 text-sm">{campaign.campaign_name}</td>
                          <td className="p-2 text-sm">
                            <Badge variant="outline">{campaign.platform}</Badge>
                          </td>
                          <td className="p-2 text-sm text-right">{campaign.total_spend.toLocaleString()}</td>
                          <td className="p-2 text-sm text-right">{campaign.total_clicks.toLocaleString()}</td>
                          <td className="p-2 text-sm text-right">{campaign.leads}</td>
                          <td className="p-2 text-sm text-right font-semibold">{campaign.contracts}</td>
                          <td className="p-2 text-sm text-right font-semibold text-green-600">
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
                            {campaign.cpa !== null ? campaign.cpa.toLocaleString() : "-"}
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

        {/* Tab 4: Contracts List */}
        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Recent Contracts ({contracts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[400px]" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 text-sm font-medium">Date</th>
                        <th className="text-right p-2 text-sm font-medium">Amount</th>
                        <th className="text-left p-2 text-sm font-medium">Platform</th>
                        <th className="text-left p-2 text-sm font-medium">Campaign</th>
                        <th className="text-left p-2 text-sm font-medium">Attribution</th>
                        <th className="text-right p-2 text-sm font-medium">Days to Close</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contracts.slice(0, 100).map((contract, i) => (
                        <tr key={i} className="border-b hover:bg-gray-50">
                          <td className="p-2 text-sm">{new Date(contract.contract_date).toLocaleDateString()}</td>
                          <td className="p-2 text-sm text-right font-semibold">
                            {contract.contract_amount.toLocaleString()} UAH
                          </td>
                          <td className="p-2 text-sm">
                            <Badge variant="outline">{contract.unified_platform}</Badge>
                          </td>
                          <td className="p-2 text-sm">
                            {getReadableCampaignName(contract.unified_campaign_name, contract.unified_platform, contract.attribution_level)}
                          </td>
                          <td className="p-2 text-sm">
                            {getAttributionBadge(contract.attribution_level)}
                          </td>
                          <td className="p-2 text-sm text-right">
                            {contract.days_to_contract !== null ? contract.days_to_contract + " days" : "-"}
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
