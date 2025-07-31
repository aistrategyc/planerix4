import { useEffect, useState } from "react"

interface SalesDaily {
  date: string
  contract_count: number
  total_revenue: number
  total_first_sum: number
}

interface SalesWeekly {
  week_start: string
  total_revenue: number
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

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)

      const query = new URLSearchParams()
      if (dateRange?.from) query.append("from", dateRange.from.toISOString())
      if (dateRange?.to) query.append("to", dateRange.to.toISOString())

      try {
        const res = await fetch(`/api/analytics/sales?${query.toString()}`)
        const json = await res.json()
        setData(json)
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
    }

    fetchData()
  }, [dateRange?.from?.toISOString(), dateRange?.to?.toISOString()])

  return { ...data, isLoading }
}