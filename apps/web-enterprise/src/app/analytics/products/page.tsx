"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { Package, TrendingUp, Target, DollarSign, Users, BarChart3, Award } from "lucide-react"
import { api } from "@/lib/api/config"

interface ProductData {
  products: Array<{
    product_key: string
    product_name: string
    product_code: string
    leads: number
    contracts: number
    revenue: number
    avg_contract_value: number
    conversion_rate: number
  }>
  timeline: Array<{
    date: string
    product_key: string
    product_name: string
    contracts: number
    revenue: number
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

const formatPercent = (value: number) => {
  return `${(value || 0).toFixed(1)}%`
}

// Цветовая палитра для продуктов
const PRODUCT_COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00',
  '#0088fe', '#ff8042', '#8dd1e1', '#d084d0', '#ffb347'
]

export default function ProductsPage() {
  const [data, setData] = useState<ProductData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all")
  const [selectedProduct, setSelectedProduct] = useState<string>("all")
  const [viewType, setViewType] = useState<string>("overview")
  const [sortBy, setSortBy] = useState<string>("revenue")

  useEffect(() => {
    fetchData()
  }, [selectedPlatform])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (selectedPlatform !== "all") {
        params.append("platform", selectedPlatform)
      }

      const response = await api.get(`/analytics/marketing/product-performance?${params.toString()}`)

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

  // Подготовка данных для топ продуктов
  const prepareTopProducts = () => {
    if (!data?.products) return []

    const sorted = [...data.products].sort((a, b) => {
      switch (sortBy) {
        case "revenue":
          return b.revenue - a.revenue
        case "leads":
          return b.leads - a.leads
        case "contracts":
          return b.contracts - a.contracts
        case "conversion_rate":
          return b.conversion_rate - a.conversion_rate
        case "avg_contract_value":
          return b.avg_contract_value - a.avg_contract_value
        default:
          return b.revenue - a.revenue
      }
    })

    return sorted.filter(p => p.revenue > 0 || p.leads > 0).slice(0, 10)
  }

  // Подготовка pie chart данных для распределения доходов
  const preparePieData = () => {
    if (!data?.products) return []

    return data.products
      .filter(p => p.revenue > 0)
      .map((product, index) => ({
        name: product.product_name || product.product_key,
        value: product.revenue,
        color: PRODUCT_COLORS[index % PRODUCT_COLORS.length]
      }))
      .slice(0, 8) // Топ 8 продуктов
  }

  // Подготовка временных данных
  const prepareTimelineData = () => {
    if (!data?.timeline) return []

    // Группировка по датам
    const groupedByDate = data.timeline.reduce((acc, item) => {
      if (!acc[item.date]) {
        acc[item.date] = { date: item.date }
      }
      acc[item.date][item.product_key] = item.revenue
      return acc
    }, {} as Record<string, any>)

    return Object.values(groupedByDate).sort((a, b) => a.date.localeCompare(b.date))
  }

  // Анализ продуктов
  const prepareProductAnalysis = () => {
    if (!data?.products) return []

    return data.products
      .filter(p => p.contracts > 0)
      .sort((a, b) => b.conversion_rate - a.conversion_rate)
      .slice(0, 8)
  }

  // Подсчет общих метрик
  const calculateTotals = () => {
    if (!data?.products) return {
      totalProducts: 0,
      totalLeads: 0,
      totalContracts: 0,
      totalRevenue: 0,
      avgConversionRate: 0,
      avgContractValue: 0
    }

    const totals = data.products.reduce((acc, product) => {
      acc.totalLeads += product.leads
      acc.totalContracts += product.contracts
      acc.totalRevenue += product.revenue
      return acc
    }, { totalLeads: 0, totalContracts: 0, totalRevenue: 0 })

    const avgConversionRate = totals.totalLeads > 0 ? (totals.totalContracts / totals.totalLeads) * 100 : 0
    const avgContractValue = totals.totalContracts > 0 ? totals.totalRevenue / totals.totalContracts : 0

    return {
      totalProducts: data.products.filter(p => p.leads > 0 || p.contracts > 0).length,
      ...totals,
      avgConversionRate,
      avgContractValue
    }
  }

  const availableProducts = data?.products?.filter(p => p.leads > 0 || p.contracts > 0) || []

  const totals = calculateTotals()
  const topProducts = prepareTopProducts()
  const pieData = preparePieData()
  const timelineData = prepareTimelineData()
  const productAnalysis = prepareProductAnalysis()

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">📦 Анализ продуктов</h1>
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
          <h1 className="text-2xl font-bold text-gray-900">📦 Анализ продуктов</h1>
          <p className="text-gray-500 mt-1">Эффективность продуктов и форм по конверсиям и доходам</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Платформа" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">📊 Все</SelectItem>
              <SelectItem value="facebook">📘 Facebook</SelectItem>
              <SelectItem value="google_ads">🔍 Google Ads</SelectItem>
              <SelectItem value="other">🔗 Другие</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Продукт" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">📦 Все продукты</SelectItem>
              {availableProducts.slice(0, 10).map(product => (
                <SelectItem key={product.product_key} value={product.product_key}>
                  {product.product_name || product.product_key}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Сортировка" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue">💰 Доход</SelectItem>
              <SelectItem value="leads">👥 Лиды</SelectItem>
              <SelectItem value="contracts">📋 Контракты</SelectItem>
              <SelectItem value="conversion_rate">📈 Конверсия</SelectItem>
              <SelectItem value="avg_contract_value">💎 Средний чек</SelectItem>
            </SelectContent>
          </Select>

          <Select value={viewType} onValueChange={setViewType}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Вид" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">📊 Обзор</SelectItem>
              <SelectItem value="timeline">📅 Динамика</SelectItem>
              <SelectItem value="analysis">🔍 Анализ</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Активных продуктов</CardTitle>
            <Package className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.totalProducts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Общий доход</CardTitle>
            <DollarSign className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalRevenue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Средняя конверсия</CardTitle>
            <Target className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercent(totals.avgConversionRate)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Средний чек</CardTitle>
            <Award className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.avgContractValue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {viewType === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Топ продукты по {sortBy === "revenue" ? "доходу" : sortBy === "leads" ? "лидам" : sortBy === "contracts" ? "контрактам" : sortBy === "conversion_rate" ? "конверсии" : "среднему чеку"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={topProducts} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis
                    dataKey="product_name"
                    type="category"
                    width={120}
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => value && value.length > 15 ? value.substring(0, 15) + "..." : value || 'N/A'}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      name.includes('revenue') || name.includes('avg_contract_value') ? formatCurrency(Number(value)) :
                      name.includes('conversion_rate') ? formatPercent(Number(value)) :
                      formatNumber(Number(value)),
                      name === 'revenue' ? 'Доход' :
                      name === 'leads' ? 'Лиды' :
                      name === 'contracts' ? 'Контракты' :
                      name === 'conversion_rate' ? 'Конверсия' :
                      name === 'avg_contract_value' ? 'Средний чек' : name
                    ]}
                  />
                  <Legend />
                  <Bar
                    dataKey={sortBy}
                    fill="#8884d8"
                    name={sortBy === "revenue" ? "Доход" : sortBy === "leads" ? "Лиды" : sortBy === "contracts" ? "Контракты" : sortBy === "conversion_rate" ? "Конверсия" : "Средний чек"}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {pieData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Распределение доходов по продуктам
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name.substring(0, 10)} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {viewType === "timeline" && timelineData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Динамика доходов по продуктам
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                  formatter={(value, name) => [formatCurrency(Number(value)), name]}
                  labelFormatter={(label) => `Дата: ${label}`}
                />
                <Legend />
                {Array.from(new Set(data?.timeline?.map(item => item.product_key))).slice(0, 5).map((productKey, index) => (
                  <Area
                    key={productKey}
                    type="monotone"
                    dataKey={productKey}
                    stackId="1"
                    stroke={PRODUCT_COLORS[index % PRODUCT_COLORS.length]}
                    fill={PRODUCT_COLORS[index % PRODUCT_COLORS.length]}
                    fillOpacity={0.6}
                    name={data?.products?.find(p => p.product_key === productKey)?.product_name || productKey}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {viewType === "analysis" && productAnalysis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Анализ конверсий по продуктам
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={productAnalysis}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="product_name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => value && value.length > 12 ? value.substring(0, 12) + "..." : value || 'N/A'}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip
                  formatter={(value, name) => [
                    name === 'conversion_rate' ? formatPercent(Number(value)) :
                    name === 'avg_contract_value' ? formatCurrency(Number(value)) :
                    formatNumber(Number(value)),
                    name === 'leads' ? 'Лиды' :
                    name === 'contracts' ? 'Контракты' :
                    name === 'conversion_rate' ? 'Конверсия' :
                    name === 'avg_contract_value' ? 'Средний чек' : name
                  ]}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="leads" fill="#8884d8" name="Лиды" />
                <Bar yAxisId="left" dataKey="contracts" fill="#82ca9d" name="Контракты" />
                <Bar yAxisId="right" dataKey="conversion_rate" fill="#ffc658" name="Конверсия %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Product Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Детальная информация по продуктам</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="pb-2">Продукт</th>
                  <th className="pb-2">Код</th>
                  <th className="pb-2">Лиды</th>
                  <th className="pb-2">Контракты</th>
                  <th className="pb-2">Доход</th>
                  <th className="pb-2">Конверсия</th>
                  <th className="pb-2">Средний чек</th>
                  <th className="pb-2">ROI</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.slice(0, 15).map((product, index) => {
                  const roi = product.avg_contract_value > 0 ? (product.revenue / (product.leads * 100)) : 0 // Примерная стоимость лида 100 руб

                  return (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 font-medium max-w-xs truncate" title={product.product_name}>
                        {product.product_name ? (
                          product.product_name.length > 30
                            ? product.product_name.substring(0, 30) + "..."
                            : product.product_name
                        ) : (
                          <span className="text-gray-400">{product.product_key}</span>
                        )}
                      </td>
                      <td className="py-2">
                        <Badge variant="outline" className="text-xs">
                          {product.product_code || 'N/A'}
                        </Badge>
                      </td>
                      <td className="py-2">{formatNumber(product.leads)}</td>
                      <td className="py-2">{formatNumber(product.contracts)}</td>
                      <td className="py-2 font-bold text-green-600">{formatCurrency(product.revenue)}</td>
                      <td className="py-2">
                        <span className={product.conversion_rate > 10 ? "text-green-600 font-medium" : product.conversion_rate > 5 ? "text-orange-600" : "text-gray-600"}>
                          {formatPercent(product.conversion_rate)}
                        </span>
                      </td>
                      <td className="py-2">{formatCurrency(product.avg_contract_value)}</td>
                      <td className="py-2">
                        <span className={roi > 5 ? "text-green-600 font-medium" : roi > 2 ? "text-orange-600" : "text-gray-600"}>
                          {roi.toFixed(1)}x
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
  )
}