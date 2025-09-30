// apps/web-enterprise/src/lib/api/analytics.ts
// Complete ITstep Analytics API client based on real DWH data

import { api } from "./config"

// ==================== TYPES ====================

export interface DateRange {
  start_date: string
  end_date: string
}

export interface MetricBase {
  impressions: number
  clicks: number
  spend: number
  conversions: number
  revenue: number
  ctr: number
  cpc: number
  cpm: number
  cvr: number
  cpa: number
  roas: number
}

export interface DashboardOverview {
  date_range: DateRange
  total_spend: number
  total_revenue: number
  total_conversions: number
  total_leads: number
  roas: number
  conversion_rate: number
  active_campaigns: number
  active_creatives: number
  spend_trend: number
  revenue_trend: number
  roas_trend: number
}

export interface RealTimeMetrics {
  active_sessions: number
  new_leads_today: number
  revenue_today: number
  conversions_today: number
  top_performing_creative: string | null
  alerts: string[]
  last_updated: string
}

export interface CampaignPerformance {
  campaign_id: string
  campaign_name: string
  platform: string
  total_metrics: MetricBase
  performance: {
    days_active: number
    first_seen: string | null
    last_active: string | null
    avg_cost_share: number
    avg_revenue_share: number
  }
}

export interface CreativePerformance {
  creative_id: string
  creative_name: string
  campaign_key?: string
  impressions: number
  clicks: number
  spend: number
  conversions: number
  revenue: number
  ctr: number
  cpc: number
  cpm: number
  roas: number
  cvr: number
  creative_url?: string
}

export interface CreativeBurnout {
  creative_id: string
  creative_name: string
  days_active: number
  initial_ctr: number
  current_ctr: number
  burnout_score: number
  status: 'fresh' | 'declining' | 'burned_out'
}

export interface FunnelStage {
  stage: string
  count: number
  conversion_rate: number
  drop_off_rate: number
}

export interface AnalyticsFilters {
  start_date: string
  end_date: string
  platforms?: string[]
  campaigns?: string[]
  products?: string[]
  branches?: number[]
  page?: number
  page_size?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

// ==================== ANALYTICS API CLASS ====================

export class AnalyticsAPI {
  /**
   * Generic method for analytics requests
   */
  static async fetchAnalytics<T = any>(endpoint: string, params?: any): Promise<T> {
    try {
      const response = await api.get(endpoint, { params })
      return response.data
    } catch (error: any) {
      console.error("Analytics fetch error:", error)
      throw new Error(error.response?.data?.message || error.message || "Failed to fetch analytics")
    }
  }

  // ==================== DASHBOARD ====================

  /**
   * Get main dashboard overview
   */
  static async getDashboardOverview(dateRange: DateRange): Promise<DashboardOverview> {
    return this.fetchAnalytics("/analytics/overview/dashboard", dateRange)
  }

  /**
   * Get real-time metrics
   */
  static async getRealTimeMetrics(): Promise<RealTimeMetrics> {
    return this.fetchAnalytics("/analytics/overview/realtime")
  }

  /**
   * Get KPI metrics
   */
  static async getKPIs(dateRange: DateRange): Promise<any> {
    return this.fetchAnalytics("/analytics/overview/kpis", dateRange)
  }

  /**
   * Get platform performance
   */
  static async getPlatformPerformance(dateRange: DateRange): Promise<any[]> {
    return this.fetchAnalytics("/analytics/overview/platforms", dateRange)
  }

  // ==================== SALES ====================

  /**
   * Get sales revenue trend
   */
  static async getRevenueTrend(dateRange: DateRange): Promise<any> {
    return this.fetchAnalytics("/analytics/sales/revenue-trend", dateRange)
  }

  /**
   * Get sales by products
   */
  static async getSalesByProducts(dateRange: DateRange): Promise<any> {
    return this.fetchAnalytics("/analytics/sales/by-products", dateRange)
  }

  /**
   * Get conversion funnel
   */
  static async getConversionFunnel(dateRange: DateRange): Promise<any> {
    return this.fetchAnalytics("/analytics/sales/conversion-funnel", dateRange)
  }

  // ==================== CAMPAIGNS ====================

  /**
   * Get campaign performance
   */
  static async getCampaignPerformance(filters: AnalyticsFilters): Promise<{
    status: string
    data: CampaignPerformance[]
    total_count: number
  }> {
    return this.fetchAnalytics("/analytics/campaigns/performance", filters)
  }

  /**
   * Get daily trend for specific campaign
   */
  static async getCampaignDailyTrend(campaignId: string, dateRange: DateRange): Promise<any> {
    return this.fetchAnalytics(`/analytics/campaigns/daily-trend`, {
      campaign_id: campaignId,
      ...dateRange
    })
  }

  /**
   * Get campaigns grouped by products
   */
  static async getCampaignsByProducts(dateRange: DateRange): Promise<any> {
    return this.fetchAnalytics("/analytics/campaigns/by-products", dateRange)
  }

  /**
   * Get rolling performance metrics
   */
  static async getRollingPerformance(days: number = 7): Promise<any> {
    return this.fetchAnalytics("/analytics/campaigns/rolling-performance", { days })
  }

  /**
   * Get campaigns summary
   */
  static async getCampaignsSummary(dateRange: DateRange): Promise<any> {
    return this.fetchAnalytics("/analytics/campaigns/summary", dateRange)
  }

  /**
   * Get creatives for specific campaign
   */
  static async getCampaignCreatives(campaignId: string, dateRange: DateRange): Promise<any> {
    return this.fetchAnalytics(`/analytics/campaigns/${campaignId}/creatives`, dateRange)
  }

  // ==================== CREATIVES ====================

  /**
   * Get creative performance
   */
  static async getCreativePerformance(filters: AnalyticsFilters): Promise<{
    status: string
    data: CreativePerformance[]
    total_count: number
  }> {
    return this.fetchAnalytics("/analytics/creatives/performance", filters)
  }

  /**
   * Get creative burnout analysis
   */
  static async getCreativeBurnoutAnalysis(
    daysBack: number = 30,
    minDaysActive: number = 7
  ): Promise<{
    status: string
    data: CreativeBurnout[]
    alerts: string[]
  }> {
    return this.fetchAnalytics("/analytics/creatives/burnout-analysis", {
      days_back: daysBack,
      min_days_active: minDaysActive
    })
  }

  /**
   * Get top performing creatives
   */
  static async getTopPerformingCreatives(
    dateRange: DateRange,
    metric: 'roas' | 'revenue' | 'conversions' | 'ctr' | 'spend' = 'roas',
    limit: number = 10
  ): Promise<any> {
    return this.fetchAnalytics("/analytics/creatives/top-performers", {
      ...dateRange,
      metric,
      limit
    })
  }

  /**
   * Get creative themes analysis
   */
  static async getCreativeThemesAnalysis(dateRange: DateRange): Promise<any> {
    return this.fetchAnalytics("/analytics/creatives/themes-analysis", dateRange)
  }

  /**
   * Get detailed creative information
   */
  static async getCreativeDetails(creativeId: string, dateRange: DateRange): Promise<any> {
    return this.fetchAnalytics(`/analytics/creatives/${creativeId}/details`, dateRange)
  }

  // ==================== MARKETING ANALYTICS ====================

  /**
   * Get executive overview
   */
  static async getExecutiveOverview(dateRange?: DateRange, platform?: string): Promise<any> {
    const params: any = {}
    if (dateRange?.start_date) params.date_from = dateRange.start_date
    if (dateRange?.end_date) params.date_to = dateRange.end_date
    if (platform) params.platform = platform
    return this.fetchAnalytics("/analytics/marketing/executive-overview", params)
  }

  /**
   * Get channels and sources analysis
   */
  static async getChannelsSources(dateRange?: DateRange, platform?: string): Promise<any> {
    const params: any = {}
    if (dateRange?.start_date) params.date_from = dateRange.start_date
    if (dateRange?.end_date) params.date_to = dateRange.end_date
    if (platform) params.platform = platform
    return this.fetchAnalytics("/analytics/marketing/channels-sources", params)
  }

  /**
   * Get marketing campaigns data
   */
  static async getMarketingCampaigns(dateRange?: DateRange, platform?: string, campaignKey?: string): Promise<any> {
    const params: any = {}
    if (dateRange?.start_date) params.date_from = dateRange.start_date
    if (dateRange?.end_date) params.date_to = dateRange.end_date
    if (platform) params.platform = platform
    if (campaignKey) params.campaign_key = campaignKey
    return this.fetchAnalytics("/analytics/marketing/campaigns", params)
  }

  /**
   * Get marketing creatives data
   */
  static async getMarketingCreatives(params: {
    dateRange?: DateRange
    platform?: string
    searchText?: string
  }): Promise<any> {
    const queryParams: any = {}
    if (params.dateRange?.start_date) queryParams.date_from = params.dateRange.start_date
    if (params.dateRange?.end_date) queryParams.date_to = params.dateRange.end_date
    if (params.platform) queryParams.platform = params.platform
    if (params.searchText) queryParams.search_text = params.searchText
    return this.fetchAnalytics("/analytics/marketing/creatives", queryParams)
  }

  /**
   * Get CRM outcomes and 360 data
   */
  static async getCRMOutcomes(dateRange?: DateRange, platform?: string, source?: string): Promise<any> {
    const params: any = {}
    if (dateRange?.start_date) params.date_from = dateRange.start_date
    if (dateRange?.end_date) params.date_to = dateRange.end_date
    if (platform) params.platform = platform
    if (source) params.source = source
    return this.fetchAnalytics("/analytics/marketing/crm-outcomes", params)
  }

  /**
   * Get attribution funnel analysis
   */
  static async getAttributionFunnel(dateRange?: DateRange, platform?: string, productKey?: string): Promise<any> {
    const params: any = {}
    if (dateRange?.start_date) params.date_from = dateRange.start_date
    if (dateRange?.end_date) params.date_to = dateRange.end_date
    if (platform) params.platform = platform
    if (productKey) params.product_key = productKey
    return this.fetchAnalytics("/analytics/marketing/attribution-funnel", params)
  }

  /**
   * Get product performance analysis
   */
  static async getProductPerformance(dateRange?: DateRange, platform?: string): Promise<any> {
    const params: any = {}
    if (dateRange?.start_date) params.date_from = dateRange.start_date
    if (dateRange?.end_date) params.date_to = dateRange.end_date
    if (platform) params.platform = platform
    return this.fetchAnalytics("/analytics/marketing/product-performance", params)
  }

  /**
   * Get geography analysis
   */
  static async getGeographyAnalysis(dateRange?: DateRange, platform?: string): Promise<any> {
    const params: any = {}
    if (dateRange?.start_date) params.date_from = dateRange.start_date
    if (dateRange?.end_date) params.date_to = dateRange.end_date
    if (platform) params.platform = platform
    return this.fetchAnalytics("/analytics/marketing/geography-analysis", params)
  }

  /**
   * Get data quality metrics
   */
  static async getDataQuality(dateRange?: DateRange): Promise<any> {
    const params: any = {}
    if (dateRange?.start_date) params.date_from = dateRange.start_date
    if (dateRange?.end_date) params.date_to = dateRange.end_date
    return this.fetchAnalytics("/analytics/marketing/data-quality", params)
  }

  /**
   * Get available date range
   */
  static async getAvailableDateRange(): Promise<any> {
    return this.fetchAnalytics("/analytics/marketing/date-range")
  }

  // ==================== LEGACY SUPPORT ====================

  /**
   * Get sales analytics (legacy)
   */
  static async getSalesAnalytics(): Promise<any> {
    return this.fetchAnalytics("/analytics/sales/test")
  }

  /**
   * Get debug information
   */
  static async getDebugInfo(): Promise<any> {
    return this.fetchAnalytics("/analytics/sales/debug")
  }

  /**
   * Получить аналитику членства в организации
   */
  static async getMembershipStats(orgId: string): Promise<any> {
    return this.fetchAnalytics(`/orgs/${orgId}/memberships/stats`)
  }

  /**
   * Получить AI инсайты по продажам
   */
  static async getSalesInsights(): Promise<any> {
    return this.fetchAnalytics("/insights/sales")
  }
}

// Backward compatibility
export const fetchAnalytics = AnalyticsAPI.fetchAnalytics
export default AnalyticsAPI
