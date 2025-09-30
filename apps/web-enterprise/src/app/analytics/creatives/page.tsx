"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts'
import { Eye, Image, TrendingUp, Activity, Search, ExternalLink, BarChart3 } from "lucide-react"
import { AnalyticsAPI } from "@/lib/api/analytics"
import { DateRangeFilter } from "@/components/analytics/DateRangeFilter"
import { useAnalyticsDateRange } from "@/hooks/useAnalyticsDateRange"

interface CreativeData {
  creatives: Array<{
    creative_key: string
    platform: string
    fb_title: string | null
    fb_permalink_url: string | null
    impressions: number
    clicks: number
    cost: number
    ctr_pct: number
    cpc: number
  }>
  latest_activity: Array<{
    creative_key: string
    platform: string
    first_seen: string
    last_active_date: string
  }>
  rolling_7d: Array<{
    creative_key: string
    platform: string
    impressions_7d: number
    clicks_7d: number
    cost_7d: number
    avg_ctr_7d: number
    avg_cpc_7d: number
  }>
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 2
  }).format(value)
}

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('ru-RU').format(value)
}

const formatPercent = (value: number) => {
  return `${(value || 0).toFixed(2)}%`
}

export default function CreativesPage() {
  const [data, setData] = useState<CreativeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [viewType, setViewType] = useState<string>("performance")
  const [sortBy, setSortBy] = useState<string>("cost")

  // Date range management
  const { dateRange, apiDateRange, updateDateRange } = useAnalyticsDateRange(30)

  useEffect(() => {
    fetchData()
  }, [selectedPlatform, apiDateRange])

  // Отдельный эффект для поиска с debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== "") {
        fetchData()
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const platform = selectedPlatform !== "all" ? selectedPlatform : undefined
      const searchText = searchTerm && searchTerm.trim() ? searchTerm.trim() : undefined
      const result = await AnalyticsAPI.getMarketingCreatives({
        dateRange: apiDateRange,
        platform,
        searchText
      })
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data")
      console.error("Fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  // Подготовка данных для топ креативов
  const prepareTopCreatives = () => {
    if (!data?.rolling_7d) return []

    const sorted = [...data.rolling_7d].sort((a, b) => {
      switch (sortBy) {
        case "cost":
          return b.cost_7d - a.cost_7d
        case "ctr":
          return b.avg_ctr_7d - a.avg_ctr_7d
        case "clicks":
          return b.clicks_7d - a.clicks_7d
        case "impressions":
          return b.impressions_7d - a.impressions_7d
        default:
          return b.cost_7d - a.cost_7d
      }
    })

    return sorted.slice(0, 15)
  }

  // Подготовка scatter data для анализа эффективности
  const prepareEfficiencyScatter = () => {
    if (!data?.rolling_7d) return []

    return data.rolling_7d
      .filter(item => item.cost_7d > 0 && item.avg_ctr_7d > 0)
      .map(item => ({
        x: item.avg_ctr_7d,
        y: item.avg_cpc_7d,
        size: Math.log(item.cost_7d + 1) * 10,
        creative: item.creative_key.substring(0, 20) + "...",
        platform: item.platform,
        cost: item.cost_7d,
        clicks: item.clicks_7d
      }))
  }

  // Анализ производительности креативов
  const preparePerformanceAnalysis = () => {
    if (!data?.creatives) return []

    return data.creatives
      .filter(item => item.cost > 0)
      .sort((a, b) => b.ctr_pct - a.ctr_pct)
      .slice(0, 10)
      .map(item => ({
        creative: item.creative_key.substring(0, 30) + "...",
        ctr: item.ctr_pct,
        cpc: item.cpc,
        cost: item.cost,
        platform: item.platform,
        title: item.fb_title
      }))
  }

  // Вычисление общих метрик
  const calculateTotals = () => {
    if (!data?.rolling_7d) return {
      totalCreatives: 0,
      totalCost: 0,
      totalClicks: 0,
      totalImpressions: 0,
      avgCTR: 0,
      avgCPC: 0
    }

    const totals = data.rolling_7d.reduce((acc, item) => {
      acc.totalCost += item.cost_7d
      acc.totalClicks += item.clicks_7d
      acc.totalImpressions += item.impressions_7d
      return acc
    }, { totalCost: 0, totalClicks: 0, totalImpressions: 0 })

    const avgCTR = totals.totalImpressions > 0 ? (totals.totalClicks / totals.totalImpressions) * 100 : 0
    const avgCPC = totals.totalClicks > 0 ? totals.totalCost / totals.totalClicks : 0

    return {
      totalCreatives: data.rolling_7d.length,
      ...totals,
      avgCTR,
      avgCPC
    }
  }

  const platforms = data?.creatives
    ? Array.from(new Set(data.creatives.map(item => item.platform)))
    : []

  const totals = calculateTotals()
  const topCreatives = prepareTopCreatives()
  const efficiencyScatter = prepareEfficiencyScatter()
  const performanceAnalysis = preparePerformanceAnalysis()

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">🎨 Анализ креативов</h1>
          <div className="animate-pulse bg-gray-200 rounded h-8 w-32"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-200 rounded-lg h-32"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-lg font-medium">Error loading data</div>
        <div className="text-gray-500 mt-2">{error}</div>
        <Button onClick={fetchData} className="mt-4">Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🎨 Анализ креативов</h1>
          <p className="text-gray-500 mt-1">Эффективность рекламных материалов и творческий анализ</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <DateRangeFilter
            value={dateRange}
            onChange={updateDateRange}
          />

          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Поиск креативов..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-[200px]"
            />
          </div>

          <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Платформа" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">📊 Все</SelectItem>
              {platforms.map(platform => (
                <SelectItem key={platform} value={platform}>
                  {platform === 'facebook' && '📘'}
                  {platform === 'google_ads' && '🔍'}
                  {platform === 'other' && '🔗'}
                  {platform}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Сортировка" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cost">💰 Затраты</SelectItem>
              <SelectItem value="ctr">📈 CTR</SelectItem>
              <SelectItem value="clicks">👆 Клики</SelectItem>
              <SelectItem value="impressions">👁️ Показы</SelectItem>
            </SelectContent>
          </Select>

          <Select value={viewType} onValueChange={setViewType}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Вид" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="performance">📊 Performance</SelectItem>
              <SelectItem value="scatter">📈 Scatter</SelectItem>
              <SelectItem value="gallery">🖼️ Gallery</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Активных креативов</CardTitle>
            <Image className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.totalCreatives}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Общие затраты (7д)</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalCost)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Средний CTR</CardTitle>
            <Activity className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercent(totals.avgCTR)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Средний CPC</CardTitle>
            <Eye className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.avgCPC)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {viewType === "performance" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Топ креативы по {sortBy === "cost" ? "затратам" : sortBy === "ctr" ? "CTR" : sortBy === "clicks" ? "кликам" : "показам"} (7 дней)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={topCreatives} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis
                    dataKey="creative_key"
                    type="category"
                    width={120}
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => value.length > 15 ? value.substring(0, 15) + "..." : value}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      name.includes('cost') ? formatCurrency(Number(value)) :
                      name.includes('ctr') ? formatPercent(Number(value)) :
                      formatNumber(Number(value)),
                      name.includes('cost') ? 'Затраты' :
                      name.includes('ctr') ? 'CTR' :
                      name.includes('clicks') ? 'Клики' :
                      name.includes('impressions') ? 'Показы' : name
                    ]}
                  />
                  <Legend />
                  <Bar
                    dataKey={sortBy === "cost" ? "cost_7d" : sortBy === "ctr" ? "avg_ctr_7d" : sortBy === "clicks" ? "clicks_7d" : "impressions_7d"}
                    fill="#8884d8"
                    name={sortBy === "cost" ? "Затраты (7д)" : sortBy === "ctr" ? "CTR" : sortBy === "clicks" ? "Клики (7д)" : "Показы (7д)"}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Лучшие креативы по CTR
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={performanceAnalysis}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="creative"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 9 }}
                  />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => [
                      name === 'ctr' ? formatPercent(Number(value)) :
                      name === 'cpc' ? formatCurrency(Number(value)) :
                      name === 'cost' ? formatCurrency(Number(value)) :
                      formatNumber(Number(value)),
                      name === 'ctr' ? 'CTR' :
                      name === 'cpc' ? 'CPC' :
                      name === 'cost' ? 'Затраты' : name
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="ctr" fill="#82ca9d" name="CTR %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {viewType === "scatter" && efficiencyScatter.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Эффективность креативов: CTR vs CPC
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={500}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="x" name="CTR %" />
                <YAxis dataKey="y" name="CPC" />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  formatter={(value, name) => [
                    name === 'x' ? `${Number(value).toFixed(2)}%` :
                    name === 'y' ? formatCurrency(Number(value)) :
                    value,
                    name === 'x' ? 'CTR' :
                    name === 'y' ? 'CPC' : name
                  ]}
                  labelFormatter={(label) => `Creative: ${label}`}
                />
                <Scatter name="Креативы" data={efficiencyScatter} fill="#8884d8" />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Creative Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>🖼️ Детали креативов</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="pb-2">ID креатива</th>
                  <th className="pb-2">Платформа</th>
                  <th className="pb-2">Название</th>
                  <th className="pb-2">Показы</th>
                  <th className="pb-2">Клики</th>
                  <th className="pb-2">Затраты</th>
                  <th className="pb-2">CTR</th>
                  <th className="pb-2">CPC</th>
                  <th className="pb-2">Ссылка</th>
                </tr>
              </thead>
              <tbody>
                {data?.creatives?.slice(0, 20).map((creative, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 font-mono text-xs max-w-xs truncate" title={creative.creative_key}>
                      {creative.creative_key.length > 20
                        ? creative.creative_key.substring(0, 20) + "..."
                        : creative.creative_key}
                    </td>
                    <td className="py-2">
                      <Badge variant="outline">{creative.platform}</Badge>
                    </td>
                    <td className="py-2 max-w-xs truncate" title={creative.fb_title || "No title"}>
                      {creative.fb_title ? (
                        creative.fb_title.length > 30
                          ? creative.fb_title.substring(0, 30) + "..."
                          : creative.fb_title
                      ) : (
                        <span className="text-gray-400">No title</span>
                      )}
                    </td>
                    <td className="py-2">{formatNumber(creative.impressions)}</td>
                    <td className="py-2">{formatNumber(creative.clicks)}</td>
                    <td className="py-2">{formatCurrency(creative.cost)}</td>
                    <td className="py-2">
                      <span className={creative.ctr_pct > 1 ? "text-green-600 font-medium" : creative.ctr_pct > 0.5 ? "text-orange-600" : "text-gray-600"}>
                        {formatPercent(creative.ctr_pct)}
                      </span>
                    </td>
                    <td className="py-2">{formatCurrency(creative.cpc)}</td>
                    <td className="py-2">
                      {creative.fb_permalink_url ? (
                        <a
                          href={creative.fb_permalink_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>⏱️ Последняя активность креативов</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="pb-2">Креатив</th>
                  <th className="pb-2">Платформа</th>
                  <th className="pb-2">Первый показ</th>
                  <th className="pb-2">Последняя активность</th>
                  <th className="pb-2">Статус</th>
                </tr>
              </thead>
              <tbody>
                {data?.latest_activity?.slice(0, 15).map((creative, index) => {
                  const daysSinceActive = Math.floor(
                    (new Date().getTime() - new Date(creative.last_active_date).getTime()) / (1000 * 3600 * 24)
                  )

                  return (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-2 font-mono text-xs max-w-xs truncate" title={creative.creative_key}>
                        {creative.creative_key.length > 30
                          ? creative.creative_key.substring(0, 30) + "..."
                          : creative.creative_key}
                      </td>
                      <td className="py-2">
                        <Badge variant="outline">{creative.platform}</Badge>
                      </td>
                      <td className="py-2 text-gray-600">
                        {new Date(creative.first_seen).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="py-2 text-gray-600">
                        {new Date(creative.last_active_date).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="py-2">
                        <Badge
                          variant={daysSinceActive <= 1 ? "default" : daysSinceActive <= 7 ? "secondary" : "outline"}
                          className={
                            daysSinceActive <= 1 ? "bg-green-100 text-green-800" :
                            daysSinceActive <= 7 ? "bg-yellow-100 text-yellow-800" :
                            "bg-gray-100 text-gray-600"
                          }
                        >
                          {daysSinceActive <= 1 ? "Активен" :
                           daysSinceActive <= 7 ? "Недавно" :
                           "Неактивен"}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}