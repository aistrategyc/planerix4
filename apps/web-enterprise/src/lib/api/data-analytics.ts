/**
 * DataAnalytics v5 API Client
 * ITstep client analytics - Verified October 6, 2025
 * 8/21 endpoints working, 13/21 pending implementation
 */

import { api as apiClient } from "./config"

interface CompareParams {
  date_from: string
  date_to: string
  platforms?: string
  prev_from?: string
  prev_to?: string
}

interface CampaignsCompareParams extends CompareParams {
  min_spend?: number
  limit?: number
}

interface TopMoversParams extends CompareParams {
  n?: number
  target_roas?: number
  kill_roas?: number
  target_cpl?: number | null
  min_leads?: number
  min_spend?: number
}

interface BudgetRecoParams extends CompareParams {
  limit?: number
  target_roas?: number
  kill_roas?: number
  target_cpl?: number | null
  min_leads?: number
  min_spend?: number
}

// KPI Compare
export const getKPICompare = async (params: CompareParams) => {
  const response = await apiClient.get("/data-analytics/v5/kpi/compare", { params })
  return response.data
}

// Trends Compare
export const getLeadsTrendCompare = async (params: CompareParams) => {
  const response = await apiClient.get("/data-analytics/v5/trend/leads/compare", { params })
  return response.data
}

export const getSpendTrendCompare = async (params: CompareParams) => {
  const response = await apiClient.get("/data-analytics/v5/trend/spend/compare", { params })
  return response.data
}

// Campaigns Compare
export const getCampaignsCompare = async (params: CampaignsCompareParams) => {
  const response = await apiClient.get("/data-analytics/v5/campaigns/compare", { params })
  return response.data
}

// Platform Share Compare
export const getPlatformShareCompare = async (params: CompareParams) => {
  const response = await apiClient.get("/data-analytics/v5/share/platforms/compare", { params })
  return response.data
}

// Top Movers (Winners/Losers/Watch)
export const getTopMovers = async (params: TopMoversParams) => {
  const response = await apiClient.get("/data-analytics/v5/campaigns/top-movers", { params })
  return response.data
}

// Budget Recommendations (✅ Working)
export const getBudgetRecommendations = async (params: BudgetRecoParams) => {
  const response = await apiClient.get("/data-analytics/v6/reco/budget", { params })
  return response.data
}

// WoW Campaigns (✅ Working)
export const getWoWCampaigns = async (filters: DataAnalyticsFilters) => {
  const response = await apiClient.get("/data-analytics/v5/campaigns/wow", {
    params: {
      date_from: filters.date_from,
      date_to: filters.date_to,
      platforms: filters.platforms,
      limit: filters.limit || 20,
    },
  })
  return response.data
}

// ============================================
// Legacy v3 compatibility wrappers for useDataAnalytics hook
// ============================================

export interface DataAnalyticsFilters {
  date_from: string
  date_to: string
  platforms?: string
  min_spend?: number
  limit?: number
}

export interface KPICards {
  leads: number
  n_contracts: number
  revenue: number
  spend: number
  cpl: number | null
  roas: number | null
}

export interface LeadsTrendItem {
  dt: string
  leads: number
}

export interface SpendTrendItem {
  dt: string
  spend: number
}

export interface CampaignItem {
  platform: string
  campaign_id: string
  campaign_name: string
  leads: number
  n_contracts: number
  revenue: number
  spend: number
  cpl: number | null
  roas: number | null
}

export interface WoWCampaignItem {
  platform: string
  campaign_id: string
  campaign_name: string
  leads_cur: number
  leads_prev: number
  leads_diff: number
  leads_diff_pct: number | null
  spend_cur: number
  spend_prev: number
  spend_diff: number
  spend_diff_pct: number | null
  cpl_cur: number | null
  cpl_prev: number | null
}

export interface UTMSourceItem {
  platform: string
  utm_source: string
  leads: number
  n_contracts: number
  revenue: number
  spend: number
}

export interface PlatformShareItem {
  platform: string
  leads: number
  share_pct: number
}

export interface TopCampaignItem {
  platform: string
  campaign_id: string
  campaign_name: string
  leads: number
  roas: number | null
}

export interface BudgetRecommendationItem {
  platform: string
  campaign_id: string
  campaign_name: string
  leads_cur: number
  spend_cur: number
  cpl_cur: number | null
  roas_cur: number | null
  leads_prev: number
  spend_prev: number
  cpl_prev: number | null
  roas_prev: number | null
  leads_diff: number
  leads_diff_pct: number | null
  action: "scale" | "pause" | "monitor"
}

// ============================================
// ✅ WORKING ENDPOINTS (Verified Oct 6, 2025)
// ============================================

// 1. KPI Cards (✅ Working - v5/kpi)
export const getKPICards = async (filters: DataAnalyticsFilters): Promise<KPICards> => {
  const response = await apiClient.get("/data-analytics/v5/kpi", {
    params: {
      date_from: filters.date_from,
      date_to: filters.date_to,
      platforms: filters.platforms,
    },
  })
  return response.data
}

// 2. Leads Trend (✅ Working - v5/trend/leads)
export const getLeadsTrend = async (filters: DataAnalyticsFilters): Promise<LeadsTrendItem[]> => {
  const response = await apiClient.get("/data-analytics/v5/trend/leads", {
    params: {
      date_from: filters.date_from,
      date_to: filters.date_to,
      platforms: filters.platforms,
      granularity: "daily",
    },
  })
  return response.data.data || []
}

// 3. Spend Trend (✅ Working - v5/trend/spend)
export const getSpendTrend = async (filters: DataAnalyticsFilters): Promise<SpendTrendItem[]> => {
  const response = await apiClient.get("/data-analytics/v5/trend/spend", {
    params: {
      date_from: filters.date_from,
      date_to: filters.date_to,
      platforms: filters.platforms,
      granularity: "daily",
    },
  })
  return response.data.data || []
}

// 4. Campaigns List (✅ Working - v5/campaigns)
export const getCampaigns = async (filters: DataAnalyticsFilters): Promise<CampaignItem[]> => {
  const response = await apiClient.get("/data-analytics/v5/campaigns", {
    params: {
      date_from: filters.date_from,
      date_to: filters.date_to,
      platform: filters.platforms, // Note: singular 'platform' in API
      min_spend: filters.min_spend,
      limit: filters.limit || 50,
    },
  })
  return response.data.data || []
}

// 5. Platform Share (✅ Working - v5/share/platforms)
export const getPlatformShare = async (date_from: string, date_to: string): Promise<PlatformShareItem[]> => {
  const response = await apiClient.get("/data-analytics/v5/share/platforms", {
    params: { date_from, date_to },
  })
  const data = response.data.data || []
  // Calculate share_pct if not provided
  const total = data.reduce((sum: number, item: any) => sum + item.leads, 0)
  return data.map((item: any) => ({
    ...item,
    share_pct: total > 0 ? (item.leads / total) * 100 : 0,
  }))
}

// 6. UTM Sources (✅ Working - v5/utm-sources)
export const getUTMSources = async (filters: DataAnalyticsFilters): Promise<UTMSourceItem[]> => {
  const response = await apiClient.get("/data-analytics/v5/utm-sources", {
    params: {
      date_from: filters.date_from,
      date_to: filters.date_to,
      platforms: filters.platforms,
      limit: filters.limit || 10,
    },
  })
  return response.data.data || []
}

// 7. Week-over-Week Campaigns (✅ Working - v5/campaigns/wow)
export const getWoWCampaignsLegacy = async (platforms?: string): Promise<WoWCampaignItem[]> => {
  const response = await apiClient.get("/data-analytics/v5/campaigns/wow", {
    params: { platforms, limit: 20 },
  })
  return response.data.data || []
}

// 8. Budget Recommendations (✅ Working - v6/reco/budget)
export const getBudgetRecommendationsLegacy = async (
  date_from: string,
  date_to: string,
  limit: number = 10
): Promise<BudgetRecommendationItem[]> => {
  const response = await apiClient.get("/data-analytics/v6/reco/budget", {
    params: { date_from, date_to, limit },
  })
  return response.data.data || []
}

// Top Campaigns by ROAS (uses campaigns endpoint)
export const getTopCampaigns = async (date_from: string, date_to: string, limit: number = 5): Promise<TopCampaignItem[]> => {
  const response = await apiClient.get("/data-analytics/v5/campaigns", {
    params: { date_from, date_to, limit: 50 },
  })
  // Sort by ROAS descending
  const campaigns = response.data.data || []
  return campaigns
    .filter((c: any) => c.roas !== null && c.roas > 0)
    .sort((a: any, b: any) => (b.roas || 0) - (a.roas || 0))
    .slice(0, limit)
}

// ============================================
// ✅ NEW ENDPOINTS (Oct 6, 2025)
// ============================================

export interface ScatterMatrixItem {
  platform: string
  campaign_id: string
  campaign_name: string
  leads: number
  spend: number
  revenue: number
  n_contracts: number
  cpl: number | null
  roas: number | null
}

export interface AnomalyItem {
  platform: string
  campaign_id: string
  campaign_name: string
  leads: number
  spend: number
  current_cpl: number | null
  baseline_cpl: number | null
  baseline_leads: number | null
  anomaly_type: "spike_cpl" | "drop_leads" | "spike_spend" | "normal"
  severity: "high" | "medium" | "low"
}

export interface PaidSplitPlatformItem {
  platform: string
  paid_leads: number
  organic_leads: number
  total_leads: number
  paid_pct: number
  organic_pct: number
}

export interface PaidSplitCampaignItem {
  platform: string
  campaign_id: string
  campaign_name: string
  source_type: "paid" | "organic"
  leads: number
  spend: number
}

// 9. Scatter Matrix (NEW - v5/campaigns/scatter-matrix)
export const getScatterMatrix = async (filters: DataAnalyticsFilters): Promise<ScatterMatrixItem[]> => {
  const response = await apiClient.get("/data-analytics/v5/campaigns/scatter-matrix", {
    params: {
      date_from: filters.date_from,
      date_to: filters.date_to,
      platform: filters.platforms,
      min_leads: 5,
      min_spend: filters.min_spend || 100,
    },
  })
  return response.data.data || []
}

// 10. Campaign Anomalies (NEW - v5/campaigns/anomalies)
export const getAnomalies = async (filters: DataAnalyticsFilters): Promise<AnomalyItem[]> => {
  const response = await apiClient.get("/data-analytics/v5/campaigns/anomalies", {
    params: {
      date_from: filters.date_from,
      date_to: filters.date_to,
      platform: filters.platforms,
    },
  })
  return response.data.data || []
}

// 11. Paid Split - Platforms (NEW - v6/leads/paid-split/platforms)
export const getPaidSplitPlatforms = async (
  date_from: string,
  date_to: string
): Promise<PaidSplitPlatformItem[]> => {
  const response = await apiClient.get("/data-analytics/v6/leads/paid-split/platforms", {
    params: { date_from, date_to },
  })
  return response.data.data || []
}

// 12. Paid Split - Campaigns (NEW - v6/leads/paid-split/campaigns)
export const getPaidSplitCampaigns = async (
  date_from: string,
  date_to: string,
  platform: string,
  limit: number = 20
): Promise<PaidSplitCampaignItem[]> => {
  const response = await apiClient.get("/data-analytics/v6/leads/paid-split/campaigns", {
    params: { date_from, date_to, platform, limit },
  })
  return response.data.data || []
}

// ============================================
// ✅ CAMPAIGN INSIGHTS (Oct 7, 2025)
// ============================================

export interface CampaignInsightItem {
  platform: string
  campaign_id: string
  campaign_name: string
  leads: number
  contracts: number
  revenue: number
  avg_contract_value: number
  conversion_rate: number
  performance_category: "high_performer" | "medium_performer" | "volume_driver" | "needs_attention"
}

export interface MetricsTrendItem {
  dt: string
  leads: number
  clicks: number
  impressions: number
  spend: number
  cpl: number | null
  cpc: number | null
  ctr: number | null
  cpm: number | null
}

// 13. Campaign Insights (NEW - v5/campaigns/insights)
export const getCampaignInsights = async (
  date_from: string,
  date_to: string,
  min_leads: number = 5
): Promise<CampaignInsightItem[]> => {
  const response = await apiClient.get("/data-analytics/v5/campaigns/insights", {
    params: { date_from, date_to, min_leads },
  })
  return response.data.data || []
}

// 14. Metrics Trend (NEW - v5/campaigns/metrics-trend)
export const getMetricsTrend = async (
  date_from: string,
  date_to: string
): Promise<MetricsTrendItem[]> => {
  const response = await apiClient.get("/data-analytics/v5/campaigns/metrics-trend", {
    params: { date_from, date_to },
  })
  return response.data.data || []
}
