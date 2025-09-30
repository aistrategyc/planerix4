import { useEffect, useState, useCallback } from "react"

interface SalesDaily {
  date: string
  contract_count: number
  total_revenue: number
  total_first_sum: number
}

interface SalesWeekly {
  week_start: string
  total_revenue: number
  total_first_sum: number
  contract_count: number
}

interface ServiceRow {
  service_id: number
  service_name: string
  contract_count: number
  total_revenue: number
  total_first_sum: number
}

interface BranchRow {
  branch_sk: number
  branch_name: string
  contract_count: number
  total_revenue: number
  total_first_sum: number
}

interface UtmRow {
  utm_source: string
  utm_medium: string
  utm_campaign: string
  contract_count: number
  total_revenue: number
  total_first_sum: number
}

interface SalesData {
  daily: SalesDaily[]
  weekly: SalesWeekly[]
  byService: ServiceRow[]
  byBranch: BranchRow[]
  byUtm: UtmRow[]
}

export function useSalesData(dateRange?: { from?: Date; to?: Date }) {
  const [data, setData] = useState<SalesData>({
    daily: [],
    weekly: [],
    byService: [],
    byBranch: [],
    byUtm: [],
  })
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    const query = new URLSearchParams()
    if (dateRange?.from) query.append("from", dateRange.from.toISOString())
    if (dateRange?.to) query.append("to", dateRange.to.toISOString())

    try {
      const res = await fetch(`/api/analytics/marketing/sales?${query.toString()}`)
      const json = await res.json()

      const mappedWeekly = (json.weekly ?? []).map((item: any) => ({
        week_start: item.week_start,
        total_revenue: item.total_revenue ?? 0,
        total_first_sum: item.total_first_sum ?? 0,
        contract_count: item.contract_count ?? 0,
      }))

      setData({
        daily: json.daily ?? [],
        weekly: mappedWeekly,
        byService: json.byService ?? [],
        byBranch: json.byBranch ?? [],
        byUtm: json.byUtm ?? [],
      })
    } catch (error) {
      console.error("Ошибка при загрузке sales data", error)
      setData({
        daily: [],
        weekly: [],
        byService: [],
        byBranch: [],
        byUtm: [],
      })
    } finally {
      setIsLoading(false)
    }
  }, [dateRange?.from?.toISOString(), dateRange?.to?.toISOString()])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    ...data,
    isLoading,
    refetch: fetchData,
  }
}