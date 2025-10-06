/**
 * DataAnalytics v4 API Client
 * ITstep client analytics with Period-over-Period comparison
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

// Budget Recommendations
export const getBudgetRecommendations = async (params: BudgetRecoParams) => {
  const response = await apiClient.get("/data-analytics/v6/reco/budget", { params })
  return response.data
}

// Legacy v3 Basic Endpoints (for backward compatibility)
export const getKPI = async (params: { date_from: string; date_to: string; platforms?: string }) => {
  const response = await apiClient.get("/data-analytics/v5/kpi", { params })
  return response.data
}

export const getLeadsTrend = async (params: { date_from: string; date_to: string; platforms?: string }) => {
  const response = await apiClient.get("/data-analytics/v5/trend/leads", { params })
  return response.data
}

export const getSpendTrend = async (params: { date_from: string; date_to: string; platforms?: string }) => {
  const response = await apiClient.get("/data-analytics/v5/trend/spend", { params })
  return response.data
}

export const getCampaigns = async (params: { date_from: string; date_to: string; platforms?: string; min_spend?: number; limit?: number }) => {
  const response = await apiClient.get("/data-analytics/v5/campaigns", { params })
  return response.data
}

export const getPlatformShare = async (params: { date_from: string; date_to: string; platforms?: string }) => {
  const response = await apiClient.get("/data-analytics/v5/share/platforms", { params })
  return response.data
}

export const getUTMSources = async (params: { date_from: string; date_to: string; platforms?: string; limit?: number }) => {
  const response = await apiClient.get("/data-analytics/v5/utm-sources", { params })
  return response.data
}

export const getWoWCampaigns = async (params: { platforms?: string; limit?: number }) => {
  const response = await apiClient.get("/data-analytics/v5/campaigns/wow", { params })
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

// KPI Cards (uses v5/kpi endpoint)
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

// Leads Trend
export const getLeadsTrend = async (filters: DataAnalyticsFilters): Promise<LeadsTrendItem[]> => {
  const response = await apiClient.get("/data-analytics/v5/trend/leads", {
    params: {
      date_from: filters.date_from,
      date_to: filters.date_to,
      platforms: filters.platforms,
    },
  })
  return response.data.data || []
}

// Spend Trend
export const getSpendTrend = async (filters: DataAnalyticsFilters): Promise<SpendTrendItem[]> => {
  const response = await apiClient.get("/data-analytics/v5/trend/spend", {
    params: {
      date_from: filters.date_from,
      date_to: filters.date_to,
      platforms: filters.platforms,
    },
  })
  return response.data.data || []
}

// Campaigns
export const getCampaigns = async (filters: DataAnalyticsFilters): Promise<CampaignItem[]> => {
  const response = await apiClient.get("/data-analytics/v5/campaigns", {
    params: {
      date_from: filters.date_from,
      date_to: filters.date_to,
      platforms: filters.platforms,
      min_spend: filters.min_spend,
      limit: filters.limit || 50,
    },
  })
  return response.data.data || []
}

// Week-over-Week Campaigns
export const getWoWCampaignsLegacy = async (platforms?: string): Promise<WoWCampaignItem[]> => {
  const response = await apiClient.get("/data-analytics/v5/campaigns/wow", {
    params: { platforms, limit: 20 },
  })
  return response.data.data || []
}

// UTM Sources
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

// Platform Share
export const getPlatformShare = async (date_from: string, date_to: string): Promise<PlatformShareItem[]> => {
  const response = await apiClient.get("/data-analytics/v5/share/platforms", {
    params: { date_from, date_to },
  })
  return response.data.data || []
}

// Top Campaigns by ROAS
export const getTopCampaigns = async (date_from: string, date_to: string, limit: number = 5): Promise<TopCampaignItem[]> => {
  const response = await apiClient.get("/data-analytics/v5/campaigns", {
    params: { date_from, date_to, limit },
  })
  // Sort by ROAS descending
  const campaigns = response.data.data || []
  return campaigns
    .filter((c: any) => c.roas !== null)
    .sort((a: any, b: any) => (b.roas || 0) - (a.roas || 0))
    .slice(0, limit)
}
