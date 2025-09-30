import { useState, useCallback, useEffect } from 'react'
import { DateRange } from '@/lib/api/analytics'

export interface DateRangeValue {
  from: Date
  to: Date
}

export function useAnalyticsDateRange(defaultDays: number = 30) {
  const [dateRange, setDateRange] = useState<DateRangeValue>(() => {
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - defaultDays + 1)
    return { from, to }
  })

  // Convert to API format
  const apiDateRange: DateRange = {
    start_date: dateRange.from.toISOString().split('T')[0],
    end_date: dateRange.to.toISOString().split('T')[0]
  }

  const updateDateRange = useCallback((newRange: DateRangeValue) => {
    setDateRange(newRange)
  }, [])

  const setPresetRange = useCallback((days: number) => {
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - days + 1)
    setDateRange({ from, to })
  }, [])

  return {
    dateRange,
    apiDateRange,
    updateDateRange,
    setPresetRange
  }
}