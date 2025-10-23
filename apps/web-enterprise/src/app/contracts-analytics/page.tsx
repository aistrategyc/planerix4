"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
  DollarSign,
  Users,
  Loader2,
  AlertCircle,
  CheckCircle,
} from "lucide-react"
import * as dataAnalyticsApi from "@/lib/api/data-analytics"
import ProtectedRoute from "@/components/auth/ProtectedRoute"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

export default function ContractsAnalyticsPage() {
  return (
    <ProtectedRoute>
      <ContractsAnalyticsPageContent />
    </ProtectedRoute>
  )
}

const PLATFORM_COLORS: Record<string, string> = {
  google: "#4285f4",
  meta: "#1877f2",
  facebook: "#1877f2",
  instagram: "#E4405F",
  direct: "#6b7280",
  email: "#10b981",
  other: "#f59e0b",
  event: "#8b5cf6",
}

function ContractsAnalyticsPageContent() {
  // Filters (UPDATED: wider range to capture all data)
  const [dateFrom, setDateFrom] = useState("2024-01-01")
  const [dateTo, setDateTo] = useState("2025-12-31")
  const [selectedPlatform, setSelectedPlatform] = useState<string>("") // "" = all

  // Data states
  const [platformComparison, setPlatformComparison] = useState<dataAnalyticsApi.V9PlatformComparison[]>([])
  const [attributionQuality, setAttributionQuality] = useState<dataAnalyticsApi.V9AttributionQuality[]>([])
  const [contractsEnriched, setContractsEnriched] = useState<any[]>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch data
  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const results = await Promise.allSettled([
        dataAnalyticsApi.getV9PlatformComparison(dateFrom, dateTo),
        dataAnalyticsApi.getV9AttributionQuality(selectedPlatform || undefined),
        dataAnalyticsApi.getV9ContractsEnriched(dateFrom, dateTo),
      ])

      if (results[0].status === "fulfilled") setPlatformComparison(results[0].value)
      if (results[1].status === "fulfilled") setAttributionQuality(results[1].value)
      if (results[2].status === "fulfilled") setContractsEnriched(results[2].value)

      const failed = results.filter((r) => r.status === "rejected")
      if (failed.length > 0) {
        console.warn("Some contracts endpoints failed:", failed)
      }
    } catch (err: any) {
      console.error("Contracts data fetch failed:", err)
      setError(err.message || "Failed to load contracts data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [dateFrom, dateTo, selectedPlatform])

  // Group contracts by source (platform)
  const contractsBySource = contractsEnriched.reduce((acc, contract) => {
    const source = contract.platform || "other"
    if (!acc[source]) {
      acc[source] = { source, contracts: 0, revenue: 0 }
    }
    acc[source].contracts += 1
    acc[source].revenue += contract.revenue || 0
    return acc
  }, {} as Record<string, { source: string; contracts: number; revenue: number }>)

  const sourceData = Object.values(contractsBySource).sort((a, b) => b.revenue - a.revenue)

  // Platform totals from platform comparison
  const platformTotals = platformComparison.reduce(
    (acc, platform) => ({
      contracts: acc.contracts + (platform.contracts || 0),
      revenue: acc.revenue + (platform.revenue || 0),
    }),
    { contracts: 0, revenue: 0 }
  )

  // Platform pie chart data
  const platformPieData = platformComparison.map((p) => ({
    name: p.platform || "unknown",
    value: p.contracts || 0,
    revenue: p.revenue || 0,
  }))

  if (loading && contractsEnriched.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-green-600" />
          <p className="text-muted-foreground">Loading contracts analytics...</p>
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
              <h3 className="font-semibold">Error Loading Contracts Data</h3>
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
            <Target className="w-8 h-8 text-green-600" />
            Contracts Attribution Analytics V9
          </h1>
          <p className="text-muted-foreground mt-1">
            Детальная аналитика контрактов — источники, атрибуция, конверсии
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
                {["all", "meta", "google", "direct"].map((platform) => (
                  <Button
                    key={platform}
                    size="sm"
                    variant={selectedPlatform === (platform === "all" ? "" : platform) ? "default" : "outline"}
                    onClick={() => setSelectedPlatform(platform === "all" ? "" : platform)}
                  >
                    {platform === "all" ? "All" : platform}
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
              <Target className="w-4 h-4 text-green-600" />
              <p className="text-sm text-muted-foreground">Total Contracts</p>
            </div>
            <p className="text-2xl font-bold">{platformTotals.contracts.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <p className="text-sm text-muted-foreground">Total Revenue</p>
            </div>
            <p className="text-2xl font-bold text-green-600">
              ${platformTotals.revenue.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-blue-600" />
              <p className="text-sm text-muted-foreground">Sources</p>
            </div>
            <p className="text-2xl font-bold">{sourceData.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <p className="text-sm text-muted-foreground">Avg Contract</p>
            </div>
            <p className="text-2xl font-bold">
              ${platformTotals.contracts > 0 ? Math.round(platformTotals.revenue / platformTotals.contracts).toLocaleString() : 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Platform Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Contracts by Platform</CardTitle>
            <p className="text-sm text-muted-foreground">Distribution of contracts across platforms</p>
          </CardHeader>
          <CardContent>
            {platformPieData.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No platform data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={platformPieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {platformPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PLATFORM_COLORS[entry.name] || PLATFORM_COLORS.other} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Platform</CardTitle>
            <p className="text-sm text-muted-foreground">Total revenue generated by each platform</p>
          </CardHeader>
          <CardContent>
            {platformPieData.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No revenue data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={platformPieData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: any) => `₴${value.toLocaleString()}`}
                    labelFormatter={(label) => `Platform: ${label}`}
                  />
                  <Bar dataKey="revenue" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attribution Quality */}
      {attributionQuality.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              Attribution Quality Score
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Quality of attribution data by platform
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Platform</TableHead>
                    <TableHead className="text-right">Total Contracts</TableHead>
                    <TableHead className="text-right">Attributed</TableHead>
                    <TableHead className="text-right">Attribution %</TableHead>
                    <TableHead className="text-right">Quality Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attributionQuality.map((attr, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Badge style={{ backgroundColor: PLATFORM_COLORS[attr.platform] || PLATFORM_COLORS.other }}>
                          {attr.platform}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{attr.total_contracts || 0}</TableCell>
                      <TableCell className="text-right">{attr.attributed_contracts || 0}</TableCell>
                      <TableCell className="text-right">
                        <span className={attr.attribution_pct > 80 ? "text-green-600" : attr.attribution_pct > 50 ? "text-yellow-600" : "text-red-600"}>
                          {attr.attribution_pct?.toFixed(1) || 0}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={attr.quality_score === "high" ? "default" : attr.quality_score === "medium" ? "secondary" : "outline"}>
                          {attr.quality_score || "low"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contracts by Source Table */}
      <Card>
        <CardHeader>
          <CardTitle>Contracts by Source - Откуда пришли клиенты</CardTitle>
          <p className="text-sm text-muted-foreground">
            Breakdown of contracts and revenue by traffic source
          </p>
        </CardHeader>
        <CardContent>
          {sourceData.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No source data available</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Contracts</TableHead>
                    <TableHead className="text-right">Total Revenue</TableHead>
                    <TableHead className="text-right">Avg Revenue</TableHead>
                    <TableHead className="text-right">% of Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sourceData.map((source, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Badge style={{ backgroundColor: PLATFORM_COLORS[source.source] || PLATFORM_COLORS.other }}>
                          {source.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{source.contracts}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        ${source.revenue.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        ${Math.round(source.revenue / source.contracts).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {((source.revenue / platformTotals.revenue) * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Contracts Table (Top 100) */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Contracts - Last {Math.min(contractsEnriched.length, 100)} Contracts</CardTitle>
          <p className="text-sm text-muted-foreground">
            Individual contract details with attribution
          </p>
        </CardHeader>
        <CardContent>
          {contractsEnriched.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No contracts data available</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Traffic Source</TableHead>
                    <TableHead>Attribution</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contractsEnriched.slice(0, 100).map((contract, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-sm">
                        {new Date(contract.contract_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" style={{ borderColor: PLATFORM_COLORS[contract.platform] || PLATFORM_COLORS.other }}>
                          {contract.platform || "unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-xs truncate">
                        {contract.campaign_name || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {contract.traffic_source || contract.utm_source || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {contract.attribution_level || "none"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        ${(contract.revenue || 0).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
