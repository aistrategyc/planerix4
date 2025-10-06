/**
 * useDataAnalytics hook with caching and error resilience
 * Each widget can fail independently without crashing the page
 */

import { useState, useEffect, useCallback, useRef } from "react"
import {
  getKPICards,
  getLeadsTrend,
  getSpendTrend,
  getCampaigns,
  getWoWCampaignsLegacy,
  getUTMSources,
  getPlatformShare,
  getTopCampaigns,
  type KPICards,
  type LeadsTrendItem,
  type SpendTrendItem,
  type CampaignItem,
  type WoWCampaignItem,
  type UTMSourceItem,
  type PlatformShareItem,
  type TopCampaignItem,
  type DataAnalyticsFilters,
} from "@/lib/api/data-analytics"

export interface DataAnalyticsState {
  kpi: KPICards | null
  leadsTrend: LeadsTrendItem[]
  spendTrend: SpendTrendItem[]
  campaigns: CampaignItem[]
  wowCampaigns: WoWCampaignItem[]
  utmSources: UTMSourceItem[]
  platformShare: PlatformShareItem[]
  topCampaigns: TopCampaignItem[]
  loading: boolean
  error: string | null
  partialErrors: Record<string, string>
}

export interface UseDataAnalyticsReturn extends DataAnalyticsState {
  filters: DataAnalyticsFilters
  setFilters: (filters: Partial<DataAnalyticsFilters>) => void
  refetch: () => Promise<void>
}

// Default date range: last 24 days (2025-09-10 to 2025-10-03 per spec)
const getDefaultDateRange = () => {
  const today = new Date()
  const end = today.toISOString().split("T")[0]
  const start = new Date(today.getTime() - 24 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0]
  return { start, end }
}

export function useDataAnalytics() {
  const defaultRange = getDefaultDateRange()

  const [filters, setFiltersState] = useState<DataAnalyticsFilters>({
    date_from: defaultRange.start,
    date_to: defaultRange.end,
    platforms: "google,meta",
    min_spend: 0,
  })

  const [state, setState] = useState<DataAnalyticsState>({
    kpi: null,
    leadsTrend: [],
    spendTrend: [],
    campaigns: [],
    wowCampaigns: [],
    utmSources: [],
    platformShare: [],
    topCampaigns: [],
    loading: false,
    error: null,
    partialErrors: {},
  })

  // Simple cache to prevent infinite loops
  const cacheRef = useRef<Map<string, Partial<DataAnalyticsState>>>(new Map())
  const isFetchingRef = useRef(false)

  const setFilters = useCallback((newFilters: Partial<DataAnalyticsFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }))
  }, [])

  const fetchData = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      console.log("Fetch already in progress, skipping")
      return
    }

    // Check cache
    const cacheKey = JSON.stringify(filters)
    const cached = cacheRef.current.get(cacheKey)
    if (cached) {
      console.log("Using cached data")
      setState((prev) => ({ ...prev, ...cached, loading: false }))
      return
    }

    isFetchingRef.current = true
    setState((prev) => ({ ...prev, loading: true, error: null, partialErrors: {} }))

    const partialErrors: Record<string, string> = {}

    try {
      // Fetch all data in parallel with individual error handling
      const results = await Promise.allSettled([
        getKPICards(filters).catch((e) => {
          partialErrors.kpi = e.message
          return null
        }),
        getLeadsTrend(filters).catch((e) => {
          partialErrors.leadsTrend = e.message
          return []
        }),
        getSpendTrend(filters).catch((e) => {
          partialErrors.spendTrend = e.message
          return []
        }),
        getCampaigns(filters).catch((e) => {
          partialErrors.campaigns = e.message
          return []
        }),
        getWoWCampaignsLegacy(filters.platforms).catch((e) => {
          partialErrors.wowCampaigns = e.message
          return []
        }),
        getUTMSources(filters).catch((e) => {
          partialErrors.utmSources = e.message
          return []
        }),
        getPlatformShare(filters.date_from, filters.date_to).catch((e) => {
          partialErrors.platformShare = e.message
          return []
        }),
        getTopCampaigns(filters.date_from, filters.date_to, 5).catch((e) => {
          partialErrors.topCampaigns = e.message
          return []
        }),
      ])

      const newState = {
        kpi: results[0].status === "fulfilled" ? results[0].value : null,
        leadsTrend: results[1].status === "fulfilled" ? results[1].value : [],
        spendTrend: results[2].status === "fulfilled" ? results[2].value : [],
        campaigns: results[3].status === "fulfilled" ? results[3].value : [],
        wowCampaigns: results[4].status === "fulfilled" ? results[4].value : [],
        utmSources: results[5].status === "fulfilled" ? results[5].value : [],
        platformShare: results[6].status === "fulfilled" ? results[6].value : [],
        topCampaigns: results[7].status === "fulfilled" ? results[7].value : [],
        loading: false,
        error: null,
        partialErrors,
      }

      setState(newState)

      // Cache the result (limit to 5 entries)
      cacheRef.current.set(cacheKey, newState)
      if (cacheRef.current.size > 5) {
        const firstKey = cacheRef.current.keys().next().value
        cacheRef.current.delete(firstKey)
      }

      // Log any partial errors
      if (Object.keys(partialErrors).length > 0) {
        console.warn("Some data failed to load:", partialErrors)
      }
    } catch (error) {
      console.error("Critical error fetching data analytics:", error)
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Failed to fetch data",
        partialErrors,
      }))
    } finally {
      isFetchingRef.current = false
    }
  }, [filters])

  // Fetch data when filters change
  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    ...state,
    filters,
    setFilters,
    refetch: fetchData,
  }
}
