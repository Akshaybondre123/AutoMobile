import { configureStore } from '@reduxjs/toolkit'
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import { combineReducers } from '@reduxjs/toolkit'
import targetsReducer from './slices/targetsSlice'
import advisorAssignmentsReducer from './slices/advisorAssignmentsSlice'
import authReducer from './slices/authSlice'
import dashboardReducer from './slices/dashboardSlice'
import globalApiReducer from './slices/globalApiSlice'

// Persist configuration
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['targets', 'advisorAssignments', 'auth', 'dashboard', 'globalApi'], // Persist all slices
  // Transform functions to clean expired data on rehydrate
  transforms: []
}

// Combine reducers
const rootReducer = combineReducers({
  targets: targetsReducer,
  advisorAssignments: advisorAssignmentsReducer,
  auth: authReducer,
  dashboard: dashboardReducer,
  globalApi: globalApiReducer,
})

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer)

// Configure store with persisted reducer
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for redux-persist
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
})

export const persistor = persistStore(store)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
