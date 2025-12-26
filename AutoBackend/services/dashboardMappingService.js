/**
 * Dashboard Mapping Service
 * Maps permissions to dashboard access
 */

/**
 * Map permission keys to dashboard identifiers
 * This mapping ensures that when a user has any of these permissions,
 * they get access to the corresponding dashboard.
 */
const PERMISSION_TO_DASHBOARD_MAP = {
  // Service Manager Dashboard - All SM-related permissions
  'sm_dashboard': 'sm_dashboard',
  'ro_billing_dashboard': 'sm_dashboard',
  'operations_dashboard': 'sm_dashboard',
  'warranty_dashboard': 'sm_dashboard',
  'service_booking_dashboard': 'sm_dashboard',
  'repair_order_list_dashboard': 'sm_dashboard',
  
  // SM Upload Permissions (also grant SM dashboard access)
  'ro_billing_upload': 'sm_dashboard',
  'operations_upload': 'sm_dashboard',
  'warranty_upload': 'sm_dashboard',
  'service_booking_upload': 'sm_dashboard',
  'average_upload': 'sm_dashboard',
  
  // SM Report Permissions (also grant SM dashboard access)
  'ro_billing_report': 'sm_dashboard',
  'operations_report': 'sm_dashboard',
  'warranty_report': 'sm_dashboard',
  'service_booking_report': 'sm_dashboard',
  'target_report': 'sm_dashboard',
  
  // General Manager / Owner Dashboard
  'gm_dashboard': 'gm_dashboard',
  // Note: 'overview' removed from automatic mapping - it should not grant dashboard access automatically
  // Only explicit GM permissions should grant GM dashboard access
  'manage_users': 'gm_dashboard',
  'manage_roles': 'gm_dashboard',
  'gm_targets': 'gm_dashboard',
  
  // General permissions that map to appropriate dashboards
  'dashboard': 'sm_dashboard', // Default dashboard permission maps to SM
  'export_data': 'sm_dashboard', // Data export typically from SM dashboard
  'import_data': 'sm_dashboard', // Data import typically from SM dashboard
  
  // Service Advisor Dashboard
  'sa_dashboard': 'sa_dashboard',
  
  // Body Shop Manager Dashboard
  'bdm_dashboard': 'bdm_dashboard',
  'body_shop_dashboard': 'bdm_dashboard',
  'body_shop_upload': 'bdm_dashboard',
  
  // Note: Legacy CRUD permissions (create, read, update, delete) don't map to dashboards
  // They are general permissions that don't grant dashboard access
}

/**
 * Dashboard priority order (for determining default dashboard)
 */
const DASHBOARD_PRIORITY = [
  'gm_dashboard',    // Highest priority
  'sm_dashboard',
  'bdm_dashboard',
  'sa_dashboard',   // Lowest priority
]

/**
 * Extract dashboard access from permissions array
 * @param {Array} permissions - Array of permission objects or permission keys
 * @returns {Object} - { dashboards: string[], default_dashboard: string | null }
 */
export const getDashboardAccess = (permissions) => {
  console.log('🔍 getDashboardAccess called with permissions:', JSON.stringify(permissions, null, 2))
  
  if (!Array.isArray(permissions) || permissions.length === 0) {
    console.log('⚠️ No permissions provided or empty array')
    return {
      dashboards: [],
      default_dashboard: null
    }
  }

  // Extract permission keys
  const permissionKeys = permissions.map(p => {
    if (typeof p === 'string') return p
    if (typeof p === 'object') {
      const key = p.permission_key || p.permissionKey || p.key || null
      if (!key) {
        console.log(`⚠️ Permission object missing key:`, JSON.stringify(p, null, 2))
      }
      return key
    }
    return null
  }).filter(Boolean)

  console.log('🔑 Extracted permission keys:', permissionKeys)
  console.log('📋 Available dashboard mappings:', Object.keys(PERMISSION_TO_DASHBOARD_MAP).slice(0, 10), '...')

  // Map permissions to dashboards
  const dashboardSet = new Set()
  permissionKeys.forEach(permissionKey => {
    const dashboard = PERMISSION_TO_DASHBOARD_MAP[permissionKey]
    if (dashboard) {
      console.log(`✅ Permission "${permissionKey}" maps to dashboard "${dashboard}"`)
      dashboardSet.add(dashboard)
    } else {
      console.log(`⚠️ Permission "${permissionKey}" has no dashboard mapping`)
    }
  })

  const dashboards = Array.from(dashboardSet)
  console.log('📊 Mapped dashboards:', dashboards)

  // DO NOT set default dashboard automatically
  // The frontend should handle routing based on available dashboards
  // Only return the dashboards array, let the frontend decide which one to show
  const defaultDashboard = null

  const result = {
    dashboards,
    default_dashboard: defaultDashboard
  }
  
  console.log('✅ Dashboard access result (no default set):', result)
  return result
}

/**
 * Get dashboard route path from dashboard identifier
 * @param {string} dashboardId - Dashboard identifier (e.g., 'sm_dashboard')
 * @returns {string} - Route path (e.g., '/dashboard/sm')
 */
export const getDashboardRoute = (dashboardId) => {
  const routeMap = {
    'gm_dashboard': '/dashboard/gm',
    'sm_dashboard': '/dashboard/sm',
    'sa_dashboard': '/dashboard/sa',
    'bdm_dashboard': '/dashboard/bdm',
  }
  return routeMap[dashboardId] || '/dashboard'
}

