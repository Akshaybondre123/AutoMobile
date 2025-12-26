"use client"

import { useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { usePermissions } from "@/hooks/usePermissions"

export default function DashboardPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isLoading: authLoading } = useAuth()
  const { permissions, dashboards, defaultDashboard, isLoading: permissionsLoading } = usePermissions()
  const hasRoutedRef = useRef(false)

  useEffect(() => {
    // Reset routing flag if pathname changes back to /dashboard
    if (pathname === "/dashboard") {
      hasRoutedRef.current = false
    }
  }, [pathname])

  // Map dashboard IDs to routes
  const getDashboardRoute = (dashboardId: string): string => {
    const routeMap: Record<string, string> = {
      'gm_dashboard': '/dashboard/gm',
      'sm_dashboard': '/dashboard/sm',
      'sa_dashboard': '/dashboard/sa',
      'bdm_dashboard': '/dashboard/bdm',
    }
    return routeMap[dashboardId] || '/dashboard'
  }

  // Helper to check if user is owner
  const isOwner = () => {
    if (!user?.role) return false
    const roleStr = String(user.role).toLowerCase().trim()
    const roleParts = roleStr.split('|').map(p => p.trim())
    return roleParts.some(part => 
      part === 'owner' || 
      part === 'general_manager' || 
      part === 'general manager' ||
      part.includes('owner')
    ) || roleStr === 'owner' || roleStr.includes('owner')
  }

  // Helper to check if user is Service Advisor
  const isServiceAdvisor = () => {
    if (!user?.role) {
      console.log('🔍 Dashboard page - No user role found')
      return false
    }
    const roleStr = String(user.role).toLowerCase().trim()
    console.log('🔍 Dashboard page - Checking role:', user.role, '-> normalized:', roleStr)
    const roleParts = roleStr.split('|').map(p => p.trim())
    // Check for various Service Advisor role formats
    const isAdvisor = roleParts.some(part => 
      part.includes('service advisor') || 
      part === 'service_advisor' ||
      part.includes('service_advisor') ||
      part === 'advisor' ||
      part.includes('advisor')
    ) || roleStr.includes('service advisor') || roleStr.includes('service_advisor') || roleStr === 'service advisor'
    console.log('🔍 Dashboard page - Is Service Advisor?', isAdvisor)
    return isAdvisor
  }

  useEffect(() => {
    // Wait until auth is loaded and user is determined
    if (authLoading || !user) {
      return
    }

    // Service Advisors get automatic access to their dashboard - no permission check needed
    // Route them immediately without waiting for permissions
    if (isServiceAdvisor()) {
      if (hasRoutedRef.current) {
        return
      }
      hasRoutedRef.current = true
      console.log('👤 Service Advisor detected - routing directly to SA dashboard (no permission check needed)')
      router.replace("/dashboard/sa")
      return
    }

    // Wait for permissions to load for other users (fully backend-driven)
    if (permissionsLoading) {
      return
    }

    // Prevent multiple routing attempts
    if (hasRoutedRef.current) {
      return
    }

    console.log('🎯 Dashboard routing - Dashboards:', dashboards, 'Default:', defaultDashboard, 'Permissions:', permissions?.length || 0, 'Is Owner:', isOwner())

    // Mark that we're attempting to route
    hasRoutedRef.current = true

    // Fully backend-driven: Route based on permissions array from backend
    // If user has permissions, route to appropriate dashboard based on backend response
    // Only owners have default permissions (handled in backend)
    if (permissions && permissions.length > 0) {
      console.log(`✅ User has ${permissions.length} permissions - routing based on backend response`)
      
      // If dashboards array is provided by backend, use it
      if (dashboards && dashboards.length > 0) {
        const firstDashboard = dashboards[0]
        const route = getDashboardRoute(firstDashboard)
        console.log(`✅ Routing to ${firstDashboard} (${route}) - from backend dashboards array`)
        router.replace(route)
        return
      }
      
      // If defaultDashboard is provided by backend, use it
      if (defaultDashboard) {
        const route = getDashboardRoute(defaultDashboard)
        console.log(`✅ Routing to ${defaultDashboard} (${route}) - from backend default`)
        router.replace(route)
        return
      }
      
      // Owner fallback: If owner has permissions but no dashboards, route to GM
      if (isOwner()) {
        console.log('👑 Owner detected with permissions, routing to GM dashboard')
        router.replace("/dashboard/gm")
        return
      }
      
      // For other users with permissions but no dashboards, route to SM as default
      console.log('✅ User has permissions, routing to SM dashboard as default')
      router.replace("/dashboard/sm")
      return
    }
    
    // If user has no permissions at all, show access denied
    // EXCEPT for Service Advisors (they already got routed above) and Owners (they have default permissions)
    if ((!permissions || permissions.length === 0) && !isOwner()) {
      console.log('❌ No permissions - routing to unauthorized')
      router.replace("/dashboard/unauthorized")
      return
    }

    // Should not reach here, but just in case
    console.log('❌ Unexpected state - routing to unauthorized')
    router.replace("/dashboard/unauthorized")

  }, [user, router, authLoading, permissionsLoading, dashboards, defaultDashboard, permissions, pathname])

  const getLoadingMessage = () => {
    if (authLoading) return "Authenticating..."
    return "Setting up your dashboard..."
  }

  const getLoadingSubtext = () => {
    if (authLoading) return "Verifying your credentials"
    return "Preparing your workspace"
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="mb-8">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {getLoadingMessage()}
        </h2>
        <p className="text-gray-600 mb-4">
          {getLoadingSubtext()}
        </p>
        <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 border border-blue-200">
          <p className="text-sm text-blue-700">
            {user ? `Welcome, ${user.name}!` : "Preparing your workspace..."}
          </p>
          {permissionsLoading && (
            <p className="text-xs text-blue-600 mt-2">
              This will only take a moment while we configure your access rights.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
