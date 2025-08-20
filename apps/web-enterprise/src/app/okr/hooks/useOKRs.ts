import { useState, useCallback, useEffect, useRef } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { OKRsAPI, type OKR, type OKRCreate, type OKRUpdate, type OKRListResponse, OKRStatus, OKRTimeframe } from '@/lib/api/okrs'
import { errorToMessage } from '@/lib/ui/errorToMessage'

export interface OKRFilters {
  timeframe?: OKRTimeframe | 'all'
  status?: OKRStatus | 'all'
  search?: string
  page?: number
  page_size?: number
}

export interface OKRStats {
  total_okrs: number
  active_okrs: number
  completed_okrs: number
  overdue_okrs: number
  completion_rate: number
}

// Main hook for OKR management
export const useOKRs = () => {
  const [okrs, setOKRs] = useState<OKR[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<OKRFilters>({
    timeframe: 'all',
    status: 'all',
    page: 1,
    page_size: 20
  })
  const { toast } = useToast()
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Fetch OKRs with current filters
  const fetchOKRs = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await OKRsAPI.getOKRs(filters)
      if (mountedRef.current) {
        setOKRs(response.items || response as any) // Handle both response types
      }
    } catch (err) {
      const errorMessage = errorToMessage(err)
      if (mountedRef.current) {
        setError(errorMessage)
        toast({
          title: 'Error',
          description: `Failed to fetch OKRs: ${errorMessage}`,
          variant: 'destructive',
        })
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [filters, toast])

  // Create new OKR
  const createOKR = useCallback(async (okrData: OKRCreate): Promise<OKR | null> => {
    try {
      setError(null)
      const newOKR = await OKRsAPI.createOKR(okrData)
      if (mountedRef.current) {
        setOKRs(prev => [newOKR, ...prev])
        toast({
          title: 'OKR Created',
          description: `OKR "${newOKR.title}" has been created successfully`,
        })
      }
      return newOKR
    } catch (err) {
      const errorMessage = errorToMessage(err)
      if (mountedRef.current) {
        setError(errorMessage)
        toast({
          title: 'Error',
          description: `Failed to create OKR: ${errorMessage}`,
          variant: 'destructive',
        })
      }
      return null
    }
  }, [toast])

  // Update existing OKR
  const updateOKR = useCallback(async (okrId: string, updates: OKRUpdate): Promise<OKR | null> => {
    try {
      setError(null)
      const updatedOKR = await OKRsAPI.updateOKR(okrId, updates)
      if (mountedRef.current) {
        setOKRs(prev => prev.map(okr => 
          okr.id === okrId ? updatedOKR : okr
        ))
        toast({
          title: 'OKR Updated',
          description: `OKR "${updatedOKR.title}" has been updated successfully`,
        })
      }
      return updatedOKR
    } catch (err) {
      const errorMessage = errorToMessage(err)
      if (mountedRef.current) {
        setError(errorMessage)
        toast({
          title: 'Error',
          description: `Failed to update OKR: ${errorMessage}`,
          variant: 'destructive',
        })
      }
      return null
    }
  }, [toast])

  // Delete OKR
  const deleteOKR = useCallback(async (okrId: string): Promise<boolean> => {
    try {
      setError(null)
      await OKRsAPI.deleteOKR(okrId)
      if (mountedRef.current) {
        setOKRs(prev => prev.filter(okr => okr.id !== okrId))
        toast({
          title: 'OKR Deleted',
          description: 'OKR has been deleted successfully',
        })
      }
      return true
    } catch (err) {
      const errorMessage = errorToMessage(err)
      if (mountedRef.current) {
        setError(errorMessage)
        toast({
          title: 'Error',
          description: `Failed to delete OKR: ${errorMessage}`,
          variant: 'destructive',
        })
      }
      return false
    }
  }, [toast])

  // Update only OKR status
  const updateOKRStatus = useCallback(async (okrId: string, status: OKRStatus): Promise<boolean> => {
    try {
      setError(null)
      const updatedOKR = await OKRsAPI.updateOKR(okrId, { status })
      if (mountedRef.current) {
        setOKRs(prev => prev.map(okr => 
          okr.id === okrId ? updatedOKR : okr
        ))
        toast({
          title: 'Status Updated',
          description: `OKR status changed to ${status}`,
        })
      }
      return true
    } catch (err) {
      const errorMessage = errorToMessage(err)
      if (mountedRef.current) {
        setError(errorMessage)
        toast({
          title: 'Error',
          description: `Failed to update OKR status: ${errorMessage}`,
          variant: 'destructive',
        })
      }
      return false
    }
  }, [toast])

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<OKRFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({
      timeframe: 'all',
      status: 'all',
      page: 1,
      page_size: 20
    })
  }, [])

  useEffect(() => {
    fetchOKRs()
  }, [fetchOKRs])

  return {
    okrs,
    loading,
    error,
    filters,
    actions: {
      createOKR,
      updateOKR,
      deleteOKR,
      updateOKRStatus,
      refetch: fetchOKRs,
      updateFilters,
      clearFilters
    }
  }
}

// Hook for single OKR details
export const useOKR = (okrId: string | null) => {
  const [okr, setOKR] = useState<OKR | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const fetchOKR = useCallback(async () => {
    if (!okrId) return
    
    try {
      setLoading(true)
      setError(null)
      const fetchedOKR = await OKRsAPI.getOKR(okrId)
      setOKR(fetchedOKR)
    } catch (err) {
      setError(errorToMessage(err))
    } finally {
      setLoading(false)
    }
  }, [okrId])

  useEffect(() => {
    fetchOKR()
  }, [fetchOKR])

  return { okr, loading, error, refetch: fetchOKR }
}

// Hook for OKR statistics
export const useOKRStats = () => {
  const [stats, setStats] = useState<OKRStats | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch all OKRs to calculate stats (in real implementation, this should be a separate API endpoint)
      const response = await OKRsAPI.getOKRs({ page_size: 1000 })
      const allOKRs = response.items || response as any
      
      if (Array.isArray(allOKRs)) {
        const total = allOKRs.length
        const active = allOKRs.filter(okr => okr.status === OKRStatus.ACTIVE).length
        const completed = allOKRs.filter(okr => okr.status === OKRStatus.DONE).length
        
        // Calculate overdue (simplified - based on timeframe, could be enhanced with actual dates)
        const overdue = allOKRs.filter(okr => 
          okr.status === OKRStatus.ACTIVE &&
          // For now, assume quarterly OKRs might be overdue if they're active too long
          okr.timeframe === OKRTimeframe.Q
        ).length
        
        const completion_rate = total > 0 ? (completed / total) * 100 : 0

        setStats({
          total_okrs: total,
          active_okrs: active,
          completed_okrs: completed,
          overdue_okrs: overdue,
          completion_rate: Math.round(completion_rate)
        })
      } else {
        // Fallback stats
        setStats({
          total_okrs: 0,
          active_okrs: 0,
          completed_okrs: 0,
          overdue_okrs: 0,
          completion_rate: 0
        })
      }
    } catch (err) {
      setError(errorToMessage(err))
      // Set fallback stats on error
      setStats({
        total_okrs: 0,
        active_okrs: 0,
        completed_okrs: 0,
        overdue_okrs: 0,
        completion_rate: 0
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { stats, loading, error, refetch: fetchStats }
}

// Hook for filtering and searching OKRs
export const useOKRFilters = (initialFilters?: Partial<OKRFilters>) => {
  const [filters, setFilters] = useState<OKRFilters>({
    timeframe: 'all',
    status: 'all',
    search: '',
    page: 1,
    page_size: 20,
    ...initialFilters
  })

  const updateFilter = useCallback((key: keyof OKRFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      // Reset page when other filters change
      ...(key !== 'page' && { page: 1 })
    }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({
      timeframe: 'all',
      status: 'all',
      search: '',
      page: 1,
      page_size: 20,
      ...initialFilters
    })
  }, [initialFilters])

  const hasActiveFilters = filters.timeframe !== 'all' || 
                          filters.status !== 'all' || 
                          (filters.search && filters.search.length > 0)

  return {
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters
  }
}

export default {
  useOKRs,
  useOKR,
  useOKRStats,
  useOKRFilters
}