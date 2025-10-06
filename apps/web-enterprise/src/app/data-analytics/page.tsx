"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { TrendingUp, TrendingDown, DollarSign, Users, FileText, Target, RefreshCcw, ArrowUp, ArrowDown, Minus } from "lucide-react"
import * as dataAnalyticsApi from "@/lib/api/data-analytics"

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]

type CompareMode = "auto" | "custom" | "disabled"

export default function DataAnalyticsV4Page() {
  // Filters
  const [dateFrom, setDateFrom] = useState("2025-09-01")
  const [dateTo, setDateTo] = useState("2025-09-30")
  const [platforms, setPlatforms] = useState<string[]>(["google", "meta"])
  const [compareMode, setCompareMode] = useState<CompareMode>("auto")
  const [prevFrom, setPrevFrom] = useState("")
  const [prevTo, setPrevTo] = useState("")
  const [minSpend, setMinSpend] = useState(0)

  // Data states
  const [kpiCompare, setKpiCompare] = useState<any>(null)
  const [leadsTrendCompare, setLeadsTrendCompare] = useState<any[]>([])
  const [spendTrendCompare, setSpendTrendCompare] = useState<any[]>([])
  const [campaignsCompare, setCampaignsCompare] = useState<any[]>([])
  const [platformShareCompare, setPlatformShareCompare] = useState<any[]>([])
  const [topMovers, setTopMovers] = useState<any>(null)
  const [budgetRecommendations, setBudgetRecommendations] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const platformsStr = platforms.join(",")
      const compareParams = {
        date_from: dateFrom,
        date_to: dateTo,
        platforms: platformsStr,
        ...(compareMode === "custom" && prevFrom && prevTo ? { prev_from: prevFrom, prev_to: prevTo } : {}),
      }

      // Use allSettled to allow independent widget failures
      const results = await Promise.allSettled([
        dataAnalyticsApi.getKPICompare(compareParams),
        dataAnalyticsApi.getLeadsTrendCompare(compareParams),
        dataAnalyticsApi.getSpendTrendCompare(compareParams),
        dataAnalyticsApi.getCampaignsCompare({ ...compareParams, limit: 20, min_spend: minSpend }),
        dataAnalyticsApi.getPlatformShareCompare(compareParams),
        dataAnalyticsApi.getTopMovers({ ...compareParams, n: 3, target_roas: 3, kill_roas: 0.8, min_leads: 5 }),
        dataAnalyticsApi.getBudgetRecommendations({ ...compareParams, limit: 10, target_roas: 5, kill_roas: 1, min_leads: 5 }),
      ])

      // Set data for successful widgets, keep empty state for failed ones
      if (results[0].status === "fulfilled") setKpiCompare(results[0].value)
      if (results[1].status === "fulfilled") setLeadsTrendCompare(results[1].value.data || [])
      if (results[2].status === "fulfilled") setSpendTrendCompare(results[2].value.data || [])
      if (results[3].status === "fulfilled") setCampaignsCompare(results[3].value.data || [])
      if (results[4].status === "fulfilled") setPlatformShareCompare(results[4].value.data || [])
      if (results[5].status === "fulfilled") setTopMovers(results[5].value)
      if (results[6].status === "fulfilled") setBudgetRecommendations(results[6].value.data || [])

      // Log failed widgets for debugging
      const failedWidgets = results
        .map((r, i) => ({ index: i, result: r }))
        .filter(({ result }) => result.status === "rejected")

      if (failedWidgets.length > 0) {
        console.warn("Some widgets failed to load:", failedWidgets)
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch data")
    } finally {
      setLoading(false)
    }
  }

  // Fetch data only on mount, not on every filter change
  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const renderDelta = (current: number, prev: number, pct: number | null, isReverse = false) => {
    if (prev === 0) return <span className="text-gray-400 text-sm">New</span>

    const diff = current - prev
    const isPositive = isReverse ? diff < 0 : diff > 0
    const Icon = diff > 0 ? ArrowUp : diff < 0 ? ArrowDown : Minus

    return (
      <div className="flex items-center gap-1 text-sm">
        <Icon className={`h-3 w-3 ${isPositive ? "text-green-600" : "text-red-600"}`} />
        <span className={isPositive ? "text-green-600" : "text-red-600"}>
          {pct !== null ? `${pct.toFixed(1)}%` : `${diff > 0 ? "+" : ""}${diff}`}
        </span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-6">
            <p className="text-red-600">Error: {error}</p>
            <Button onClick={fetchData} className="mt-4">Retry</Button>
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
          <h1 className="text-3xl font-bold text-gray-900">Data Analytics v4</h1>
          <p className="text-gray-500 mt-1">ITstep — Period-over-Period Analysis</p>
        </div>
        <Button onClick={fetchData} disabled={loading} variant="outline" size="sm">
          <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters & Compare Mode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Date From</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Date To</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Platforms</label>
              <div className="flex gap-2">
                {["google", "meta", "email"].map((platform) => (
                  <Button
                    key={platform}
                    size="sm"
                    variant={platforms.includes(platform) ? "default" : "outline"}
                    onClick={() => {
                      setPlatforms(prev =>
                        prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
                      )
                    }}
                  >
                    {platform}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Compare Mode</label>
              <Select value={compareMode} onValueChange={(v) => setCompareMode(v as CompareMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (prev period)</SelectItem>
                  <SelectItem value="custom">Custom dates</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {compareMode === "custom" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
              <div>
                <label className="text-sm font-medium mb-2 block">Previous Period From</label>
                <Input type="date" value={prevFrom} onChange={(e) => setPrevFrom(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Previous Period To</label>
                <Input type="date" value={prevTo} onChange={(e) => setPrevTo(e.target.value)} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPI Cards with Compare */}
      {kpiCompare && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpiCompare.leads_cur.toLocaleString()}</div>
              {renderDelta(kpiCompare.leads_cur, kpiCompare.leads_prev, kpiCompare.leads_diff_pct)}
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
              <div className="text-2xl font-bold">{kpiCompare.n_contracts_cur.toLocaleString()}</div>
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
              <div className="text-2xl font-bold">₴{(kpiCompare.revenue_cur / 1000).toFixed(1)}k</div>
              {renderDelta(kpiCompare.revenue_cur, kpiCompare.revenue_prev, kpiCompare.revenue_diff_pct)}
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
              <div className="text-2xl font-bold">₴{(kpiCompare.spend_cur / 1000).toFixed(1)}k</div>
              {renderDelta(kpiCompare.spend_cur, kpiCompare.spend_prev, kpiCompare.spend_diff_pct, true)}
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
                {kpiCompare.cpl_cur ? `₴${kpiCompare.cpl_cur.toFixed(0)}` : "N/A"}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                prev: {kpiCompare.cpl_prev ? `₴${kpiCompare.cpl_prev.toFixed(0)}` : "N/A"}
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
                {kpiCompare.roas_cur ? kpiCompare.roas_cur.toFixed(2) : "N/A"}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                prev: {kpiCompare.roas_prev ? kpiCompare.roas_prev.toFixed(2) : "N/A"}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trends Compare */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Leads Trend Compare</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={leadsTrendCompare}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dt" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="leads_cur" stroke="#3b82f6" strokeWidth={2} name="Current" />
                <Line type="monotone" dataKey="leads_prev_shifted" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" name="Previous" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spend Trend Compare</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={spendTrendCompare}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dt" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="spend_cur" stroke="#10b981" strokeWidth={2} name="Current" />
                <Line type="monotone" dataKey="spend_prev_shifted" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" name="Previous" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Movers (Winners/Losers/Watch) */}
      {topMovers && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-green-700">
                <TrendingUp className="h-5 w-5" />
                Winners (Scale) — {topMovers.winners.length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topMovers.winners.map((campaign: any, idx: number) => (
                  <div key={idx} className="p-3 bg-white rounded border border-green-100">
                    <div className="font-medium text-sm truncate">{campaign.campaign_name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {campaign.leads_cur} leads • ROAS: {campaign.roas_cur?.toFixed(2) || "N/A"} • ₴{campaign.spend_cur.toFixed(0)}
                    </div>
                  </div>
                ))}
                {topMovers.winners.length === 0 && (
                  <p className="text-sm text-gray-500">No winners found</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-yellow-700">
                <Minus className="h-5 w-5" />
                Watch — {topMovers.watch.length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topMovers.watch.map((campaign: any, idx: number) => (
                  <div key={idx} className="p-3 bg-white rounded border border-yellow-100">
                    <div className="font-medium text-sm truncate">{campaign.campaign_name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {campaign.leads_cur} leads • ROAS: {campaign.roas_cur?.toFixed(2) || "N/A"} • ₴{campaign.spend_cur.toFixed(0)}
                    </div>
                  </div>
                ))}
                {topMovers.watch.length === 0 && (
                  <p className="text-sm text-gray-500">No campaigns to watch</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-red-700">
                <TrendingDown className="h-5 w-5" />
                Losers (Pause) — {topMovers.losers.length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topMovers.losers.map((campaign: any, idx: number) => (
                  <div key={idx} className="p-3 bg-white rounded border border-red-100">
                    <div className="font-medium text-sm truncate">{campaign.campaign_name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {campaign.leads_cur} leads • ROAS: {campaign.roas_cur?.toFixed(2) || "N/A"} • ₴{campaign.spend_cur.toFixed(0)}
                    </div>
                  </div>
                ))}
                {topMovers.losers.length === 0 && (
                  <p className="text-sm text-gray-500">No losers found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Budget Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Recommendations (Top 10)</CardTitle>
        </CardHeader>
        <CardContent>
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
                  <th className="text-right p-2">Δ Leads</th>
                </tr>
              </thead>
              <tbody>
                {budgetRecommendations.map((reco: any, idx: number) => (
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
                    <td className="p-2">{reco.platform}</td>
                    <td className="p-2 max-w-xs truncate">{reco.campaign_name}</td>
                    <td className="text-right p-2">{reco.leads_cur}</td>
                    <td className="text-right p-2">₴{reco.spend_cur.toFixed(0)}</td>
                    <td className="text-right p-2">{reco.cpl_cur ? `₴${reco.cpl_cur.toFixed(0)}` : "—"}</td>
                    <td className="text-right p-2">{reco.roas_cur ? reco.roas_cur.toFixed(2) : "—"}</td>
                    <td className={`text-right p-2 ${reco.leads_diff >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {reco.leads_diff >= 0 ? "+" : ""}{reco.leads_diff}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Platform Share Compare */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Platform Share Compare</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={platformShareCompare}
                  dataKey="cur_leads"
                  nameKey="platform"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.platform}: ${entry.share_cur_pct?.toFixed(1)}%`}
                >
                  {platformShareCompare.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Share Details</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Platform</th>
                  <th className="text-right p-2">Current %</th>
                  <th className="text-right p-2">Previous %</th>
                  <th className="text-right p-2">Δ p.p.</th>
                </tr>
              </thead>
              <tbody>
                {platformShareCompare.map((share, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="p-2 font-medium">{share.platform}</td>
                    <td className="text-right p-2">{share.share_cur_pct?.toFixed(1) || "—"}%</td>
                    <td className="text-right p-2">{share.share_prev_pct?.toFixed(1) || "—"}%</td>
                    <td className={`text-right p-2 ${(share.share_diff_pp || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {share.share_diff_pp !== null ? `${share.share_diff_pp > 0 ? "+" : ""}${share.share_diff_pp.toFixed(1)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns Compare Table */}
      <Card>
        <CardHeader>
          <CardTitle>Campaigns Period-over-Period (Top 20)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Platform</th>
                  <th className="text-left p-2">Campaign</th>
                  <th className="text-right p-2">Leads Cur</th>
                  <th className="text-right p-2">Leads Prev</th>
                  <th className="text-right p-2">Δ %</th>
                  <th className="text-right p-2">ROAS Cur</th>
                  <th className="text-right p-2">CPL Cur</th>
                  <th className="text-right p-2">Spend Cur</th>
                </tr>
              </thead>
              <tbody>
                {campaignsCompare.map((campaign, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="p-2">{campaign.platform}</td>
                    <td className="p-2 max-w-xs truncate">{campaign.campaign_name}</td>
                    <td className="text-right p-2 font-medium">{campaign.leads_cur}</td>
                    <td className="text-right p-2 text-gray-500">{campaign.leads_prev}</td>
                    <td className={`text-right p-2 ${(campaign.leads_diff_pct || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {campaign.leads_diff_pct ? `${campaign.leads_diff_pct.toFixed(1)}%` : "—"}
                    </td>
                    <td className="text-right p-2">{campaign.roas_cur ? campaign.roas_cur.toFixed(2) : "—"}</td>
                    <td className="text-right p-2">{campaign.cpl_cur ? `₴${campaign.cpl_cur.toFixed(0)}` : "—"}</td>
                    <td className="text-right p-2">₴{campaign.spend_cur.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
