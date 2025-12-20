"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { usePermissions } from "@/hooks/usePermissions"
import { Button } from "@/components/ui/button"
import { BarChart3, Upload, Target, LogOut, Menu, X, Settings, LayoutDashboard, Wrench, PlusSquare } from "lucide-react"
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
  
  // Only owner has fixed role - all others use permissions
  const isGM = isOwner()
  const isSM = user.role === "service_manager" || user.role?.toLowerCase().includes("service_manager")
  const isSA = user.role === "service_advisor" || user.role?.toLowerCase().includes("service_advisor")
  const isBDM = user.role === "body_shop_manager" || user.role?.toLowerCase().includes("body_shop_manager")
  
  // Determine dashboard based on permissions (not role) - matches main dashboard routing logic
  // Check for GM-level permissions (manage_users, manage_roles, gm_targets)
  const hasGMPermissions = hasPermission('manage_users') || hasPermission('manage_roles') || hasPermission('gm_targets')
  
  // Check for SM-level permissions (dashboard access for billing, operations, warranty, service_booking, repair_order)
  const hasSMPermissions = hasPermission('ro_billing_dashboard') || hasPermission('operations_dashboard') || 
                           hasPermission('warranty_dashboard') || hasPermission('service_booking_dashboard') ||
                           hasPermission('repair_order_list_dashboard') || hasPermission('ro_billing_upload') ||
                           hasPermission('operations_upload') || hasPermission('warranty_upload') || 
                           hasPermission('service_booking_upload') || hasPermission('upload')
  
  // Determine which dashboard to link to (priority: GM permissions > SM permissions > overview > role fallback)
  let dashboardHref = "/dashboard/sa" // Default fallback
  if (isGM || hasGMPermissions) {
    dashboardHref = "/dashboard/gm"
  } else if (hasSMPermissions) {
    dashboardHref = "/dashboard/sm"
  } else if (hasPermission('overview')) {
    dashboardHref = "/dashboard/gm" // overview routes to GM
  } else if (isSM) {
    dashboardHref = "/dashboard/sm"
  } else if (isBDM) {
    dashboardHref = "/dashboard/bdm"
  }

  const navItems = [
    // Main Dashboards - Route based on permissions (owner is only fixed role)
    {
      label: "Dashboard",
      href: dashboardHref,
      icon: BarChart3,
      show: true, // Everyone can see their respective dashboard
    },
    // Service Advisor specific tools
    {
      label: "Services Dashboard",
      href: "/dashboard/sa/services",
      icon: Wrench,
      show: isSA,
    },
    {
      label: "Create Service",
      href: "/dashboard/sa/create-service",
      icon: PlusSquare,
      show: isSA,
    },
    
    // GM Module Pages - GM sees all, others need permission
    {
      label: "Overview",
      href: "/dashboard/gm/overview",
      icon: LayoutDashboard,
      show: isGM || hasPermission("overview"),
    },
    {
      label: "GM Targets",
      href: "/dashboard/gm/targets",
      icon: Target,
      show: isGM || hasPermission("gm_targets"),
    },
    {
      label: "User Access",
      href: "/dashboard/gm/user-access",
      icon: Settings,
      // Owners should always see User Access (or anyone with manage_users permission)
      show: isGM || hasPermission("manage_users"),
    },
    
    // Upload - Single permission for all uploads (anyone with upload permission, not GM)
    {
      label: "Upload",
      href: "/dashboard/sm/upload",
      icon: Upload,
      show: !isGM && hasPermission("upload"),
    },
    
    // Reports - Show only for SM/SA, not GM (GM has overview in their dashboard)
    {
      label: "Target Report",
      href: "/dashboard/reports/targets",
      icon: Target,
      show: !isGM && hasPermission("target_report"),
    },
    {
      label: "RO Billing Report",
      href: "/dashboard/reports/ro-billing",
      icon: BarChart3,
      show: !isGM && hasPermission("ro_billing_report"),
    },
    {
      label: "Warranty Report",
      href: "/dashboard/reports/warranty",
      icon: BarChart3,
      show: !isGM && hasPermission("warranty_report"),
    },
    {
      label: "Operations Report",
      href: "/dashboard/reports/operations",
      icon: BarChart3,
      show: !isGM && hasPermission("operations_report"),
    },
    {
      label: "Service Booking Report",
      href: "/dashboard/reports/service-booking",
      icon: BarChart3,
      show: !isGM && hasPermission("service_booking_report"),
    },
  ]

  const visibleItems = navItems.filter((item) => item.show)

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
        className={`fixed left-0 top-0 h-screen w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-transform duration-300 z-40 ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Simplified header styling with neutral colors */}
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-2xl font-bold text-sidebar-foreground">Shubh Hyundai</h1>
          <p className="text-sm text-sidebar-foreground/60 mt-1">Service Dashboard</p>
        </div>

        <nav className="p-4 space-y-2">
          {visibleItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href}>
                <button
                  onClick={() => setIsOpen(false)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive ? "bg-primary text-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </button>
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-sidebar-border">
          <Button
            onClick={() => {
              logout()
              setIsOpen(false)
            }}
            variant="outline"
            className="w-full justify-start gap-2"
          >
            <LogOut size={18} />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsOpen(false)} />}
    </>
  )
}