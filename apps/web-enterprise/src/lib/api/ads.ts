/**
 * API client for Ads Manager and Marketing Campaigns
 *
 * Provides type-safe interfaces for fetching real advertising and campaign data
 * from the ITstep analytics database via the backend API.
 */

import { api } from './config'

// ============================================================================
// Ads Manager Types
// ============================================================================

export interface AdMetrics {
  impressions: number
  clicks: number
  spend: number
  ctr: number
  cpc: number
  conversions?: number
  cpa?: number
  roas?: number
}

export interface Ad {
  ad_id: string
  ad_name: string
  campaign_id: string
  campaign_name?: string
  platform: 'google' | 'meta'
  type: 'search' | 'display' | 'video' | 'shopping' | 'social'
  status: 'active' | 'paused' | 'draft' | 'expired'
  metrics: AdMetrics
  date_start: string
  date_stop: string
}

export interface AdStatsResponse {
  total_ads: number
  total_campaigns: number
  total_impressions: number
  total_clicks: number
  total_spend: number
  avg_ctr: number
  avg_cpc: number
}

// ============================================================================
// Marketing Campaigns Types
// ============================================================================

export interface CampaignMetrics {
  impressions: number
  clicks: number
  spend: number
  leads: number
  cpl: number  // Cost per lead
  ctr: number
  conversions?: number
  roas?: number
}

export interface Campaign {
  campaign_id: string
  campaign_name: string
  platform: 'google' | 'meta'
  type: 'email' | 'social' | 'ppc' | 'content' | 'seo' | 'influencer'
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled'
  days_active: number
  metrics: CampaignMetrics
  budget?: number
  target_audience?: string
}

export interface CampaignStatsResponse {
  total_campaigns: number
  active_campaigns: number
  total_spend: number
  total_leads: number
  avg_cpl: number
  avg_ctr: number
}

// ============================================================================
// Ads Manager API
// ============================================================================

export const AdsAPI = {
  /**
   * Get list of advertisements from ITstep analytics database
   */
  async getAds(params: {
    date_from?: string
    date_to?: string
    platform?: string
    limit?: number
  } = {}): Promise<Ad[]> {
    const response = await api.get('/ads-manager', { params })
    return response.data
  },

  /**
   * Get aggregated statistics for all advertisements
   */
  async getStats(params: {
    date_from?: string
    date_to?: string
  } = {}): Promise<AdStatsResponse> {
    const response = await api.get('/ads-manager/stats', { params })
    return response.data
  }
}

// ============================================================================
// Marketing Campaigns API
// ============================================================================

export const CampaignsAPI = {
  /**
   * Get list of marketing campaigns from ITstep analytics database
   */
  async getCampaigns(params: {
    date_from?: string
    date_to?: string
    platform?: string
    limit?: number
  } = {}): Promise<Campaign[]> {
    const response = await api.get('/marketing-campaigns', { params })
    return response.data
  },

  /**
   * Get aggregated statistics for all campaigns
   */
  async getStats(params: {
    date_from?: string
    date_to?: string
  } = {}): Promise<CampaignStatsResponse> {
    const response = await api.get('/marketing-campaigns/stats', { params })
    return response.data
  }
}
