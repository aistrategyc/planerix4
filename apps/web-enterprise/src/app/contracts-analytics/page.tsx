"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { TrendingUp, DollarSign, Users, FileText, Target, RefreshCcw, AlertCircle, ArrowUpRight, ArrowDownRight } from "lucide-react"
import * as contractsApi from "@/lib/api/contracts-attribution"
import ProtectedRoute from "@/components/auth/ProtectedRoute"

const PLATFORM_COLORS: Record<string, string> = {
  google: "#4285f4",
  meta: "#1877f2",
  direct: "#6b7280",
  email: "#10b981",
  other: "#f59e0b"
}

const ATTRIBUTION_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#6b7280"]

function ContractsAnalyticsPageContent() {
  // Filters - default last 40 days
  const [dateFrom, setDateFrom] = useState("2025-09-10")
  const [dateTo, setDateTo] = useState("2025-10-19")
  const [selectedPlatform, setSelectedPlatform] = useState<string>("")
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day")

  // Data states
  const [attributionSummary, setAttributionSummary] = useState<contractsApi.AttributionSummaryResponse | null>(null)
  const [platformBreakdown, setPlatformBreakdown] = useState<contractsApi.ContractPlatformData[]>([])
  const [topSources, setTopSources] = useState<contractsApi.ContractSourceData[]>([])
  const [timeline, setTimeline] = useState<contractsApi.ContractTimelineData[]>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const filters: contractsApi.ContractsFilters = {
        date_from: dateFrom,
        date_to: dateTo,
        platform: selectedPlatform || undefined,
        limit: 50,
        group_by: groupBy,
      }

      // Fetch all data in parallel
      const results = await Promise.allSettled([
        contractsApi.ContractsAttributionAPI.getAttributionSummary({ date_from: dateFrom, date_to: dateTo }),
        contractsApi.ContractsAttributionAPI.getByPlatform({ date_from: dateFrom, date_to: dateTo }),
        contractsApi.ContractsAttributionAPI.getBySource(filters),
        contractsApi.ContractsAttributionAPI.getTimeline(filters),
      ])

      // Set data for successful requests
      if (results[0].status === "fulfilled") setAttributionSummary(results[0].value)
      if (results[1].status === "fulfilled") setPlatformBreakdown(results[1].value.data)
      if (results[2].status === "fulfilled") setTopSources(results[2].value.data)
      if (results[3].status === "fulfilled") setTimeline(results[3].value.data)

      // Log failures
      const failed = results.filter((r) => r.status === "rejected")
      if (failed.length > 0) {
        console.warn("Some requests failed:", failed)
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
          <h1 className="text-3xl font-bold text-gray-900">Contracts Attribution Analysis</h1>
          <p className="text-gray-500 mt-1">Detailed insights on contract sources and conversion funnels</p>
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                {["all", "Meta", "Google Ads", "Direct"].map((platform) => (
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
            <div>
              <label className="text-sm font-medium mb-2 block">Group By</label>
              <div className="flex gap-2">
                {(["day", "week", "month"] as const).map((g) => (
                  <Button
                    key={g}
                    size="sm"
                    variant={groupBy === g ? "default" : "outline"}
                    onClick={() => setGroupBy(g)}
                  >
                    {g}
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

      {/* Overall KPI Cards */}
      {attributionSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contractsApi.formatNumber(attributionSummary.total_leads)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Total Contracts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{contractsApi.formatNumber(attributionSummary.total_contracts)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contractsApi.formatCurrency(attributionSummary.total_revenue)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Conversion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${contractsApi.getConversionRateColor(attributionSummary.overall_conversion_rate)}`}>
                {contractsApi.formatPercent(attributionSummary.overall_conversion_rate)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Attribution Summary - Donut Chart + Table */}
      {attributionSummary && attributionSummary.data.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Attribution Type Distribution</CardTitle>
              <p className="text-sm text-gray-500">Leads breakdown by attribution type</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={attributionSummary.data}
                    dataKey="total_leads"
                    nameKey="attribution_type"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry.attribution_type}: ${entry.lead_share_pct.toFixed(1)}%`}
                  >
                    {attributionSummary.data.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={ATTRIBUTION_COLORS[index % ATTRIBUTION_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attribution Performance</CardTitle>
              <p className="text-sm text-gray-500">Conversion rates by attribution type</p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-2">Type</th>
                      <th className="text-right p-2">Leads</th>
                      <th className="text-right p-2">Contracts</th>
                      <th className="text-right p-2">CVR %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attributionSummary.data.map((item, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{item.attribution_type}</td>
                        <td className="text-right p-2">{contractsApi.formatNumber(item.total_leads)}</td>
                        <td className="text-right p-2 font-bold text-green-600">{item.contracts}</td>
                        <td className={`text-right p-2 font-semibold ${contractsApi.getConversionRateColor(item.conversion_rate)}`}>
                          {contractsApi.formatPercent(item.conversion_rate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Platform Breakdown - Bar Chart */}
      {platformBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Platform Performance Comparison
            </CardTitle>
            <p className="text-sm text-gray-500">Compare conversion effectiveness across platforms</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Bar Chart */}
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={platformBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="platform" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as contractsApi.ContractPlatformData
                        return (
                          <div className="bg-white p-3 border rounded shadow-lg">
                            <p className="font-semibold capitalize">{data.platform}</p>
                            <p className="text-sm">Leads: {contractsApi.formatNumber(data.total_leads)}</p>
                            <p className="text-sm">Contracts: {data.contracts}</p>
                            <p className="text-sm">Revenue: {contractsApi.formatCurrency(data.revenue)}</p>
                            <p className="text-sm">CVR: {contractsApi.formatPercent(data.conversion_rate)}</p>
                            <p className="text-sm">Avg: {contractsApi.formatCurrency(data.avg_contract_value)}</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="total_leads" name="Leads" fill="#3b82f6" />
                  <Bar yAxisId="right" dataKey="contracts" name="Contracts" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>

              {/* Platform Details Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-2">Platform</th>
                      <th className="text-right p-2">Leads</th>
                      <th className="text-right p-2">Contracts</th>
                      <th className="text-right p-2">Revenue</th>
                      <th className="text-right p-2">Avg Contract</th>
                      <th className="text-right p-2">CVR %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {platformBreakdown.map((platform, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${contractsApi.getPlatformBadgeColor(platform.platform)}`}>
                            {platform.platform}
                          </span>
                        </td>
                        <td className="text-right p-2">{contractsApi.formatNumber(platform.total_leads)}</td>
                        <td className="text-right p-2 font-bold text-green-600">{platform.contracts}</td>
                        <td className="text-right p-2 font-bold text-blue-600">{contractsApi.formatCurrency(platform.revenue)}</td>
                        <td className="text-right p-2">{contractsApi.formatCurrency(platform.avg_contract_value)}</td>
                        <td className={`text-right p-2 font-semibold ${contractsApi.getConversionRateColor(platform.conversion_rate)}`}>
                          {contractsApi.formatPercent(platform.conversion_rate)}
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

      {/* Top Sources Table */}
      {topSources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Top Traffic Sources by Contracts
            </CardTitle>
            <p className="text-sm text-gray-500">Best performing campaigns and traffic sources</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-2">Platform</th>
                    <th className="text-left p-2">Traffic Source</th>
                    <th className="text-left p-2">Campaign ID</th>
                    <th className="text-right p-2">Leads</th>
                    <th className="text-right p-2">Contracts</th>
                    <th className="text-right p-2">Revenue</th>
                    <th className="text-right p-2">Avg Contract</th>
                    <th className="text-right p-2">CVR %</th>
                  </tr>
                </thead>
                <tbody>
                  {topSources.map((source, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${contractsApi.getPlatformBadgeColor(source.platform)}`}>
                          {source.platform}
                        </span>
                      </td>
                      <td className="p-2 max-w-xs truncate font-medium">{source.traffic_source}</td>
                      <td className="p-2 font-mono text-xs text-gray-600">{source.campaign}</td>
                      <td className="text-right p-2">{contractsApi.formatNumber(source.total_leads)}</td>
                      <td className="text-right p-2 font-bold text-green-600">{source.contracts}</td>
                      <td className="text-right p-2 font-bold text-blue-600">{contractsApi.formatCurrency(source.revenue)}</td>
                      <td className="text-right p-2">{contractsApi.formatCurrency(source.avg_contract_value)}</td>
                      <td className={`text-right p-2 font-semibold ${contractsApi.getConversionRateColor(source.conversion_rate)}`}>
                        {contractsApi.formatPercent(source.conversion_rate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conversion Timeline */}
      {timeline.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Conversion Funnel Timeline
            </CardTitle>
            <p className="text-sm text-gray-500">Track leads → contracts conversion over time</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Line Chart */}
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dt" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as contractsApi.ContractTimelineData
                        return (
                          <div className="bg-white p-3 border rounded shadow-lg">
                            <p className="font-semibold">{data.dt}</p>
                            <p className="text-sm">Leads: {contractsApi.formatNumber(data.total_leads)}</p>
                            <p className="text-sm">Contracts: {data.contracts}</p>
                            <p className="text-sm">Revenue: {contractsApi.formatCurrency(data.revenue)}</p>
                            <p className="text-sm text-purple-600">CVR: {contractsApi.formatPercent(data.conversion_rate)}</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="total_leads" name="Leads" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                  <Line yAxisId="left" type="monotone" dataKey="contracts" name="Contracts" stroke="#10b981" strokeWidth={3} dot={{ r: 5 }} />
                  <Line yAxisId="right" type="monotone" dataKey="conversion_rate" name="CVR %" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>

              {/* Timeline Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-2">Date</th>
                      <th className="text-right p-2">Leads</th>
                      <th className="text-right p-2">Contracts</th>
                      <th className="text-right p-2">Revenue</th>
                      <th className="text-right p-2">CVR %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeline.map((item, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{item.dt}</td>
                        <td className="text-right p-2">{contractsApi.formatNumber(item.total_leads)}</td>
                        <td className="text-right p-2 font-bold text-green-600">{item.contracts}</td>
                        <td className="text-right p-2 font-bold text-blue-600">{contractsApi.formatCurrency(item.revenue)}</td>
                        <td className={`text-right p-2 font-semibold ${contractsApi.getConversionRateColor(item.conversion_rate)}`}>
                          {contractsApi.formatPercent(item.conversion_rate)}
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

      {/* Key Insights Summary */}
      {attributionSummary && platformBreakdown.length > 0 && (
        <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Best Converting Attribution */}
              {attributionSummary.data.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowUpRight className="h-5 w-5 text-green-600" />
                    <div className="text-sm font-semibold text-gray-700">Best Attribution Type</div>
                  </div>
                  <div className="text-xl font-bold text-green-600">
                    {attributionSummary.data.sort((a, b) => b.conversion_rate - a.conversion_rate)[0].attribution_type}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {contractsApi.formatPercent(attributionSummary.data.sort((a, b) => b.conversion_rate - a.conversion_rate)[0].conversion_rate)} conversion rate
                  </div>
                </div>
              )}

              {/* Best Platform */}
              {platformBreakdown.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    <div className="text-sm font-semibold text-gray-700">Top Platform</div>
                  </div>
                  <div className="text-xl font-bold text-blue-600 capitalize">
                    {platformBreakdown.sort((a, b) => b.contracts - a.contracts)[0].platform}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {platformBreakdown.sort((a, b) => b.contracts - a.contracts)[0].contracts} contracts
                  </div>
                </div>
              )}

              {/* Total Impact */}
              <div className="bg-white rounded-lg p-4 border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                  <div className="text-sm font-semibold text-gray-700">Avg Contract Value</div>
                </div>
                <div className="text-xl font-bold text-purple-600">
                  {contractsApi.formatCurrency(attributionSummary.total_revenue / attributionSummary.total_contracts)}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Across all channels
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Wrap with authentication protection
export default function ContractsAnalyticsPage() {
  return (
    <ProtectedRoute requireAuth={true}>
      <ContractsAnalyticsPageContent />
    </ProtectedRoute>
  )
}
