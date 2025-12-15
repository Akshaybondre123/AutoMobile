"use client"

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'

// Types
export interface DashboardData {
  summary?: any
  data: any[]
  count?: number
  totalAmount?: number
  [key: string]: any
}

export type DataType = "average" | "ro_billing" | "operations" | "warranty" | "service_booking" | "repair_order_list"

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

// Action types
type DashboardAction =
  | { type: 'SET_DATA'; payload: { userKey: string; dataType: string; data: DashboardData } }
  | { type: 'SET_LOADING'; payload: { userKey: string; dataType: string; loading: boolean } }
  | { type: 'SET_ERROR'; payload: { userKey: string; dataType: string; error: string | null } }
  | { type: 'MARK_FOR_REFRESH'; payload: { userKey: string; dataType?: string } }
  | { type: 'CLEAR_USER_DATA'; payload: { userKey: string } }
  | { type: 'CLEAR_ALL_DATA' }
  | { type: 'LOAD_FROM_STORAGE'; payload: DashboardState }

// Constants
const STORAGE_KEY = 'dashboard_global_state'
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

// Initial state
const initialState: DashboardState = {}

// Reducer
const dashboardReducer = (state: DashboardState, action: DashboardAction): DashboardState => {
  switch (action.type) {
    case 'SET_DATA': {
      const { userKey, dataType, data } = action.payload
      return {
        ...state,
        [userKey]: {
          ...state[userKey],
          [dataType]: {
            data,
            lastFetched: Date.now(),
            isLoading: false,
            error: null,
            hasData: true,
            needsRefresh: false
          }
        }
      }
    }
    
    case 'SET_LOADING': {
      const { userKey, dataType, loading } = action.payload
      return {
        ...state,
        [userKey]: {
          ...state[userKey],
          [dataType]: {
            ...state[userKey]?.[dataType],
            data: state[userKey]?.[dataType]?.data || null,
            lastFetched: state[userKey]?.[dataType]?.lastFetched || 0,
            isLoading: loading,
            error: loading ? null : state[userKey]?.[dataType]?.error || null,
            hasData: state[userKey]?.[dataType]?.hasData || false,
            needsRefresh: state[userKey]?.[dataType]?.needsRefresh || false
          }
        }
      }
    }
    
    case 'SET_ERROR': {
      const { userKey, dataType, error } = action.payload
      return {
        ...state,
        [userKey]: {
          ...state[userKey],
          [dataType]: {
            ...state[userKey]?.[dataType],
            data: state[userKey]?.[dataType]?.data || null,
            lastFetched: state[userKey]?.[dataType]?.lastFetched || 0,
            isLoading: false,
            error,
            hasData: state[userKey]?.[dataType]?.hasData || false,
            needsRefresh: state[userKey]?.[dataType]?.needsRefresh || false
          }
        }
      }
    }
    
    case 'MARK_FOR_REFRESH': {
      const { userKey, dataType } = action.payload
      if (dataType) {
        // Mark specific data type for refresh
        return {
          ...state,
          [userKey]: {
            ...state[userKey],
            [dataType]: {
              ...state[userKey]?.[dataType],
              data: state[userKey]?.[dataType]?.data || null,
              lastFetched: state[userKey]?.[dataType]?.lastFetched || 0,
              isLoading: state[userKey]?.[dataType]?.isLoading || false,
              error: state[userKey]?.[dataType]?.error || null,
              hasData: state[userKey]?.[dataType]?.hasData || false,
              needsRefresh: true
            }
          }
        }
      } else {
        // Mark all data types for this user for refresh
        const userData = state[userKey] || {}
        const updatedUserData = Object.keys(userData).reduce((acc, dt) => ({
          ...acc,
          [dt]: {
            ...userData[dt],
            needsRefresh: true
          }
        }), {})
        
        return {
          ...state,
          [userKey]: updatedUserData
        }
      }
    }
    
    case 'CLEAR_USER_DATA': {
      const { userKey } = action.payload
      const newState = { ...state }
      delete newState[userKey]
      return newState
    }
    
    case 'CLEAR_ALL_DATA': {
      return initialState
    }
    
    case 'LOAD_FROM_STORAGE': {
      return action.payload
    }
    
    default:
      return state
  }
}

// Context
const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

// Provider component
interface DashboardProviderProps {
  children: ReactNode
}

export const DashboardProvider: React.FC<DashboardProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(dashboardReducer, initialState)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsedState = JSON.parse(stored)
        // Clean expired entries
        const cleanedState = Object.keys(parsedState).reduce((acc, userKey) => {
          const userData = parsedState[userKey]
          const cleanedUserData = Object.keys(userData).reduce((userAcc, dataType) => {
            const entry = userData[dataType]
            if (!isDataExpired(entry.lastFetched)) {
              return {
                ...userAcc,
                [dataType]: {
                  ...entry,
                  needsRefresh: isDataStale(entry.lastFetched) // Mark stale data for background refresh
                }
              }
            }
            return userAcc
          }, {})
          
          if (Object.keys(cleanedUserData).length > 0) {
            acc[userKey] = cleanedUserData
          }
          return acc
        }, {} as DashboardState)
        
        dispatch({ type: 'LOAD_FROM_STORAGE', payload: cleanedState })
      }
    } catch (error) {
      console.warn('Failed to load dashboard state from storage:', error)
    }
  }, [])

  // Save to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (error) {
      console.warn('Failed to save dashboard state to storage:', error)
    }
  }, [state])

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
      dispatch({ type: 'SET_DATA', payload: { userKey, dataType: dataKey, data } })
    },

    setLoading: (userEmail: string, dataType: DataType, loading: boolean, city?: string) => {
      const userKey = getUserKey(userEmail, city)
      const dataKey = getDataKey(dataType)
      dispatch({ type: 'SET_LOADING', payload: { userKey, dataType: dataKey, loading } })
    },

    setError: (userEmail: string, dataType: DataType, error: string | null, city?: string) => {
      const userKey = getUserKey(userEmail, city)
      const dataKey = getDataKey(dataType)
      dispatch({ type: 'SET_ERROR', payload: { userKey, dataType: dataKey, error } })
    },

    markForRefresh: (userEmail: string, dataType?: DataType, city?: string) => {
      const userKey = getUserKey(userEmail, city)
      const dataKey = dataType ? getDataKey(dataType) : undefined
      console.log('🔄 Global State: Marking for refresh', userKey, dataKey || 'all data types')
      dispatch({ type: 'MARK_FOR_REFRESH', payload: { userKey, dataType: dataKey } })
    },

    clearUserData: (userEmail: string) => {
      const userKey = getUserKey(userEmail)
      console.log('🗑️ Global State: Clearing user data for', userKey)
      dispatch({ type: 'CLEAR_USER_DATA', payload: { userKey } })
    },

    clearAllData: () => {
      console.log('🗑️ Global State: Clearing all data')
      dispatch({ type: 'CLEAR_ALL_DATA' })
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
