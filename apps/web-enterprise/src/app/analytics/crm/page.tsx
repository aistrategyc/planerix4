"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LineChart, Line, AreaChart, Area, BarChart, Bar, FunnelChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Users, TrendingUp, Target, DollarSign, Activity, Filter, Award } from "lucide-react"
import { AnalyticsAPI } from "@/lib/api/analytics"
import { DateRangeFilter } from "@/components/analytics/DateRangeFilter"
import { useAnalyticsDateRange } from "@/hooks/useAnalyticsDateRange"

interface CRMData {
  funnel_data: Array<{
    date: string
    leads: number
    contracts: number
    revenue: number
  }>
  crm_360_data: Array<{
    date: string
    platform: string
    source: string
    cost: number
    leads: number
    contracts: number
    revenue: number
    cpl: number
    cpa: number
    roas: number
  }>
  top_sources_revenue: Array<{
    platform: string
    source: string
    total_revenue: number
    total_leads: number
    total_contracts: number
    total_cost: number
  }>
  top_sources_leads: Array<{
    platform: string
    source: string
    total_leads: number
    total_revenue: number
    total_contracts: number
    total_cost: number
  }>
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0
  }).format(value)
}

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('ru-RU').format(value)
}

export default function CRMPage() {
  const [data, setData] = useState<CRMData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all")
  const [selectedSource, setSelectedSource] = useState<string>("all")
  const [viewType, setViewType] = useState<string>("funnel")

  // Date range management
  const { dateRange, apiDateRange, updateDateRange } = useAnalyticsDateRange(30)

  useEffect(() => {
    fetchData()
  }, [selectedPlatform, selectedSource, apiDateRange])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const platform = selectedPlatform !== "all" ? selectedPlatform : undefined
      const source = selectedSource !== "all" ? selectedSource : undefined
      const result = await AnalyticsAPI.getCRMOutcomes(apiDateRange, platform, source)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data")
      console.error("Fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  // Подготовка данных для воронки конверсии
  const prepareFunnelData = () => {
    if (!data?.funnel_data) return []

    return data.funnel_data.map(item => ({
      date: item.date,
      leads: item.leads,
      contracts: item.contracts,
      revenue: item.revenue,
      conversion_rate: item.leads > 0 ? (item.contracts / item.leads) * 100 : 0
    }))
  }

  // Подготовка данных ROAS по источникам
  const prepareROASData = () => {
    if (!data?.crm_360_data) return []

    const sourceROAS = data.crm_360_data.reduce((acc, item) => {
      const key = `${item.platform}-${item.source}`
      if (!acc[key]) {
        acc[key] = {
          source: item.source,
          platform: item.platform,
          totalCost: 0,
          totalRevenue: 0,
          totalLeads: 0,
          totalContracts: 0
        }
      }
      acc[key].totalCost += item.cost
      acc[key].totalRevenue += item.revenue
      acc[key].totalLeads += item.leads
      acc[key].totalContracts += item.contracts
      return acc
    }, {} as Record<string, any>)

    return Object.values(sourceROAS)
      .map((item: any) => ({
        ...item,
        roas: item.totalCost > 0 ? item.totalRevenue / item.totalCost : 0,
        cpl: item.totalLeads > 0 ? item.totalCost / item.totalLeads : 0
      }))
      .filter(item => item.totalCost > 0)
      .sort((a, b) => b.roas - a.roas)
      .slice(0, 15)
  }

  // Подготовка временных трендов
  const prepareTimelineData = () => {
    if (!data?.funnel_data) return []

    return data.funnel_data
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30) // Последние 30 дней
  }

  // Подготовка данных для анализа источников
  const prepareSourceAnalysis = () => {
    if (!data?.crm_360_data) return []

    const platformData = data.crm_360_data.reduce((acc, item) => {
      if (!acc[item.platform]) {
        acc[item.platform] = {
          platform: item.platform,
          totalCost: 0,
          totalLeads: 0,
          totalContracts: 0,
          totalRevenue: 0,
          sources: new Set()
        }
      }
      acc[item.platform].totalCost += item.cost
      acc[item.platform].totalLeads += item.leads
      acc[item.platform].totalContracts += item.contracts
      acc[item.platform].totalRevenue += item.revenue
      acc[item.platform].sources.add(item.source)
      return acc
    }, {} as Record<string, any>)

    return Object.values(platformData).map((item: any) => ({
      ...item,
      sourceCount: item.sources.size,
      roas: item.totalCost > 0 ? item.totalRevenue / item.totalCost : 0,
      conversionRate: item.totalLeads > 0 ? (item.totalContracts / item.totalLeads) * 100 : 0
    }))
  }

  // Вычисление общих метрик
  const calculateTotals = () => {
    if (!data?.funnel_data) return {
      totalLeads: 0,
      totalContracts: 0,
      totalRevenue: 0,
      avgConversionRate: 0,
      totalSources: 0
    }

    const totals = data.funnel_data.reduce((acc, item) => {
      acc.totalLeads += item.leads
      acc.totalContracts += item.contracts
      acc.totalRevenue += item.revenue
      return acc
    }, { totalLeads: 0, totalContracts: 0, totalRevenue: 0 })

    const avgConversionRate = totals.totalLeads > 0 ? (totals.totalContracts / totals.totalLeads) * 100 : 0
    const totalSources = data?.crm_360_data ? new Set(data.crm_360_data.map(item => `${item.platform}-${item.source}`)).size : 0

    return {
      ...totals,
      avgConversionRate,
      totalSources
    }
  }

  const platforms = data?.crm_360_data
    ? Array.from(new Set(data.crm_360_data.map(item => item.platform)))
    : []

  const sources = data?.crm_360_data && selectedPlatform !== "all"
    ? Array.from(new Set(data.crm_360_data.filter(item => item.platform === selectedPlatform).map(item => item.source)))
    : []

  const totals = calculateTotals()
  const funnelData = prepareFunnelData()
  const roasData = prepareROASData()
  const timelineData = prepareTimelineData()
  const sourceAnalysis = prepareSourceAnalysis()

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">🤝 CRM 360</h1>
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
          <h1 className="text-2xl font-bold text-gray-900">🤝 CRM 360</h1>
          <p className="text-gray-500 mt-1">Полная воронка продаж и анализ источников</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <DateRangeFilter
            value={dateRange}
            onChange={updateDateRange}
          />

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

          {selectedPlatform !== "all" && sources.length > 0 && (
            <Select value={selectedSource} onValueChange={setSelectedSource}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Источник" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">📊 Все источники</SelectItem>
                {sources.map(source => (
                  <SelectItem key={source} value={source}>
                    {source.length > 15 ? source.substring(0, 15) + "..." : source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={viewType} onValueChange={setViewType}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Вид" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="funnel">🔄 Воронка</SelectItem>
              <SelectItem value="roas">📈 ROAS</SelectItem>
              <SelectItem value="timeline">📅 Timeline</SelectItem>
              <SelectItem value="sources">📊 Источники</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Всего лидов</CardTitle>
            <Users className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totals.totalLeads)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Контракты</CardTitle>
            <Target className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totals.totalContracts)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Общая выручка</CardTitle>
            <DollarSign className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalRevenue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Конверсия в продажу</CardTitle>
            <TrendingUp className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.avgConversionRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {viewType === "funnel" && funnelData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Воронка конверсии (по дням)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={funnelData.slice(-30)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => [
                      name === 'conversion_rate' ? `${Number(value).toFixed(1)}%` : formatNumber(Number(value)),
                      name === 'leads' ? 'Лиды' :
                      name === 'contracts' ? 'Контракты' :
                      name === 'conversion_rate' ? 'Конверсия' : name
                    ]}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="leads" stackId="1" stroke="#8884d8" fill="#8884d8" name="Лиды" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="contracts" stackId="2" stroke="#82ca9d" fill="#82ca9d" name="Контракты" fillOpacity={0.8} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Динамика выручки
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={funnelData.slice(-30)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#ff7300" strokeWidth={3} name="Выручка" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {viewType === "roas" && roasData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                ROAS по источникам
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={roasData.slice(0, 10)} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis
                    dataKey="source"
                    type="category"
                    width={120}
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => value.length > 15 ? value.substring(0, 15) + "..." : value}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      name === 'roas' ? `${Number(value).toFixed(2)}x` :
                      name.includes('Cost') || name.includes('Revenue') ? formatCurrency(Number(value)) :
                      formatNumber(Number(value)),
                      name === 'roas' ? 'ROAS' :
                      name === 'totalCost' ? 'Затраты' :
                      name === 'totalRevenue' ? 'Выручка' : name
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="roas" fill="#8884d8" name="ROAS" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                CPL по источникам
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={roasData.slice(0, 10)} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis
                    dataKey="source"
                    type="category"
                    width={120}
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => value.length > 15 ? value.substring(0, 15) + "..." : value}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                  <Legend />
                  <Bar dataKey="cpl" fill="#82ca9d" name="CPL" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {viewType === "timeline" && timelineData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Временные тренды (30 дней)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip
                  formatter={(value, name) => [
                    name === 'conversion_rate' ? `${Number(value).toFixed(1)}%` :
                    name === 'revenue' ? formatCurrency(Number(value)) :
                    formatNumber(Number(value)),
                    name === 'leads' ? 'Лиды' :
                    name === 'contracts' ? 'Контракты' :
                    name === 'revenue' ? 'Выручка' :
                    name === 'conversion_rate' ? 'Конверсия' : name
                  ]}
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="leads" stroke="#8884d8" strokeWidth={2} name="Лиды" />
                <Line yAxisId="left" type="monotone" dataKey="contracts" stroke="#82ca9d" strokeWidth={2} name="Контракты" />
                <Line yAxisId="right" type="monotone" dataKey="conversion_rate" stroke="#ff7300" strokeWidth={2} name="Конверсия %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {viewType === "sources" && sourceAnalysis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Анализ по платформам
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={sourceAnalysis}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="platform" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip
                  formatter={(value, name) => [
                    name.includes('Cost') || name.includes('Revenue') ? formatCurrency(Number(value)) :
                    name === 'roas' ? `${Number(value).toFixed(2)}x` :
                    name === 'conversionRate' ? `${Number(value).toFixed(1)}%` :
                    formatNumber(Number(value)),
                    name === 'totalCost' ? 'Затраты' :
                    name === 'totalRevenue' ? 'Выручка' :
                    name === 'totalLeads' ? 'Лиды' :
                    name === 'totalContracts' ? 'Контракты' :
                    name === 'roas' ? 'ROAS' :
                    name === 'conversionRate' ? 'Конверсия' :
                    name === 'sourceCount' ? 'Источники' : name
                  ]}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="totalLeads" fill="#8884d8" name="Лиды" />
                <Bar yAxisId="left" dataKey="totalContracts" fill="#82ca9d" name="Контракты" />
                <Bar yAxisId="right" dataKey="roas" fill="#ff7300" name="ROAS" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top Sources Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>🏆 Топ источники по выручке</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="pb-2">Источник</th>
                    <th className="pb-2">Платформа</th>
                    <th className="pb-2">Выручка</th>
                    <th className="pb-2">Лиды</th>
                    <th className="pb-2">Контракты</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.top_sources_revenue?.slice(0, 10).map((source, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-2 font-medium max-w-xs truncate" title={source.source}>
                        {source.source.length > 20 ? source.source.substring(0, 20) + "..." : source.source}
                      </td>
                      <td className="py-2">
                        <Badge variant="outline">{source.platform}</Badge>
                      </td>
                      <td className="py-2 font-bold text-green-600">{formatCurrency(source.total_revenue)}</td>
                      <td className="py-2">{formatNumber(source.total_leads)}</td>
                      <td className="py-2">{formatNumber(source.total_contracts)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>👥 Топ источники по лидам</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="pb-2">Источник</th>
                    <th className="pb-2">Платформа</th>
                    <th className="pb-2">Лиды</th>
                    <th className="pb-2">Контракты</th>
                    <th className="pb-2">Конверсия</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.top_sources_leads?.slice(0, 10).map((source, index) => {
                    const conversionRate = source.total_leads > 0 ? (source.total_contracts / source.total_leads) * 100 : 0
                    return (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-2 font-medium max-w-xs truncate" title={source.source}>
                          {source.source.length > 20 ? source.source.substring(0, 20) + "..." : source.source}
                        </td>
                        <td className="py-2">
                          <Badge variant="outline">{source.platform}</Badge>
                        </td>
                        <td className="py-2 font-bold text-blue-600">{formatNumber(source.total_leads)}</td>
                        <td className="py-2">{formatNumber(source.total_contracts)}</td>
                        <td className="py-2">
                          <span className={conversionRate > 10 ? "text-green-600 font-medium" : conversionRate > 5 ? "text-orange-600" : "text-gray-600"}>
                            {conversionRate.toFixed(1)}%
                          </span>
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
    </div>
  )
}