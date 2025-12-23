"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { usePermissions } from "@/hooks/usePermissions"
import { useDashboardData } from "@/hooks/useDashboardData"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, AlertCircle, FileText, Wrench } from "lucide-react"
import { useRouter } from "next/navigation"

// Format R/O Date function
const formatRODate = (roDate: any): string => {
  if (!roDate) return 'N/A'
  
  try {
    // Handle Excel serial numbers (like "46003.61729166667")
    const excelSerialMatch = roDate.toString().match(/^(\d+)(\.\d+)?$/)
    if (excelSerialMatch) {
      const serialNumber = parseFloat(roDate)
      const excelEpoch = new Date(1899, 11, 30) // December 30, 1899
      const convertedDate = new Date(excelEpoch.getTime() + serialNumber * 24 * 60 * 60 * 1000)
      return convertedDate.toLocaleDateString('en-GB') // DD/MM/YYYY format
    }
    
    // Handle DD-MM-YYYY format (like "01-12-2025")
    const ddmmyyyyMatch = roDate.toString().match(/^(\d{2})-(\d{2})-(\d{4})$/)
    if (ddmmyyyyMatch) {
      return roDate // Already in correct format
    }
    
    // Try parsing as standard date
    const parsedDate = new Date(roDate)
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toLocaleDateString('en-GB') // DD/MM/YYYY format
    }
    
    return roDate.toString()
  } catch (error) {
    console.warn('Date parsing error:', error)
    return roDate.toString()
  }
}

export default function RepairOrderListPage() {
  const { user } = useAuth()
  const { hasPermission } = usePermissions()
  const router = useRouter()
  const [data, setData] = useState<any[]>([])
  
  // ✅ Use shared dashboard cache so Repair Order List data is fetched once and reused
  const {
    data: dashboardData,
    isLoading,
    error,
  } = useDashboardData({ dataType: "repair_order_list" })

  useEffect(() => {
    const dataArray = Array.isArray(dashboardData?.data) ? dashboardData.data : []
    // Map backend field names (snake_case) to frontend field names (camelCase)
    const mappedData = dataArray.map((record: any) => ({
      roNo: record.ro_no || record.roNo || '',
      roDate: record.ro_date || record.roDate || '',
      roStatus: record.ro_status || record.roStatus || '',
      regNo: record.reg_no || record.regNo || record.Reg_No || '',
      vin: record.vin || record.VIN || '',
      model: record.model || '',
      workType: record.work_type || record.workType || '',
      svcAdv: record.svc_adv || record.svcAdv || '',
      // Keep original record for debugging
      _original: record
    }))
    setData(mappedData)
  }, [dashboardData])
  
  // Check permission first
  if (!hasPermission("repair_order_list_report") && user?.role !== "service_manager") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-8 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to view the Repair Order List Report.</p>
            <p className="text-sm text-gray-500 mt-2">Required: repair_order_list_report permission or service_manager role</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Repair Order List Report</h1>
          <p className="text-muted-foreground mt-2">View repair orders for {user?.city}</p>
        </div>
        <Button onClick={() => router.push("/dashboard/sm/upload")} className="bg-blue-600 hover:bg-blue-700">
          <Upload className="mr-2 h-4 w-4" />
          Upload Data
        </Button>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Repair Orders</CardTitle>
          <CardDescription>{data.length} orders found</CardDescription>
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
                    <th className="text-left py-3 px-4 font-semibold">R/O No</th>
                    <th className="text-left py-3 px-4 font-semibold">R/O Date</th>
                    <th className="text-center py-3 px-4 font-semibold">R/O Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Reg. No</th>
                    <th className="text-left py-3 px-4 font-semibold">VIN</th>
                    <th className="text-left py-3 px-4 font-semibold">Model</th>
                    <th className="text-left py-3 px-4 font-semibold">Work Type</th>
                    <th className="text-left py-3 px-4 font-semibold">Svc Adv.</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((record, idx) => {
                    const roNo = record.roNo || record._original?.ro_no || 'N/A'
                    const roDate = formatRODate(record.roDate || record._original?.ro_date || '')
                    const roStatus = record.roStatus || record._original?.ro_status || 'N/A'
                    const regNo = record.regNo || record._original?.reg_no || 'N/A'
                    const vin = record.vin || record._original?.vin || 'N/A'
                    const model = record.model || record._original?.model || 'N/A'
                    const workType = record.workType || record._original?.work_type || 'N/A'
                    const svcAdv = record.svcAdv || record._original?.svc_adv || 'N/A'
                    const statusLower = roStatus.toLowerCase()
                    
                    return (
                      <tr key={idx} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 text-sm font-medium">{roNo}</td>
                        <td className="py-3 px-4 text-sm">{roDate}</td>
                        <td className="text-center py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              statusLower === "open"
                                ? "bg-blue-100 text-blue-800"
                                : statusLower === "closed" || statusLower === "close" || statusLower === "completed"
                                  ? "bg-green-100 text-green-800"
                                  : statusLower === "cancelled" || statusLower === "canceled" || statusLower === "cancel"
                                    ? "bg-red-100 text-red-800"
                                    : statusLower === "pending" || statusLower === "in progress" || statusLower === "inprogress"
                                      ? "bg-orange-100 text-orange-800"
                                      : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {roStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">{regNo}</td>
                        <td className="py-3 px-4 text-sm font-mono">{vin}</td>
                        <td className="py-3 px-4 text-sm">{model}</td>
                        <td className="py-3 px-4 text-sm">{workType}</td>
                        <td className="py-3 px-4 text-sm">{svcAdv}</td>
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

