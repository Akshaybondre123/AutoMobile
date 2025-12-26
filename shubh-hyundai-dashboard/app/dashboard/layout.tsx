"use client"

import type React from "react"

import { AuthProvider, useAuth } from "@/lib/auth-context"
import { DashboardProvider } from "@/contexts/DashboardContext"
import { GlobalApiProvider } from "@/contexts/GlobalApiContext"
import { Sidebar } from "@/components/sidebar"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { usePermissions } from "@/hooks/usePermissions"

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const { permissions, isLoading: permissionsLoading } = usePermissions()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  const handleBackToLogin = () => {
    router.push("/login")
  }

  // Don't auto-redirect - let individual pages handle their own access control
  // The layout should only block rendering, not redirect

  // Check if user is Service Advisor (always has access, no permission check needed)
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

  const isAdvisor = isServiceAdvisor()

  // Service Advisors don't need to wait for permissions - they always have access
  // Only wait for permissions for other users
  if (isLoading || (!isAdvisor && permissionsLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>{isAdvisor ? "Loading dashboard..." : "Loading..."}</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  // REMOVED: Access Denied check
  // System now checks permissions, not dashboards
  // If user has permissions, they can access - no blocking based on dashboards array
  // Individual pages will handle their own permission checks

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-64 min-h-screen bg-background w-full overflow-x-hidden">
        <div className="p-3 sm:p-4 md:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <GlobalApiProvider>
        <DashboardProvider>
          <DashboardLayoutContent>{children}</DashboardLayoutContent>
        </DashboardProvider>
      </GlobalApiProvider>
    </AuthProvider>
  )
}