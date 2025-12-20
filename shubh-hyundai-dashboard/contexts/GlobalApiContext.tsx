"use client"

import React, { createContext, useContext, useEffect, ReactNode } from 'react'
import { useAppSelector, useAppDispatch } from '@/lib/store/hooks'
import {
  setApiData as setGlobalApiData,
  setApiLoading as setGlobalApiLoading,
  setApiError as setGlobalApiError,
  markApiForRefresh as markGlobalApiForRefresh,
  clearApiData as clearGlobalApiData,
  clearAllApiData as clearAllGlobalApiData,
  cleanExpiredApiData
} from '@/lib/store/slices/globalApiSlice'

// Types for different API endpoints
export interface ApiState<T = any> {
  data: T | null
  isLoading: boolean
  error: string | null
  lastFetched: number
  hasData: boolean
  needsRefresh: boolean
}

export interface GlobalApiState {
  [endpoint: string]: {
    [userKey: string]: ApiState
  }
}

interface GlobalApiContextType {
  // State getters
  getApiData: <T = any>(endpoint: string, userKey?: string) => T | null
  getApiLoading: (endpoint: string, userKey?: string) => boolean
  getApiError: (endpoint: string, userKey?: string) => string | null
  hasApiData: (endpoint: string, userKey?: string) => boolean
  needsApiRefresh: (endpoint: string, userKey?: string) => boolean
  
  // Actions
  setApiData: <T = any>(endpoint: string, data: T, userKey?: string) => void
  setApiLoading: (endpoint: string, loading: boolean, userKey?: string) => void
  setApiError: (endpoint: string, error: string | null, userKey?: string) => void
  markApiForRefresh: (endpoint: string, userKey?: string) => void
  clearApiData: (endpoint: string, userKey?: string) => void
  clearAllApiData: () => void
  
  // Utilities
  getApiStats: () => { totalEndpoints: number, totalEntries: number, totalSize: number }
}

// Constants
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const STALE_TIME = 2 * 60 * 1000 // 2 minutes

// Helper functions
const getDefaultUserKey = (): string => 'default'

const isDataStale = (lastFetched: number): boolean => {
  return Date.now() - lastFetched > STALE_TIME
}

const isDataExpired = (lastFetched: number): boolean => {
  return Date.now() - lastFetched > CACHE_DURATION
}

// Context
const GlobalApiContext = createContext<GlobalApiContextType | undefined>(undefined)

// Provider component
interface GlobalApiProviderProps {
  children: ReactNode
}

export const GlobalApiProvider: React.FC<GlobalApiProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch()
  const state = useAppSelector((state) => state.globalApi)

  // Clean expired data on mount (after rehydration)
  useEffect(() => {
    dispatch(cleanExpiredApiData())
  }, [dispatch])

  // Context value
  const contextValue: GlobalApiContextType = {
    // State getters
    getApiData: <T = any>(endpoint: string, userKey?: string): T | null => {
      const key = userKey || getDefaultUserKey()
      return state[endpoint]?.[key]?.data || null
    },

    getApiLoading: (endpoint: string, userKey?: string): boolean => {
      const key = userKey || getDefaultUserKey()
      return state[endpoint]?.[key]?.isLoading || false
    },

    getApiError: (endpoint: string, userKey?: string): string | null => {
      const key = userKey || getDefaultUserKey()
      return state[endpoint]?.[key]?.error || null
    },

    hasApiData: (endpoint: string, userKey?: string): boolean => {
      const key = userKey || getDefaultUserKey()
      const entry = state[endpoint]?.[key]
      return entry?.hasData && !isDataExpired(entry.lastFetched)
    },

    needsApiRefresh: (endpoint: string, userKey?: string): boolean => {
      const key = userKey || getDefaultUserKey()
      const entry = state[endpoint]?.[key]
      return entry?.needsRefresh || isDataStale(entry?.lastFetched || 0)
    },

    // Actions
    setApiData: <T = any>(endpoint: string, data: T, userKey?: string): void => {
      const key = userKey || getDefaultUserKey()
      console.log('💾 Global API: Setting data for', endpoint, key, '- Size:', JSON.stringify(data).length, 'chars')
      dispatch(setGlobalApiData({ endpoint, userKey: key, data }))
    },

    setApiLoading: (endpoint: string, loading: boolean, userKey?: string): void => {
      const key = userKey || getDefaultUserKey()
      dispatch(setGlobalApiLoading({ endpoint, userKey: key, loading }))
    },

    setApiError: (endpoint: string, error: string | null, userKey?: string): void => {
      const key = userKey || getDefaultUserKey()
      dispatch(setGlobalApiError({ endpoint, userKey: key, error }))
    },

    markApiForRefresh: (endpoint: string, userKey?: string): void => {
      const key = userKey || getDefaultUserKey()
      console.log('🔄 Global API: Marking for refresh', endpoint, key)
      dispatch(markGlobalApiForRefresh({ endpoint, userKey: key }))
    },

    clearApiData: (endpoint: string, userKey?: string): void => {
      const key = userKey || getDefaultUserKey()
      console.log('🗑️ Global API: Clearing data for', endpoint, key)
      dispatch(clearGlobalApiData({ endpoint, userKey: key }))
    },

    clearAllApiData: (): void => {
      console.log('🗑️ Global API: Clearing all data')
      dispatch(clearAllGlobalApiData())
    },

    // Utilities
    getApiStats: () => {
      const endpoints = Object.keys(state)
      const totalEntries = endpoints.reduce((acc, endpoint) => {
        return acc + Object.keys(state[endpoint]).length
      }, 0)
      const totalSize = JSON.stringify(state).length

      return {
        totalEndpoints: endpoints.length,
        totalEntries,
        totalSize
      }
    }
  }

  return (
    <GlobalApiContext.Provider value={contextValue}>
      {children}
    </GlobalApiContext.Provider>
  )
}

// Hook to use the context
export const useGlobalApi = (): GlobalApiContextType => {
  const context = useContext(GlobalApiContext)
  if (context === undefined) {
    throw new Error('useGlobalApi must be used within a GlobalApiProvider')
  }
  return context
}

// Export types for use in components
export type { GlobalApiContextType }
