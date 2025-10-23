/**
 * Platform Performance Trends Component
 * Multi-line chart showing leads, contracts, revenue trends over time
 * Supports platform filtering and comparison
 * Created: October 23, 2025
 */

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { TrendingUp } from "lucide-react"

interface TrendDataPoint {
  dt: string
  platform?: string
  leads?: number
  contracts?: number
  revenue?: number
  conversion_rate?: number
}

interface PlatformPerformanceTrendsProps {
  data: TrendDataPoint[]
  metrics?: ("leads" | "contracts" | "revenue" | "conversion_rate")[]
  title?: string
  loading?: boolean
}

const METRIC_COLORS = {
  leads: "#3b82f6",
  contracts: "#10b981",
  revenue: "#f59e0b",
  conversion_rate: "#8b5cf6",
}

const METRIC_LABELS = {
  leads: "Leads",
  contracts: "Contracts",
  revenue: "Revenue",
  conversion_rate: "Conversion %",
}

const formatValue = (value: number | undefined, metric: string) => {
  if (value === undefined || value === null) return "N/A"

  switch (metric) {
    case "revenue":
      return `$${(value / 1000).toFixed(1)}K`
    case "conversion_rate":
      return `${value.toFixed(1)}%`
    default:
      return value.toFixed(0)
  }
}

const formatDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  } catch {
    return dateStr
  }
}

export function PlatformPerformanceTrends({
  data,
  metrics = ["leads", "contracts", "revenue"],
  title = "Platform Performance Trends",
  loading = false,
}: PlatformPerformanceTrendsProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 animate-pulse bg-gray-100 rounded"></div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-gray-500">
            No trend data available
          </div>
        </CardContent>
      </Card>
    )
  }

  // Prepare data for chart
  const chartData = data.map((item) => ({
    date: formatDate(item.dt),
    ...item,
  }))

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-semibold text-sm mb-2">{payload[0].payload.date}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600">{entry.name}:</span>
            <span className="font-semibold">
              {formatValue(entry.value, entry.dataKey)}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
            />
            <YAxis stroke="#6b7280" fontSize={12} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: "20px" }}
              iconType="line"
              formatter={(value) => METRIC_LABELS[value as keyof typeof METRIC_LABELS] || value}
            />
            {metrics.map((metric) => (
              <Line
                key={metric}
                type="monotone"
                dataKey={metric}
                stroke={METRIC_COLORS[metric]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                name={METRIC_LABELS[metric]}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
          {metrics.map((metric) => {
            const values = data.map((d) => d[metric]).filter((v) => v !== undefined && v !== null) as number[]
            const total = values.reduce((sum, v) => sum + v, 0)
            const avg = values.length > 0 ? total / values.length : 0

            return (
              <div key={metric} className="text-center">
                <div className="text-xs text-gray-500 mb-1">
                  Avg {METRIC_LABELS[metric]}
                </div>
                <div className="text-lg font-bold" style={{ color: METRIC_COLORS[metric] }}>
                  {formatValue(avg, metric)}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
