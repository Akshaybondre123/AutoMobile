"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { usePermissions } from "@/hooks/usePermissions"
import { useDashboardData } from "@/hooks/useDashboardData"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, AlertCircle, FileText, DollarSign, Shield } from "lucide-react"
import { useRouter } from "next/navigation"

export default function WarrantyPage() {
  const { user } = useAuth()
  const { hasPermission } = usePermissions()
  const router = useRouter()
  const [data, setData] = useState<any[]>([])
  
  // ✅ Use shared dashboard cache so Warranty data is fetched once and reused
  const {
    data: dashboardData,
    isLoading,
    error,
  } = useDashboardData({ dataType: "warranty" })

  useEffect(() => {
    const dataArray = Array.isArray(dashboardData?.data) ? dashboardData.data : []
    // Map backend field names (snake_case) to frontend field names (camelCase)
    const mappedData = dataArray.map((record: any) => ({
      claimDate: record.claim_date || record.claimDate || '',
      claimType: record.claim_type || record.claimType || '',
      status: record.claim_status || record.status || '',
      labour: record.labour_amount || record.labour || 0,
      part: record.part_amount || record.part || 0,
      // Include other fields if needed
      claimNumber: record.claim_number || record.claimNumber || '',
      vehicleNumber: record.vehicle_number || record.vehicleNumber || '',
      customerName: record.customer_name || record.customerName || '',
      totalAmount: record.total_claim_amount || record.totalAmount || 0,
      approvedAmount: record.approved_amount || record.approvedAmount || 0,
      roNumber: record.RO_No || record.roNumber || record.ro_no || '',
      // Keep original record for debugging
      _original: record
    }))
    setData(mappedData)
  }, [dashboardData])
  
  // Check permission first
  // ✅ UPDATED: Single permission check - no need for dual checks
  if (!hasPermission("warranty_report") && user?.role !== "service_manager") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-8 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to view the Warranty Report.</p>
            <p className="text-sm text-gray-500 mt-2">Required: warranty_report permission or service_manager role</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalLabour = data.reduce((sum, row) => sum + (Number(row.labour) || 0), 0)
  const totalPart = data.reduce((sum, row) => sum + (Number(row.part) || 0), 0)
  const totalClaims = data.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Warranty Report</h1>
          <p className="text-muted-foreground mt-2">View warranty claims for {user?.city}</p>
        </div>
        <Button onClick={() => router.push("/dashboard/sm/upload")} className="bg-blue-600 hover:bg-blue-700">
          <Upload className="mr-2 h-4 w-4" />
          Upload Data
        </Button>
      </div>


      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Warranty Claims</CardTitle>
          <CardDescription>{data.length} claims found</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">{error}</div>
          ) : data.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">No data uploaded yet</p>
              <Button
                onClick={() => router.push("/dashboard/sm/upload")}
                className="mt-4 bg-blue-600 hover:bg-blue-700"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Data
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-semibold">Claim Date</th>
                    <th className="text-left py-3 px-4 font-semibold">Claim Type</th>
                    <th className="text-center py-3 px-4 font-semibold">Status</th>
                    <th className="text-right py-3 px-4 font-semibold">Labour</th>
                    <th className="text-right py-3 px-4 font-semibold">Part</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((record, idx) => {
                    const claimDate = record.claimDate || record._original?.claim_date || 'N/A'
                    const claimType = record.claimType || record._original?.claim_type || 'N/A'
                    const status = record.status || record._original?.claim_status || 'Pending'
                    const labour = Number(record.labour) || 0
                    const part = Number(record.part) || 0
                    
                    return (
                      <tr key={idx} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 text-sm">{claimDate}</td>
                        <td className="py-3 px-4 text-sm">{claimType}</td>
                        <td className="text-center py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              status?.toLowerCase() === "approved" || status?.toLowerCase() === "approve"
                                ? "bg-green-100 text-green-800"
                                : status?.toLowerCase() === "rejected" || status?.toLowerCase() === "reject"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="text-right py-3 px-4 text-sm font-medium">
                          {labour > 0 ? `₹${labour.toLocaleString('en-IN')}` : '₹0'}
                        </td>
                        <td className="text-right py-3 px-4 text-sm font-medium">
                          {part > 0 ? `₹${part.toLocaleString('en-IN')}` : '₹0'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
