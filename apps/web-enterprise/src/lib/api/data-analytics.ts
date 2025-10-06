/**
 * Data Analytics API Client for ITstep client
 * Endpoints: /api/data-analytics/v5/*
 */

import { api } from "./config"

// ==================== TYPES ====================

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
}

export interface TopCampaignItem {
  campaign_name: string
  leads: number
}

export interface DataAnalyticsFilters {
  date_from: string
  date_to: string
  platforms?: string
  min_spend?: number
}

// ==================== API FUNCTIONS ====================

/**
 * Get KPI cards aggregated metrics
 */
export async function getKPICards(filters: DataAnalyticsFilters): Promise<KPICards> {
  const params = new URLSearchParams({
    date_from: filters.date_from,
    date_to: filters.date_to,
    platforms: filters.platforms || "google,meta",
  })

  const response = await api.get(`/data-analytics/v5/kpi?${params}`)
  return response.data
}

/**
 * Get daily leads trend
 */
export async function getLeadsTrend(filters: DataAnalyticsFilters): Promise<LeadsTrendItem[]> {
  const params = new URLSearchParams({
    date_from: filters.date_from,
    date_to: filters.date_to,
    platforms: filters.platforms || "google,meta",
  })

  const response = await api.get(`/data-analytics/v5/trend/leads?${params}`)
  return response.data.data
}

/**
 * Get daily spend trend
 */
export async function getSpendTrend(filters: DataAnalyticsFilters): Promise<SpendTrendItem[]> {
  const params = new URLSearchParams({
    date_from: filters.date_from,
    date_to: filters.date_to,
    platforms: filters.platforms || "google,meta",
  })

  const response = await api.get(`/data-analytics/v5/trend/spend?${params}`)
  return response.data.data
}

/**
 * Get campaigns aggregated metrics
 */
export async function getCampaigns(filters: DataAnalyticsFilters): Promise<CampaignItem[]> {
  const params = new URLSearchParams({
    date_from: filters.date_from,
    date_to: filters.date_to,
    platforms: filters.platforms || "google,meta",
    min_spend: (filters.min_spend || 0).toString(),
    limit: "500",
  })

  const response = await api.get(`/data-analytics/v5/campaigns?${params}`)
  return response.data.data
}

/**
 * Get week-over-week campaigns comparison
 */
export async function getWoWCampaigns(platforms?: string): Promise<WoWCampaignItem[]> {
  const params = new URLSearchParams({
    platforms: platforms || "google,meta",
    limit: "200",
  })

  const response = await api.get(`/data-analytics/v5/campaigns/wow?${params}`)
  return response.data.data
}

/**
 * Get UTM sources aggregated metrics
 */
export async function getUTMSources(filters: DataAnalyticsFilters): Promise<UTMSourceItem[]> {
  const params = new URLSearchParams({
    date_from: filters.date_from,
    date_to: filters.date_to,
    platforms: filters.platforms || "google,meta,email",
    limit: "1000",
  })

  const response = await api.get(`/data-analytics/v5/utm-sources?${params}`)
  return response.data.data
}

/**
 * Get platform leads distribution
 */
export async function getPlatformShare(
  date_from: string,
  date_to: string
): Promise<PlatformShareItem[]> {
  const params = new URLSearchParams({
    date_from,
    date_to,
  })

  const response = await api.get(`/data-analytics/v5/share/platforms?${params}`)
  return response.data.data
}

/**
 * Get top campaigns by leads
 */
export async function getTopCampaigns(
  date_from: string,
  date_to: string,
  limit: number = 5
): Promise<TopCampaignItem[]> {
  const params = new URLSearchParams({
    date_from,
    date_to,
    limit: limit.toString(),
  })

  const response = await api.get(`/data-analytics/v5/share/top-campaigns?${params}`)
  return response.data.data
}
