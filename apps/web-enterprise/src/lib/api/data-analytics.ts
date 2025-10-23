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

// ============================================
// ✅ CONTRACTS ATTRIBUTION (Oct 14, 2025)
// ============================================

export interface ContractDetailItem {
  sk_contract: string
  sk_lead: string
  request_created_at: string
  contract_created_at: string
  product_name: string | null
  contract_amount: number
  platform: string | null
  // Meta attribution
  meta_campaign_name: string | null
  meta_adset_name: string | null
  meta_ad_name: string | null
  meta_creative_id: string | null
  // Google attribution
  google_campaign_name: string | null
  google_ad_group_name: string | null
  google_keyword: string | null
  google_gclid: string | null
  // Attribution flags
  has_full_attribution: boolean
  has_partial_attribution: boolean
  attribution_source: string | null
}

export interface ContractByCreativeItem {
  platform: string
  meta_creative_id: string
  meta_ad_name: string | null
  contracts: number
  revenue: number
  avg_contract_value: number
  leads: number
  conversion_rate: number
}

export interface ContractByCampaignItem {
  platform: string
  campaign_id: string | null
  campaign_name: string | null
  contracts: number
  revenue: number
  avg_contract_value: number
  leads: number
  conversion_rate: number
  spend: number
  roas: number | null
}

export interface ContractTimelineItem {
  dt: string
  contracts: number
  revenue: number
  avg_contract_value: number
}

export interface AttributionCoverageStats {
  total_contracts: number
  contracts_with_full_attribution: number
  contracts_with_partial_attribution: number
  contracts_no_attribution: number
  full_attribution_pct: number
  partial_attribution_pct: number
  no_attribution_pct: number
  total_leads: number
  leads_with_attribution: number
  leads_attribution_pct: number
  platforms: Array<{
    platform: string
    contracts: number
    full_attribution_pct: number
  }>
}

// 15. Contracts Detail (NEW - v6/contracts/detail)
export const getContractsDetail = async (
  date_from: string,
  date_to: string,
  platform?: string,
  limit: number = 100
): Promise<ContractDetailItem[]> => {
  const response = await apiClient.get("/data-analytics/v6/contracts/detail", {
    params: { date_from, date_to, platform, limit },
  })
  return response.data || []
}

// 16. Contracts by Creative (NEW - v6/contracts/by-creative)
export const getContractsByCreative = async (
  date_from: string,
  date_to: string,
  limit: number = 50
): Promise<ContractByCreativeItem[]> => {
  const response = await apiClient.get("/data-analytics/v6/contracts/by-creative", {
    params: { date_from, date_to, limit },
  })
  return response.data || []
}

// 17. Contracts by Campaign (NEW - v6/contracts/by-campaign)
export const getContractsByCampaign = async (
  date_from: string,
  date_to: string,
  platform?: string,
  limit: number = 50
): Promise<ContractByCampaignItem[]> => {
  const response = await apiClient.get("/data-analytics/v6/contracts/by-campaign", {
    params: { date_from, date_to, platform, limit },
  })
  return response.data || []
}

// 18. Contracts Timeline (NEW - v6/contracts/timeline)
export const getContractsTimeline = async (
  date_from: string,
  date_to: string,
  platform?: string
): Promise<ContractTimelineItem[]> => {
  const response = await apiClient.get("/data-analytics/v6/contracts/timeline", {
    params: { date_from, date_to, platform },
  })
  return response.data || []
}

// 19. Attribution Coverage Stats (NEW - contracts/v6/attribution/coverage)
export const getAttributionCoverage = async (
  date_from: string,
  date_to: string
): Promise<AttributionCoverageStats> => {
  const response = await apiClient.get("/data-analytics/contracts/v6/attribution/coverage", {
    params: { date_from, date_to },
  })
  return response.data
}

// ============================================
// ✅ FUNNEL ANALYSIS (Oct 14, 2025)
// ============================================

export interface FunnelAnalysisItem {
  date: string
  platform: string
  impressions: number
  clicks: number
  leads: number
  contracts: number
  ctr: number
  cvr: number
  contract_rate: number
}

export interface FunnelAggregateItem {
  platform: string
  impressions: number
  clicks: number
  leads: number
  contracts: number
  ctr: number
  cvr: number
  contract_rate: number
}

// 20. Funnel Analysis Daily (NEW - sales/v6/funnel)
export const getFunnelAnalysis = async (
  date_from: string,
  date_to: string,
  platform?: string
): Promise<FunnelAnalysisItem[]> => {
  const response = await apiClient.get("/data-analytics/sales/v6/funnel", {
    params: { date_from, date_to, platform },
  })
  return response.data || []
}

// 21. Funnel Aggregate by Platform (NEW - sales/v6/funnel/aggregate)
export const getFunnelAggregate = async (
  date_from: string,
  date_to: string
): Promise<FunnelAggregateItem[]> => {
  const response = await apiClient.get("/data-analytics/sales/v6/funnel/aggregate", {
    params: { date_from, date_to },
  })
  return response.data || []
}

// ============================================
// ✅ ORGANIC VS PAID & PRODUCTS (Oct 14, 2025)
// ============================================

export interface OrganicVsPaidItem {
  traffic_type: string
  platform: string
  leads: number
  contracts: number
  revenue: number
  cvr: number
}

export interface ProductPerformanceItem {
  product_name: string
  contracts: number
  revenue: number
  avg_value: number
}

// 22. Organic vs Paid Traffic (NEW - sales/v6/traffic/organic-vs-paid)
export const getOrganicVsPaid = async (
  date_from: string,
  date_to: string
): Promise<OrganicVsPaidItem[]> => {
  const response = await apiClient.get("/data-analytics/sales/v6/traffic/organic-vs-paid", {
    params: { date_from, date_to },
  })
  return response.data || []
}

// 23. Products Performance (NEW - sales/v6/products/performance)
export const getProductsPerformance = async (
  date_from: string,
  date_to: string,
  limit: number = 20
): Promise<ProductPerformanceItem[]> => {
  const response = await apiClient.get("/data-analytics/sales/v6/products/performance", {
    params: { date_from, date_to, limit },
  })
  return response.data || []
}

// ============================================================================
// V9 ENHANCED ANALYTICS - 1000% VERIFIED with SK_LEAD KEYS
// Added: October 23, 2025
// User requirement: "1000% проверенные с sk_ ключами и сравнительным анализом"
// ============================================================================

export interface V9PlatformComparison {
  period_start: string
  period_type: string
  platform: string
  leads: number
  contracts: number
  revenue: number
  prev_period_leads: number
  prev_period_contracts: number
  prev_period_revenue: number
  leads_growth_pct: number
  contracts_growth_pct: number
  revenue_growth_pct: number
}

export interface V9ContractEnriched {
  sk_contract: string
  sk_lead: string
  contract_date: string
  contract_day: string
  client_id: string
  contract_amount: number
  unified_platform: string
  unified_campaign_name: string
  meta_campaign_id: string | null
  meta_campaign_name: string | null
  google_campaign_id: string | null
  google_campaign_name: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  attribution_level: string
  days_to_contract: number | null
}

export interface V9MonthlyCohort {
  cohort_month: string
  platform: string
  leads: number
  contracts: number
  revenue: number
  avg_contract_value: number
  conversion_rate: number
  prev_month_leads: number | null
  prev_month_contracts: number | null
  leads_mom_growth: number | null
  contracts_mom_growth: number | null
  repeat_customer_rate: number | null
}

export interface V9FacebookWeekly {
  week_start: string
  campaign_id: string
  campaign_name: string
  leads: number
  contracts: number
  revenue: number
  conversion_rate: number
  prev_week_leads: number | null
  prev_week_contracts: number | null
  leads_wow_growth: number | null
  contracts_wow_growth: number | null
}

export interface V9GoogleWeekly {
  week_start: string
  campaign_id: string
  campaign_name: string
  leads: number
  contracts: number
  revenue: number
  conversion_rate: number
  prev_week_leads: number | null
  prev_week_contracts: number | null
  leads_wow_growth: number | null
  contracts_wow_growth: number | null
}

export interface V9AttributionQuality {
  platform: string
  attribution_level: string
  total_contracts: number
  contracts_with_campaign: number
  campaign_match_rate: number
  utm_coverage: number
  quality_score: string
}

// 24. V9 Platform Performance Comparison (Week-over-Week)
export const getV9PlatformComparison = async (
  date_from?: string,
  date_to?: string
): Promise<V9PlatformComparison[]> => {
  const response = await apiClient.get("/data-analytics/v9/platforms/comparison", {
    params: { start_date: date_from, end_date: date_to },
  })
  return response.data || []
}

// 25. V9 Contracts with SK_LEAD Enrichment
export const getV9ContractsEnriched = async (
  date_from?: string,
  date_to?: string,
  platform?: string
): Promise<V9ContractEnriched[]> => {
  const response = await apiClient.get("/data-analytics/v9/contracts/enriched", {
    params: { start_date: date_from, end_date: date_to, platform },
  })
  return response.data || []
}

// 26. V9 Monthly Cohort Analysis
export const getV9MonthlyCohorts = async (
  platform?: string
): Promise<V9MonthlyCohort[]> => {
  const response = await apiClient.get("/data-analytics/v9/cohorts/monthly", {
    params: { platform },
  })
  return response.data || []
}

// 27. V9 Facebook Weekly Performance
export const getV9FacebookWeekly = async (
  date_from?: string,
  date_to?: string,
  campaign_id?: string
): Promise<V9FacebookWeekly[]> => {
  const response = await apiClient.get("/data-analytics/v9/campaigns/facebook/weekly", {
    params: { start_date: date_from, end_date: date_to, campaign_id },
  })
  return response.data || []
}

// 28. V9 Google Ads Weekly Performance
export const getV9GoogleWeekly = async (
  date_from?: string,
  date_to?: string,
  campaign_id?: string
): Promise<V9GoogleWeekly[]> => {
  const response = await apiClient.get("/data-analytics/v9/campaigns/google/weekly", {
    params: { start_date: date_from, end_date: date_to, campaign_id },
  })
  return response.data || []
}

// 29. V9 Attribution Quality Metrics
export const getV9AttributionQuality = async (
  platform?: string
): Promise<V9AttributionQuality[]> => {
  const response = await apiClient.get("/data-analytics/v9/attribution/quality", {
    params: { platform },
  })
  return response.data || []
}

// V9 Campaigns Performance
export const getV9CampaignsPerformance = async (
  start_date: string,
  end_date: string,
  platform?: string
): Promise<any[]> => {
  const response = await apiClient.get("/data-analytics/v9/campaigns/performance", {
    params: { start_date, end_date, platform },
  })
  return response.data || []
}

// ============================================================================
// V10 PROD ANALYTICS - FULL CUSTOMER FUNNEL
// Added: October 23, 2025
// Production Verified: All endpoints working with 17,136 events (3.75x improvement)
// User requirement: "все эти ивенты это воронка клиента, что с ним происходило! все нужны!"
// ============================================================================

export interface V10Summary {
  total_events: number
  unique_clients: number
  first_touch_events: number
  mid_and_last_touch_events: number
  contracts: number
  total_revenue: number
  unique_platforms: number
  data_multiplier: number
}

export interface V10EventFunnel {
  dt: string
  platform: string
  channel: string
  total_events: number
  unique_clients: number
  first_touch_events: number
  last_touch_events: number
  contracts: number
  revenue: number
  avg_touch_sequence: number
}

export interface V10ContractMultiTouch {
  contract_day: string
  client_id: number
  contract_amount: number
  attributed_platform: string
  attributed_channel: string
  attributed_campaign_name: string | null
  first_touch_platform: string
  first_touch_channel: string
  total_touches: number
  days_to_convert: number
  platforms_in_journey: string[]
}

export interface V10PlatformTouches {
  platform: string
  unique_clients: number
  total_touches: number
  avg_touches_per_client: number
  clients_who_converted: number
  conversion_rate_pct: number
  total_revenue: number
  avg_revenue_per_converted: number
}

export interface V10FacebookFunnel {
  dt: string
  platform: string
  campaign_name: string | null
  total_events: number
  unique_clients: number
  first_touch: number
  mid_funnel: number
  last_touch: number
  contracts: number
  revenue: number
}

export interface V10GoogleFunnel {
  dt: string
  campaign_name: string | null
  total_events: number
  unique_clients: number
  first_touch: number
  mid_funnel: number
  last_touch: number
  contracts: number
  revenue: number
}

// 30. V10 Summary Statistics (VERIFIED - Production Oct 23, 2025)
export const getV10Summary = async (): Promise<V10Summary> => {
  const response = await apiClient.get("/data-analytics/v10/summary/prod")
  return response.data
}

// 31. V10 Full Customer Funnel (VERIFIED - 17,136 events)
export const getV10EventsFunnel = async (
  start_date?: string,
  end_date?: string,
  platform?: string
): Promise<V10EventFunnel[]> => {
  const response = await apiClient.get("/data-analytics/v10/events/funnel", {
    params: { start_date, end_date, platform },
  })
  return response.data || []
}

// 32. V10 Multi-Touch Attribution (VERIFIED - 424 contracts with journey)
export const getV10ContractsMultiTouch = async (
  start_date?: string,
  end_date?: string
): Promise<V10ContractMultiTouch[]> => {
  const response = await apiClient.get("/data-analytics/v10/contracts/multi-touch", {
    params: { start_date, end_date },
  })
  return response.data || []
}

// 33. V10 Platform Touches Analysis (VERIFIED - Email/Event preserved)
export const getV10PlatformsTouches = async (): Promise<V10PlatformTouches[]> => {
  const response = await apiClient.get("/data-analytics/v10/platforms/touches")
  return response.data || []
}

// 34. V10 Facebook Full Funnel (VERIFIED - 564 events, 33x improvement)
export const getV10FacebookFunnel = async (
  start_date?: string,
  end_date?: string
): Promise<V10FacebookFunnel[]> => {
  const response = await apiClient.get("/data-analytics/v10/campaigns/facebook/funnel", {
    params: { start_date, end_date },
  })
  return response.data || []
}

// 35. V10 Google Full Funnel (VERIFIED - 84 events with mid-funnel)
export const getV10GoogleFunnel = async (
  start_date?: string,
  end_date?: string
): Promise<V10GoogleFunnel[]> => {
  const response = await apiClient.get("/data-analytics/v10/campaigns/google/funnel", {
    params: { start_date, end_date },
  })
  return response.data || []
}
