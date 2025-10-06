"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { TrendingUp, DollarSign, Users, FileText, Target, RefreshCcw, AlertCircle } from "lucide-react"
import * as dataAnalyticsApi from "@/lib/api/data-analytics"

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]

export default function DataAnalyticsPage() {
  // Filters - September 2025 ITstep data
  const [dateFrom, setDateFrom] = useState("2025-09-01")
  const [dateTo, setDateTo] = useState("2025-09-30")
  const [selectedPlatform, setSelectedPlatform] = useState<string>("")

  // Data states (8 working endpoints)
  const [kpi, setKpi] = useState<any>(null)
  const [leadsTrend, setLeadsTrend] = useState<any[]>([])
  const [spendTrend, setSpendTrend] = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [platformShare, setPlatformShare] = useState<any[]>([])
  const [utmSources, setUtmSources] = useState<any[]>([])
  const [wowCampaigns, setWowCampaigns] = useState<any[]>([])
  const [budgetReco, setBudgetReco] = useState<any[]>([])

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

      // Use Promise.allSettled for independent failures
      const results = await Promise.allSettled([
        dataAnalyticsApi.getKPICards(filters),
        dataAnalyticsApi.getLeadsTrend(filters),
        dataAnalyticsApi.getSpendTrend(filters),
        dataAnalyticsApi.getCampaigns(filters),
        dataAnalyticsApi.getPlatformShare(dateFrom, dateTo),
        dataAnalyticsApi.getUTMSources(filters),
        dataAnalyticsApi.getWoWCampaigns(filters),
        dataAnalyticsApi.getBudgetRecommendationsLegacy(dateFrom, dateTo, 10),
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
    </div>
  )
}
