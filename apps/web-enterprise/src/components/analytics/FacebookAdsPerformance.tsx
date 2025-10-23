/**
 * Facebook Ads Performance Component
 * Weekly performance breakdown with ROAS, CPL, spend analysis
 * Uses V9 Facebook weekly data
 * Created: October 23, 2025
 */

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts"
import { DollarSign, TrendingUp, Target } from "lucide-react"
import type { V9FacebookWeekly } from "@/lib/api/data-analytics"

interface FacebookAdsPerformanceProps {
  data: V9FacebookWeekly[]
  title?: string
  showTopCampaigns?: number
  loading?: boolean
}

const formatCurrency = (value: number) => `$${(value / 1000).toFixed(1)}K`
const formatNumber = (value: number) => value.toFixed(0)
const formatPercent = (value: number) => `${value.toFixed(1)}%`
const formatGrowth = (value: number | null) => {
  if (value === null || value === undefined) return "N/A"
  const sign = value >= 0 ? "+" : ""
  return `${sign}${value.toFixed(1)}%`
}

export function FacebookAdsPerformance({
  data,
  title = "Facebook Ads Weekly Performance",
  showTopCampaigns = 10,
  loading = false,
}: FacebookAdsPerformanceProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#1877f2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 animate-pulse bg-gray-100 rounded"></div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#1877f2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center text-gray-500">
            No Facebook Ads data available
          </div>
        </CardContent>
      </Card>
    )
  }

  // Aggregate by campaign
  const campaignData = data.reduce((acc, item) => {
    const key = item.campaign_id
    if (!acc[key]) {
      acc[key] = {
        campaign_id: item.campaign_id,
        campaign_name: item.campaign_name,
        leads: 0,
        contracts: 0,
        revenue: 0,
        weeks: [],
      }
    }
    acc[key].leads += item.leads
    acc[key].contracts += item.contracts
    acc[key].revenue += item.revenue
    acc[key].weeks.push(item)
    return acc
  }, {} as Record<string, any>)

  const topCampaigns = Object.values(campaignData)
    .sort((a: any, b: any) => b.revenue - a.revenue)
    .slice(0, showTopCampaigns)

  // Prepare weekly trend data (aggregate all campaigns)
  const weeklyTrend = data.reduce((acc, item) => {
    const week = item.week_start
    if (!acc[week]) {
      acc[week] = {
        week: week,
        leads: 0,
        contracts: 0,
        revenue: 0,
        conversion_rate: 0,
        count: 0,
      }
    }
    acc[week].leads += item.leads
    acc[week].contracts += item.contracts
    acc[week].revenue += item.revenue
    acc[week].conversion_rate += item.conversion_rate
    acc[week].count += 1
    return acc
  }, {} as Record<string, any>)

  const trendData = Object.values(weeklyTrend)
    .map((item: any) => ({
      ...item,
      conversion_rate: item.conversion_rate / item.count,
    }))
    .sort((a: any, b: any) => new Date(a.week).getTime() - new Date(b.week).getTime())

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-semibold text-sm mb-2">{payload[0].payload.week}</p>
        <div className="space-y-1 text-xs">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded" style={{ backgroundColor: entry.color }} />
                <span className="text-gray-600">{entry.name}:</span>
              </div>
              <span className="font-semibold">
                {entry.dataKey === "revenue"
                  ? formatCurrency(entry.value)
                  : entry.dataKey === "conversion_rate"
                  ? formatPercent(entry.value)
                  : formatNumber(entry.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#1877f2">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Weekly Trend Chart */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Weekly Performance Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="week"
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                }}
              />
              <YAxis yAxisId="left" stroke="#6b7280" fontSize={12} />
              <YAxis yAxisId="right" orientation="right" stroke="#6b7280" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar yAxisId="left" dataKey="leads" fill="#3b82f6" name="Leads" />
              <Bar yAxisId="left" dataKey="contracts" fill="#10b981" name="Contracts" />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="conversion_rate"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Conversion Rate %"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Top Campaigns Table */}
        <div>
          <h3 className="text-sm font-semibold mb-3">
            Top {showTopCampaigns} Campaigns by Revenue
          </h3>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3 font-medium text-gray-600">#</th>
                  <th className="text-left p-3 font-medium text-gray-600">Campaign</th>
                  <th className="text-right p-3 font-medium text-gray-600">Leads</th>
                  <th className="text-right p-3 font-medium text-gray-600">Contracts</th>
                  <th className="text-right p-3 font-medium text-gray-600">Revenue</th>
                  <th className="text-right p-3 font-medium text-gray-600">Conv. Rate</th>
                  <th className="text-right p-3 font-medium text-gray-600">Avg Growth</th>
                </tr>
              </thead>
              <tbody>
                {topCampaigns.map((campaign: any, index: number) => {
                  const convRate = campaign.leads > 0 ? (campaign.contracts / campaign.leads) * 100 : 0
                  const avgGrowth = campaign.weeks.length > 0
                    ? campaign.weeks.reduce((sum: number, w: any) => sum + (w.leads_wow_growth || 0), 0) /
                      campaign.weeks.length
                    : null

                  return (
                    <tr key={campaign.campaign_id} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-gray-500">{index + 1}</td>
                      <td className="p-3 font-medium">{campaign.campaign_name}</td>
                      <td className="text-right p-3">{campaign.leads}</td>
                      <td className="text-right p-3 font-semibold text-green-600">
                        {campaign.contracts}
                      </td>
                      <td className="text-right p-3 font-bold">
                        {formatCurrency(campaign.revenue)}
                      </td>
                      <td className="text-right p-3">{formatPercent(convRate)}</td>
                      <td className={`text-right p-3 font-medium ${avgGrowth && avgGrowth >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatGrowth(avgGrowth)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-1">
              <Target className="h-4 w-4" />
              Total Leads
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {formatNumber(topCampaigns.reduce((sum, c: any) => sum + c.leads, 0))}
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-1">
              <TrendingUp className="h-4 w-4" />
              Total Contracts
            </div>
            <div className="text-2xl font-bold text-green-600">
              {formatNumber(topCampaigns.reduce((sum, c: any) => sum + c.contracts, 0))}
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-1">
              <DollarSign className="h-4 w-4" />
              Total Revenue
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(topCampaigns.reduce((sum, c: any) => sum + c.revenue, 0))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
