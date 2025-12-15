"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { usePermissions } from "@/hooks/usePermissions"

export default function DashboardPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { permissions, isLoading: permissionsLoading, hasPermission } = usePermissions()

  useEffect(() => {
    console.log('🔍 Dashboard routing debug:', {
      user: user?.email,
      role: user?.role,
      authLoading,
      permissionsLoading,
      permissionsCount: permissions.length,
      permissions: permissions.slice(0, 5) // Show first 5 permissions
    })

    if (!user) {
      console.log('❌ No user, redirecting to login')
      return
    }
    
    // Wait for both auth and permissions to be ready
    if (authLoading || permissionsLoading) {
      console.log('⏳ Still loading...', { authLoading, permissionsLoading })
      return
    }

    console.log('✅ Ready to route. User:', user.email, 'Permissions:', permissions.length)

    // Check if user has NO permissions assigned (except General Managers only)
    if (permissions.length === 0 && user.role !== "general_manager") {
      console.log('❌ No permissions and not GM, showing no role message')
      return
    }

    // Smart routing using database permissions
    // Check for GM-level permissions OR general_manager role
    if (hasPermission('manage_users') || hasPermission('manage_roles') || hasPermission('target_report') || user.role === "general_manager") {
      console.log('🎯 Routing to GM dashboard')
      router.push("/dashboard/gm")
      return
    }
    
    // Check for SM-level permissions (any dashboard access)
    if (hasPermission('ro_billing_upload') || hasPermission('operations_upload') || 
        hasPermission('ro_billing_dashboard') || hasPermission('operations_dashboard') ||
        hasPermission('warranty_dashboard') || hasPermission('warranty_upload') ||
        hasPermission('service_booking_dashboard') || hasPermission('service_booking_upload')) {
      console.log('🎯 Routing to SM dashboard')
      router.push("/dashboard/sm")
      return
    }
    
    // Basic access - route to SA dashboard
    if (hasPermission('dashboard') || hasPermission('overview')) {
      console.log('🎯 Routing to SA dashboard')
      router.push("/dashboard/sa")
      return
    }

    // Fallback to role-based routing
    console.log('🎯 Using fallback role-based routing for:', user.role)
    switch (user?.role as string) {
      case "general_manager":
        console.log('→ GM dashboard (fallback)')
        router.push("/dashboard/gm")
        break
      case "service_manager":
        console.log('→ SM dashboard (fallback)')
        router.push("/dashboard/sm")
        break
      default:
        console.log('→ SA dashboard (fallback)')
        router.push("/dashboard/sa")
        break
    }

  }, [user, router, permissions, authLoading, permissionsLoading, hasPermission])

  const getLoadingMessage = () => {
    if (authLoading) return "Authenticating..."
    return "Setting up your dashboard..."
  }

  const getLoadingSubtext = () => {
    if (authLoading) return "Verifying your credentials"
    return "Preparing your workspace"
  }

  // ✅ FIXED: Show no permissions message immediately when 0 permissions detected (except General Managers only)
  if (user && !authLoading && permissions.length === 0 && user.role !== "general_manager") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-orange-100">
        <div className="text-center max-w-lg mx-auto p-8">
          <div className="mb-8">
            <div className="w-24 h-24 mx-auto bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-5V9m0 0V7m0 2h2m-2 0H10M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-red-800 mb-4">
            No Role Assigned
          </h2>
          <p className="text-lg text-red-700 mb-6">
            Currently, you have not been assigned any role.
          </p>
          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-6 border border-red-200 mb-6">
            <p className="text-red-800 font-semibold mb-2">
              Please contact your admin for role assignment.
            </p>
            <p className="text-sm text-red-600">
              Your administrator needs to assign you a role to access the system.
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-2">
              <strong>User:</strong> {user.email}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Role:</strong> {user.role || 'Not assigned'}
            </p>
          </div>
          <button 
            onClick={() => window.location.href = '/login'}
            className="mt-6 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    )
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
