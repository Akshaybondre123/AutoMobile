"use client"

import React, { createContext, useContext, useEffect, ReactNode } from 'react'
import { useAppSelector, useAppDispatch } from '@/lib/store/hooks'
import {
  setData as setDashboardData,
  setLoading as setDashboardLoading,
  setError as setDashboardError,
  markForRefresh as markDashboardForRefresh,
  clearUserData as clearDashboardUserData,
  clearAllData as clearAllDashboardData,
  cleanExpiredData,
  type DashboardData,
  type DataType
} from '@/lib/store/slices/dashboardSlice'

// Re-export types for backwards compatibility
export type { DashboardData, DataType }

interface DashboardState {
  [userKey: string]: {
    [dataType: string]: {
      data: DashboardData | null
      lastFetched: number
      isLoading: boolean
      error: string | null
      hasData: boolean
      needsRefresh: boolean
    }
  }
}

interface DashboardContextType {
  // State getters
  getData: (userEmail: string, dataType: DataType, city?: string) => DashboardData | null
  getLoadingState: (userEmail: string, dataType: DataType, city?: string) => boolean
  getError: (userEmail: string, dataType: DataType, city?: string) => string | null
  hasData: (userEmail: string, dataType: DataType, city?: string) => boolean
  needsRefresh: (userEmail: string, dataType: DataType, city?: string) => boolean
  
  // Actions
  setData: (userEmail: string, dataType: DataType, data: DashboardData, city?: string) => void
  setLoading: (userEmail: string, dataType: DataType, loading: boolean, city?: string) => void
  setError: (userEmail: string, dataType: DataType, error: string | null, city?: string) => void
  markForRefresh: (userEmail: string, dataType?: DataType, city?: string) => void
  clearUserData: (userEmail: string) => void
  clearAllData: () => void
  
  // Utilities
  getStats: () => { totalEntries: number, totalSize: number, oldestEntry: number | null }
}

// Constants (moved to slice, but kept here for helper functions)
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const STALE_TIME = 2 * 60 * 1000 // 2 minutes - show stale data but refetch in background

// Helper functions
const getUserKey = (userEmail: string, city?: string): string => {
  return `${userEmail}-${city || 'default'}`
}

const getDataKey = (dataType: DataType): string => {
  return dataType
}

const isDataStale = (lastFetched: number): boolean => {
  return Date.now() - lastFetched > STALE_TIME
}

const isDataExpired = (lastFetched: number): boolean => {
  return Date.now() - lastFetched > CACHE_DURATION
}

// Context
const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

// Provider component
interface DashboardProviderProps {
  children: ReactNode
}

export const DashboardProvider: React.FC<DashboardProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch()
  const state = useAppSelector((state) => state.dashboard)

  // Clean expired data on mount (after rehydration)
  useEffect(() => {
    dispatch(cleanExpiredData())
  }, [dispatch])

  // Context value
  const contextValue: DashboardContextType = {
    // State getters
    getData: (userEmail: string, dataType: DataType, city?: string) => {
      const userKey = getUserKey(userEmail, city)
      const dataKey = getDataKey(dataType)
      return state[userKey]?.[dataKey]?.data || null
    },

    getLoadingState: (userEmail: string, dataType: DataType, city?: string) => {
      const userKey = getUserKey(userEmail, city)
      const dataKey = getDataKey(dataType)
      return state[userKey]?.[dataKey]?.isLoading || false
    },

    getError: (userEmail: string, dataType: DataType, city?: string) => {
      const userKey = getUserKey(userEmail, city)
      const dataKey = getDataKey(dataType)
      return state[userKey]?.[dataKey]?.error || null
    },

    hasData: (userEmail: string, dataType: DataType, city?: string) => {
      const userKey = getUserKey(userEmail, city)
      const dataKey = getDataKey(dataType)
      const entry = state[userKey]?.[dataKey]
      return entry?.hasData && !isDataExpired(entry.lastFetched)
    },

    needsRefresh: (userEmail: string, dataType: DataType, city?: string) => {
      const userKey = getUserKey(userEmail, city)
      const dataKey = getDataKey(dataType)
      const entry = state[userKey]?.[dataKey]
      return entry?.needsRefresh || isDataStale(entry?.lastFetched || 0)
    },

    // Actions
    setData: (userEmail: string, dataType: DataType, data: DashboardData, city?: string) => {
      const userKey = getUserKey(userEmail, city)
      const dataKey = getDataKey(dataType)
      console.log('💾 Global State: Setting data for', userKey, dataKey, '- Records:', data?.data?.length || 0)
      dispatch(setDashboardData({ userKey, dataType: dataKey, data }))
    },

    setLoading: (userEmail: string, dataType: DataType, loading: boolean, city?: string) => {
      const userKey = getUserKey(userEmail, city)
      const dataKey = getDataKey(dataType)
      dispatch(setDashboardLoading({ userKey, dataType: dataKey, loading }))
    },

    setError: (userEmail: string, dataType: DataType, error: string | null, city?: string) => {
      const userKey = getUserKey(userEmail, city)
      const dataKey = getDataKey(dataType)
      dispatch(setDashboardError({ userKey, dataType: dataKey, error }))
    },

    markForRefresh: (userEmail: string, dataType?: DataType, city?: string) => {
      const userKey = getUserKey(userEmail, city)
      const dataKey = dataType ? getDataKey(dataType) : undefined
      console.log('🔄 Global State: Marking for refresh', userKey, dataKey || 'all data types')
      dispatch(markDashboardForRefresh({ userKey, dataType: dataKey }))
    },

    clearUserData: (userEmail: string) => {
      const userKey = getUserKey(userEmail)
      console.log('🗑️ Global State: Clearing user data for', userKey)
      dispatch(clearDashboardUserData({ userKey }))
    },

    clearAllData: () => {
      console.log('🗑️ Global State: Clearing all data')
      dispatch(clearAllDashboardData())
    },

    // Utilities
    getStats: () => {
      const entries = Object.values(state).flatMap(userData => Object.values(userData))
      const totalSize = JSON.stringify(state).length
      const oldestEntry = entries.length > 0 
        ? Math.min(...entries.map(e => e.lastFetched))
        : null

      return {
        totalEntries: entries.length,
        totalSize,
        oldestEntry
      }
    }
  }

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  )
}

// Hook to use the context
export const useDashboard = (): DashboardContextType => {
  const context = useContext(DashboardContext)
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider')
  }
  return context
}

// Export types for use in components
export type { DashboardContextType }
