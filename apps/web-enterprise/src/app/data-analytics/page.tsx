"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis, BarChart, Bar } from "recharts"
import { TrendingUp, DollarSign, Users, FileText, Target, RefreshCcw, AlertCircle, AlertTriangle, ArrowUpRight, ArrowDownRight } from "lucide-react"
import * as dataAnalyticsApi from "@/lib/api/data-analytics"
import ProtectedRoute from "@/components/auth/ProtectedRoute"

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]

function DataAnalyticsPageContent() {
  // Filters - Oct 19, 2025 - Updated start date to match RAW data availability
  const [dateFrom, setDateFrom] = useState("2025-09-10")
  const [dateTo, setDateTo] = useState("2025-10-19")
  const [selectedPlatform, setSelectedPlatform] = useState<string>("")

  // Data states (11 working endpoints)
  const [kpi, setKpi] = useState<any>(null)
  const [leadsTrend, setLeadsTrend] = useState<any[]>([])
  const [spendTrend, setSpendTrend] = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [platformShare, setPlatformShare] = useState<any[]>([])
  const [utmSources, setUtmSources] = useState<any[]>([])
  const [wowCampaigns, setWowCampaigns] = useState<any[]>([])
  const [budgetReco, setBudgetReco] = useState<any[]>([])
  // NEW: Oct 6, 2025
  const [scatterMatrix, setScatterMatrix] = useState<any[]>([])
  const [anomalies, setAnomalies] = useState<any[]>([])
  const [paidSplit, setPaidSplit] = useState<any[]>([])
  // NEW: Oct 7, 2025 - Campaign Insights
  const [campaignInsights, setCampaignInsights] = useState<any[]>([])
  const [metricsTrend, setMetricsTrend] = useState<any[]>([])
  // NEW: Oct 14, 2025 - Contracts Attribution
  const [contractsDetail, setContractsDetail] = useState<any[]>([])
  const [contractsByCreative, setContractsByCreative] = useState<any[]>([])
  const [contractsByCampaign, setContractsByCampaign] = useState<any[]>([])
  const [contractsTimeline, setContractsTimeline] = useState<any[]>([])
  const [attributionCoverage, setAttributionCoverage] = useState<any>(null)
  // NEW: Oct 14, 2025 - Funnel Analysis
  const [funnelData, setFunnelData] = useState<any[]>([])
  const [funnelAggregate, setFunnelAggregate] = useState<any[]>([])
  // NEW: Oct 14, 2025 - Organic vs Paid & Products
  const [organicVsPaid, setOrganicVsPaid] = useState<any[]>([])
  const [productsPerformance, setProductsPerformance] = useState<any[]>([])
  // NEW: Oct 23, 2025 - V9 Enhanced Analytics with SK_LEAD
  const [v9PlatformComparison, setV9PlatformComparison] = useState<dataAnalyticsApi.V9PlatformComparison[]>([])
  const [v9MonthlyCohorts, setV9MonthlyCohorts] = useState<dataAnalyticsApi.V9MonthlyCohort[]>([])
  const [v9AttributionQuality, setV9AttributionQuality] = useState<dataAnalyticsApi.V9AttributionQuality[]>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const filters: dataAnalyticsApi.DataAnalyticsFilters = {
        date_from: dateFrom,
        date_to: dateTo,
        platforms: selectedPlatform || undefined,
        limit: 50,
      }

      // Use Promise.allSettled for independent failures (25 endpoints total)
      const results = await Promise.allSettled([
        dataAnalyticsApi.getKPICards(filters),
        dataAnalyticsApi.getLeadsTrend(filters),
        dataAnalyticsApi.getSpendTrend(filters),
        dataAnalyticsApi.getCampaigns(filters),
        dataAnalyticsApi.getPlatformShare(dateFrom, dateTo),
        dataAnalyticsApi.getUTMSources(filters),
        dataAnalyticsApi.getWoWCampaigns(filters),
        dataAnalyticsApi.getBudgetRecommendationsLegacy(dateFrom, dateTo, 10),
        // NEW: Oct 6, 2025
        dataAnalyticsApi.getScatterMatrix(filters),
        dataAnalyticsApi.getAnomalies(filters),
        dataAnalyticsApi.getPaidSplitPlatforms(dateFrom, dateTo),
        // NEW: Oct 7, 2025
        dataAnalyticsApi.getCampaignInsights(dateFrom, dateTo, 5),
        dataAnalyticsApi.getMetricsTrend(dateFrom, dateTo),
        // NEW: Oct 14, 2025 - Contracts Attribution
        dataAnalyticsApi.getContractsDetail(dateFrom, dateTo, undefined, 50),
        dataAnalyticsApi.getContractsByCreative(dateFrom, dateTo, 20),
        dataAnalyticsApi.getContractsByCampaign(dateFrom, dateTo, undefined, 20),
        dataAnalyticsApi.getContractsTimeline(dateFrom, dateTo),
        dataAnalyticsApi.getAttributionCoverage(dateFrom, dateTo),
        // NEW: Oct 14, 2025 - Funnel Analysis
        dataAnalyticsApi.getFunnelAnalysis(dateFrom, dateTo, selectedPlatform || undefined),
        dataAnalyticsApi.getFunnelAggregate(dateFrom, dateTo),
        // NEW: Oct 14, 2025 - Organic vs Paid & Products
        dataAnalyticsApi.getOrganicVsPaid(dateFrom, dateTo),
        dataAnalyticsApi.getProductsPerformance(dateFrom, dateTo, 20),
        // NEW: Oct 23, 2025 - V9 Enhanced Analytics (1000% Verified)
        dataAnalyticsApi.getV9PlatformComparison(dateFrom, dateTo),
        dataAnalyticsApi.getV9MonthlyCohorts(selectedPlatform || undefined),
        dataAnalyticsApi.getV9AttributionQuality(selectedPlatform || undefined),
      ])

      // Set data for successful requests
      if (results[0].status === "fulfilled") setKpi(results[0].value)
      if (results[1].status === "fulfilled") setLeadsTrend(results[1].value)
      if (results[2].status === "fulfilled") setSpendTrend(results[2].value)
      if (results[3].status === "fulfilled") setCampaigns(results[3].value)
      if (results[4].status === "fulfilled") setPlatformShare(results[4].value)
      if (results[5].status === "fulfilled") setUtmSources(results[5].value)
      if (results[6].status === "fulfilled") setWowCampaigns(results[6].value)
      if (results[7].status === "fulfilled") setBudgetReco(results[7].value)
      // NEW: Oct 6
      if (results[8].status === "fulfilled") setScatterMatrix(results[8].value)
      if (results[9].status === "fulfilled") setAnomalies(results[9].value)
      if (results[10].status === "fulfilled") setPaidSplit(results[10].value)
      // NEW: Oct 7
      if (results[11].status === "fulfilled") setCampaignInsights(results[11].value)
      if (results[12].status === "fulfilled") setMetricsTrend(results[12].value)
      // NEW: Oct 14 - Contracts Attribution
      if (results[13].status === "fulfilled") setContractsDetail(results[13].value)
      if (results[14].status === "fulfilled") setContractsByCreative(results[14].value)
      if (results[15].status === "fulfilled") setContractsByCampaign(results[15].value)
      if (results[16].status === "fulfilled") setContractsTimeline(results[16].value)
      if (results[17].status === "fulfilled") setAttributionCoverage(results[17].value)
      // NEW: Oct 14 - Funnel Analysis
      if (results[18].status === "fulfilled") setFunnelData(results[18].value)
      if (results[19].status === "fulfilled") setFunnelAggregate(results[19].value)
      // NEW: Oct 14 - Organic vs Paid & Products
      if (results[20].status === "fulfilled") setOrganicVsPaid(results[20].value)
      if (results[21].status === "fulfilled") setProductsPerformance(results[21].value)
      // NEW: Oct 23 - V9 Enhanced Analytics
      if (results[22].status === "fulfilled") setV9PlatformComparison(results[22].value)
      if (results[23].status === "fulfilled") setV9MonthlyCohorts(results[23].value)
      if (results[24].status === "fulfilled") setV9AttributionQuality(results[24].value)

      // Log failures
      const failed = results.filter((r) => r.status === "rejected")
      if (failed.length > 0) {
        console.warn("Some widgets failed:", failed)
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (error) {
    return (
      <div className="p-8">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-6 flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <div>
              <p className="text-red-600 font-medium">Error loading data</p>
              <p className="text-red-500 text-sm mt-1">{error}</p>
            </div>
            <Button onClick={fetchData} className="ml-auto">Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Data Analytics v5</h1>
          <p className="text-gray-500 mt-1">ITstep Marketing Analytics — Verified Endpoints</p>
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
              <label className="text-sm font-medium mb-2 block">Date From</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Date To</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Platform</label>
              <div className="flex gap-2">
                {["all", "google", "meta"].map((platform) => (
                  <Button
                    key={platform}
                    size="sm"
                    variant={selectedPlatform === (platform === "all" ? "" : platform) ? "default" : "outline"}
                    onClick={() => setSelectedPlatform(platform === "all" ? "" : platform)}
                  >
                    {platform}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex items-end">
              <Button onClick={fetchData} disabled={loading} className="w-full">
                {loading ? "Loading..." : "Apply"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards (✅ v5/kpi) */}
      {kpi && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.leads.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Contracts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.n_contracts.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₴{(kpi.revenue / 1000).toFixed(1)}k</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Spend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₴{(kpi.spend / 1000).toFixed(1)}k</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <Target className="h-4 w-4" />
                CPL
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpi.cpl ? `₴${kpi.cpl.toFixed(0)}` : "N/A"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                ROAS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpi.roas ? kpi.roas.toFixed(2) : "N/A"}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trends (✅ v5/trend/leads & v5/trend/spend) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Leads Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {leadsTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={leadsTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dt" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2} name="Leads" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spend Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {spendTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={spendTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dt" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="spend" stroke="#10b981" strokeWidth={2} name="Spend" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Platform Share (✅ v5/share/platforms) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Platform Share</CardTitle>
          </CardHeader>
          <CardContent>
            {platformShare.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={platformShare}
                    dataKey="leads"
                    nameKey="platform"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry.platform}: ${entry.share_pct.toFixed(1)}%`}
                  >
                    {platformShare.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform Details</CardTitle>
          </CardHeader>
          <CardContent>
            {platformShare.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Platform</th>
                    <th className="text-right p-2">Leads</th>
                    <th className="text-right p-2">Share %</th>
                  </tr>
                </thead>
                <tbody>
                  {platformShare.map((share, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2 font-medium capitalize">{share.platform}</td>
                      <td className="text-right p-2">{share.leads.toLocaleString()}</td>
                      <td className="text-right p-2 font-medium">{share.share_pct.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-8 text-center text-gray-400">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Budget Recommendations (✅ v6/reco/budget) */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          {budgetReco.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Action</th>
                    <th className="text-left p-2">Platform</th>
                    <th className="text-left p-2">Campaign</th>
                    <th className="text-right p-2">Leads</th>
                    <th className="text-right p-2">Spend</th>
                    <th className="text-right p-2">CPL</th>
                    <th className="text-right p-2">ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {budgetReco.map((reco: any, idx: number) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          reco.action === "scale" ? "bg-green-100 text-green-700" :
                          reco.action === "pause" ? "bg-red-100 text-red-700" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>
                          {reco.action.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-2 capitalize">{reco.platform}</td>
                      <td className="p-2 max-w-xs truncate">{reco.campaign_name}</td>
                      <td className="text-right p-2">{reco.leads_cur}</td>
                      <td className="text-right p-2">₴{reco.spend_cur.toFixed(0)}</td>
                      <td className="text-right p-2">{reco.cpl_cur ? `₴${reco.cpl_cur.toFixed(0)}` : "—"}</td>
                      <td className="text-right p-2">{reco.roas_cur ? reco.roas_cur.toFixed(2) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-400">
              No recommendations available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Campaigns Table (✅ v5/campaigns) */}
      <Card>
        <CardHeader>
          <CardTitle>Top Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {campaigns.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Platform</th>
                    <th className="text-left p-2">Campaign</th>
                    <th className="text-right p-2">Leads</th>
                    <th className="text-right p-2">Contracts</th>
                    <th className="text-right p-2">Revenue</th>
                    <th className="text-right p-2">Spend</th>
                    <th className="text-right p-2">CPL</th>
                    <th className="text-right p-2">ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.slice(0, 20).map((campaign, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="p-2 capitalize">{campaign.platform}</td>
                      <td className="p-2 max-w-xs truncate">{campaign.campaign_name}</td>
                      <td className="text-right p-2 font-medium">{campaign.leads}</td>
                      <td className="text-right p-2">{campaign.n_contracts}</td>
                      <td className="text-right p-2">₴{(campaign.revenue / 1000).toFixed(1)}k</td>
                      <td className="text-right p-2">₴{campaign.spend.toFixed(0)}</td>
                      <td className="text-right p-2">{campaign.cpl ? `₴${campaign.cpl.toFixed(0)}` : "—"}</td>
                      <td className="text-right p-2">{campaign.roas ? campaign.roas.toFixed(2) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-400">
              No campaigns data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* WoW Campaigns (✅ v5/campaigns/wow) */}
      <Card>
        <CardHeader>
          <CardTitle>Week-over-Week Campaign Changes</CardTitle>
        </CardHeader>
        <CardContent>
          {wowCampaigns.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Platform</th>
                    <th className="text-left p-2">Campaign</th>
                    <th className="text-right p-2">Leads Cur</th>
                    <th className="text-right p-2">Leads Prev</th>
                    <th className="text-right p-2">Δ %</th>
                    <th className="text-right p-2">CPL Cur</th>
                    <th className="text-right p-2">CPL Prev</th>
                  </tr>
                </thead>
                <tbody>
                  {wowCampaigns.slice(0, 10).map((campaign, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="p-2 capitalize">{campaign.platform}</td>
                      <td className="p-2 max-w-xs truncate">{campaign.campaign_name}</td>
                      <td className="text-right p-2 font-medium">{campaign.leads_cur}</td>
                      <td className="text-right p-2 text-gray-500">{campaign.leads_prev}</td>
                      <td className={`text-right p-2 ${(campaign.leads_diff_pct || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {campaign.leads_diff_pct ? `${campaign.leads_diff_pct.toFixed(1)}%` : "—"}
                      </td>
                      <td className="text-right p-2">{campaign.cpl_cur ? `₴${campaign.cpl_cur.toFixed(0)}` : "—"}</td>
                      <td className="text-right p-2 text-gray-500">{campaign.cpl_prev ? `₴${campaign.cpl_prev.toFixed(0)}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-400">
              No WoW data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* UTM Sources (✅ v5/utm-sources) */}
      <Card>
        <CardHeader>
          <CardTitle>UTM Sources</CardTitle>
        </CardHeader>
        <CardContent>
          {utmSources.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Platform</th>
                    <th className="text-left p-2">UTM Source</th>
                    <th className="text-right p-2">Leads</th>
                    <th className="text-right p-2">Contracts</th>
                    <th className="text-right p-2">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {utmSources.map((utm, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="p-2 capitalize">{utm.platform}</td>
                      <td className="p-2">{utm.utm_source}</td>
                      <td className="text-right p-2">{utm.leads}</td>
                      <td className="text-right p-2">{utm.n_contracts}</td>
                      <td className="text-right p-2">₴{(utm.revenue / 1000).toFixed(1)}k</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-400">
              No UTM sources data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* 🆕 Scatter Matrix (✅ v5/campaigns/scatter-matrix) */}
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Campaign Performance Matrix (CPL vs ROAS)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {scatterMatrix.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="cpl"
                  name="CPL"
                  label={{ value: "Cost Per Lead (₴)", position: "bottom" }}
                  domain={["auto", "auto"]}
                />
                <YAxis
                  type="number"
                  dataKey="roas"
                  name="ROAS"
                  label={{ value: "Return on Ad Spend", angle: -90, position: "left" }}
                  domain={["auto", "auto"]}
                />
                <ZAxis type="number" dataKey="spend" range={[50, 400]} name="Spend" />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-white p-3 border rounded shadow-lg">
                          <p className="font-semibold">{data.campaign_name}</p>
                          <p className="text-sm">Platform: {data.platform}</p>
                          <p className="text-sm">CPL: ₴{data.cpl?.toFixed(2) || "N/A"}</p>
                          <p className="text-sm">ROAS: {data.roas?.toFixed(2) || "N/A"}</p>
                          <p className="text-sm">Spend: ₴{(data.spend / 1000).toFixed(1)}k</p>
                          <p className="text-sm">Leads: {data.leads}</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend />
                <Scatter
                  name="Google"
                  data={scatterMatrix.filter((d: any) => d.platform === "google")}
                  fill="#4285f4"
                />
                <Scatter
                  name="Meta"
                  data={scatterMatrix.filter((d: any) => d.platform === "meta")}
                  fill="#1877f2"
                />
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <div className="py-8 text-center text-gray-400">
              No scatter matrix data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* 🆕 Anomalies (✅ v5/campaigns/anomalies) */}
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Campaign Anomalies
          </CardTitle>
        </CardHeader>
        <CardContent>
          {anomalies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {anomalies.slice(0, 6).map((anomaly: any, idx: number) => {
                const severityColors = {
                  high: "border-red-500 bg-red-50",
                  medium: "border-orange-500 bg-orange-50",
                  low: "border-yellow-500 bg-yellow-50",
                }
                const typeIcons = {
                  spike_cpl: <ArrowUpRight className="h-4 w-4 text-red-500" />,
                  drop_leads: <ArrowDownRight className="h-4 w-4 text-red-500" />,
                  spike_spend: <ArrowUpRight className="h-4 w-4 text-orange-500" />,
                }
                return (
                  <div
                    key={idx}
                    className={`border-2 rounded-lg p-4 ${severityColors[anomaly.severity as keyof typeof severityColors] || "border-gray-300"}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {typeIcons[anomaly.anomaly_type as keyof typeof typeIcons]}
                        <span className="text-xs font-semibold uppercase text-gray-600">
                          {anomaly.anomaly_type.replace("_", " ")}
                        </span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded font-semibold ${
                        anomaly.severity === "high" ? "bg-red-200 text-red-800" :
                        anomaly.severity === "medium" ? "bg-orange-200 text-orange-800" :
                        "bg-yellow-200 text-yellow-800"
                      }`}>
                        {anomaly.severity}
                      </span>
                    </div>
                    <p className="font-semibold text-sm mb-1 truncate" title={anomaly.campaign_name}>
                      {anomaly.campaign_name}
                    </p>
                    <p className="text-xs text-gray-600 mb-2">{anomaly.platform}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-gray-500">Current CPL</p>
                        <p className="font-semibold">₴{anomaly.current_cpl?.toFixed(2) || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Baseline CPL</p>
                        <p className="font-semibold">₴{anomaly.baseline_cpl?.toFixed(2) || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Leads</p>
                        <p className="font-semibold">{anomaly.leads}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Spend</p>
                        <p className="font-semibold">₴{(anomaly.spend / 1000).toFixed(1)}k</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-400">
              No anomalies detected
            </div>
          )}
        </CardContent>
      </Card>

      {/* Campaign Insights - Performance Categories (NEW: Oct 7, 2025) */}
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Campaign Performance Insights
          </CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            Active campaigns with contracts and performance metrics
          </p>
        </CardHeader>
        <CardContent>
          {campaignInsights && campaignInsights.length > 0 ? (
            <div className="space-y-4">
              {/* Performance Categories Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {["high_performer", "medium_performer", "volume_driver", "needs_attention"].map((category) => {
                  const campaigns = campaignInsights.filter((c: any) => c.performance_category === category)
                  const totalLeads = campaigns.reduce((sum: number, c: any) => sum + c.leads, 0)
                  const totalContracts = campaigns.reduce((sum: number, c: any) => sum + c.contracts, 0)
                  const totalRevenue = campaigns.reduce((sum: number, c: any) => sum + c.revenue, 0)

                  const categoryConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
                    high_performer: { label: "High Performers", color: "text-green-700", bg: "bg-green-50", border: "border-green-300" },
                    medium_performer: { label: "Medium Performers", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-300" },
                    volume_driver: { label: "Volume Drivers", color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-300" },
                    needs_attention: { label: "Needs Attention", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-300" },
                  }

                  const config = categoryConfig[category]

                  return (
                    <div key={category} className={`p-4 rounded-lg border-2 ${config.bg} ${config.border}`}>
                      <div className={`text-xs font-semibold uppercase tracking-wide mb-2 ${config.color}`}>
                        {config.label}
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">Campaigns:</span>
                          <span className="font-bold text-sm">{campaigns.length}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">Leads:</span>
                          <span className="font-semibold text-sm">{totalLeads}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">Contracts:</span>
                          <span className="font-semibold text-sm text-green-600">{totalContracts}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">Revenue:</span>
                          <span className="font-semibold text-sm text-blue-600">₴{(totalRevenue / 1000).toFixed(0)}k</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Detailed Campaign Cards (Top 12) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                {campaignInsights.slice(0, 12).map((campaign: any, idx: number) => {
                  const categoryColors: Record<string, string> = {
                    high_performer: "border-l-green-500 bg-green-50/50",
                    medium_performer: "border-l-blue-500 bg-blue-50/50",
                    volume_driver: "border-l-purple-500 bg-purple-50/50",
                    needs_attention: "border-l-orange-500 bg-orange-50/50",
                  }

                  return (
                    <div key={idx} className={`border-l-4 rounded-lg p-4 ${categoryColors[campaign.performance_category] || "border-l-gray-400"}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                            {campaign.platform}
                          </div>
                          <div className="text-sm font-bold text-gray-900 truncate" title={campaign.campaign_name}>
                            {campaign.campaign_name}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                        <div>
                          <div className="text-gray-500">Leads</div>
                          <div className="font-bold text-lg">{campaign.leads}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Contracts</div>
                          <div className="font-bold text-lg text-green-600">{campaign.contracts}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Revenue</div>
                          <div className="font-semibold text-blue-600">₴{(campaign.revenue / 1000).toFixed(0)}k</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Conv. Rate</div>
                          <div className="font-semibold">{campaign.conversion_rate.toFixed(1)}%</div>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t">
                        <div className="text-xs text-gray-500">Avg Contract</div>
                        <div className="font-semibold text-sm">₴{(campaign.avg_contract_value / 1000).toFixed(1)}k</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-400">
              No campaign insights available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metrics Trend - CPL, CPC, CTR, CPM (NEW: Oct 7, 2025) */}
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Daily Metrics Trend
          </CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            CPL, CPC, CTR, CPM daily evolution
          </p>
        </CardHeader>
        <CardContent>
          {metricsTrend && metricsTrend.length > 0 ? (
            <div className="space-y-6">
              {/* CPL & CPC Trend */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Cost Per Lead & Cost Per Click</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={metricsTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dt" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="cpl" name="CPL (₴)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                    <Line yAxisId="right" type="monotone" dataKey="cpc" name="CPC (₴)" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* CTR & CPM Trend */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Click-Through Rate & Cost Per Mille</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={metricsTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dt" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="ctr" name="CTR (%)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                    <Line yAxisId="right" type="monotone" dataKey="cpm" name="CPM (₴)" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Metrics Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-2">Date</th>
                      <th className="text-right p-2">Leads</th>
                      <th className="text-right p-2">Clicks</th>
                      <th className="text-right p-2">Impressions</th>
                      <th className="text-right p-2">Spend</th>
                      <th className="text-right p-2">CPL</th>
                      <th className="text-right p-2">CPC</th>
                      <th className="text-right p-2">CTR</th>
                      <th className="text-right p-2">CPM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metricsTrend.map((row: any, idx: number) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{row.dt}</td>
                        <td className="text-right p-2">{row.leads}</td>
                        <td className="text-right p-2">{row.clicks.toLocaleString()}</td>
                        <td className="text-right p-2">{row.impressions.toLocaleString()}</td>
                        <td className="text-right p-2">₴{row.spend.toFixed(0)}</td>
                        <td className="text-right p-2 font-semibold text-blue-600">
                          {row.cpl ? `₴${row.cpl.toFixed(0)}` : "—"}
                        </td>
                        <td className="text-right p-2 font-semibold text-green-600">
                          {row.cpc ? `₴${row.cpc.toFixed(2)}` : "—"}
                        </td>
                        <td className="text-right p-2 font-semibold text-orange-600">
                          {row.ctr ? `${row.ctr.toFixed(2)}%` : "—"}
                        </td>
                        <td className="text-right p-2 font-semibold text-red-600">
                          {row.cpm ? `₴${row.cpm.toFixed(2)}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-400">
              No metrics trend data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* 🆕 Paid vs Organic Split (✅ v6/leads/paid-split/platforms) */}
      <Card className="col-span-full lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Paid vs Organic Traffic Split
          </CardTitle>
        </CardHeader>
        <CardContent>
          {paidSplit.length > 0 ? (
            <div className="space-y-6">
              {/* Bar Chart */}
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={paidSplit}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="platform" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="paid_leads" name="Paid Leads" fill="#3b82f6" stackId="a" />
                  <Bar dataKey="organic_leads" name="Organic Leads" fill="#10b981" stackId="a" />
                </BarChart>
              </ResponsiveContainer>

              {/* Details Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Platform</th>
                      <th className="text-right p-2">Paid</th>
                      <th className="text-right p-2">Organic</th>
                      <th className="text-right p-2">Total</th>
                      <th className="text-right p-2">Paid %</th>
                      <th className="text-right p-2">Organic %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paidSplit.map((split: any, idx: number) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="p-2 capitalize font-semibold">{split.platform}</td>
                        <td className="text-right p-2 text-blue-600 font-semibold">{split.paid_leads}</td>
                        <td className="text-right p-2 text-green-600 font-semibold">{split.organic_leads}</td>
                        <td className="text-right p-2 font-semibold">{split.total_leads}</td>
                        <td className="text-right p-2">{split.paid_pct.toFixed(1)}%</td>
                        <td className="text-right p-2">{split.organic_pct.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-400">
              No paid/organic split data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* 🆕 ORGANIC VS PAID TRAFFIC (NEW: Oct 14, 2025) */}
      {organicVsPaid.length > 0 && (
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              Organic vs Paid Traffic with Contracts
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Traffic source analysis: paid advertising vs organic channels with contract conversion
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-2">Traffic Type</th>
                    <th className="text-left p-2">Platform</th>
                    <th className="text-right p-2">Leads</th>
                    <th className="text-right p-2">Contracts</th>
                    <th className="text-right p-2">Revenue</th>
                    <th className="text-right p-2">CVR %</th>
                  </tr>
                </thead>
                <tbody>
                  {organicVsPaid.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          item.traffic_type === 'Paid' ? 'bg-blue-100 text-blue-700' :
                          item.traffic_type === 'Organic' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {item.traffic_type}
                        </span>
                      </td>
                      <td className="p-2 capitalize font-medium">{item.platform}</td>
                      <td className="text-right p-2">{item.leads.toLocaleString()}</td>
                      <td className="text-right p-2 font-bold text-green-600">{item.contracts}</td>
                      <td className="text-right p-2">₴{(item.revenue / 1000).toFixed(0)}k</td>
                      <td className="text-right p-2 font-semibold text-purple-600">{item.cvr.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {['Paid', 'Organic', 'Unknown'].map((type) => {
                const typeData = organicVsPaid.filter((i: any) => i.traffic_type === type)
                const totalLeads = typeData.reduce((sum: number, i: any) => sum + i.leads, 0)
                const totalContracts = typeData.reduce((sum: number, i: any) => sum + i.contracts, 0)
                const totalRevenue = typeData.reduce((sum: number, i: any) => sum + i.revenue, 0)
                const avgCvr = totalLeads > 0 ? (totalContracts / totalLeads) * 100 : 0

                return (
                  <div key={type} className={`border-2 rounded-lg p-4 ${
                    type === 'Paid' ? 'bg-blue-50 border-blue-300' :
                    type === 'Organic' ? 'bg-green-50 border-green-300' :
                    'bg-gray-50 border-gray-300'
                  }`}>
                    <div className="text-sm font-semibold mb-2 uppercase">{type}</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Leads:</span>
                        <span className="font-bold">{totalLeads.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Contracts:</span>
                        <span className="font-bold text-green-600">{totalContracts}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Revenue:</span>
                        <span className="font-bold text-blue-600">₴{(totalRevenue / 1000).toFixed(0)}k</span>
                      </div>
                      <div className="flex justify-between">
                        <span>CVR:</span>
                        <span className="font-bold text-purple-600">{avgCvr.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 🆕 PRODUCTS PERFORMANCE (NEW: Oct 14, 2025) */}
      {productsPerformance.length > 0 && (
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-600" />
              Products Performance
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Revenue and contract statistics by product/service
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-2">Product / Service Name</th>
                    <th className="text-right p-2">Contracts</th>
                    <th className="text-right p-2">Total Revenue</th>
                    <th className="text-right p-2">Avg Contract Value</th>
                  </tr>
                </thead>
                <tbody>
                  {productsPerformance.map((product: any, idx: number) => (
                    <tr key={idx} className="border-b hover:bg-orange-50/30">
                      <td className="p-2 font-medium max-w-md truncate" title={product.product_name}>
                        {product.product_name}
                      </td>
                      <td className="text-right p-2 font-bold text-green-600">{product.contracts}</td>
                      <td className="text-right p-2 font-bold text-blue-600">
                        ₴{(product.revenue / 1000).toFixed(0)}k
                      </td>
                      <td className="text-right p-2">
                        ₴{(product.avg_value / 1000).toFixed(1)}k
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Top 5 Products Summary */}
            <div className="mt-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="text-sm font-semibold mb-2">Top 5 Products Summary</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-gray-600">Total Contracts (Top 5)</div>
                  <div className="text-2xl font-bold text-green-600">
                    {productsPerformance.slice(0, 5).reduce((sum, p) => sum + p.contracts, 0)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Total Revenue (Top 5)</div>
                  <div className="text-2xl font-bold text-blue-600">
                    ₴{(productsPerformance.slice(0, 5).reduce((sum, p) => sum + p.revenue, 0) / 1000).toFixed(0)}k
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Avg Contract Value</div>
                  <div className="text-2xl font-bold text-orange-600">
                    ₴{(productsPerformance.slice(0, 5).reduce((sum, p) => sum + p.revenue, 0) /
                       productsPerformance.slice(0, 5).reduce((sum, p) => sum + p.contracts, 0) / 1000).toFixed(1)}k
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 🆕 FUNNEL ANALYSIS DASHBOARD (NEW: Oct 14, 2025) */}
      {(funnelAggregate.length > 0 || funnelData.length > 0) && (
        <>
          <div className="col-span-full pt-8 border-t-4 border-purple-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Marketing Funnel Analysis</h2>
            <p className="text-gray-600">Track the full conversion journey: Impressions → Clicks → Leads → Contracts</p>
          </div>

          {/* Funnel Aggregate by Platform */}
          {funnelAggregate.length > 0 && (
            <Card className="col-span-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  Funnel Performance by Platform
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Conversion rates at each stage of the marketing funnel
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Platform Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {funnelAggregate.map((platform: any, idx: number) => (
                      <div key={idx} className={`border-2 rounded-lg p-6 ${
                        platform.platform === "meta" ? "bg-blue-50 border-blue-300" :
                        platform.platform === "google" ? "bg-orange-50 border-orange-300" :
                        "bg-gray-50 border-gray-300"
                      }`}>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-bold capitalize">{platform.platform}</h3>
                          <div className="text-2xl font-bold text-green-600">{platform.contracts}</div>
                        </div>

                        {/* Funnel Stages */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Impressions</span>
                            <span className="font-semibold">{platform.impressions.toLocaleString()}</span>
                          </div>
                          <div className="border-t pt-2">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm text-gray-600">Clicks</span>
                              <span className="font-semibold">{platform.clicks.toLocaleString()}</span>
                            </div>
                            <div className="text-xs text-blue-600 text-right">
                              CTR: {platform.ctr.toFixed(2)}%
                            </div>
                          </div>
                          <div className="border-t pt-2">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm text-gray-600">Leads</span>
                              <span className="font-semibold">{platform.leads}</span>
                            </div>
                            <div className="text-xs text-green-600 text-right">
                              CVR: {platform.cvr.toFixed(2)}%
                            </div>
                          </div>
                          <div className="border-t pt-2">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm text-gray-600">Contracts</span>
                              <span className="font-bold text-lg text-green-700">{platform.contracts}</span>
                            </div>
                            <div className="text-xs text-purple-600 text-right">
                              Contract Rate: {platform.contract_rate.toFixed(2)}%
                            </div>
                          </div>
                        </div>

                        {/* Overall Conversion */}
                        <div className="mt-4 pt-4 border-t-2 border-dashed">
                          <div className="flex justify-between items-center">
                            <span className="text-xs uppercase font-semibold text-gray-500">End-to-End</span>
                            <span className="text-lg font-bold text-purple-700">
                              {((platform.contracts / platform.impressions) * 100).toFixed(4)}%
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 text-right">
                            {platform.impressions.toLocaleString()} impressions → {platform.contracts} contracts
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Funnel Visualization - Bar Chart */}
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold mb-3">Funnel Stages Comparison</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={funnelAggregate.map((p: any) => ({
                        platform: p.platform,
                        impressions: Math.log10(p.impressions + 1),
                        clicks: Math.log10(p.clicks + 1),
                        leads: Math.log10(p.leads + 1),
                        contracts: Math.log10(p.contracts + 1)
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="platform" />
                        <YAxis label={{ value: "Log Scale", angle: -90, position: "insideLeft" }} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const platform = funnelAggregate.find((p: any) => p.platform === payload[0].payload.platform)
                              if (!platform) return null
                              return (
                                <div className="bg-white p-3 border rounded shadow-lg">
                                  <p className="font-semibold capitalize">{platform.platform}</p>
                                  <p className="text-sm">Impressions: {platform.impressions.toLocaleString()}</p>
                                  <p className="text-sm">Clicks: {platform.clicks.toLocaleString()} ({platform.ctr.toFixed(2)}%)</p>
                                  <p className="text-sm">Leads: {platform.leads} ({platform.cvr.toFixed(2)}%)</p>
                                  <p className="text-sm">Contracts: {platform.contracts} ({platform.contract_rate.toFixed(2)}%)</p>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <Legend />
                        <Bar dataKey="impressions" name="Impressions" fill="#cbd5e1" />
                        <Bar dataKey="clicks" name="Clicks" fill="#3b82f6" />
                        <Bar dataKey="leads" name="Leads" fill="#10b981" />
                        <Bar dataKey="contracts" name="Contracts" fill="#8b5cf6" />
                      </BarChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Note: Values shown on logarithmic scale for visualization (log10)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Daily Funnel Trend */}
          {funnelData.length > 0 && (
            <Card className="col-span-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  Daily Funnel Metrics Trend
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Track conversion rates over time by platform
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* CTR Trend */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Click-Through Rate (CTR) by Date</h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={funnelData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis label={{ value: "CTR (%)", angle: -90, position: "insideLeft" }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="ctr" name="CTR %" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* CVR Trend */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Conversion Rate (CVR) by Date</h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={funnelData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis label={{ value: "CVR (%)", angle: -90, position: "insideLeft" }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="cvr" name="CVR %" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Contract Rate Trend */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Contract Rate by Date</h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={funnelData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis label={{ value: "Contract Rate (%)", angle: -90, position: "insideLeft" }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="contract_rate" name="Contract Rate %" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* 🆕 CONTRACTS ATTRIBUTION DASHBOARD (NEW: Oct 14, 2025) */}
      {(attributionCoverage || contractsTimeline.length > 0 || contractsByCreative.length > 0 || contractsByCampaign.length > 0) && (
        <>
          <div className="col-span-full pt-8 border-t-4 border-blue-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Contracts Attribution Dashboard</h2>
            <p className="text-gray-600">Detailed contract attribution to campaigns, ads, and creatives</p>
          </div>

          {/* Attribution Coverage Stats */}
          {attributionCoverage && (
            <Card className="col-span-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Attribution Coverage Overview
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Percentage of contracts and leads with complete attribution data
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Totals */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border-2 border-blue-200">
                    <div className="text-sm text-blue-700 font-semibold mb-2">TOTAL VOLUME</div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Leads:</span>
                        <span className="text-2xl font-bold text-blue-900">{attributionCoverage.totals.leads.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Contracts:</span>
                        <span className="text-2xl font-bold text-green-700">{attributionCoverage.totals.contracts.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Leads Coverage */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border-2 border-green-200">
                    <div className="text-sm text-green-700 font-semibold mb-2">LEADS ATTRIBUTION</div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>With Platform:</span>
                        <span className="font-bold">{attributionCoverage.leads_coverage.with_platform_pct.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>With UTM:</span>
                        <span className="font-bold">{attributionCoverage.leads_coverage.with_utm_pct.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Meta Campaign:</span>
                        <span className="font-bold text-blue-700">{attributionCoverage.leads_coverage.with_meta_campaign_pct.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Meta Creative:</span>
                        <span className="font-bold text-blue-700">{attributionCoverage.leads_coverage.with_meta_creative_pct.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Google Campaign:</span>
                        <span className="font-bold text-orange-700">{attributionCoverage.leads_coverage.with_google_campaign_pct.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Contracts Coverage */}
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border-2 border-purple-200">
                    <div className="text-sm text-purple-700 font-semibold mb-2">CONTRACTS ATTRIBUTION</div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>With Creative:</span>
                        <span className="font-bold text-blue-700">{attributionCoverage.contracts_coverage.with_creative_pct.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Meta Campaign:</span>
                        <span className="font-bold text-blue-700">{attributionCoverage.contracts_coverage.with_meta_campaign_pct.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Google Campaign:</span>
                        <span className="font-bold text-orange-700">{attributionCoverage.contracts_coverage.with_google_campaign_pct.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Coverage Warning */}
                  <div className={`rounded-lg p-6 border-2 ${
                    attributionCoverage.contracts_coverage.with_creative_pct < 20
                      ? "bg-gradient-to-br from-red-50 to-red-100 border-red-300"
                      : attributionCoverage.contracts_coverage.with_creative_pct < 50
                      ? "bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-300"
                      : "bg-gradient-to-br from-green-50 to-green-100 border-green-300"
                  }`}>
                    <div className={`text-sm font-semibold mb-2 ${
                      attributionCoverage.contracts_coverage.with_creative_pct < 20 ? "text-red-700" :
                      attributionCoverage.contracts_coverage.with_creative_pct < 50 ? "text-yellow-700" : "text-green-700"
                    }`}>
                      ATTRIBUTION HEALTH
                    </div>
                    <div className="text-3xl font-bold mb-2">
                      {attributionCoverage.contracts_coverage.with_creative_pct < 20 ? "⚠️ LOW" :
                       attributionCoverage.contracts_coverage.with_creative_pct < 50 ? "⚡ MEDIUM" : "✅ GOOD"}
                    </div>
                    <p className="text-xs">
                      {attributionCoverage.contracts_coverage.with_creative_pct < 20
                        ? "Only " + attributionCoverage.contracts_coverage.with_creative_pct.toFixed(0) + "% of contracts have creative attribution"
                        : attributionCoverage.contracts_coverage.with_creative_pct < 50
                        ? attributionCoverage.contracts_coverage.with_creative_pct.toFixed(0) + "% attribution - consider improving tracking"
                        : "Great! " + attributionCoverage.contracts_coverage.with_creative_pct.toFixed(0) + "% contracts tracked to creatives"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contracts Timeline */}
          {contractsTimeline.length > 0 && (
            <Card className="col-span-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Daily Contracts & Revenue Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={contractsTimeline}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          return (
                            <div className="bg-white p-3 border rounded shadow-lg">
                              <p className="font-semibold">{data.date}</p>
                              <p className="text-sm">Contracts: {data.contracts_count}</p>
                              <p className="text-sm">Revenue: ₴{(data.daily_revenue / 1000).toFixed(1)}k</p>
                              <p className="text-sm text-gray-500">Avg: ₴{(data.avg_contract_value / 1000).toFixed(1)}k</p>
                              <p className="text-xs text-blue-600">Meta: {data.meta_contracts}</p>
                              <p className="text-xs text-orange-600">Google: {data.google_contracts}</p>
                              <p className="text-xs text-gray-600">Direct: {data.direct_contracts}</p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="contracts_count" name="Contracts" stroke="#10b981" strokeWidth={3} dot={{ r: 5 }} />
                    <Line yAxisId="right" type="monotone" dataKey="daily_revenue" name="Revenue (₴)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Contracts by Creative */}
          {contractsByCreative.length > 0 && (
            <Card className="col-span-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  Top Revenue-Generating Creatives (Meta)
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Which specific ad creatives generated the most contracts
                </p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-2">Creative ID</th>
                        <th className="text-left p-2">Ad Name</th>
                        <th className="text-left p-2">Campaign</th>
                        <th className="text-right p-2">Contracts</th>
                        <th className="text-right p-2">Revenue</th>
                        <th className="text-right p-2">Avg Value</th>
                        <th className="text-right p-2">Leads</th>
                        <th className="text-right p-2">CVR</th>
                        <th className="text-right p-2">Period</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contractsByCreative.map((creative: any, idx: number) => (
                        <tr key={idx} className="border-b hover:bg-blue-50/30">
                          <td className="p-2 font-mono text-xs text-gray-600">{creative.creative_id}</td>
                          <td className="p-2 max-w-xs truncate font-medium">{creative.ad_name}</td>
                          <td className="p-2 max-w-xs truncate text-gray-600">{creative.campaign_name}</td>
                          <td className="text-right p-2 font-bold text-green-700">{creative.contracts_count}</td>
                          <td className="text-right p-2 font-bold text-blue-700">₴{(creative.total_revenue / 1000).toFixed(0)}k</td>
                          <td className="text-right p-2">₴{(creative.avg_contract_value / 1000).toFixed(1)}k</td>
                          <td className="text-right p-2">{creative.total_leads}</td>
                          <td className="text-right p-2 font-semibold text-purple-600">{creative.cvr}%</td>
                          <td className="text-right p-2 text-xs text-gray-500">{creative.first_contract_date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contracts by Campaign */}
          {contractsByCampaign.length > 0 && (
            <Card className="col-span-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Contracts Attribution by Campaign
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Which campaigns generated the most contract revenue
                </p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-2">Platform</th>
                        <th className="text-left p-2">Campaign Name</th>
                        <th className="text-right p-2">Contracts</th>
                        <th className="text-right p-2">Revenue</th>
                        <th className="text-right p-2">Avg Value</th>
                        <th className="text-right p-2">Leads</th>
                        <th className="text-right p-2">CVR</th>
                        <th className="text-right p-2">First</th>
                        <th className="text-right p-2">Last</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contractsByCampaign.map((campaign: any, idx: number) => (
                        <tr key={idx} className="border-b hover:bg-green-50/30">
                          <td className="p-2 capitalize">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              campaign.platform === "meta" ? "bg-blue-100 text-blue-700" :
                              campaign.platform === "google" ? "bg-orange-100 text-orange-700" :
                              "bg-gray-100 text-gray-700"
                            }`}>
                              {campaign.platform}
                            </span>
                          </td>
                          <td className="p-2 max-w-xs truncate font-medium">{campaign.campaign_name}</td>
                          <td className="text-right p-2 font-bold text-green-700">{campaign.contracts_count}</td>
                          <td className="text-right p-2 font-bold text-blue-700">₴{(campaign.total_revenue / 1000).toFixed(0)}k</td>
                          <td className="text-right p-2">₴{(campaign.avg_contract_value / 1000).toFixed(1)}k</td>
                          <td className="text-right p-2">{campaign.total_leads}</td>
                          <td className="text-right p-2 font-semibold text-purple-600">{campaign.cvr}%</td>
                          <td className="text-right p-2 text-xs text-gray-500">{campaign.first_contract_date}</td>
                          <td className="text-right p-2 text-xs text-gray-500">{campaign.last_contract_date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ============================================================================ */}
          {/* V9 ENHANCED ANALYTICS - 1000% VERIFIED (October 23, 2025) */}
          {/* ============================================================================ */}

          {/* V9.1: Week-over-Week Platform Performance */}
          {v9PlatformComparison.length > 0 && (
            <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  📊 Week-over-Week Platform Performance (V9 - SK_LEAD Verified)
                </CardTitle>
                <p className="text-sm text-gray-600">Сравнение платформ по неделям с процентом роста (1000% проверено)</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Bar Chart */}
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={v9PlatformComparison.slice(-12)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period_start" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload as dataAnalyticsApi.V9PlatformComparison
                            return (
                              <div className="bg-white p-3 border rounded shadow-lg">
                                <p className="font-semibold">{data.platform} - {data.period_start}</p>
                                <p className="text-sm">Leads: {data.leads} ({data.leads_growth_pct > 0 ? '+' : ''}{data.leads_growth_pct}%)</p>
                                <p className="text-sm text-green-600 font-bold">Contracts: {data.contracts} ({data.contracts_growth_pct > 0 ? '+' : ''}{data.contracts_growth_pct}%)</p>
                                <p className="text-sm text-blue-600 font-bold">Revenue: ₴{(data.revenue / 1000).toFixed(1)}k ({data.revenue_growth_pct > 0 ? '+' : ''}{data.revenue_growth_pct}%)</p>
                                <p className="text-xs text-gray-500 mt-1">Previous: {data.prev_period_contracts} contracts</p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="contracts" name="Contracts (This Week)" fill="#10b981" />
                      <Bar yAxisId="left" dataKey="prev_period_contracts" name="Contracts (Last Week)" fill="#94a3b8" />
                      <Bar yAxisId="right" dataKey="leads" name="Leads" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Table with Growth Indicators */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left p-2">Week</th>
                          <th className="text-left p-2">Platform</th>
                          <th className="text-right p-2">Leads</th>
                          <th className="text-right p-2">WoW Growth</th>
                          <th className="text-right p-2">Contracts</th>
                          <th className="text-right p-2">WoW Growth</th>
                          <th className="text-right p-2">Revenue</th>
                          <th className="text-right p-2">WoW Growth</th>
                        </tr>
                      </thead>
                      <tbody>
                        {v9PlatformComparison.slice(-12).reverse().map((item, idx) => (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            <td className="p-2 font-medium">{item.period_start}</td>
                            <td className="p-2">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                item.platform === 'facebook' ? 'bg-blue-100 text-blue-700' :
                                item.platform === 'instagram' ? 'bg-pink-100 text-pink-700' :
                                item.platform === 'google' ? 'bg-orange-100 text-orange-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {item.platform}
                              </span>
                            </td>
                            <td className="text-right p-2">{item.leads}</td>
                            <td className={`text-right p-2 font-semibold flex items-center justify-end gap-1 ${
                              item.leads_growth_pct > 0 ? 'text-green-600' : item.leads_growth_pct < 0 ? 'text-red-600' : 'text-gray-500'
                            }`}>
                              {item.leads_growth_pct > 0 ? <ArrowUpRight className="h-3 w-3" /> : item.leads_growth_pct < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
                              {item.leads_growth_pct > 0 ? '+' : ''}{item.leads_growth_pct}%
                            </td>
                            <td className="text-right p-2 font-bold text-green-700">{item.contracts}</td>
                            <td className={`text-right p-2 font-semibold flex items-center justify-end gap-1 ${
                              item.contracts_growth_pct > 0 ? 'text-green-600' : item.contracts_growth_pct < 0 ? 'text-red-600' : 'text-gray-500'
                            }`}>
                              {item.contracts_growth_pct > 0 ? <ArrowUpRight className="h-3 w-3" /> : item.contracts_growth_pct < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
                              {item.contracts_growth_pct > 0 ? '+' : ''}{item.contracts_growth_pct}%
                            </td>
                            <td className="text-right p-2 font-bold text-blue-700">₴{(item.revenue / 1000).toFixed(1)}k</td>
                            <td className={`text-right p-2 font-semibold flex items-center justify-end gap-1 ${
                              item.revenue_growth_pct > 0 ? 'text-green-600' : item.revenue_growth_pct < 0 ? 'text-red-600' : 'text-gray-500'
                            }`}>
                              {item.revenue_growth_pct > 0 ? <ArrowUpRight className="h-3 w-3" /> : item.revenue_growth_pct < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
                              {item.revenue_growth_pct > 0 ? '+' : ''}{item.revenue_growth_pct}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* V9.2: Monthly Cohort Analysis */}
          {v9MonthlyCohorts.length > 0 && (
            <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-teal-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-600" />
                  📅 Monthly Cohort Analysis (V9 - SK_LEAD Verified)
                </CardTitle>
                <p className="text-sm text-gray-600">Анализ когорт по месяцам с MoM ростом и repeat rate (1000% проверено)</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Line Chart */}
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={v9MonthlyCohorts}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="cohort_month" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="contracts" name="Contracts" stroke="#10b981" strokeWidth={3} dot={{ r: 5 }} />
                      <Line yAxisId="right" type="monotone" dataKey="conversion_rate" name="CVR %" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
                      <Line yAxisId="right" type="monotone" dataKey="repeat_customer_rate" name="Repeat Rate %" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left p-2">Month</th>
                          <th className="text-left p-2">Platform</th>
                          <th className="text-right p-2">Leads</th>
                          <th className="text-right p-2">Contracts</th>
                          <th className="text-right p-2">Revenue</th>
                          <th className="text-right p-2">CVR %</th>
                          <th className="text-right p-2">MoM Growth</th>
                          <th className="text-right p-2">Repeat %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {v9MonthlyCohorts.map((item, idx) => (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            <td className="p-2 font-medium">{item.cohort_month}</td>
                            <td className="p-2 capitalize">{item.platform}</td>
                            <td className="text-right p-2">{item.leads}</td>
                            <td className="text-right p-2 font-bold text-green-700">{item.contracts}</td>
                            <td className="text-right p-2 font-bold text-blue-700">₴{(item.revenue / 1000).toFixed(1)}k</td>
                            <td className="text-right p-2 font-semibold text-purple-600">{item.conversion_rate.toFixed(2)}%</td>
                            <td className={`text-right p-2 font-semibold ${
                              (item.contracts_mom_growth ?? 0) > 0 ? 'text-green-600' : (item.contracts_mom_growth ?? 0) < 0 ? 'text-red-600' : 'text-gray-500'
                            }`}>
                              {item.contracts_mom_growth !== null ? `${item.contracts_mom_growth > 0 ? '+' : ''}${item.contracts_mom_growth.toFixed(1)}%` : 'N/A'}
                            </td>
                            <td className="text-right p-2 font-semibold text-orange-600">
                              {item.repeat_customer_rate !== null ? `${item.repeat_customer_rate.toFixed(1)}%` : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* V9.3: Attribution Quality Dashboard */}
          {v9AttributionQuality.length > 0 && (
            <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-orange-600" />
                  🎯 Attribution Data Quality (V9 - SK_LEAD Verified)
                </CardTitle>
                <p className="text-sm text-gray-600">Качество атрибуции данных по платформам (1000% проверено)</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {v9AttributionQuality.map((item, idx) => (
                      <div key={idx} className="bg-white rounded-lg p-4 border-2 border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`px-3 py-1 rounded text-sm font-bold ${
                            item.platform === 'facebook' ? 'bg-blue-100 text-blue-700' :
                            item.platform === 'instagram' ? 'bg-pink-100 text-pink-700' :
                            item.platform === 'google' ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {item.platform}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            item.quality_score === 'HIGH' ? 'bg-green-100 text-green-700' :
                            item.quality_score === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {item.quality_score}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Contracts:</span>
                            <span className="font-bold">{item.total_contracts}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">With Campaign:</span>
                            <span className="font-bold text-green-600">{item.contracts_with_campaign}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Campaign Match:</span>
                            <span className="font-bold text-blue-600">{item.campaign_match_rate.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">UTM Coverage:</span>
                            <span className="font-bold text-purple-600">{item.utm_coverage.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Attribution Level:</span>
                            <span className="font-medium text-xs capitalize">{item.attribution_level}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

// Wrap with authentication protection
export default function DataAnalyticsPage() {
  return (
    <ProtectedRoute requireAuth={true}>
      <DataAnalyticsPageContent />
    </ProtectedRoute>
  )
}
