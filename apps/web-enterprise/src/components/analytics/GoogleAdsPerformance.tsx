/**
 * Google Ads Performance Component
 * Weekly performance breakdown with ROAS, CPL, spend analysis
 * Uses V9 Google weekly data
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
import type { V9GoogleWeekly } from "@/lib/api/data-analytics"

interface GoogleAdsPerformanceProps {
  data: V9GoogleWeekly[]
  title?: string
  showTopCampaigns?: number
  loading?: boolean
}

const formatCurrency = (value: number) => `₴${(value / 1000).toFixed(1)}K`
const formatNumber = (value: number) => value.toFixed(0)
const formatPercent = (value: number) => `${value.toFixed(1)}%`
const formatGrowth = (value: number | null) => {
  if (value === null || value === undefined) return "N/A"
  const sign = value >= 0 ? "+" : ""
  return `${sign}${value.toFixed(1)}%`
}

export function GoogleAdsPerformance({
  data,
  title = "Google Ads Weekly Performance",
  showTopCampaigns = 10,
  loading = false,
}: GoogleAdsPerformanceProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285f4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34a853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#fbbc05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#ea4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
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
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285f4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34a853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#fbbc05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#ea4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center text-gray-500">
            No Google Ads data available
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
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="#4285f4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34a853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#fbbc05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#ea4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
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
              <Bar yAxisId="left" dataKey="leads" fill="#4285f4" name="Leads" />
              <Bar yAxisId="left" dataKey="contracts" fill="#34a853" name="Contracts" />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="conversion_rate"
                stroke="#fbbc05"
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
