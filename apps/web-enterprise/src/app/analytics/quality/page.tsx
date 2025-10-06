"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Shield, Database, TrendingUp, AlertCircle } from "lucide-react"
import { api } from "@/lib/api/config"

interface QualityData {
  issues: Array<{
    issue_perf: string
    issue_crm: string
    issue_count: number
  }>
  cost_comparison: Array<{
    date: string
    platform: string
    cost_pd: number
    cost_360: number
    is_match: boolean
    difference: number
  }>
  empty_sources: Array<{
    date: string
    platform: string
    source: string | null
    leads: number
    contracts: number
    revenue: number
  }>
  last_refresh: string
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

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('ru-RU')
}

export default function QualityPage() {
  const [data, setData] = useState<QualityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await api.get('/analytics/marketing/data-quality')

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

  // Подготовка данных для анализа расхождений по затратам
  const prepareCostDiscrepancyData = () => {
    if (!data?.cost_comparison) return []

    return data.cost_comparison.map(item => ({
      ...item,
      discrepancy_pct: item.cost_pd > 0 ? (item.difference / item.cost_pd) * 100 : 0
    }))
  }

  // Группировка расхождений по платформам
  const preparePlatformDiscrepancies = () => {
    if (!data?.cost_comparison) return []

    const platformTotals = data.cost_comparison.reduce((acc, item) => {
      if (!acc[item.platform]) {
        acc[item.platform] = {
          platform: item.platform,
          totalDiscrepancy: 0,
          countDiscrepancy: 0,
          maxDiscrepancy: 0
        }
      }
      acc[item.platform].totalDiscrepancy += item.difference
      acc[item.platform].countDiscrepancy += 1
      acc[item.platform].maxDiscrepancy = Math.max(acc[item.platform].maxDiscrepancy, item.difference)
      return acc
    }, {} as Record<string, any>)

    return Object.values(platformTotals)
  }

  // Анализ пустых источников
  const analyzeEmptySources = () => {
    if (!data?.empty_sources) return {
      totalEmpty: 0,
      totalLeadsLost: 0,
      totalRevenueLost: 0,
      platformsAffected: 0
    }

    const analysis = data.empty_sources.reduce((acc, item) => {
      acc.totalEmpty += 1
      acc.totalLeadsLost += item.leads
      acc.totalRevenueLost += item.revenue
      return acc
    }, { totalEmpty: 0, totalLeadsLost: 0, totalRevenueLost: 0 })

    const platformsAffected = new Set(data.empty_sources.map(item => item.platform)).size

    return { ...analysis, platformsAffected }
  }

  // Общий статус качества данных
  const calculateQualityScore = () => {
    let score = 100
    let issues = 0

    if (data?.issues && data.issues.length > 0) {
      issues += data.issues.reduce((sum, issue) => sum + issue.issue_count, 0)
      score -= Math.min(30, issues * 2) // Максимум -30 за проблемы
    }

    if (data?.cost_comparison && data.cost_comparison.length > 0) {
      score -= Math.min(25, data.cost_comparison.length * 3) // Максимум -25 за расхождения
    }

    if (data?.empty_sources && data.empty_sources.length > 0) {
      score -= Math.min(20, data.empty_sources.length * 4) // Максимум -20 за пустые источники
    }

    return Math.max(0, Math.round(score))
  }

  const costDiscrepancyData = prepareCostDiscrepancyData()
  const platformDiscrepancies = preparePlatformDiscrepancies()
  const emptySourcesAnalysis = analyzeEmptySources()
  const qualityScore = calculateQualityScore()

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">⚡ Контроль качества</h1>
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
          <h1 className="text-2xl font-bold text-gray-900">⚡ Контроль качества данных</h1>
          <p className="text-gray-500 mt-1">Мониторинг целостности и согласованности аналитических данных</p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm">
            Обновлено: {data?.last_refresh ? formatDateTime(data.last_refresh) : 'N/A'}
          </Badge>
          <Button onClick={fetchData} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Обновить
          </Button>
        </div>
      </div>

      {/* Quality Score & Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={`border-2 ${qualityScore >= 90 ? 'border-green-200 bg-green-50' : qualityScore >= 70 ? 'border-yellow-200 bg-yellow-50' : 'border-red-200 bg-red-50'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Общая оценка качества</CardTitle>
            {qualityScore >= 90 ?
              <CheckCircle className="h-5 w-5 text-green-500" /> :
              qualityScore >= 70 ?
              <AlertTriangle className="h-5 w-5 text-yellow-500" /> :
              <XCircle className="h-5 w-5 text-red-500" />
            }
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${qualityScore >= 90 ? 'text-green-700' : qualityScore >= 70 ? 'text-yellow-700' : 'text-red-700'}`}>
              {qualityScore}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Выявленные проблемы</CardTitle>
            <AlertCircle className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.issues?.reduce((sum, issue) => sum + issue.issue_count, 0) || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Расхождения в затратах</CardTitle>
            <Database className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.cost_comparison?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Пустые источники</CardTitle>
            <Shield className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emptySourcesAnalysis.totalEmpty}</div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {qualityScore < 80 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Внимание:</strong> Обнаружены проблемы качества данных, которые могут влиять на точность аналитики.
            Рекомендуется проверить и исправить выявленные несоответствия.
          </AlertDescription>
        </Alert>
      )}

      {/* Issues Analysis */}
      {data?.issues && data.issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Обнаруженные проблемы
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="pb-2">Проблема Performance</th>
                    <th className="pb-2">Проблема CRM</th>
                    <th className="pb-2">Количество случаев</th>
                    <th className="pb-2">Критичность</th>
                  </tr>
                </thead>
                <tbody>
                  {data.issues.map((issue, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-2">{issue.issue_perf || '-'}</td>
                      <td className="py-2">{issue.issue_crm || '-'}</td>
                      <td className="py-2 font-bold">{formatNumber(issue.issue_count)}</td>
                      <td className="py-2">
                        <Badge
                          variant={issue.issue_count > 10 ? "destructive" : issue.issue_count > 5 ? "secondary" : "outline"}
                        >
                          {issue.issue_count > 10 ? "Высокая" : issue.issue_count > 5 ? "Средняя" : "Низкая"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cost Comparison Charts */}
      {costDiscrepancyData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Расхождения в затратах по датам
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={costDiscrepancyData.slice(-15)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => [
                      formatCurrency(Number(value)),
                      name === 'difference' ? 'Разница' :
                      name === 'cost_pd' ? 'Затраты Platform' :
                      name === 'cost_360' ? 'Затраты 360' : name
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="difference" fill="#ff7300" name="Разница" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Расхождения по платформам
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={platformDiscrepancies}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="platform" />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => [
                      formatCurrency(Number(value)),
                      name === 'totalDiscrepancy' ? 'Общая разница' :
                      name === 'maxDiscrepancy' ? 'Макс. разница' :
                      formatNumber(Number(value))
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="totalDiscrepancy" fill="#8884d8" name="Общая разница" />
                  <Bar dataKey="maxDiscrepancy" fill="#ff7300" name="Макс. разница" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cost Comparison Table */}
      {data?.cost_comparison && data.cost_comparison.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>💰 Детализация расхождений в затратах</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="pb-2">Дата</th>
                    <th className="pb-2">Платформа</th>
                    <th className="pb-2">Platform Daily</th>
                    <th className="pb-2">CRM 360</th>
                    <th className="pb-2">Разница</th>
                    <th className="pb-2">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {data.cost_comparison.slice(0, 20).map((comparison, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-2">{comparison.date}</td>
                      <td className="py-2">
                        <Badge variant="outline">{comparison.platform}</Badge>
                      </td>
                      <td className="py-2">{formatCurrency(comparison.cost_pd)}</td>
                      <td className="py-2">{formatCurrency(comparison.cost_360)}</td>
                      <td className="py-2 font-bold text-red-600">{formatCurrency(comparison.difference)}</td>
                      <td className="py-2">
                        <Badge variant="destructive">
                          Не совпадает
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty Sources Analysis */}
      {data?.empty_sources && data.empty_sources.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Анализ пустых источников
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Всего записей:</span>
                <span className="font-bold">{emptySourcesAnalysis.totalEmpty}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Потерянные лиды:</span>
                <span className="font-bold text-orange-600">{formatNumber(emptySourcesAnalysis.totalLeadsLost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Потерянная выручка:</span>
                <span className="font-bold text-red-600">{formatCurrency(emptySourcesAnalysis.totalRevenueLost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Затронутых платформ:</span>
                <span className="font-bold">{emptySourcesAnalysis.platformsAffected}</span>
              </div>
            </CardContent>
          </Card>

          {/* Empty Sources Table */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>⚠️ Записи с пустыми источниками</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr className="text-left">
                      <th className="pb-2">Дата</th>
                      <th className="pb-2">Платформа</th>
                      <th className="pb-2">Источник</th>
                      <th className="pb-2">Лиды</th>
                      <th className="pb-2">Контракты</th>
                      <th className="pb-2">Выручка</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.empty_sources.slice(0, 15).map((source, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-2">{source.date}</td>
                        <td className="py-2">
                          <Badge variant="outline">{source.platform}</Badge>
                        </td>
                        <td className="py-2">
                          <Badge variant="destructive" className="text-xs">
                            {source.source || '(empty)'}
                          </Badge>
                        </td>
                        <td className="py-2 text-orange-600 font-medium">{formatNumber(source.leads)}</td>
                        <td className="py-2">{formatNumber(source.contracts)}</td>
                        <td className="py-2 text-red-600 font-medium">{formatCurrency(source.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Data Health Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Сводка по качеству данных
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="space-y-2">
              <div className={`text-3xl font-bold ${qualityScore >= 90 ? 'text-green-600' : qualityScore >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                {qualityScore}%
              </div>
              <div className="text-muted-foreground text-sm">Общая оценка качества</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-blue-600">
                {(data?.cost_comparison?.reduce((sum, item) => sum + item.difference, 0) || 0) / 1000}к
              </div>
              <div className="text-muted-foreground text-sm">Общие расхождения (руб.)</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-purple-600">
                {Math.round(((data?.cost_comparison?.length || 0) + (data?.empty_sources?.length || 0)) / Math.max((data?.cost_comparison?.length || 0) + (data?.empty_sources?.length || 0), 1) * 100)}%
              </div>
              <div className="text-muted-foreground text-sm">Процент проблемных записей</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}