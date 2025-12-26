"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { getApiUrl } from "@/lib/config"
import { useUserApiData } from "@/hooks/useGlobalApiData"
import { useAppDispatch } from "@/lib/store/hooks"
import { setUser } from "@/lib/store/slices/authSlice"

// Shared across all hook instances to avoid duplicate network calls
const permissionCache = new Map<string, { timestamp: number; perms: string[] }>()
const inFlight = new Map<string, Promise<string[]>>()
const lastFetchTs = new Map<string, number>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const FETCH_COOLDOWN_MS = 5_000 // 5 seconds

interface Permission {
  id: string
  permission_key: string
  name: string
}

export function usePermissions() {
  const { user } = useAuth()
  const dispatch = useAppDispatch()
  const [permissions, setPermissions] = useState<string[]>([])
  const [dashboards, setDashboards] = useState<string[]>([])
  const [defaultDashboard, setDefaultDashboard] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      return
    }

    if (user) {
      // Fetch permissions from backend (fully backend-driven, no hardcoded fallbacks)
      fetchUserPermissions()
    } else {
      setPermissions([])
      setDashboards([])
      setDefaultDashboard(null)
      setIsLoading(false)
    }
  }, [user])

  const fetchUserPermissions = useCallback(async () => {
    if (!user) return

    const fetchKey = `${user.email}`
    const now = Date.now()

    // Serve from cache if still fresh
    const cached = permissionCache.get(fetchKey)
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      console.log("📦 Using cached permissions", fetchKey)
      setPermissions(cached.perms)
      setIsLoading(false)
      return
    }

    // Cooldown: avoid spamming the same permission endpoint within a short window
    const lastTs = lastFetchTs.get(fetchKey) || 0
    if (now - lastTs < FETCH_COOLDOWN_MS && permissions.length > 0) {
      console.log("⏭️ Skipping permission fetch (cooldown active)", fetchKey)
      return
    }

    // Prevent parallel fetches
    const inProgress = inFlight.get(fetchKey)
    if (inProgress) {
      console.log("⏭️ Joining in-flight permission fetch", fetchKey)
      try {
        const perms = await inProgress
        setPermissions(perms)
      } finally {
        setIsLoading(false)
      }
      return
    }

    lastFetchTs.set(fetchKey, now)

    const promise = (async () => {
      try {
      // Always show a quick loading state when re-fetching from backend
      setIsLoading(true)
      setError(null)

      // Role permissions may already be set in useEffect for immediate access
      // This function enhances/replaces them with latest database permissions

      // Try to enhance with database permissions (primary path)
      try {
        // Ensure we're on client side before making fetch
        if (typeof window === 'undefined') {
          console.log("⏭️ Skipping fetch - server-side rendering")
          return permissions
        }

        const directApiUrl = getApiUrl(`/api/rbac/users/email/${encodeURIComponent(user.email)}/permissions`)
        console.log("🔍 Fetching permissions for:", user.email, "Role:", user.role)
        console.log("🌐 API URL:", directApiUrl)
        console.log("🌍 Window location:", typeof window !== 'undefined' ? window.location.href : 'N/A')
        console.log("🔧 Environment:", {
          NODE_ENV: process.env.NODE_ENV,
          NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'not set'
        })
        
        const directResponse = await fetch(directApiUrl, { 
          cache: 'no-cache',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          mode: 'cors' // Explicitly set CORS mode
        })
        console.log("📡 API Response Status:", directResponse.status)
        
        if (directResponse.ok) {
          const directData = await directResponse.json()
          console.log("📦 Full API Response:", JSON.stringify(directData, null, 2))
          
          // Extract user data from response (includes showroom_id and showroom_city)
          const userDataFromApi = directData.data?.user
          if (userDataFromApi && user) {
            console.log("👤 User data from permissions API:", userDataFromApi)
            // Update user in auth context with showroom_id and showroom_city if they're present
            if (userDataFromApi.showroom_id !== undefined || userDataFromApi.showroom_city !== undefined) {
              console.log("📍 Updating user with showroom data:", {
                showroom_id: userDataFromApi.showroom_id,
                showroom_city: userDataFromApi.showroom_city
              })
              // Update the user object with showroom data
              const updatedUser = {
                ...user,
                showroom_id: userDataFromApi.showroom_id || user.showroom_id,
                showroom_city: userDataFromApi.showroom_city || user.showroom_city
              }
              dispatch(setUser(updatedUser))
            }
          }
          
          // Try multiple ways to extract permissions
          let directPermissions = directData.data?.permissions || directData.permissions || directData.data || []
          
          // If it's an object with a permissions property, extract it
          if (directPermissions && typeof directPermissions === 'object' && !Array.isArray(directPermissions)) {
            directPermissions = directPermissions.permissions || []
          }
          
          console.log("📋 Extracted permissions array:", directPermissions)
          console.log("🔢 Permissions count:", Array.isArray(directPermissions) ? directPermissions.length : 0)
          
          // Extract dashboards and default_dashboard from response
          const responseDashboards = directData.data?.dashboards || directData.dashboards || []
          const responseDefaultDashboard = directData.data?.default_dashboard || directData.default_dashboard || null
          
          console.log("📦 Full API Response Structure:", {
            hasData: !!directData.data,
            hasDashboards: !!responseDashboards,
            dashboardsValue: responseDashboards,
            dashboardsType: typeof responseDashboards,
            dashboardsIsArray: Array.isArray(responseDashboards),
            hasDefaultDashboard: !!responseDefaultDashboard,
            defaultDashboardValue: responseDefaultDashboard,
            permissionsCount: Array.isArray(directPermissions) ? directPermissions.length : 0,
            fullResponse: JSON.stringify(directData, null, 2).substring(0, 500) // First 500 chars for debugging
          })
          
          if (Array.isArray(directPermissions) && directPermissions.length > 0) {
            const directPermissionKeys = directPermissions.map((p: any) => {
              // Handle different permission formats
              if (typeof p === 'string') return p
              if (typeof p === 'object') {
                return p.permission_key || p.permissionKey || p.key || p.name || null
              }
              return null
            }).filter(Boolean) // Remove null/undefined values
            
            console.log("🔑 Extracted permission keys:", directPermissionKeys)
            console.log("📊 Dashboards from backend:", responseDashboards, "Type:", typeof responseDashboards, "Is Array:", Array.isArray(responseDashboards))
            console.log("🎯 Default dashboard from backend:", responseDefaultDashboard)
            
            // Ensure dashboards is always an array
            let finalDashboards = Array.isArray(responseDashboards) ? responseDashboards : []
            let finalDefaultDashboard = responseDefaultDashboard || null
            
            // REMOVED: Frontend fallback dashboard mapping
            // System is now fully backend-driven - no hardcoded permission-to-dashboard mapping
            // If backend doesn't return dashboards, we don't compute them on frontend
            // Only owners have default permissions (handled in backend)
            
            if (directPermissionKeys.length > 0) {
              console.log("✅ Setting", directPermissionKeys.length, "permissions from database:", directPermissionKeys)
              console.log("✅ Setting dashboards:", finalDashboards, "default:", finalDefaultDashboard)
              setPermissions(directPermissionKeys)
              setDashboards(finalDashboards)
              setDefaultDashboard(finalDefaultDashboard)
              permissionCache.set(fetchKey, { timestamp: Date.now(), perms: directPermissionKeys })
              setIsLoading(false)
              return directPermissionKeys
            }
          } else {
            console.log("⚠️ Database returned 0 permissions for user:", user.email)
            console.log("📋 Direct permissions value:", directPermissions)
            // Fully backend-driven: if no permissions, user has no access
            console.log("🚫 Setting empty permissions - user has no database permissions")
            setPermissions([])
            setDashboards([])
            setDefaultDashboard(null)
            permissionCache.set(fetchKey, { timestamp: Date.now(), perms: [] })
            setIsLoading(false)
            return []
          }
        }
      } catch (directErr: any) {
        console.error("❌ Direct API error:", directErr)
        console.error("❌ Error type:", directErr?.constructor?.name)
        console.error("❌ Error message:", directErr?.message)
        
        // Check if it's a network error (CORS, connection refused, etc.)
        const isFetchError = directErr instanceof TypeError && (
          directErr.message.includes('fetch') || 
          directErr.message.includes('Failed to fetch') ||
          directErr.message.includes('NetworkError') ||
          directErr.message.includes('Network request failed')
        )
        
        if (isFetchError) {
          const apiUrl = getApiUrl(`/api/rbac/users/email/${encodeURIComponent(user.email)}/permissions`)
          console.error("🌐 Network error - API may be unreachable or CORS issue")
          console.error("🔗 Attempted URL:", apiUrl)
          console.error("💡 Is backend running? Check:", apiUrl)
          setError(`Network error: Unable to reach API at ${apiUrl}. Please check your connection and that the backend is running.`)
          
          // Fully backend-driven: No fallback permissions
          console.log("🚫 Network error - setting empty permissions (fully backend-driven)")
          setPermissions([])
          setDashboards([])
          setDefaultDashboard(null)
          return []
        }
        // Try fallback API
      }
      
      // FALLBACK: Try summary API
      try {
        // Ensure we're on client side before making fetch
        if (typeof window === 'undefined') {
          console.log("⏭️ Skipping fallback fetch - server-side rendering")
          return []
        }

        const summaryResponse = await fetch(getApiUrl("/api/rbac/user-roles-summary"), {
          cache: 'no-cache',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        })
        
  if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json()
          console.log("📦 Summary API Response Data:", summaryData)
          
          // Use usersWithRoles specifically for users who have permissions assigned
          const usersWithRoles = summaryData.usersWithRoles || summaryData.data?.usersWithRoles || []
          const allUsers = summaryData.allUsers || summaryData.data?.allUsers || []
          
          console.log("👥 Total users:", allUsers.length)
          console.log("👥 Users with roles:", usersWithRoles.length)
          
          // First try to find user in usersWithRoles (users with assigned permissions)
          let currentUser = usersWithRoles.find((u: any) => u.email === user.email)
          
          if (!currentUser) {
            // Fallback: try to find in allUsers
            currentUser = allUsers.find((u: any) => u.email === user.email)
            console.log("🔍 User not found in usersWithRoles, checking allUsers")
          }
          
          console.log("🔍 Looking for user:", user.email)
          console.log("👤 Current user found:", currentUser ? "Yes" : "No")
          
          if (currentUser) {
            console.log("📋 Full user object:", JSON.stringify(currentUser, null, 2))
            console.log("🔍 User roles:", currentUser.roles)
            console.log("🔍 User assignedRoles:", currentUser.assignedRoles)
            console.log("🔍 User userRoles:", currentUser.userRoles)
            
            // Try different possible role field names
            const userRoles = currentUser.roles || currentUser.assignedRoles || currentUser.userRoles || []
            
            if (userRoles && userRoles.length > 0) {
              console.log("✅ Found user with database roles:", userRoles.map((r: any) => r.name || r.roleName || r))
              
              // Get all permissions from all roles
              let allPermissions: string[] = []
              for (const role of userRoles) {
                console.log("🔍 Processing role:", JSON.stringify(role, null, 2))
                
                if (role.permissions) {
                  const rolePerms = role.permissions.map((p: any) => p.permission_key || p.permissionKey || p.key || p)
                  allPermissions = [...allPermissions, ...rolePerms]
                  console.log(`📋 Role "${role.name || role.roleName || 'Unknown'}" permissions:`, rolePerms)
                } else if (role.rolePermissions) {
                  const rolePerms = role.rolePermissions.map((p: any) => p.permission_key || p.permissionKey || p.key || p)
                  allPermissions = [...allPermissions, ...rolePerms]
                  console.log(`📋 Role "${role.name || role.roleName || 'Unknown'}" rolePermissions:`, rolePerms)
                } else {
                  console.log(`⚠️ Role "${role.name || role.roleName || 'Unknown'}" has no permissions field`)
                  console.log("🔍 Available fields in role:", Object.keys(role))
                }
              }
            
            // Remove duplicates
            allPermissions = [...new Set(allPermissions)]
            
            if (allPermissions.length > 0) {
              console.log("✅ Using database permissions from summary API")
              setPermissions(allPermissions)
              setDashboards([]) // Summary API doesn't provide dashboards, will be empty
              setDefaultDashboard(null)
              permissionCache.set(fetchKey, { timestamp: Date.now(), perms: allPermissions })
            } else {
              console.log("🚫 No permissions found in summary API")
              setPermissions([])
              setDashboards([])
              setDefaultDashboard(null)
            }
          } else {
            console.log("⚠️ User has no roles assigned in database")
            // Fully backend-driven: If user has no roles, they have no access
            console.log("🚫 Setting empty permissions - user needs admin to assign roles")
            setPermissions([])
            setDashboards([])
            setDefaultDashboard(null)
          }
        } else {
          console.log("📊 User not found in database")
          // Fully backend-driven: No fallback permissions
          console.log("🚫 User not in database - setting empty permissions")
          setPermissions([])
          setDashboards([])
          setDefaultDashboard(null)
          permissionCache.set(fetchKey, { timestamp: Date.now(), perms: [] })
        }
        } else {
          console.log("⚠️ Summary API failed - no fallback permissions")
          setPermissions([])
          setDashboards([])
          setDefaultDashboard(null)
        }
      } catch (summaryErr: any) {
        console.error("❌ Summary API error:", summaryErr)
        // Check if it's a network error
        if (summaryErr instanceof TypeError && summaryErr.message.includes('fetch')) {
          console.error("🌐 Network error - Fallback API also unreachable")
          setError(`Network error: Unable to reach API. Please check your connection and that the backend is running.`)
        }
        // Fully backend-driven: No fallback permissions
        console.log("🚫 Summary API error - setting empty permissions")
        setPermissions([])
        setDashboards([])
        setDefaultDashboard(null)
        return []
      }

    } catch (err: any) {
      console.error("❌ Error in permission fetching:", err)
      setError(err?.message || "Failed to fetch permissions")
      
      // Check if it's a network error
      if (err instanceof TypeError && err.message.includes('fetch')) {
        console.error("🌐 Network/CORS error detected")
        setError("Network error: Unable to reach API. Please check your connection and that the backend is running.")
      }
      
      // Fully backend-driven: No fallback permissions
      console.log("🚫 Error occurred - setting empty permissions (fully backend-driven)")
      setPermissions([])
      setDashboards([])
      setDefaultDashboard(null)
    } finally {
      setIsLoading(false)
    }

    const cachedPermissions = permissionCache.get(fetchKey)?.perms
    if (Array.isArray(cachedPermissions)) {
      return cachedPermissions
    }

    return Array.isArray(permissions) ? permissions : []
    })()

    inFlight.set(fetchKey, promise)
    try {
      await promise
    } finally {
      inFlight.delete(fetchKey)
    }
  }, [user])

  // Old method removed - using simplified single API approach

  // REMOVED: All hardcoded role-based permission functions
  // System is now fully backend-driven - all permissions must come from the backend API
  // No fallback permissions are provided - users must have explicit permissions assigned

  const hasPermission = useCallback((permissionKey: string): boolean => {
    // Extra safety: handle any unexpected non-array state
    if (!Array.isArray(permissions)) {
      console.warn("⚠️ hasPermission: permissions is not an array:", permissions)
      return false
    }
    const hasIt = permissions.includes(permissionKey)
    // Debug logging for permission checks (only log if not found to avoid spam)
    if (!hasIt && permissions.length > 0) {
      console.log(`🔍 Permission check: "${permissionKey}" - Available permissions:`, permissions)
    }
    return hasIt
  }, [permissions])

  const hasAnyPermission = useCallback((permissionKeys: string[]): boolean => {
    return permissionKeys.some(key => hasPermission(key))
  }, [hasPermission])

  const refetchPermissions = useCallback(async () => {
    // Clear cache and refetch
    if (user) {
      await fetchUserPermissions()
    }
  }, [user, fetchUserPermissions])

  const debugPermissions = () => {
    console.log("🐛 Permission Debug Info:")
    console.log("- User:", user?.email, "Role:", user?.role)
    const permissionList = Array.isArray(permissions) ? permissions : []
    console.log("- Permissions:", permissionList)
    console.log("- Permission Count:", permissionList.length)
    console.log("- Is Loading:", isLoading)
    console.log("- Has GM Permissions:", hasPermission('manage_users') || hasPermission('manage_roles'))
    console.log("- Has SM Permissions:", hasPermission('ro_billing_dashboard') || hasPermission('operations_dashboard'))
    console.log("- Has SA Permissions:", hasPermission('dashboard') || hasPermission('overview'))
    // Test direct API call
    if (user?.email) {
      console.log("🧪 Testing direct API call...")
      fetch(getApiUrl(`/api/rbac/users/email/${encodeURIComponent(user.email)}/permissions`))
        .then(response => {
          console.log("📡 Direct API test status:", response.status)
          return response.json()
        })
        .then(data => {
          console.log("📦 Direct API test data:", data)
        })
        .catch(err => {
          console.log("❌ Direct API test error:", err)
        })
    }
  }

  // Force refresh permissions and clear cache
  const forceRefresh = async () => {
    if (user?.email) {
      console.log("🔄 Force refreshing permissions...")
      setPermissions([])
      await fetchUserPermissions()
    }
  }

  const testRBACAPI = async () => {
    if (!user) return
    
    console.log("🧪 Testing RBAC API...")
    const testUrl = getApiUrl(`/api/rbac/users/email/${encodeURIComponent(user.email)}/permissions`)
    console.log("🌐 Test URL:", testUrl)
    
    try {
      const response = await fetch(testUrl)
      console.log("📡 Test Response Status:", response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log("✅ Test Response Data:", data)
      } else {
        const errorText = await response.text()
        console.log("❌ Test Error:", errorText)
      }
    } catch (error) {
      console.log("❌ Test Failed:", error)
    }
  }

  const clearCacheAndRefresh = () => {
    if (!user) return
    
    console.log("🧹 Clearing cache and forcing refresh for user:", user.email)
    
    // Reset state completely
    setPermissions([])
    setIsLoading(true)
    setError(null)
    
    // Force refetch with delay
    setTimeout(() => {
      console.log("🔄 Forcing fresh permission fetch...")
      refetchPermissions()
    }, 200)
  }

  return {
    permissions: permissions || [],
    dashboards: dashboards || [],
    defaultDashboard: defaultDashboard || null,
    isLoading,
    error,
    hasPermission,
    hasAnyPermission,
    refetch: refetchPermissions,
    debug: debugPermissions,
    testAPI: testRBACAPI,
    forceRefresh,
    clearCacheAndRefresh
  }
}
