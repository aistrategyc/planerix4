"use client"

/**
 * Analytics Dashboard - Clean and simplified version
 * Shows key metrics with real ITstep data in a user-friendly way
 */

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  TrendingUp,
  DollarSign,
  Target,
  Users,
  Eye,
  Activity,
  RefreshCw,
  AlertTriangle,
  Calendar
} from "lucide-react"
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import { cn } from "@/lib/utils"
import { DateRangeFilter } from "@/components/analytics/DateRangeFilter"
import { useDynamicDateRange } from "@/hooks/useDynamicDateRange"

// Import analytics hooks
import ProtectedRoute from "@/components/auth/ProtectedRoute"
import {
  useDashboardOverview,
  useRealTimeMetrics,
  useKPIs,
  useRevenueTrend,
  useCampaignPerformance,
  useCreativePerformance,
  useAnalyticsFilters
} from "@/hooks/useAnalytics"

// ==================== COMPONENTS ====================

/**
 * Simple KPI Card
 */
interface KPICardProps {
  title: string
  value: string | number
  trend?: number
  icon: React.ReactNode
  format?: 'currency' | 'percentage' | 'number'
}

function KPICard({ title, value, trend, icon, format = 'number' }: KPICardProps) {
  const formatValue = (val: string | number) => {
    if (format === 'currency') {
      return typeof val === 'number' ? `$${val.toLocaleString()}` : val
    }
    if (format === 'percentage') {
      return typeof val === 'number' ? `${val.toFixed(1)}%` : val
    }
    return typeof val === 'number' ? val.toLocaleString() : val
  }

  const getTrendColor = (trend?: number) => {
    if (trend === undefined) return "text-gray-500"
    return trend > 0 ? "text-green-600" : trend < 0 ? "text-red-600" : "text-gray-500"
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value)}</div>
        {trend !== undefined && (
          <p className={cn("text-xs", getTrendColor(trend))}>
            {trend > 0 ? "+" : ""}{trend.toFixed(1)}% from last period
          </p>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Loading skeleton
 */
function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
      <div className="h-8 bg-gray-200 rounded w-1/2"></div>
    </div>
  )
}


// ==================== MAIN COMPONENT ====================

function AnalyticsPageContentContent() {
  const [activeTab, setActiveTab] = useState("overview")

  // Date range management with calendar filter - dynamically load from database
  const {
    dateRange,
    apiDateRange,
    updateDateRange,
    refreshDateRange,
    isLoading: dateRangeLoading,
    isUsingDatabaseDates
  } = useDynamicDateRange(7) // Default to last 7 days of available data
  const { filters } = useAnalyticsFilters(apiDateRange)

  // Only essential data hooks
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError } = useDashboardOverview(apiDateRange)
  const { data: realtimeData, isLoading: realtimeLoading } = useRealTimeMetrics()
  const { data: kpisData, isLoading: kpisLoading } = useKPIs(apiDateRange)
  const { data: revenueTrendData, isLoading: revenueTrendLoading } = useRevenueTrend(apiDateRange)
  const { data: campaignsData, isLoading: campaignsLoading } = useCampaignPerformance(filters)
  const { data: creativesData, isLoading: creativesLoading } = useCreativePerformance(filters)

  // Error state
  if (dashboardError) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Ошибка загрузки
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Не удалось загрузить данные аналитики. Проверьте соединение и попробуйте снова.
            </p>
            <Button onClick={() => window.location.reload()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Повторить
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Simplified Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">📈 Аналитика</h1>
          <p className="text-muted-foreground">
            Ключевые показатели маркетинговых кампаний ITstep
            {isUsingDatabaseDates && (
              <span className="text-green-600 text-sm ml-2">
                • Данные обновляются ежедневно
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center space-x-4 mt-4 md:mt-0">
          <DateRangeFilter
            value={dateRange}
            onChange={updateDateRange}
          />
          {dateRangeLoading ? (
            <Badge variant="outline" className="flex items-center">
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              Загрузка...
            </Badge>
          ) : isUsingDatabaseDates ? (
            <Badge variant="outline" className="flex items-center text-green-700 border-green-200">
              <Activity className="h-3 w-3 mr-1" />
              Актуальные данные
            </Badge>
          ) : (
            <Badge variant="outline" className="flex items-center text-orange-700 border-orange-200">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Резервные данные
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={refreshDateRange}
            disabled={dateRangeLoading}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${dateRangeLoading ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {realtimeData?.alerts && realtimeData.alerts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
              <div>
                <p className="font-medium text-orange-800">Внимание</p>
                <ul className="text-sm text-orange-700 mt-1">
                  {realtimeData.alerts.map((alert, index) => (
                    <li key={index}>• {alert}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Доход"
          value={dashboardLoading ? 0 : dashboardData?.total_revenue || 0}
          trend={dashboardData?.revenue_trend}
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          format="currency"
        />
        <KPICard
          title="Расходы"
          value={dashboardLoading ? 0 : dashboardData?.total_spend || 0}
          trend={dashboardData?.spend_trend}
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          format="currency"
        />
        <KPICard
          title="ROAS"
          value={dashboardLoading ? 0 : dashboardData?.roas || 0}
          trend={dashboardData?.roas_trend}
          icon={<Target className="h-4 w-4 text-muted-foreground" />}
          format="number"
        />
        <KPICard
          title="Лиды"
          value={dashboardLoading ? 0 : dashboardData?.total_leads || 0}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          format="number"
        />
      </div>

      {/* Real-time Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {realtimeLoading ? <LoadingSkeleton /> : realtimeData?.active_sessions || 0}
            </div>
            <p className="text-xs text-muted-foreground">Активные сессии</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {realtimeLoading ? <LoadingSkeleton /> : realtimeData?.new_leads_today || 0}
            </div>
            <p className="text-xs text-muted-foreground">Новые лиды сегодня</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {realtimeLoading ? <LoadingSkeleton /> : `$${(realtimeData?.revenue_today || 0).toLocaleString()}`}
            </div>
            <p className="text-xs text-muted-foreground">Доход сегодня</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {dashboardLoading ? <LoadingSkeleton /> : dashboardData?.active_campaigns || 0}
            </div>
            <p className="text-xs text-muted-foreground">Активные кампании</p>
          </CardContent>
        </Card>
      </div>

      {/* Simplified Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="campaigns">Кампании</TabsTrigger>
          <TabsTrigger value="creatives">Креативы</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Тренд доходов</CardTitle>
            </CardHeader>
            <CardContent>
              {revenueTrendLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : revenueTrendData?.status === 'success' && revenueTrendData?.data ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueTrendData.data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  Нет данных о доходах
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Эффективность кампаний</CardTitle>
            </CardHeader>
            <CardContent>
              {campaignsLoading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : campaignsData?.status === 'success' && campaignsData?.data ? (
                <div className="space-y-4">
                  {campaignsData.data.slice(0, 10).map((campaign: any) => (
                    <div key={campaign.campaign_id} className="flex justify-between items-center p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{campaign.campaign_name}</p>
                        <p className="text-sm text-gray-500">{campaign.platform}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${campaign.total_metrics.spend.toLocaleString()}</p>
                        <p className="text-sm text-gray-500">ROAS: {campaign.total_metrics.roas.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Нет данных о кампаниях
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Creatives Tab */}
        <TabsContent value="creatives" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Эффективность креативов</CardTitle>
            </CardHeader>
            <CardContent>
              {creativesLoading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : creativesData?.status === 'success' && creativesData?.data ? (
                <div className="space-y-4">
                  {creativesData.data.slice(0, 10).map((creative: any) => (
                    <div key={creative.creative_id} className="flex justify-between items-center p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{creative.creative_name}</p>
                        <p className="text-sm text-gray-500">CTR: {creative.ctr.toFixed(2)}%</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${creative.spend.toLocaleString()}</p>
                        <p className="text-sm text-gray-500">ROAS: {creative.roas.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Нет данных о креативах
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Wrap with authentication protection
export default function AnalyticsPageContent() {
  return (
    <ProtectedRoute requireAuth={true}>
      <AnalyticsPageContentContent />
    </ProtectedRoute>
  )
}
