"use client"

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'

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

// Action types
type GlobalApiAction =
  | { type: 'SET_API_DATA'; payload: { endpoint: string; userKey: string; data: any } }
  | { type: 'SET_API_LOADING'; payload: { endpoint: string; userKey: string; loading: boolean } }
  | { type: 'SET_API_ERROR'; payload: { endpoint: string; userKey: string; error: string | null } }
  | { type: 'MARK_API_FOR_REFRESH'; payload: { endpoint: string; userKey: string } }
  | { type: 'CLEAR_API_DATA'; payload: { endpoint: string; userKey: string } }
  | { type: 'CLEAR_ALL_API_DATA' }
  | { type: 'LOAD_FROM_STORAGE'; payload: GlobalApiState }

// Constants
const STORAGE_KEY = 'global_api_state'
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

const createDefaultApiState = (): ApiState => ({
  data: null,
  isLoading: false,
  error: null,
  lastFetched: 0,
  hasData: false,
  needsRefresh: false
})

// Initial state
const initialState: GlobalApiState = {}

// Reducer
const globalApiReducer = (state: GlobalApiState, action: GlobalApiAction): GlobalApiState => {
  switch (action.type) {
    case 'SET_API_DATA': {
      const { endpoint, userKey, data } = action.payload
      return {
        ...state,
        [endpoint]: {
          ...state[endpoint],
          [userKey]: {
            data,
            isLoading: false,
            error: null,
            lastFetched: Date.now(),
            hasData: true,
            needsRefresh: false
          }
        }
      }
    }
    
    case 'SET_API_LOADING': {
      const { endpoint, userKey, loading } = action.payload
      const currentState = state[endpoint]?.[userKey] || createDefaultApiState()
      return {
        ...state,
        [endpoint]: {
          ...state[endpoint],
          [userKey]: {
            ...currentState,
            isLoading: loading,
            error: loading ? null : currentState.error
          }
        }
      }
    }
    
    case 'SET_API_ERROR': {
      const { endpoint, userKey, error } = action.payload
      const currentState = state[endpoint]?.[userKey] || createDefaultApiState()
      return {
        ...state,
        [endpoint]: {
          ...state[endpoint],
          [userKey]: {
            ...currentState,
            isLoading: false,
            error
          }
        }
      }
    }
    
    case 'MARK_API_FOR_REFRESH': {
      const { endpoint, userKey } = action.payload
      const currentState = state[endpoint]?.[userKey] || createDefaultApiState()
      return {
        ...state,
        [endpoint]: {
          ...state[endpoint],
          [userKey]: {
            ...currentState,
            needsRefresh: true
          }
        }
      }
    }
    
    case 'CLEAR_API_DATA': {
      const { endpoint, userKey } = action.payload
      if (state[endpoint]) {
        const newEndpointState = { ...state[endpoint] }
        delete newEndpointState[userKey]
        
        if (Object.keys(newEndpointState).length === 0) {
          const newState = { ...state }
          delete newState[endpoint]
          return newState
        }
        
        return {
          ...state,
          [endpoint]: newEndpointState
        }
      }
      return state
    }
    
    case 'CLEAR_ALL_API_DATA': {
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
const GlobalApiContext = createContext<GlobalApiContextType | undefined>(undefined)

// Provider component
interface GlobalApiProviderProps {
  children: ReactNode
}

export const GlobalApiProvider: React.FC<GlobalApiProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(globalApiReducer, initialState)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsedState = JSON.parse(stored)
        // Clean expired entries
        const cleanedState = Object.keys(parsedState).reduce((acc, endpoint) => {
          const endpointData = parsedState[endpoint]
          const cleanedEndpointData = Object.keys(endpointData).reduce((endpointAcc, userKey) => {
            const entry = endpointData[userKey]
            if (!isDataExpired(entry.lastFetched)) {
              return {
                ...endpointAcc,
                [userKey]: {
                  ...entry,
                  needsRefresh: isDataStale(entry.lastFetched)
                }
              }
            }
            return endpointAcc
          }, {})
          
          if (Object.keys(cleanedEndpointData).length > 0) {
            acc[endpoint] = cleanedEndpointData
          }
          return acc
        }, {} as GlobalApiState)
        
        dispatch({ type: 'LOAD_FROM_STORAGE', payload: cleanedState })
      }
    } catch (error) {
      console.warn('Failed to load global API state from storage:', error)
    }
  }, [])

  // Save to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (error) {
      console.warn('Failed to save global API state to storage:', error)
    }
  }, [state])

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
      dispatch({ type: 'SET_API_DATA', payload: { endpoint, userKey: key, data } })
    },

    setApiLoading: (endpoint: string, loading: boolean, userKey?: string): void => {
      const key = userKey || getDefaultUserKey()
      dispatch({ type: 'SET_API_LOADING', payload: { endpoint, userKey: key, loading } })
    },

    setApiError: (endpoint: string, error: string | null, userKey?: string): void => {
      const key = userKey || getDefaultUserKey()
      dispatch({ type: 'SET_API_ERROR', payload: { endpoint, userKey: key, error } })
    },

    markApiForRefresh: (endpoint: string, userKey?: string): void => {
      const key = userKey || getDefaultUserKey()
      console.log('🔄 Global API: Marking for refresh', endpoint, key)
      dispatch({ type: 'MARK_API_FOR_REFRESH', payload: { endpoint, userKey: key } })
    },

    clearApiData: (endpoint: string, userKey?: string): void => {
      const key = userKey || getDefaultUserKey()
      console.log('🗑️ Global API: Clearing data for', endpoint, key)
      dispatch({ type: 'CLEAR_API_DATA', payload: { endpoint, userKey: key } })
    },

    clearAllApiData: (): void => {
      console.log('🗑️ Global API: Clearing all data')
      dispatch({ type: 'CLEAR_ALL_API_DATA' })
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
