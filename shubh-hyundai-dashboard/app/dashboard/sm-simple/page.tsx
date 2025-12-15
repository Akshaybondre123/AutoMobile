"use client"

import { useAuth } from "@/lib/auth-context"
import { usePermissions } from "@/hooks/usePermissions"
import { useDashboardData } from "@/hooks/useDashboardData"
import { useState } from "react"

export default function SMSimplePage() {
  const { user } = useAuth()
  const { permissions, hasPermission } = usePermissions()
  const [selectedDataType, setSelectedDataType] = useState<"average" | "ro_billing" | "operations" | "warranty" | "service_booking">("average")
  
  const { 
    data: dashboardData, 
    isLoading, 
    error, 
    hasData 
  } = useDashboardData({ 
    dataType: selectedDataType,
    autoFetch: true,
    backgroundRevalidation: true 
  })

  console.log('🔍 SM Simple Dashboard State:', {
    user: user?.email,
    selectedDataType,
    hasData,
    isLoading,
    error,
    dataLength: dashboardData?.data?.length || 0,
    permissions: permissions.length
  })

  return (
    <div className="p-8 min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">SM Dashboard - Simple Test</h1>
        
        {/* User Info */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-2">User Information</h2>
          <p><strong>Email:</strong> {user?.email || 'Not logged in'}</p>
          <p><strong>Role:</strong> {user?.role || 'No role'}</p>
          <p><strong>City:</strong> {user?.city || 'No city'}</p>
          <p><strong>Permissions:</strong> {permissions.length} permissions</p>
        </div>

        {/* Data Type Selector */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-2">Data Type</h2>
          <select 
            value={selectedDataType} 
            onChange={(e) => setSelectedDataType(e.target.value as any)}
            className="border p-2 rounded"
          >
            <option value="average">Average</option>
            <option value="ro_billing">RO Billing</option>
            <option value="operations">Operations</option>
            <option value="warranty">Warranty</option>
            <option value="service_booking">Service Booking</option>
          </select>
        </div>

        {/* Data Status */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-2">Data Status</h2>
          <p><strong>Selected Type:</strong> {selectedDataType}</p>
          <p><strong>Has Data:</strong> {hasData ? 'Yes' : 'No'}</p>
          <p><strong>Is Loading:</strong> {isLoading ? 'Yes' : 'No'}</p>
          <p><strong>Error:</strong> {error || 'None'}</p>
          <p><strong>Data Length:</strong> {dashboardData?.data?.length || 0}</p>
        </div>

        {/* Data Display */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Data Content</h2>
          
          {isLoading && !hasData && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading data...</p>
            </div>
          )}

          {error && !hasData && (
            <div className="text-center py-8 text-red-600">
              <p>Error: {error}</p>
            </div>
          )}

          {!isLoading && !error && !hasData && (
            <div className="text-center py-8 text-gray-500">
              <p>No data available for {selectedDataType}</p>
            </div>
          )}

          {dashboardData && (
            <div>
              <p className="mb-4"><strong>Data loaded successfully!</strong></p>
              <p>Records: {dashboardData.data?.length || 0}</p>
              {dashboardData.summary && (
                <div className="mt-4">
                  <h3 className="font-semibold">Summary:</h3>
                  <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
                    {JSON.stringify(dashboardData.summary, null, 2)}
                  </pre>
                </div>
              )}
              {dashboardData.data && dashboardData.data.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold">First Record:</h3>
                  <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
                    {JSON.stringify(dashboardData.data[0], null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
