import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface ApiState<T = any> {
  data: T | null
  isLoading: boolean
  error: string | null
  lastFetched: number
  hasData: boolean
  needsRefresh: boolean
}

interface GlobalApiState {
  [endpoint: string]: {
    [userKey: string]: ApiState
  }
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const STALE_TIME = 2 * 60 * 1000 // 2 minutes

const initialState: GlobalApiState = {}

const createDefaultApiState = (): ApiState => ({
  data: null,
  isLoading: false,
  error: null,
  lastFetched: 0,
  hasData: false,
  needsRefresh: false
})

const globalApiSlice = createSlice({
  name: 'globalApi',
  initialState,
  reducers: {
    setApiData: (state, action: PayloadAction<{ endpoint: string; userKey: string; data: any }>) => {
      const { endpoint, userKey, data } = action.payload
      if (!state[endpoint]) {
        state[endpoint] = {}
      }
      state[endpoint][userKey] = {
        data,
        isLoading: false,
        error: null,
        lastFetched: Date.now(),
        hasData: true,
        needsRefresh: false
      }
    },
    setApiLoading: (state, action: PayloadAction<{ endpoint: string; userKey: string; loading: boolean }>) => {
      const { endpoint, userKey, loading } = action.payload
      if (!state[endpoint]) {
        state[endpoint] = {}
      }
      const currentState = state[endpoint][userKey] || createDefaultApiState()
      state[endpoint][userKey] = {
        ...currentState,
        isLoading: loading,
        error: loading ? null : currentState.error
      }
    },
    setApiError: (state, action: PayloadAction<{ endpoint: string; userKey: string; error: string | null }>) => {
      const { endpoint, userKey, error } = action.payload
      if (!state[endpoint]) {
        state[endpoint] = {}
      }
      const currentState = state[endpoint][userKey] || createDefaultApiState()
      state[endpoint][userKey] = {
        ...currentState,
        isLoading: false,
        error
      }
    },
    markApiForRefresh: (state, action: PayloadAction<{ endpoint: string; userKey: string }>) => {
      const { endpoint, userKey } = action.payload
      if (!state[endpoint] || !state[endpoint][userKey]) return
      state[endpoint][userKey].needsRefresh = true
    },
    clearApiData: (state, action: PayloadAction<{ endpoint: string; userKey: string }>) => {
      const { endpoint, userKey } = action.payload
      if (state[endpoint] && state[endpoint][userKey]) {
        delete state[endpoint][userKey]
        if (Object.keys(state[endpoint]).length === 0) {
          delete state[endpoint]
        }
      }
    },
    clearAllApiData: (state) => {
      Object.keys(state).forEach(key => delete state[key])
    },
    // Clean expired entries on rehydrate
    cleanExpiredApiData: (state) => {
      const now = Date.now()
      Object.keys(state).forEach(endpoint => {
        const endpointData = state[endpoint]
        Object.keys(endpointData).forEach(userKey => {
          const entry = endpointData[userKey]
          if (now - entry.lastFetched > CACHE_DURATION) {
            delete endpointData[userKey]
          } else if (now - entry.lastFetched > STALE_TIME) {
            entry.needsRefresh = true
          }
        })
        if (Object.keys(endpointData).length === 0) {
          delete state[endpoint]
        }
      })
    }
  },
})

export const { 
  setApiData, 
  setApiLoading, 
  setApiError, 
  markApiForRefresh, 
  clearApiData, 
  clearAllApiData,
  cleanExpiredApiData
} = globalApiSlice.actions

// Helper selectors
export const selectApiData = <T = any>(state: { globalApi: GlobalApiState }, endpoint: string, userKey: string): T | null => {
  return state.globalApi[endpoint]?.[userKey]?.data || null
}

export const selectApiLoading = (state: { globalApi: GlobalApiState }, endpoint: string, userKey: string): boolean => {
  return state.globalApi[endpoint]?.[userKey]?.isLoading || false
}

export const selectApiError = (state: { globalApi: GlobalApiState }, endpoint: string, userKey: string): string | null => {
  return state.globalApi[endpoint]?.[userKey]?.error || null
}

export const selectApiHasData = (state: { globalApi: GlobalApiState }, endpoint: string, userKey: string): boolean => {
  const entry = state.globalApi[endpoint]?.[userKey]
  if (!entry) return false
  const now = Date.now()
  return entry.hasData && (now - entry.lastFetched <= CACHE_DURATION)
}

export const selectApiNeedsRefresh = (state: { globalApi: GlobalApiState }, endpoint: string, userKey: string): boolean => {
  const entry = state.globalApi[endpoint]?.[userKey]
  if (!entry) return true
  const now = Date.now()
  return entry.needsRefresh || (now - entry.lastFetched > STALE_TIME)
}

export default globalApiSlice.reducer
