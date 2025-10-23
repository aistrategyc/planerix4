/**
 * Week-over-Week Comparison Component
 * Shows platform performance comparison with growth indicators
 * Uses V9 Platform Comparison API data
 * Created: October 23, 2025
 */

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react"
import type { V9PlatformComparison } from "@/lib/api/data-analytics"

interface WeekOverWeekComparisonProps {
  data: V9PlatformComparison[]
  metric?: "leads" | "contracts" | "revenue"
  title?: string
  loading?: boolean
}

const PLATFORM_COLORS: Record<string, string> = {
  google: "#4285f4",
  facebook: "#1877f2",
  instagram: "#e4405f",
  telegram: "#0088cc",
  email: "#ea4335",
  organic: "#34a853",
  event: "#fbbc04",
  viber: "#7360f2",
  other: "#9ca3af",
}

const METRIC_LABELS = {
  leads: "Leads",
  contracts: "Contracts",
  revenue: "Revenue",
}

const formatValue = (value: number, metric: string) => {
  if (metric === "revenue") {
    return `$${(value / 1000).toFixed(1)}K`
  }
  return value.toFixed(0)
}

const formatGrowth = (growth: number | null) => {
  if (growth === null || growth === undefined) return "N/A"
  const sign = growth >= 0 ? "+" : ""
  return `${sign}${growth.toFixed(1)}%`
}

export function WeekOverWeekComparison({
  data,
  metric = "leads",
  title = "Week-over-Week Performance",
  loading = false,
}: WeekOverWeekComparisonProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
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
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center text-gray-500">
            No comparison data available
          </div>
        </CardContent>
      </Card>
    )
  }

  // Aggregate by platform (sum across weeks)
  const platformData = data.reduce((acc, item) => {
    const platform = item.platform
    if (!acc[platform]) {
      acc[platform] = {
        platform,
        current: 0,
        previous: 0,
        growth: 0,
      }
    }

    const growthKey = `${metric}_growth_pct` as keyof V9PlatformComparison
    const currentKey = metric as keyof V9PlatformComparison
    const prevKey = `prev_period_${metric}` as keyof V9PlatformComparison

    acc[platform].current += Number(item[currentKey]) || 0
    acc[platform].previous += Number(item[prevKey]) || 0

    // Calculate weighted average growth
    const growth = item[growthKey] as number
    if (growth !== null && growth !== undefined) {
      acc[platform].growth = growth
    }

    return acc
  }, {} as Record<string, { platform: string; current: number; previous: number; growth: number }>)

  const chartData = Object.values(platformData)
    .sort((a, b) => b.current - a.current)
    .slice(0, 8) // Top 8 platforms

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null

    const data = payload[0].payload
    const growth = data.growth

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
        <p className="font-semibold text-sm mb-2 capitalize">{data.platform}</p>
        <div className="space-y-1 text-xs">
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-600">Current:</span>
            <span className="font-semibold">{formatValue(data.current, metric)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-600">Previous:</span>
            <span className="font-semibold">{formatValue(data.previous, metric)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 pt-2 border-t">
            <span className="text-gray-600">Growth:</span>
            <span className={`font-bold ${growth >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatGrowth(growth)}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title} - {METRIC_LABELS[metric]}</span>
          <div className="flex items-center gap-2 text-sm font-normal text-gray-600">
            <span>Previous</span>
            <ArrowRight className="h-4 w-4" />
            <span>Current</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={chartData}
            layout="horizontal"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" stroke="#6b7280" fontSize={12} />
            <YAxis
              type="category"
              dataKey="platform"
              stroke="#6b7280"
              fontSize={12}
              width={80}
              tickFormatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar
              dataKey="previous"
              name="Previous Period"
              fill="#9ca3af"
              radius={[0, 4, 4, 0]}
            />
            <Bar
              dataKey="current"
              name="Current Period"
              radius={[0, 4, 4, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={PLATFORM_COLORS[entry.platform.toLowerCase()] || PLATFORM_COLORS.other}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Growth Indicators */}
        <div className="mt-6 pt-6 border-t">
          <h4 className="text-sm font-semibold mb-3">Growth Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {chartData.slice(0, 4).map((item) => {
              const isPositive = item.growth >= 0
              return (
                <div
                  key={item.platform}
                  className="p-3 rounded-lg border"
                  style={{
                    borderColor: PLATFORM_COLORS[item.platform.toLowerCase()] || PLATFORM_COLORS.other,
                    backgroundColor: `${PLATFORM_COLORS[item.platform.toLowerCase()] || PLATFORM_COLORS.other}10`,
                  }}
                >
                  <div className="text-xs text-gray-600 capitalize mb-1">
                    {item.platform}
                  </div>
                  <div className={`text-lg font-bold flex items-center gap-1 ${isPositive ? "text-green-600" : "text-red-600"}`}>
                    {isPositive ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    {formatGrowth(item.growth)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
