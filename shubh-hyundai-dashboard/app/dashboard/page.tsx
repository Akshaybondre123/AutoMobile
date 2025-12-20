"use client"

import { useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { usePermissions } from "@/hooks/usePermissions"

export default function DashboardPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isLoading: authLoading } = useAuth()
  const { permissions, isLoading: permissionsLoading, hasPermission } = usePermissions()
  const hasRoutedRef = useRef(false)

  useEffect(() => {
    // Reset routing flag if pathname changes back to /dashboard
    if (pathname === "/dashboard") {
      hasRoutedRef.current = false
    }
  }, [pathname])

  useEffect(() => {
    // Wait until auth is loaded, user is determined, AND permissions are loaded
    if (authLoading || !user || permissionsLoading) {
      return
    }

    // Prevent multiple routing attempts
    if (hasRoutedRef.current) {
      return
    }

    // Helper function to check if user is owner (handles formatted role strings like "Owner | CRM | BSM")
    // This check must happen FIRST before any other routing logic
    const isOwner = () => {
      if (!user?.role) {
        console.log('⚠️ No user role found for owner check')
        return false
      }
      const roleStr = String(user.role).toLowerCase().trim()
      const roleParts = roleStr.split('|').map(p => p.trim())
      const isOwnerRole = roleParts.some(part => part === 'owner') || roleStr.includes('owner')
      console.log('🔍 Owner check - Role:', roleStr, 'Is Owner:', isOwnerRole)
      return isOwnerRole
    }

    // Helper function to check if user has Service Manager role (handles formatted role strings like "Service Manager | CRM | BSM")
    const isServiceManager = () => {
      if (!user?.role) return false
      const roleStr = String(user.role).toLowerCase().trim()
      const roleParts = roleStr.split('|').map(p => p.trim())
      return roleParts.some(part => 
        part.includes('service manager') || 
        part === 'service_manager' ||
        part.includes('service_manager')
      ) || roleStr.includes('service manager') || roleStr.includes('service_manager')
    }

    // Helper function to check if user has Service Advisor role
    const isServiceAdvisor = () => {
      if (!user?.role) return false
      const roleStr = String(user.role).toLowerCase().trim()
      const roleParts = roleStr.split('|').map(p => p.trim())
      return roleParts.some(part => 
        part.includes('service advisor') || 
        part === 'service_advisor' ||
        part.includes('service_advisor')
      ) || roleStr.includes('service advisor') || roleStr.includes('service_advisor')
    }

    // Route based on user's primary role (from database)
    const primaryRole = user.role?.toLowerCase() || ""

    console.log('🎯 Dashboard routing - Role:', primaryRole, 'Permissions:', permissions.length, 'Is Owner:', isOwner(), 'Is Service Manager:', isServiceManager(), 'Is Service Advisor:', isServiceAdvisor())

    // Mark that we're attempting to route
    hasRoutedRef.current = true

    // PRIORITY 0: Owners should ALWAYS go to GM dashboard first (before checking permissions)
    if (isOwner()) {
      console.log('✅ Routing to GM (owner role detected)')
      router.replace("/dashboard/gm")
      return
    }

    // PRIORITY 1: Route based on permissions first (most accurate)
    // Check for GM-level permissions (manage_users, manage_roles, gm_targets) - these are exclusive to GM
    if (hasPermission('manage_users') || hasPermission('manage_roles') || hasPermission('gm_targets')) {
      console.log('✅ Routing to GM (has GM management permissions)')
      router.replace("/dashboard/gm")
      return
    }

    // Check for SM-level permissions (dashboard access for billing, operations, warranty, service_booking, repair_order)
    if (hasPermission('ro_billing_dashboard') || hasPermission('operations_dashboard') || 
        hasPermission('warranty_dashboard') || hasPermission('service_booking_dashboard') ||
        hasPermission('repair_order_list_dashboard') || hasPermission('ro_billing_upload') ||
        hasPermission('operations_upload') || hasPermission('warranty_upload') || 
        hasPermission('service_booking_upload')) {
      console.log('✅ Routing to SM (has SM permissions)')
      router.replace("/dashboard/sm")
      return
    }

    // If user has upload permission, route to SM
    if (hasPermission('upload')) {
      console.log('✅ Routing to SM (has upload permission)')
      router.replace("/dashboard/sm")
      return
    }

    // PRIORITY 2: Route based on role if permissions don't clearly indicate
    // SERVICE MANAGER roles (handles formatted strings like "Service Manager | CRM | BSM")
    // Check this BEFORE checking for overview permission to prioritize SM over GM overview
    if (isServiceManager()) {
      console.log('✅ Routing to SM (service_manager role detected)')
      router.replace("/dashboard/sm")
      return
    }

    if (isServiceAdvisor()) {
      console.log('✅ Routing to SA (service_advisor role detected)')
      router.replace("/dashboard/sa")
      return
    }

    // If user has overview permission but no other specific permissions, route to GM
    if (hasPermission('overview')) {
      console.log('✅ Routing to GM (has overview permission - fallback)')
      router.replace("/dashboard/gm")
      return
    }

    // If user has no recognized role and no permissions, show unauthorized
    // Don't default to any dashboard - show permission denied
    if (permissions.length === 0) {
      console.log('❌ No permissions, routing to unauthorized')
      router.replace("/dashboard/unauthorized")
      return
    }

    // If we have permissions but none matched the routing criteria above, show unauthorized
    // This means user has some permissions but they don't grant access to any dashboard
    console.log('❌ Has permissions but no dashboard access - routing to unauthorized')
    router.replace("/dashboard/unauthorized")

  }, [user, router, authLoading, permissionsLoading, permissions, hasPermission, pathname])

  const getLoadingMessage = () => {
    if (authLoading) return "Authenticating..."
    return "Setting up your dashboard..."
  }

  const getLoadingSubtext = () => {
    if (authLoading) return "Verifying your credentials"
    return "Preparing your workspace"
  }

  // Helper function to check if user is owner (handles formatted role strings)
  const isOwner = () => {
    if (!user?.role) return false
    const roleStr = String(user.role).toLowerCase().trim()
    const roleParts = roleStr.split('|').map(p => p.trim())
    return roleParts.some(part => part === 'owner') || roleStr.includes('owner')
  }
  
  // Redirect to unauthorized page if no permissions (except owner - only fixed role)
  if (user && !authLoading && !permissionsLoading && permissions.length === 0 && !isOwner()) {
    router.push("/dashboard/unauthorized")
    return null
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
