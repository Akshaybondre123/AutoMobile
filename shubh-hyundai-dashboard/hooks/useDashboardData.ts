"use client"

import { useCallback, useEffect, useRef } from 'react'
import { useDashboard, DataType, DashboardData } from '@/contexts/DashboardContext'
import { useAuth } from '@/lib/auth-context'
import { usePermissions } from '@/hooks/usePermissions'
import { getApiUrl } from '@/lib/config'

interface UseDashboardDataOptions {
  dataType: DataType
  autoFetch?: boolean // Whether to auto-fetch on mount
  backgroundRevalidation?: boolean // Whether to revalidate in background
  summary?: boolean // If true, hit lightweight summary endpoint
}

interface UseDashboardDataReturn {
  data: DashboardData | null
  isLoading: boolean
  error: string | null
  hasData: boolean
  
  // Actions
  fetchData: (forceRefresh?: boolean) => Promise<void>
  refreshData: () => Promise<void>
  clearData: () => void
}

export const useDashboardData = (options: UseDashboardDataOptions): UseDashboardDataReturn => {
  const { dataType, autoFetch = true, backgroundRevalidation = true, summary = false } = options
  const { user } = useAuth()
  const { permissions, isLoading: permissionsLoading } = usePermissions()
  const {
    getData,
    setData,
    getLoadingState,
    setLoading,
    getError,
    setError,
    hasData: hasDataInState,
    needsRefresh,
    markForRefresh
  } = useDashboard()

  const fetchInProgressRef = useRef<Set<string>>(new Set())

  // Derive city for state lookups (extract from email or use default)
  // For emails like sm.pune@shubh.com -> Pune
  // For emails like nilesh.bather@shubh.com -> use default (Pune) or get from user data
  const deriveCity = useCallback((email?: string, existingCity?: string): string => {
    if (existingCity) return existingCity
    if (!email) return "Pune" // Default
    const emailParts = email.split('.')
    if (emailParts.length > 1) {
      const cityPart = emailParts[1]?.split('@')[0]
      // Check if it's a valid city name (not just a name like "bather")
      const validCities = ["pune", "mumbai", "nagpur", "palanpur", "patan"]
      if (cityPart && validCities.includes(cityPart.toLowerCase())) {
        return cityPart.charAt(0).toUpperCase() + cityPart.slice(1).toLowerCase()
      }
    }
    // Default to Pune if city can't be determined from email
    return "Pune"
  }, [])
  
  const userCity = user?.email ? deriveCity(user.email, user.city) : null

  // Get current state
  const data = user?.email && userCity ? getData(user.email, dataType, userCity) : null
  const isLoading = user?.email && userCity ? getLoadingState(user.email, dataType, userCity) : false
  const error = user?.email && userCity ? getError(user.email, dataType, userCity) : null
  const hasData = user?.email && userCity ? hasDataInState(user.email, dataType, userCity) : false
  const shouldRefresh = user?.email && userCity ? needsRefresh(user.email, dataType, userCity) : false

  // Fetch data function
  const fetchData = useCallback(async (forceRefresh: boolean = false) => {
    if (!user?.email) {
      console.log('⏭️ Skipping fetch - no user email')
      return
    }
    
    // Use derived city (already calculated above)
    const fetchCity = deriveCity(user.email, user.city)
    console.log('📍 Using city for fetch:', fetchCity, '(from:', user.city || 'email/default', ')')

    // Wait for permissions to load before checking
    if (permissionsLoading) {
      console.log('⏳ Waiting for permissions to load...')
      return
    }

    // Only owner has fixed access - all others must have explicit permissions
    const isOwner = user.role === "owner"
    const userHasAccess = isOwner || permissions.length > 0
    if (!userHasAccess) {
      console.log('🚫 Skipping fetch - no permissions assigned (Access Denied)')
      return
    }
    
    // For non-owner users, check if they have permission for this specific data type
    if (!isOwner) {
      const dataTypePermissionMap: Record<string, string> = {
        'ro_billing': 'ro_billing_dashboard',
        'operations': 'operations_dashboard',
        'warranty': 'warranty_dashboard',
        'service_booking': 'service_booking_dashboard',
        'repair_order_list': 'repair_order_list_dashboard',
        // 'average' doesn't need a specific permission - if user has ANY SM permission, they can view average
      }
      
      const requiredPermission = dataTypePermissionMap[dataType]
      if (requiredPermission) {
        // Check if user has the required permission
        const hasRequiredPermission = Array.isArray(permissions) && permissions.includes(requiredPermission)
        if (!hasRequiredPermission) {
          console.log(`🚫 Skipping fetch - user doesn't have permission "${requiredPermission}" for dataType "${dataType}"`)
          console.log(`📋 Available permissions:`, permissions)
          return
        }
        console.log(`✅ User has permission "${requiredPermission}" for dataType "${dataType}"`)
      } else if (dataType === 'average') {
        // For average data type, check if user has ANY SM dashboard permission
        // If they have any SM permission, they can view the average dashboard
        const smPermissions = [
          'ro_billing_dashboard',
          'operations_dashboard',
          'warranty_dashboard',
          'service_booking_dashboard',
          'repair_order_list_dashboard',
          'ro_billing_upload',
          'operations_upload',
          'service_booking_upload',
          'target_report', // Target report is also SM-related
          'upload' // Upload permission is also SM-related
        ]
        const hasAnySMPermission = Array.isArray(permissions) && smPermissions.some(perm => permissions.includes(perm))
        if (!hasAnySMPermission) {
          console.log(`🚫 Skipping fetch - user doesn't have any SM dashboard permission for average dataType`)
          console.log(`📋 Available permissions:`, permissions)
          console.log(`📋 Looking for any of:`, smPermissions)
          return
        }
        console.log(`✅ User has SM dashboard permission for average dataType`)
        console.log(`📋 User permissions include SM permission, allowing average view`)
      }
    }

    const fetchKey = `${user.email}-${dataType}-${fetchCity}`
    
    // Prevent duplicate fetches
    if (fetchInProgressRef.current.has(fetchKey) && !forceRefresh) {
      console.log('⏭️ Skipping fetch - already in progress:', fetchKey)
      return
    }

    // Check current state values directly (don't use closure values to avoid infinite loops)
    const currentHasData = hasDataInState(user.email, dataType, fetchCity)
    const currentShouldRefresh = needsRefresh(user.email, dataType, fetchCity)

    // Check if we need to fetch
    if (!forceRefresh && currentHasData && !currentShouldRefresh) {
      console.log('📦 Using existing data for:', dataType, '- No refresh needed')
      return
    }

    console.log('🚀 Fetching data for:', dataType, forceRefresh ? '(forced)' : currentShouldRefresh ? '(stale)' : '(first time)')
    
    fetchInProgressRef.current.add(fetchKey)
    
    // Only show loading if we don't have data or it's a forced refresh
    if (!currentHasData || forceRefresh) {
      setLoading(user.email, dataType, true, fetchCity)
    }
    
    setError(user.email, dataType, null, fetchCity)

    try {
      let apiUrl: string
      
      // Use specialized BookingList API for service_booking with VIN matching
      if (dataType === 'service_booking') {
        // Use showroom_id associated with the logged-in user. Do NOT use hardcoded showroom ids.
        // If the user has no showroom configured, bail out and surface a helpful error.
        // Support both `showroom_id` and `showroomId` shapes coming from various auth implementations.
        // (Under-specification: assume user object may have showroom_id or showroomId)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userAny: any = user
        let userShowroomId = userAny?.showroom_id || userAny?.showroomId
        
        // If showroom_id is not available, try to fetch it from the showrooms API
        if (!userShowroomId) {
          console.warn('⚠️ Missing showroom_id for service_booking fetch, attempting to fetch from API...')
          try {
            const showroomsResponse = await fetch(getApiUrl("/api/rbac/showrooms"), {
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
              }
            })
            
            if (showroomsResponse.ok) {
              const showroomsResult = await showroomsResponse.json()
              if (showroomsResult.success && Array.isArray(showroomsResult.data) && showroomsResult.data.length > 0) {
                const firstShowroom = showroomsResult.data[0]
                userShowroomId = firstShowroom._id
                console.log('✅ Fetched showroom_id from API:', userShowroomId)
              }
            }
          } catch (showroomFetchError) {
            console.error('❌ Error fetching showroom_id:', showroomFetchError)
          }
        }
        
        if (!userShowroomId) {
          const errorMessage = 'Showroom is not configured for this user. Please contact administrator to assign a showroom to your account.'
          console.warn('❌ Missing showroom_id for service_booking fetch - cannot proceed')
          setError(user.email, dataType, errorMessage, fetchCity)
          // Clean up state and return early
          setLoading(user.email, dataType, false, fetchCity)
          fetchInProgressRef.current.delete(fetchKey)
          return
        }

        apiUrl = getApiUrl(`/api/booking-list/dashboard?uploadedBy=${encodeURIComponent(user.email)}&city=${encodeURIComponent(fetchCity)}&showroom_id=${encodeURIComponent(userShowroomId)}`)
        console.log('🔗 Fetching BookingList with VIN matching:', dataType)
        console.log('🌐 BookingList API URL:', apiUrl)
        console.log('📋 Request params:', {
          uploadedBy: user.email,
          city: fetchCity,
          showroom_id: userShowroomId
        })
      } else {
        const summaryFlag = summary ? '&summary=true' : ''
        apiUrl = getApiUrl(`/api/service-manager/dashboard-data?uploadedBy=${user.email}&city=${fetchCity}&dataType=${dataType}${summaryFlag}`)
        console.log('🔗 Fetching:', dataType, summary ? '(summary)' : '')
        console.log('🌐 API URL:', apiUrl)
      }
      
      // Add timeout to fetch (30 seconds)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)
      
      try {
        console.log('🌐 Making fetch request to:', apiUrl)
        const response = await fetch(apiUrl, {
          signal: controller.signal,
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          mode: 'cors'
        })
        clearTimeout(timeoutId)
        console.log('📡 Response status:', response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API Error:', response.status, errorText)
        throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`)
      }

        const responseData = await response.json()
        console.log('✅ Loaded:', dataType, '- Records:', responseData?.summary?.totalBookings || responseData?.count || responseData?.data?.length || 0)
        console.log('📦 Response data structure:', {
          hasData: !!responseData.data,
          dataLength: Array.isArray(responseData.data) ? responseData.data.length : 'not array',
          hasSummary: !!responseData.summary,
          count: responseData.count
        })
        
        // Ensure data has the correct structure
        const structuredData: DashboardData = {
          ...responseData,
          data: Array.isArray(responseData.data) ? responseData.data : []
        }

      // Save to global state
      setData(user.email, dataType, structuredData, fetchCity)
      console.log('💾 Data saved to state for:', dataType)
      } catch (fetchErr: any) {
        clearTimeout(timeoutId)
        if (fetchErr.name === 'AbortError') {
          console.error('⏱️ Fetch timeout after 30 seconds for:', dataType)
          throw new Error('Request timeout: The server took too long to respond. Please try again.')
        }
        // Check if it's a network error (CORS, connection refused, etc.)
        if (fetchErr instanceof TypeError && (
          fetchErr.message.includes('fetch') || 
          fetchErr.message.includes('Failed to fetch') ||
          fetchErr.message.includes('NetworkError') ||
          fetchErr.message.includes('Network request failed')
        )) {
          console.error('🌐 Network error detected:', fetchErr.message)
          throw new Error(`Network error: Unable to reach API at ${apiUrl}. Please check your connection and that the backend is running.`)
        }
        throw fetchErr
      }
      
    } catch (err: any) {
      let errorMessage = err?.message || "Failed to load data. Please try again."
      
      // Provide more specific error messages
      if (err?.message?.includes('Network error')) {
        errorMessage = err.message
      } else if (err?.message?.includes('timeout')) {
        errorMessage = err.message
      } else if (err?.message?.includes('Showroom is not configured')) {
        errorMessage = err.message
      }
      
      console.error('❌ Fetch error for', dataType, ':', err)
      console.error('❌ Error details:', {
        message: err?.message,
        name: err?.name,
        stack: err?.stack,
        apiUrl: dataType === 'service_booking' ? getApiUrl(`/api/booking-list/dashboard?uploadedBy=${user?.email}&city=${fetchCity}&showroom_id=${(user as any)?.showroom_id || (user as any)?.showroomId || 'MISSING'}`) : 'N/A'
      })
      setError(user.email, dataType, errorMessage, fetchCity)
    } finally {
      setLoading(user.email, dataType, false, fetchCity)
      fetchInProgressRef.current.delete(fetchKey)
    }
  }, [user?.email, user?.city, user?.role, permissions, permissionsLoading, dataType, setData, setLoading, setError, deriveCity, hasDataInState, needsRefresh])

  // Refresh data (always force refresh)
  const refreshData = useCallback(async () => {
    if (user?.email) {
      console.log('🔄 Manual refresh triggered for:', dataType)
      markForRefresh(user.email, dataType, user.city)
      await fetchData(true)
    }
  }, [user?.email, user?.city, dataType, fetchData, markForRefresh])

  // Clear data
  const clearData = useCallback(() => {
    if (user?.email) {
      console.log('🗑️ Clearing data for:', dataType)
      markForRefresh(user.email, dataType, user.city)
    }
  }, [user?.email, user?.city, dataType, markForRefresh])

  // Auto-fetch on mount or when dataType changes (wait for permissions to load)
  useEffect(() => {
    if (autoFetch && user?.email && !permissionsLoading) {
      // City will be derived in fetchData if not present
      console.log('🔄 Auto-fetch triggered for:', dataType, {
        user: user.email,
        city: user.city || 'will be derived',
        permissionsLoaded: !permissionsLoading,
        permissionsCount: permissions.length
      })
      // Only fetch if permissions are loaded (fetchData will check permissions)
      fetchData()
    } else {
      console.log('⏸️ Auto-fetch skipped for:', dataType, {
        autoFetch,
        hasUser: !!user?.email,
        permissionsLoading
      })
    }
  }, [autoFetch, user?.email, user?.city, dataType, permissionsLoading, permissions.length, fetchData])

  // Background revalidation for stale data (wait for permissions to load)
  useEffect(() => {
    if (!user?.email || !userCity) return
    if (!backgroundRevalidation || permissionsLoading) return
    
    // Read current state values directly to avoid closure issues
    const currentHasData = hasDataInState(user.email, dataType, userCity)
    const currentShouldRefresh = needsRefresh(user.email, dataType, userCity)
    const currentIsLoading = getLoadingState(user.email, dataType, userCity)
    
    if (currentHasData && currentShouldRefresh && !currentIsLoading) {
      console.log('🔄 Background revalidation for stale data:', dataType)
      fetchData() // This will fetch in background without showing loader
    }
  }, [backgroundRevalidation, user?.email, userCity, dataType, permissionsLoading, fetchData, hasDataInState, needsRefresh, getLoadingState])

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

// Hook for multiple data types (useful for dashboard overview)
export const useDashboardMultiData = (dataTypes: DataType[]) => {
  const { user } = useAuth()
  const dashboard = useDashboard()

  const results = dataTypes.map(dataType => {
    const data = user?.email ? dashboard.getData(user.email, dataType, user.city) : null
    const isLoading = user?.email ? dashboard.getLoadingState(user.email, dataType, user.city) : false
    const error = user?.email ? dashboard.getError(user.email, dataType, user.city) : null
    const hasData = user?.email ? dashboard.hasData(user.email, dataType, user.city) : false

    return {
      dataType,
      data,
      isLoading,
      error,
      hasData
    }
  })

  const isAnyLoading = results.some(r => r.isLoading)
  const hasAnyData = results.some(r => r.hasData)
  const hasAnyError = results.some(r => r.error)

  const fetchAll = useCallback(async (forceRefresh: boolean = false) => {
    if (!user?.email || !user?.city) return

    const fetchPromises = dataTypes.map(async (dataType) => {
      const shouldFetch = forceRefresh || 
        !dashboard.hasData(user.email, dataType, user.city) || 
        dashboard.needsRefresh(user.email, dataType, user.city)

      if (shouldFetch) {
        // Use the single data hook logic here
        const hook = useDashboardData({ dataType, autoFetch: false })
        return hook.fetchData(forceRefresh)
      }
    })

    await Promise.all(fetchPromises)
  }, [user?.email, user?.city, dataTypes, dashboard])

  return {
    results,
    isAnyLoading,
    hasAnyData,
    hasAnyError,
    fetchAll
  }
}
