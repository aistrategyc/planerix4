"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, FunnelChart } from 'recharts'
import { TrendingUp, Target, Eye, Users, Activity, Filter, Zap } from "lucide-react"
import { api } from "@/lib/api/config"

interface FunnelData {
  funnel_data: Array<{
    date: string
    platform: string
    campaign_key: string
    creative_key: string
    product_key: string
    impressions: number
    clicks: number
    cost: number
    leads: number
    contracts: number
    revenue: number
    ctr: number
    cpc: number
    cpl: number
    cpa: number
    lead_to_contract_rate: number
    roas: number
  }>
  funnel_totals: {
    total_impressions: number
    total_clicks: number
    total_cost: number
    total_leads: number
    total_contracts: number
    total_revenue: number
  }
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

const formatPercent = (value: number) => {
  return `${(value || 0).toFixed(2)}%`
}

export default function FunnelPage() {
  const [data, setData] = useState<FunnelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all")
  const [selectedProduct, setSelectedProduct] = useState<string>("all")
  const [viewType, setViewType] = useState<string>("overview")

  useEffect(() => {
    fetchData()
  }, [selectedPlatform, selectedProduct])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (selectedPlatform !== "all") {
        params.append("platform", selectedPlatform)
      }
      if (selectedProduct !== "all") {
        params.append("product_key", selectedProduct)
      }

      const response = await api.get(`/analytics/marketing/attribution-funnel?${params.toString()}`)

      if (response.ok) {
        const result = await response.json()
        setData(result)
      } else {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data")
      console.error("Fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  // Подготовка данных воронки для визуализации
  const prepareFunnelVisualization = () => {
    if (!data?.funnel_totals) return []

    const totals = data.funnel_totals
    return [
      { stage: "Показы", value: totals.total_impressions, color: "#8884d8", rate: 100 },
      { stage: "Клики", value: totals.total_clicks, color: "#82ca9d", rate: totals.total_impressions > 0 ? (totals.total_clicks / totals.total_impressions) * 100 : 0 },
      { stage: "Лиды", value: totals.total_leads, color: "#ffc658", rate: totals.total_clicks > 0 ? (totals.total_leads / totals.total_clicks) * 100 : 0 },
      { stage: "Контракты", value: totals.total_contracts, color: "#ff7300", rate: totals.total_leads > 0 ? (totals.total_contracts / totals.total_leads) * 100 : 0 },
    ]
  }

  // Временная динамика воронки
  const prepareTimelineFunnel = () => {
    if (!data?.funnel_data) return []

    const groupedByDate = data.funnel_data.reduce((acc, item) => {
      if (!acc[item.date]) {
        acc[item.date] = {
          date: item.date,
          impressions: 0,
          clicks: 0,
          leads: 0,
          contracts: 0,
          cost: 0,
          revenue: 0
        }
      }
      acc[item.date].impressions += item.impressions
      acc[item.date].clicks += item.clicks
      acc[item.date].leads += item.leads
      acc[item.date].contracts += item.contracts
      acc[item.date].cost += item.cost
      acc[item.date].revenue += item.revenue
      return acc
    }, {} as Record<string, any>)

    return Object.values(groupedByDate)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30) // Последние 30 дней
  }

  // Анализ эффективности по кампаниям
  const prepareCampaignAnalysis = () => {
    if (!data?.funnel_data) return []

    const groupedByCampaign = data.funnel_data.reduce((acc, item) => {
      const key = `${item.campaign_key}_${item.platform}`
      if (!acc[key]) {
        acc[key] = {
          campaign_key: item.campaign_key,
          platform: item.platform,
          impressions: 0,
          clicks: 0,
          leads: 0,
          contracts: 0,
          cost: 0,
          revenue: 0
        }
      }
      acc[key].impressions += item.impressions
      acc[key].clicks += item.clicks
      acc[key].leads += item.leads
      acc[key].contracts += item.contracts
      acc[key].cost += item.cost
      acc[key].revenue += item.revenue
      return acc
    }, {} as Record<string, any>)

    return Object.values(groupedByCampaign)
      .filter(item => item.cost > 0)
      .map(item => ({
        ...item,
        ctr: item.impressions > 0 ? (item.clicks / item.impressions) * 100 : 0,
        conversion_rate: item.clicks > 0 ? (item.leads / item.clicks) * 100 : 0,
        lead_to_deal: item.leads > 0 ? (item.contracts / item.leads) * 100 : 0,
        roas: item.cost > 0 ? item.revenue / item.cost : 0
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
  }

  // Вычисление ключевых метрик
  const calculateMetrics = () => {
    if (!data?.funnel_totals) return {
      ctr: 0,
      clickToLead: 0,
      leadToContract: 0,
      overallConversion: 0,
      averageRoas: 0,
      costPerStage: { cpc: 0, cpl: 0, cpa: 0 }
    }

    const totals = data.funnel_totals
    const ctr = totals.total_impressions > 0 ? (totals.total_clicks / totals.total_impressions) * 100 : 0
    const clickToLead = totals.total_clicks > 0 ? (totals.total_leads / totals.total_clicks) * 100 : 0
    const leadToContract = totals.total_leads > 0 ? (totals.total_contracts / totals.total_leads) * 100 : 0
    const overallConversion = totals.total_impressions > 0 ? (totals.total_contracts / totals.total_impressions) * 100 : 0

    const averageRoas = data.funnel_data.length > 0
      ? data.funnel_data.reduce((sum, item) => sum + item.roas, 0) / data.funnel_data.length
      : 0

    const costPerStage = {
      cpc: totals.total_clicks > 0 ? totals.total_cost / totals.total_clicks : 0,
      cpl: totals.total_leads > 0 ? totals.total_cost / totals.total_leads : 0,
      cpa: totals.total_contracts > 0 ? totals.total_cost / totals.total_contracts : 0
    }

    return {
      ctr,
      clickToLead,
      leadToContract,
      overallConversion,
      averageRoas,
      costPerStage
    }
  }

  const availableProducts = data?.funnel_data
    ? Array.from(new Set(data.funnel_data.map(item => item.product_key).filter(Boolean)))
    : []

  const availablePlatforms = data?.funnel_data
    ? Array.from(new Set(data.funnel_data.map(item => item.platform)))
    : []

  const funnelVisualization = prepareFunnelVisualization()
  const timelineFunnel = prepareTimelineFunnel()
  const campaignAnalysis = prepareCampaignAnalysis()
  const metrics = calculateMetrics()

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">⚡ Attribution Funnel</h1>
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
          <h1 className="text-2xl font-bold text-gray-900">⚡ Attribution Funnel</h1>
          <p className="text-gray-500 mt-1">Полная воронка атрибуции от показа до контракта</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Платформа" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">📊 Все</SelectItem>
              {availablePlatforms.map(platform => (
                <SelectItem key={platform} value={platform}>
                  {platform === 'facebook' && '📘'}
                  {platform === 'google_ads' && '🔍'}
                  {platform === 'other' && '🔗'}
                  {platform}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {availableProducts.length > 0 && (
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Продукт" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">📦 Все продукты</SelectItem>
                {availableProducts.slice(0, 10).map(product => (
                  <SelectItem key={product} value={product}>
                    {product}
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
              <SelectItem value="overview">📊 Обзор</SelectItem>
              <SelectItem value="timeline">📅 Динамика</SelectItem>
              <SelectItem value="campaigns">🎯 Кампании</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">CTR</CardTitle>
            <Eye className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercent(metrics.ctr)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Клик → Лид</CardTitle>
            <Users className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercent(metrics.clickToLead)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Лид → Контракт</CardTitle>
            <Target className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercent(metrics.leadToContract)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Общая конверсия</CardTitle>
            <TrendingUp className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercent(metrics.overallConversion)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Funnel Visualization */}
      {viewType === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Воронка конверсии
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={funnelVisualization} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="stage" type="category" width={80} />
                  <Tooltip
                    formatter={(value, name) => [
                      formatNumber(Number(value)),
                      name === 'value' ? 'Количество' : name
                    ]}
                    labelFormatter={(label) => `${label}: ${funnelVisualization.find(f => f.stage === label)?.rate.toFixed(2)}% от предыдущего`}
                  />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Стоимость на этапе
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">CPC (Стоимость клика)</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(metrics.costPerStage.cpc)}</p>
                </div>
                <Eye className="h-8 w-8 text-blue-500" />
              </div>

              <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">CPL (Стоимость лида)</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(metrics.costPerStage.cpl)}</p>
                </div>
                <Users className="h-8 w-8 text-green-500" />
              </div>

              <div className="flex justify-between items-center p-4 bg-purple-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">CPA (Стоимость контракта)</p>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(metrics.costPerStage.cpa)}</p>
                </div>
                <Target className="h-8 w-8 text-purple-500" />
              </div>

              <div className="flex justify-between items-center p-4 bg-orange-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Средний ROAS</p>
                  <p className="text-2xl font-bold text-orange-600">{metrics.averageRoas.toFixed(2)}x</p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {viewType === "timeline" && timelineFunnel.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Динамика воронки по дням
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={timelineFunnel}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                  formatter={(value, name) => [
                    formatNumber(Number(value)),
                    name === 'impressions' ? 'Показы' :
                    name === 'clicks' ? 'Клики' :
                    name === 'leads' ? 'Лиды' :
                    name === 'contracts' ? 'Контракты' : name
                  ]}
                />
                <Legend />
                <Area type="monotone" dataKey="impressions" stackId="1" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} name="Показы" />
                <Area type="monotone" dataKey="clicks" stackId="2" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} name="Клики" />
                <Area type="monotone" dataKey="leads" stackId="3" stroke="#ffc658" fill="#ffc658" fillOpacity={0.8} name="Лиды" />
                <Area type="monotone" dataKey="contracts" stackId="4" stroke="#ff7300" fill="#ff7300" fillOpacity={1} name="Контракты" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {viewType === "campaigns" && campaignAnalysis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Анализ эффективности кампаний
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="pb-2">Кампания</th>
                    <th className="pb-2">Платформа</th>
                    <th className="pb-2">Показы</th>
                    <th className="pb-2">CTR</th>
                    <th className="pb-2">Конверсия в лид</th>
                    <th className="pb-2">Лид → Контракт</th>
                    <th className="pb-2">Затраты</th>
                    <th className="pb-2">ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {campaignAnalysis.map((campaign, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 font-medium max-w-xs truncate" title={campaign.campaign_key}>
                        {campaign.campaign_key.length > 30
                          ? campaign.campaign_key.substring(0, 30) + "..."
                          : campaign.campaign_key}
                      </td>
                      <td className="py-2">
                        <Badge variant="outline">{campaign.platform}</Badge>
                      </td>
                      <td className="py-2">{formatNumber(campaign.impressions)}</td>
                      <td className="py-2">
                        <span className={campaign.ctr > 2 ? "text-green-600 font-medium" : campaign.ctr > 1 ? "text-orange-600" : "text-gray-600"}>
                          {formatPercent(campaign.ctr)}
                        </span>
                      </td>
                      <td className="py-2">
                        <span className={campaign.conversion_rate > 10 ? "text-green-600 font-medium" : campaign.conversion_rate > 5 ? "text-orange-600" : "text-gray-600"}>
                          {formatPercent(campaign.conversion_rate)}
                        </span>
                      </td>
                      <td className="py-2">
                        <span className={campaign.lead_to_deal > 20 ? "text-green-600 font-medium" : campaign.lead_to_deal > 10 ? "text-orange-600" : "text-gray-600"}>
                          {formatPercent(campaign.lead_to_deal)}
                        </span>
                      </td>
                      <td className="py-2">{formatCurrency(campaign.cost)}</td>
                      <td className="py-2">
                        <span className={campaign.roas > 3 ? "text-green-600 font-medium" : campaign.roas > 1 ? "text-orange-600" : "text-red-600"}>
                          {campaign.roas.toFixed(2)}x
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Сводная статистика воронки</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-center">
            <div className="space-y-2">
              <div className="text-3xl font-bold text-blue-600">{formatNumber(data?.funnel_totals.total_impressions || 0)}</div>
              <div className="text-muted-foreground text-sm">Показы</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-green-600">{formatNumber(data?.funnel_totals.total_clicks || 0)}</div>
              <div className="text-muted-foreground text-sm">Клики</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-yellow-600">{formatNumber(data?.funnel_totals.total_leads || 0)}</div>
              <div className="text-muted-foreground text-sm">Лиды</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-orange-600">{formatNumber(data?.funnel_totals.total_contracts || 0)}</div>
              <div className="text-muted-foreground text-sm">Контракты</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-purple-600">{formatCurrency(data?.funnel_totals.total_cost || 0)}</div>
              <div className="text-muted-foreground text-sm">Затраты</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-green-600">{formatCurrency(data?.funnel_totals.total_revenue || 0)}</div>
              <div className="text-muted-foreground text-sm">Выручка</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}