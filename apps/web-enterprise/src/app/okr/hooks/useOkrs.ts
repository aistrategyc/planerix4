import { useState, useCallback } from 'react'
import { OKRsAPI, type OKR, type OKRCreate, type OKRUpdate } from '@/lib/api/okr'

export function useOkrs() {
  const [okrs, setOkrs] = useState<OKR[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadOkrs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await OKRsAPI.list()
      setOkrs(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load OKRs')
      console.error('Failed to load OKRs:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const createOkr = useCallback(async (data: OKRCreate): Promise<boolean> => {
    try {
      const newOkr = await OKRsAPI.create(data)
      setOkrs(prev => [newOkr, ...prev])
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create OKR')
      console.error('Failed to create OKR:', err)
      return false
    }
  }, [])

  const updateOkr = useCallback(async (id: string, data: OKRUpdate): Promise<boolean> => {
    try {
      const updatedOkr = await OKRsAPI.update(id, data)
      setOkrs(prev => prev.map(okr => okr.id === id ? updatedOkr : okr))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update OKR')
      console.error('Failed to update OKR:', err)
      return false
    }
  }, [])

  const deleteOkr = useCallback(async (id: string): Promise<boolean> => {
    try {
      await OKRsAPI.delete(id)
      setOkrs(prev => prev.filter(okr => okr.id !== id))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete OKR')
      console.error('Failed to delete OKR:', err)
      return false
    }
  }, [])

  const updateProgress = useCallback(async (id: string, progress: number): Promise<boolean> => {
    try {
      const updatedOkr = await OKRsAPI.updateProgress(id, progress)
      setOkrs(prev => prev.map(okr => okr.id === id ? updatedOkr : okr))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update progress')
      console.error('Failed to update progress:', err)
      return false
    }
  }, [])

  const updateStatus = useCallback(async (id: string, status: OKR['status']): Promise<boolean> => {
    try {
      const updatedOkr = await OKRsAPI.updateStatus(id, status)
      setOkrs(prev => prev.map(okr => okr.id === id ? updatedOkr : okr))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
      console.error('Failed to update status:', err)
      return false
    }
  }, [])

  return {
    okrs,
    loading,
    error,
    loadOkrs,
    createOkr,
    updateOkr,
    deleteOkr,
    updateProgress,
    updateStatus
  }
}