/**
 * Facebook Creative Analytics Component
 * Shows creative previews with detailed contract performance
 * Helps identify which creatives are performing vs exhausted
 * Created: October 23, 2025
 */

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Image as ImageIcon,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react"

interface CreativePerformance {
  ad_id: string
  ad_name: string
  adset_name: string
  campaign_name: string
  image_url: string | null
  primary_text: string | null
  headline: string | null
  call_to_action: string | null
  contracts: number
  revenue: number
  leads: number
  spend: number
  roas: number | null
  conversion_rate: number
  cost_per_contract: number | null
  status: "active" | "exhausted" | "needs_attention" | "top_performer"
}

interface FacebookCreativeAnalyticsProps {
  data: CreativePerformance[]
  title?: string
  showTop?: number
  loading?: boolean
}

const formatCurrency = (value: number) => `$${value.toFixed(2)}`
const formatNumber = (value: number) => value.toFixed(0)
const formatPercent = (value: number) => `${value.toFixed(1)}%`

const getStatusBadge = (status: string) => {
  switch (status) {
    case "top_performer":
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Top Performer
        </Badge>
      )
    case "active":
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-200">
          <Clock className="h-3 w-3 mr-1" />
          Active
        </Badge>
      )
    case "needs_attention":
      return (
        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Needs Attention
        </Badge>
      )
    case "exhausted":
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200">
          <TrendingDown className="h-3 w-3 mr-1" />
          Exhausted
        </Badge>
      )
    default:
      return <Badge className="bg-gray-100 text-gray-700">Unknown</Badge>
  }
}

const getPerformanceDescription = (creative: CreativePerformance) => {
  if (creative.status === "top_performer") {
    return `🎯 Лучший креатив! ${creative.contracts} договоров, ROAS ${creative.roas?.toFixed(1)}x`
  }
  if (creative.status === "exhausted") {
    return `⚠️ Креатив исчерпал себя. Низкая конверсия (${creative.conversion_rate.toFixed(1)}%), нужна замена`
  }
  if (creative.status === "needs_attention") {
    return `📊 Средняя производительность. Можно оптимизировать расходы`
  }
  return `✅ Стабильно работающий креатив`
}

export function FacebookCreativeAnalytics({
  data,
  title = "Meta Creative Performance Analysis",
  showTop = 12,
  loading = false,
}: FacebookCreativeAnalyticsProps) {
  const [sortBy, setSortBy] = useState<"revenue" | "contracts" | "roas" | "conversion_rate">("revenue")
  const [filterStatus, setFilterStatus] = useState<string>("all")

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
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
            <ImageIcon className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center text-gray-500">
            No creative data available
          </div>
        </CardContent>
      </Card>
    )
  }

  // Filter and sort data
  let filteredData = data
  if (filterStatus !== "all") {
    filteredData = data.filter((c) => c.status === filterStatus)
  }

  filteredData = [...filteredData].sort((a, b) => {
    switch (sortBy) {
      case "revenue":
        return b.revenue - a.revenue
      case "contracts":
        return b.contracts - a.contracts
      case "roas":
        return (b.roas || 0) - (a.roas || 0)
      case "conversion_rate":
        return b.conversion_rate - a.conversion_rate
      default:
        return 0
    }
  })

  const topCreatives = filteredData.slice(0, showTop)

  // Summary stats
  const totalContracts = topCreatives.reduce((sum, c) => sum + c.contracts, 0)
  const totalRevenue = topCreatives.reduce((sum, c) => sum + c.revenue, 0)
  const totalSpend = topCreatives.reduce((sum, c) => sum + c.spend, 0)
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#1877f2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            {title}
          </CardTitle>

          {/* Filters */}
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="all">All Status</option>
              <option value="top_performer">Top Performers</option>
              <option value="active">Active</option>
              <option value="needs_attention">Needs Attention</option>
              <option value="exhausted">Exhausted</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="revenue">Sort by Revenue</option>
              <option value="contracts">Sort by Contracts</option>
              <option value="roas">Sort by ROAS</option>
              <option value="conversion_rate">Sort by Conv. Rate</option>
            </select>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">Total Contracts</div>
            <div className="text-lg font-bold text-green-600">{totalContracts}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">Total Revenue</div>
            <div className="text-lg font-bold text-purple-600">{formatCurrency(totalRevenue)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">Total Spend</div>
            <div className="text-lg font-bold text-orange-600">{formatCurrency(totalSpend)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">Avg ROAS</div>
            <div className="text-lg font-bold text-blue-600">{avgRoas.toFixed(2)}x</div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Creative Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topCreatives.map((creative) => (
            <Card key={creative.ad_id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {/* Creative Preview */}
              <div className="relative h-48 bg-gray-100">
                {creative.image_url ? (
                  <img
                    src={creative.image_url}
                    alt={creative.ad_name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder-image.png"
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-gray-400" />
                  </div>
                )}

                {/* Status Badge Overlay */}
                <div className="absolute top-2 right-2">
                  {getStatusBadge(creative.status)}
                </div>
              </div>

              {/* Creative Info */}
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Ad Name */}
                  <div>
                    <h4 className="font-semibold text-sm truncate" title={creative.ad_name}>
                      {creative.ad_name}
                    </h4>
                    <p className="text-xs text-gray-500 truncate" title={creative.campaign_name}>
                      {creative.campaign_name}
                    </p>
                  </div>

                  {/* Ad Copy Preview */}
                  {(creative.headline || creative.primary_text) && (
                    <div className="text-xs bg-gray-50 p-2 rounded">
                      {creative.headline && (
                        <p className="font-medium line-clamp-1">{creative.headline}</p>
                      )}
                      {creative.primary_text && (
                        <p className="text-gray-600 line-clamp-2 mt-1">{creative.primary_text}</p>
                      )}
                    </div>
                  )}

                  {/* Performance Description */}
                  <div className="text-xs bg-blue-50 p-2 rounded border border-blue-200">
                    {getPerformanceDescription(creative)}
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="text-gray-500">Contracts</div>
                      <div className="font-bold text-green-600">{creative.contracts}</div>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="text-gray-500">Revenue</div>
                      <div className="font-bold text-purple-600">
                        {formatCurrency(creative.revenue)}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="text-gray-500">Conv. Rate</div>
                      <div className="font-bold">{formatPercent(creative.conversion_rate)}</div>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="text-gray-500">ROAS</div>
                      <div className="font-bold text-blue-600">
                        {creative.roas ? `${creative.roas.toFixed(2)}x` : "N/A"}
                      </div>
                    </div>
                  </div>

                  {/* Contract Details */}
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Leads → Contracts:</span>
                      <span className="font-semibold">
                        {creative.leads} → {creative.contracts}
                      </span>
                    </div>
                    {creative.cost_per_contract && (
                      <div className="flex items-center justify-between text-xs mt-1">
                        <span className="text-gray-600">Cost per Contract:</span>
                        <span className="font-semibold">
                          {formatCurrency(creative.cost_per_contract)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {creative.call_to_action && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs"
                      onClick={() => window.open(`https://facebook.com/ads/library/${creative.ad_id}`, "_blank")}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View in Ads Library
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom Legend */}
        <div className="mt-6 pt-6 border-t">
          <h4 className="text-sm font-semibold mb-3">Status Legend</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="flex items-start gap-2">
              {getStatusBadge("top_performer")}
              <span className="text-gray-600">Высокая конверсия, отличный ROAS, много договоров</span>
            </div>
            <div className="flex items-start gap-2">
              {getStatusBadge("active")}
              <span className="text-gray-600">Стабильно работает, средние показатели</span>
            </div>
            <div className="flex items-start gap-2">
              {getStatusBadge("needs_attention")}
              <span className="text-gray-600">Требует оптимизации, низкий ROAS или конверсия</span>
            </div>
            <div className="flex items-start gap-2">
              {getStatusBadge("exhausted")}
              <span className="text-gray-600">Исчерпан, не дает результатов, нужна замена</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
