"use client"

import { useCallback, useEffect, useRef } from 'react'
import { useGlobalApi } from '@/contexts/GlobalApiContext'
import { useAuth } from '@/lib/auth-context'
import { getApiUrl } from '@/lib/config'

interface UseGlobalApiDataOptions {
  endpoint: string
  userSpecific?: boolean // Whether to use user-specific caching
  autoFetch?: boolean // Whether to auto-fetch on mount
  backgroundRevalidation?: boolean // Whether to revalidate in background
  dependencies?: any[] // Dependencies that trigger refetch
  transform?: (data: any) => any // Transform function for response data
}

interface UseGlobalApiDataReturn<T = any> {
  data: T | null
  isLoading: boolean
  error: string | null
  hasData: boolean
  
  // Actions
  fetchData: (forceRefresh?: boolean) => Promise<void>
  refreshData: () => Promise<void>
  clearData: () => void
}

export const useGlobalApiData = <T = any>(options: UseGlobalApiDataOptions): UseGlobalApiDataReturn<T> => {
  const { 
    endpoint, 
    userSpecific = true, 
    autoFetch = true, 
    backgroundRevalidation = true,
    dependencies = [],
    transform
  } = options
  
  const { user } = useAuth()
  const {
    getApiData,
    setApiData,
    getApiLoading,
    setApiLoading,
    getApiError,
    setApiError,
    hasApiData,
    needsApiRefresh,
    markApiForRefresh
  } = useGlobalApi()

  const fetchInProgressRef = useRef<Set<string>>(new Set())

  // Generate user key for caching
  const getUserKey = useCallback(() => {
    if (!userSpecific) return 'global'
    return user?.email ? `${user.email}-${user.city || 'default'}` : 'anonymous'
  }, [user?.email, user?.city, userSpecific])

  const userKey = getUserKey()

  // Get current state
  const data = getApiData<T>(endpoint, userKey)
  const isLoading = getApiLoading(endpoint, userKey)
  const error = getApiError(endpoint, userKey)
  const hasData = hasApiData(endpoint, userKey)
  const shouldRefresh = needsApiRefresh(endpoint, userKey)

  // Fetch data function
  const fetchData = useCallback(async (forceRefresh: boolean = false) => {
    const fetchKey = `${endpoint}-${userKey}`
    
    // Prevent duplicate fetches
    if (fetchInProgressRef.current.has(fetchKey) && !forceRefresh) {
      console.log('⏭️ Skipping fetch - already in progress:', fetchKey)
      return
    }

    // Check if we need to fetch
    if (!forceRefresh && hasData && !shouldRefresh) {
      console.log('📦 Using existing API data for:', endpoint, '- No refresh needed')
      return
    }

    console.log('🚀 Fetching API data for:', endpoint, forceRefresh ? '(forced)' : shouldRefresh ? '(stale)' : '(first time)')
    
    fetchInProgressRef.current.add(fetchKey)
    
    // Only show loading if we don't have data or it's a forced refresh
    if (!hasData || forceRefresh) {
      setApiLoading(endpoint, true, userKey)
    }
    
    setApiError(endpoint, null, userKey)

    try {
      const apiUrl = getApiUrl(endpoint)
      console.log('🔗 Fetching from:', apiUrl)
      
      const response = await fetch(apiUrl)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API Error:', response.status, errorText)
        throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`)
      }

      let responseData = await response.json()
      
      // Apply transform if provided
      if (transform) {
        responseData = transform(responseData)
      }
      
      console.log('✅ Loaded API data for:', endpoint, '- Size:', JSON.stringify(responseData).length, 'chars')

      // Save to global state
      setApiData(endpoint, responseData, userKey)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load data. Please try again."
      console.error('❌ API fetch error:', err)
      setApiError(endpoint, errorMessage, userKey)
    } finally {
      setApiLoading(endpoint, false, userKey)
      fetchInProgressRef.current.delete(fetchKey)
    }
  }, [endpoint, userKey, hasData, shouldRefresh, setApiData, setApiLoading, setApiError, transform])

  // Refresh data (always force refresh)
  const refreshData = useCallback(async () => {
    console.log('🔄 Manual refresh triggered for API:', endpoint)
    markApiForRefresh(endpoint, userKey)
    await fetchData(true)
  }, [endpoint, userKey, fetchData, markApiForRefresh])

  // Clear data
  const clearData = useCallback(() => {
    console.log('🗑️ Clearing API data for:', endpoint)
    markApiForRefresh(endpoint, userKey)
  }, [endpoint, userKey, markApiForRefresh])

  // Auto-fetch on mount or when dependencies change
  useEffect(() => {
    if (autoFetch) {
      fetchData()
    }
  }, [autoFetch, endpoint, userKey, ...dependencies, fetchData])

  // Background revalidation for stale data
  useEffect(() => {
    if (backgroundRevalidation && hasData && shouldRefresh && !isLoading) {
      console.log('🔄 Background revalidation for stale API data:', endpoint)
      fetchData() // This will fetch in background without showing loader
    }
  }, [backgroundRevalidation, hasData, shouldRefresh, isLoading, endpoint, fetchData])

  return {
    data,
    isLoading,
    error,
    hasData,
    fetchData,
    refreshData,
    clearData
  }
}

// Specialized hooks for common API patterns

// Hook for user-specific APIs (like permissions, user data)
export const useUserApiData = <T = any>(endpoint: string, options?: Partial<UseGlobalApiDataOptions>) => {
  return useGlobalApiData<T>({
    endpoint,
    userSpecific: true,
    autoFetch: true,
    backgroundRevalidation: true,
    ...options
  })
}

// Hook for global APIs (like roles, permissions list)
export const useGlobalApiDataOnly = <T = any>(endpoint: string, options?: Partial<UseGlobalApiDataOptions>) => {
  return useGlobalApiData<T>({
    endpoint,
    userSpecific: false,
    autoFetch: true,
    backgroundRevalidation: true,
    ...options
  })
}

// Hook for APIs that should only be fetched manually
export const useManualApiData = <T = any>(endpoint: string, options?: Partial<UseGlobalApiDataOptions>) => {
  return useGlobalApiData<T>({
    endpoint,
    userSpecific: true,
    autoFetch: false,
    backgroundRevalidation: false,
    ...options
  })
}

// Hook for APIs with custom transform
export const useTransformedApiData = <T = any>(
  endpoint: string, 
  transform: (data: any) => T,
  options?: Partial<UseGlobalApiDataOptions>
) => {
  return useGlobalApiData<T>({
    endpoint,
    transform,
    userSpecific: true,
    autoFetch: true,
    backgroundRevalidation: true,
    ...options
  })
}
