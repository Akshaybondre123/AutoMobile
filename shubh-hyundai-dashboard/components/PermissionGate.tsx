"use client"

import { usePermissions } from "@/hooks/usePermissions"
import { ReactNode } from "react"

interface PermissionGateProps {
  children: ReactNode
  permission?: string
  permissions?: string[]
  requireAll?: boolean
  fallback?: ReactNode
}

export function PermissionGate({ 
  children, 
  permission, 
  permissions = [], 
  requireAll = false,
  fallback = null 
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, isLoading } = usePermissions()

  if (isLoading) {
    return <div className="animate-pulse bg-gray-200 h-4 w-full rounded"></div>
  }

  let hasAccess = false

  if (permission) {
    hasAccess = hasPermission(permission)
  } else if (permissions.length > 0) {
    if (requireAll) {
      hasAccess = permissions.every(p => hasPermission(p))
    } else {
      hasAccess = hasAnyPermission(permissions)
    }
  } else {
    // No permissions specified, allow access
    hasAccess = true
  }

  if (!hasAccess) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// REMOVED: Hardcoded convenience components with specific permissions
// System is now fully backend-driven - use PermissionGate directly with permissions from backend
// Only owners have default permissions (handled in backend)
// Example usage: <PermissionGate permission="ro_billing_dashboard">{children}</PermissionGate>
