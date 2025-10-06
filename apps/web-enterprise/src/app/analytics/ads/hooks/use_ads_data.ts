import { useEffect, useState } from "react"

interface DailyStat {
  date: string
  spend: number
  clicks: number
  impressions: number
  ctr: number
  cpc: number
  cpm: number
}

interface CampaignStat {
  campaign_id: string
  campaign_name?: string
  platform?: string    
  spend: number
  clicks: number
  conversions: number
  ctr: number
  cpc: number
  cpa: number
}

interface AdGroupStat {
  ad_group_id: string
  ad_group_name: string
  spend: number
  clicks: number
  conversions: number
  ctr: number
  cpc: number
  cpa: number
}

interface PlatformStat {
  platform: string
  spend: number
  impressions: number
  clicks: number
  conversions: number
  ctr: number
  cpc: number
  cpa: number | null
}

interface UtmStat {
  date: string
  utm_source: string
  utm_medium: string
  utm_campaign: string
  sessions: number
  conversions: number
  spend: number
  conv_rate: number
  cpa: number | null
  cps: number | null
  platform: string
}

interface UseAdsDataResult {
  isLoading: boolean
  daily: DailyStat[]
  campaigns: CampaignStat[]
  adGroups: AdGroupStat[]
  platforms: PlatformStat[]
  utm: UtmStat[]
}

export function useAdsData(dateRange: { from?: Date; to?: Date }): UseAdsDataResult {
  const [data, setData] = useState<UseAdsDataResult>({
    isLoading: true,
    daily: [],
    campaigns: [],
    adGroups: [],
    platforms: [],
    utm: [],
  })

  useEffect(() => {
    const fetchData = async () => {
      const from = dateRange.from?.toISOString().split("T")[0]
      const to = dateRange.to?.toISOString().split("T")[0]

      if (!from || !to) return

      setData((prev) => ({ ...prev, isLoading: true }))

      try {
        const res = await fetch(`/api/analytics/marketing/ads?from=${from}&to=${to}`)
        if (!res.ok) throw new Error("API request failed")
        const json = await res.json()

        setData({
          isLoading: false,
          daily: json.daily ?? [],
          campaigns: json.campaigns ?? [],
          adGroups: json.adGroups ?? [],
          platforms: json.platforms ?? [],
          utm: json.utm ?? [],
        })
      } catch (error) {
        console.error("❌ Failed to fetch ads data:", error)
        setData({
          isLoading: false,
          daily: [],
          campaigns: [],
          adGroups: [],
          platforms: [],
          utm: [],
        })
      }
    }

    fetchData()
  }, [dateRange])

  return data
}