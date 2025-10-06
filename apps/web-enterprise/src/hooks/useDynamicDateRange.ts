/**
 * Dynamic Date Range Hook
 * Automatically fetches the latest available date range from the database
 */

import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DateRange } from '@/lib/api/analytics'

export interface DateRangeValue {
  from: Date
  to: Date
}

interface DatabaseDateRange {
  max_date: string
  min_date: string
  suggested_start_date: string
  suggested_end_date: string
  month_start_date: string
  has_recent_data: boolean
}

/**
 * Hook to fetch dynamic date range from database
 */
export function useDynamicDateRange(defaultDaysBack: number = 7) {
  // Fetch actual date range from database
  const { data: dbDateRange, isLoading, error } = useQuery({
    queryKey: ['analytics', 'date-range'],
    queryFn: async (): Promise<DatabaseDateRange> => {
      const response = await fetch('/api/analytics/marketing/date-range')
      if (!response.ok) {
        throw new Error('Failed to fetch date range')
      }
      return response.json()
    },
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    cacheTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    retry: 3,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  })

  const [dateRange, setDateRange] = useState<DateRangeValue>(() => {
    // Fallback to hardcoded range while loading
    const to = new Date('2025-09-25')
    const from = new Date('2025-08-31')
    return { from, to }
  })

  // Update date range when database data is available
  useEffect(() => {
    if (dbDateRange && !error) {
      // Use suggested dates from database (covers last week of available data)
      const to = new Date(dbDateRange.suggested_end_date)
      const from = new Date(dbDateRange.suggested_start_date)

      // Validate dates
      if (!isNaN(to.getTime()) && !isNaN(from.getTime())) {
        setDateRange({ from, to })
      } else {
        console.warn('Invalid date range from database, using fallback')
      }
    }
  }, [dbDateRange, error])

  // Convert to API format
  const apiDateRange: DateRange = {
    start_date: dateRange.from.toISOString().split('T')[0],
    end_date: dateRange.to.toISOString().split('T')[0]
  }

  const updateDateRange = useCallback((newRange: DateRangeValue) => {
    setDateRange(newRange)
  }, [])

  const setPresetRange = useCallback((days: number) => {
    if (dbDateRange) {
      // Use database max date as reference (most recent available data)
      const to = new Date(dbDateRange.max_date)
      const from = new Date(to)
      from.setDate(from.getDate() - days + 1)

      // Don't go before the earliest available data
      const earliestDate = new Date(dbDateRange.min_date)
      if (from < earliestDate) {
        from.setTime(earliestDate.getTime())
      }

      setDateRange({ from, to })
    } else {
      // Fallback to hardcoded range
      const to = new Date('2025-09-25')
      const from = new Date(to)
      from.setDate(from.getDate() - days + 1)
      const earliestDate = new Date('2025-08-31')
      if (from < earliestDate) {
        from.setTime(earliestDate.getTime())
      }
      setDateRange({ from, to })
    }
  }, [dbDateRange])

  const refreshDateRange = useCallback(async () => {
    // Force refetch the date range
    return fetch('/api/analytics/marketing/date-range', {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' }
    })
    .then(res => res.json())
    .then((data: DatabaseDateRange) => {
      const to = new Date(data.suggested_end_date)
      const from = new Date(data.suggested_start_date)
      if (!isNaN(to.getTime()) && !isNaN(from.getTime())) {
        setDateRange({ from, to })
        return { from, to }
      }
    })
    .catch(console.error)
  }, [])

  return {
    dateRange,
    apiDateRange,
    updateDateRange,
    setPresetRange,
    refreshDateRange,
    isLoading,
    error,
    databaseInfo: dbDateRange,
    isUsingDatabaseDates: Boolean(dbDateRange && !error)
  }
}