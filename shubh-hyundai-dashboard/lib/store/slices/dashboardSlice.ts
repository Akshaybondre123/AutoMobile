import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface DashboardData {
  summary?: any
  data: any[]
  count?: number
  totalAmount?: number
  [key: string]: any
}

export type DataType = "average" | "ro_billing" | "operations" | "warranty" | "service_booking" | "repair_order_list"

interface DataEntry {
  data: DashboardData | null
  lastFetched: number
  isLoading: boolean
  error: string | null
  hasData: boolean
  needsRefresh: boolean
}

interface UserData {
  [dataType: string]: DataEntry
}

interface DashboardState {
  [userKey: string]: UserData
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const STALE_TIME = 2 * 60 * 1000 // 2 minutes

const initialState: DashboardState = {}

const createDefaultDataEntry = (): DataEntry => ({
  data: null,
  lastFetched: 0,
  isLoading: false,
  error: null,
  hasData: false,
  needsRefresh: false
})

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setData: (state, action: PayloadAction<{ userKey: string; dataType: string; data: DashboardData }>) => {
      const { userKey, dataType, data } = action.payload
      if (!state[userKey]) {
        state[userKey] = {}
      }
      state[userKey][dataType] = {
        data,
        lastFetched: Date.now(),
        isLoading: false,
        error: null,
        hasData: true,
        needsRefresh: false
      }
    },
    setLoading: (state, action: PayloadAction<{ userKey: string; dataType: string; loading: boolean }>) => {
      const { userKey, dataType, loading } = action.payload
      if (!state[userKey]) {
        state[userKey] = {}
      }
      if (!state[userKey][dataType]) {
        state[userKey][dataType] = createDefaultDataEntry()
      }
      state[userKey][dataType].isLoading = loading
      if (loading) {
        state[userKey][dataType].error = null
      }
    },
    setError: (state, action: PayloadAction<{ userKey: string; dataType: string; error: string | null }>) => {
      const { userKey, dataType, error } = action.payload
      if (!state[userKey]) {
        state[userKey] = {}
      }
      if (!state[userKey][dataType]) {
        state[userKey][dataType] = createDefaultDataEntry()
      }
      state[userKey][dataType].error = error
      state[userKey][dataType].isLoading = false
    },
    markForRefresh: (state, action: PayloadAction<{ userKey: string; dataType?: string }>) => {
      const { userKey, dataType } = action.payload
      if (!state[userKey]) return
      
      if (dataType) {
        if (state[userKey][dataType]) {
          state[userKey][dataType].needsRefresh = true
        }
      } else {
        // Mark all data types for this user
        Object.keys(state[userKey]).forEach(dt => {
          state[userKey][dt].needsRefresh = true
        })
      }
    },
    clearUserData: (state, action: PayloadAction<{ userKey: string }>) => {
      delete state[action.payload.userKey]
    },
    clearAllData: (state) => {
      Object.keys(state).forEach(key => delete state[key])
    },
    // Clean expired entries on rehydrate
    cleanExpiredData: (state) => {
      const now = Date.now()
      Object.keys(state).forEach(userKey => {
        const userData = state[userKey]
        Object.keys(userData).forEach(dataType => {
          const entry = userData[dataType]
          if (now - entry.lastFetched > CACHE_DURATION) {
            delete userData[dataType]
          } else if (now - entry.lastFetched > STALE_TIME) {
            entry.needsRefresh = true
          }
        })
        if (Object.keys(userData).length === 0) {
          delete state[userKey]
        }
      })
    }
  },
})

export const { 
  setData, 
  setLoading, 
  setError, 
  markForRefresh, 
  clearUserData, 
  clearAllData,
  cleanExpiredData
} = dashboardSlice.actions

// Helper selectors (can be used with useAppSelector)
export const selectDashboardData = (state: { dashboard: DashboardState }, userKey: string, dataType: string) => {
  return state.dashboard[userKey]?.[dataType]?.data || null
}

export const selectDashboardLoading = (state: { dashboard: DashboardState }, userKey: string, dataType: string) => {
  return state.dashboard[userKey]?.[dataType]?.isLoading || false
}

export const selectDashboardError = (state: { dashboard: DashboardState }, userKey: string, dataType: string) => {
  return state.dashboard[userKey]?.[dataType]?.error || null
}

export const selectDashboardHasData = (state: { dashboard: DashboardState }, userKey: string, dataType: string) => {
  const entry = state.dashboard[userKey]?.[dataType]
  if (!entry) return false
  const now = Date.now()
  return entry.hasData && (now - entry.lastFetched <= CACHE_DURATION)
}

export const selectDashboardNeedsRefresh = (state: { dashboard: DashboardState }, userKey: string, dataType: string) => {
  const entry = state.dashboard[userKey]?.[dataType]
  if (!entry) return true
  const now = Date.now()
  return entry.needsRefresh || (now - entry.lastFetched > STALE_TIME)
}

export default dashboardSlice.reducer
