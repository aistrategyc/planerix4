/**
 * Platform KPI Cards Component
 * Enhanced visualization for V9 Platform Performance
 * Shows best performers across key metrics
 * Created: October 23, 2025
 */

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, DollarSign, Target, Users, Award } from "lucide-react"

interface PlatformKPI {
  platform: string
  metric_name: string
  metric_value: number | string
  growth_pct?: number | null
  icon: "conversion" | "revenue" | "contracts" | "roi"
}

interface PlatformKPICardsProps {
  data: {
    best_conversion?: { platform: string; value: number }
    highest_revenue?: { platform: string; value: number }
    most_contracts?: { platform: string; value: number }
    best_roas?: { platform: string; value: number }
  }
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

const getIconComponent = (type: string) => {
  switch (type) {
    case "conversion":
      return Target
    case "revenue":
      return DollarSign
    case "contracts":
      return Users
    case "roi":
      return Award
    default:
      return TrendingUp
  }
}

const formatValue = (value: number, type: string) => {
  if (type === "conversion" || type === "roi") {
    return `${value.toFixed(1)}%`
  }
  if (type === "revenue") {
    return `${(value / 1000).toFixed(0)}K`
  }
  return value.toString()
}

export function PlatformKPICards({ data, loading = false }: PlatformKPICardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const cards: PlatformKPI[] = []

  if (data.best_conversion) {
    cards.push({
      platform: data.best_conversion.platform,
      metric_name: "Best Conversion",
      metric_value: data.best_conversion.value,
      icon: "conversion",
    })
  }

  if (data.highest_revenue) {
    cards.push({
      platform: data.highest_revenue.platform,
      metric_name: "Highest Revenue",
      metric_value: data.highest_revenue.value,
      icon: "revenue",
    })
  }

  if (data.most_contracts) {
    cards.push({
      platform: data.most_contracts.platform,
      metric_name: "Most Contracts",
      metric_value: data.most_contracts.value,
      icon: "contracts",
    })
  }

  if (data.best_roas) {
    cards.push({
      platform: data.best_roas.platform,
      metric_name: "Best ROAS",
      metric_value: data.best_roas.value,
      icon: "roi",
    })
  }

  if (cards.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          No platform data available
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const Icon = getIconComponent(card.icon)
        const platformColor = PLATFORM_COLORS[card.platform.toLowerCase()] || PLATFORM_COLORS.other
        const formattedValue = typeof card.metric_value === "number"
          ? formatValue(card.metric_value, card.icon)
          : card.metric_value

        return (
          <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Icon className="h-4 w-4" style={{ color: platformColor }} />
                {card.metric_name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="text-2xl font-bold" style={{ color: platformColor }}>
                  {formattedValue}
                </div>
                <div className="text-sm text-gray-500 capitalize flex items-center gap-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: platformColor }}
                  />
                  {card.platform}
                </div>
                {card.growth_pct !== undefined && card.growth_pct !== null && (
                  <div className={`text-xs flex items-center gap-1 ${card.growth_pct >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {card.growth_pct >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {Math.abs(card.growth_pct).toFixed(1)}% vs last period
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
