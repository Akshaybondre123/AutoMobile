"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { usePermissions } from "@/hooks/usePermissions"
import { Button } from "@/components/ui/button"
import { BarChart3, Upload, Target, LogOut, Menu, X, Settings, LayoutDashboard, Wrench, PlusSquare, FileText, Shield } from "lucide-react"
import { useState } from "react"

export function Sidebar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const { hasPermission } = usePermissions()
  const [isOpen, setIsOpen] = useState(false)

  if (!user) return null

  // Helper function to check if user is owner (handles formatted role strings like "Owner | CRM | BSM")
  const isOwner = () => {
    if (!user?.role) return false
    const roleStr = String(user.role).toLowerCase().trim()
    // Check if role contains "owner" (handles "Owner", "owner", "Owner | ...", etc.)
    const roleParts = roleStr.split('|').map(p => p.trim())
    return roleParts.some(part => part === 'owner') || roleStr.includes('owner')
  }
  
  // Only owner has fixed role - all others use permissions from backend
  const isGM = isOwner()
  
  // Fully backend-driven: Determine dashboard based on backend response, not hardcoded permissions
  // Use dashboards array from backend if available
  const { dashboards, defaultDashboard } = usePermissions()
  
  // Determine which dashboard to link to - use current path if already on a dashboard
  let dashboardHref = "/dashboard/sm" // Default fallback
  const currentPath = pathname
  
  // If user is already on a dashboard, keep them on that dashboard
  if (currentPath.startsWith('/dashboard/gm')) {
    dashboardHref = "/dashboard/gm"
  } else if (currentPath.startsWith('/dashboard/sm')) {
    dashboardHref = "/dashboard/sm"
  } else if (currentPath.startsWith('/dashboard/sa')) {
    dashboardHref = "/dashboard/sa"
  } else if (currentPath.startsWith('/dashboard/bdm')) {
    dashboardHref = "/dashboard/bdm"
  } else if (isGM) {
    dashboardHref = "/dashboard/gm"
  } else if (dashboards && dashboards.length > 0) {
    // Use first dashboard from backend
    const firstDashboard = dashboards[0]
    if (firstDashboard === 'gm_dashboard') dashboardHref = "/dashboard/gm"
    else if (firstDashboard === 'sm_dashboard') dashboardHref = "/dashboard/sm"
    else if (firstDashboard === 'sa_dashboard') dashboardHref = "/dashboard/sa"
    else if (firstDashboard === 'bdm_dashboard') dashboardHref = "/dashboard/bdm"
  } else if (defaultDashboard) {
    // Use default dashboard from backend
    if (defaultDashboard === 'gm_dashboard') dashboardHref = "/dashboard/gm"
    else if (defaultDashboard === 'sm_dashboard') dashboardHref = "/dashboard/sm"
    else if (defaultDashboard === 'sa_dashboard') dashboardHref = "/dashboard/sa"
    else if (defaultDashboard === 'bdm_dashboard') dashboardHref = "/dashboard/bdm"
  }

  // Group navigation items by category for better organization
  const dashboardItems = [
    {
      label: "Dashboard",
      href: dashboardHref,
      icon: BarChart3,
      show: true,
    },
  ]

  const managementItems = [
    {
      label: "Overview",
      href: "/dashboard/gm/overview",
      icon: LayoutDashboard,
      show: isGM, // Only owners see this (owners have default GM permissions from backend)
    },
    {
      label: "GM Targets",
      href: "/dashboard/gm/targets",
      icon: Target,
      show: isGM, // Only owners see this
    },
    {
      label: "User Access",
      href: "/dashboard/gm/user-access",
      icon: Settings,
      show: isGM, // Only owners see this
    },
  ]

  const serviceItems = [
    {
      label: "Services Dashboard",
      href: "/dashboard/sa/services",
      icon: Wrench,
      show: false, // REMOVED: Hardcoded isSA check - permissions checked on page level
    },
    {
      label: "Create Service",
      href: "/dashboard/sa/create-service",
      icon: PlusSquare,
      show: false, // REMOVED: Hardcoded isSA check - permissions checked on page level
    },
  ]

  const uploadItems = [
    {
      label: "Upload",
      href: "/dashboard/sm/upload",
      icon: Upload,
      show: !isGM, // Show for all non-owners (permissions checked on page level)
    },
  ]

  const reportItems = [
    {
      label: "Target Report",
      href: "/dashboard/reports/targets",
      icon: Target,
      show: !isGM && hasPermission("target_report"), // Dynamically check permission from backend
    },
    {
      label: "RO Billing Report",
      href: "/dashboard/reports/ro-billing",
      icon: FileText,
      show: !isGM && hasPermission("ro_billing_report"), // Dynamically check permission from backend
    },
    {
      label: "Warranty Report",
      href: "/dashboard/reports/warranty",
      icon: Shield,
      show: !isGM && hasPermission("warranty_report"), // Dynamically check permission from backend
    },
    {
      label: "Operations Report",
      href: "/dashboard/reports/operations",
      icon: BarChart3,
      show: !isGM && hasPermission("operations_report"), // Dynamically check permission from backend
    },
    {
      label: "Service Booking Report",
      href: "/dashboard/reports/service-booking",
      icon: FileText,
      show: !isGM && hasPermission("service_booking_report"), // Dynamically check permission from backend
    },
    {
      label: "Repair Order List Report",
      href: "/dashboard/reports/repair-order-list",
      icon: FileText,
      show: !isGM && hasPermission("repair_order_list_report"), // Dynamically check permission from backend
    },
  ]

  // Helper function to render grouped nav items
  const renderNavGroup = (items: typeof dashboardItems, groupLabel?: string) => {
    const visibleItems = items.filter((item) => item.show)
    if (visibleItems.length === 0) return null

    return (
      <div className="space-y-1">
        {groupLabel && (
          <div className="px-4 py-2 mt-4 first:mt-0">
            <p className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
              {groupLabel}
            </p>
          </div>
        )}
        {visibleItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href}>
              <button
                onClick={() => setIsOpen(false)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group ${
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                <Icon 
                  size={20} 
                  className={`transition-transform duration-200 ${isActive ? 'scale-105' : 'group-hover:scale-105'}`}
                />
                <span className="flex-1 text-left font-medium">{item.label}</span>
              </button>
            </Link>
          )
        })}
      </div>
    )
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-primary text-primary-foreground"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-transform duration-300 z-40 flex flex-col ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-sidebar-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-sidebar-foreground">Shubh Hyundai</h1>
              <p className="text-xs text-sidebar-foreground/60 mt-0.5">Service Dashboard</p>
            </div>
          </div>
        </div>

        {/* Navigation with Scroll */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {renderNavGroup(dashboardItems)}
          {renderNavGroup(managementItems, "Management")}
          {renderNavGroup(serviceItems, "Services")}
          {renderNavGroup(uploadItems, "Data")}
          {renderNavGroup(reportItems, "Reports")}
        </nav>

        {/* User Info & Logout */}
        <div className="border-t border-sidebar-border bg-sidebar/50 backdrop-blur-sm flex-shrink-0">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-semibold text-sm">
                  {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-sidebar-foreground truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email || ''}</p>
              </div>
            </div>
            <Button
              onClick={() => {
                logout()
                setIsOpen(false)
              }}
              variant="outline"
              className="w-full justify-start gap-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
            >
              <LogOut size={18} />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsOpen(false)} />}
    </>
  )
}