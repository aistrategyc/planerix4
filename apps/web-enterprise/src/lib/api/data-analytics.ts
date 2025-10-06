/**
 * DataAnalytics v4 API Client
 * ITstep client analytics with Period-over-Period comparison
 */

import { apiClient } from "./config"

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
