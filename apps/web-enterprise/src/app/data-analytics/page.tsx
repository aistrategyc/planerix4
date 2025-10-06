"use client"

import { useState } from "react"
import { useDataAnalytics } from "@/hooks/useDataAnalytics"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { TrendingUp, DollarSign, Users, FileText, Target, RefreshCcw } from "lucide-react"

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]

export default function DataAnalyticsPage() {
  const {
    kpi,
    leadsTrend,
    spendTrend,
    campaigns,
    wowCampaigns,
    utmSources,
    platformShare,
    topCampaigns,
    loading,
    error,
    filters,
    setFilters,
    refetch,
  } = useDataAnalytics()

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["google", "meta"])

  const handlePlatformChange = (platform: string) => {
    const newPlatforms = selectedPlatforms.includes(platform)
      ? selectedPlatforms.filter((p) => p !== platform)
      : [...selectedPlatforms, platform]
    setSelectedPlatforms(newPlatforms)
    setFilters({ platforms: newPlatforms.join(",") })
  }

  if (error) {
    return (
      <div className="p-8">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-6">
            <p className="text-red-600">Error: {error}</p>
            <Button onClick={refetch} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Data Analytics</h1>
          <p className="text-gray-500 mt-1">ITstep client analytics dashboard</p>
        </div>
        <Button onClick={refetch} disabled={loading} variant="outline" size="sm">
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
              <Input
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters({ date_from: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Date To</label>
              <Input
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters({ date_to: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Platforms</label>
              <div className="flex gap-2">
                {["google", "meta", "email"].map((platform) => (
                  <Button
                    key={platform}
                    size="sm"
                    variant={selectedPlatforms.includes(platform) ? "default" : "outline"}
                    onClick={() => handlePlatformChange(platform)}
                  >
                    {platform}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Min Spend</label>
              <Input
                type="number"
                value={filters.min_spend || 0}
                onChange={(e) => setFilters({ min_spend: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
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
              <div className="text-2xl font-bold">${kpi.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
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
              <div className="text-2xl font-bold">${kpi.spend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
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
                {kpi.cpl ? `$${kpi.cpl.toFixed(2)}` : "N/A"}
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

      {/* Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Leads Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={leadsTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dt" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spend Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={spendTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dt" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="spend" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Platform Share Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Leads by Platform</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={platformShare}
                dataKey="leads"
                nameKey="platform"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {platformShare.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Campaigns Table */}
      <Card>
        <CardHeader>
          <CardTitle>Campaigns (Top 20)</CardTitle>
        </CardHeader>
        <CardContent>
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
                    <td className="p-2">{campaign.platform}</td>
                    <td className="p-2">{campaign.campaign_name}</td>
                    <td className="text-right p-2">{campaign.leads}</td>
                    <td className="text-right p-2">{campaign.n_contracts}</td>
                    <td className="text-right p-2">${campaign.revenue.toFixed(2)}</td>
                    <td className="text-right p-2">${campaign.spend.toFixed(2)}</td>
                    <td className="text-right p-2">{campaign.cpl ? `$${campaign.cpl.toFixed(2)}` : "N/A"}</td>
                    <td className="text-right p-2">{campaign.roas ? campaign.roas.toFixed(2) : "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Week-over-Week Table */}
      <Card>
        <CardHeader>
          <CardTitle>Week-over-Week Campaigns (Top 20)</CardTitle>
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
                  <th className="text-right p-2">Δ Leads</th>
                  <th className="text-right p-2">Δ %</th>
                  <th className="text-right p-2">Spend Cur</th>
                  <th className="text-right p-2">Spend Prev</th>
                </tr>
              </thead>
              <tbody>
                {wowCampaigns.slice(0, 20).map((campaign, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="p-2">{campaign.platform}</td>
                    <td className="p-2">{campaign.campaign_name}</td>
                    <td className="text-right p-2">{campaign.leads_cur}</td>
                    <td className="text-right p-2">{campaign.leads_prev}</td>
                    <td className={`text-right p-2 ${campaign.leads_diff >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {campaign.leads_diff >= 0 ? "+" : ""}{campaign.leads_diff}
                    </td>
                    <td className={`text-right p-2 ${(campaign.leads_diff_pct || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {campaign.leads_diff_pct ? `${campaign.leads_diff_pct.toFixed(1)}%` : "N/A"}
                    </td>
                    <td className="text-right p-2">${campaign.spend_cur.toFixed(2)}</td>
                    <td className="text-right p-2">${campaign.spend_prev.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* UTM Sources Table */}
      <Card>
        <CardHeader>
          <CardTitle>UTM Sources (Top 20)</CardTitle>
        </CardHeader>
        <CardContent>
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
                {utmSources.slice(0, 20).map((source, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="p-2">{source.platform}</td>
                    <td className="p-2">{source.utm_source}</td>
                    <td className="text-right p-2">{source.leads}</td>
                    <td className="text-right p-2">{source.n_contracts}</td>
                    <td className="text-right p-2">${source.revenue.toFixed(2)}</td>
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
