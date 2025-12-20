"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import {
  uploadServiceData,
  getRoBillingReports,
  getOperationsReports,
  getWarrantyReports,
  getServiceBookingReports,
  getUploadHistory,
  getUploadStats,
  type ROBillingReport,
  type OperationsReport,
  type WarrantyReport,
  type ServiceBookingReport,
  type UploadHistory,
  type UploadStats,
} from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, CheckCircle, AlertCircle, FileText } from "lucide-react"

type ReportType = "ro_billing" | "operations" | "warranty" | "service_booking"

interface ReportSection {
  type: ReportType
  title: string
  description: string
  icon: React.ReactNode
  color: string
}

const reportSections: ReportSection[] = [
  {
    type: "ro_billing",
    title: "RO Billing Report",
    description: "Repair Order billing details with labour and parts cost. Required column: RO_No",
    icon: <FileText className="h-5 w-5" />,
    color: "blue",
  },
  {
    type: "operations",
    title: "Operations/Part Report",
    description: "Operations and part codes with descriptions. Required column: OP_Part_Code",
    icon: <FileText className="h-5 w-5" />,
    color: "green",
  },
  {
    type: "warranty",
    title: "Warranty Report",
    description: "Warranty claims and approvals. Required column: RO_No",
    icon: <FileText className="h-5 w-5" />,
    color: "purple",
  },
  {
    type: "service_booking",
    title: "Booking List Report",
    description: "Service bookings and scheduling information. Required column: Reg_No",
    icon: <FileText className="h-5 w-5" />,
    color: "orange",
  },
]

export default function UploadPage() {
  const { user } = useAuth()
  const [files, setFiles] = useState<Record<ReportType, File | null>>({
    ro_billing: null,
    operations: null,
    warranty: null,
    service_booking: null,
  })
  const [isLoading, setIsLoading] = useState<Record<ReportType, boolean>>({
    ro_billing: false,
    operations: false,
    warranty: false,
    service_booking: false,
  })
  const [messages, setMessages] = useState<Record<ReportType, { type: "success" | "error"; text: string } | null>>({
    ro_billing: null,
    operations: null,
    warranty: null,
    service_booking: null,
  })
  const [roBillingData, setRoBillingData] = useState<ROBillingReport[]>([])
  const [operationsData, setOperationsData] = useState<OperationsReport[]>([])
  const [warrantyData, setWarrantyData] = useState<WarrantyReport[]>([])
  const [bookingData, setBookingData] = useState<ServiceBookingReport[]>([])
  const [uploadHistory, setUploadHistory] = useState<UploadHistory[]>([])
  const [uploadStats, setUploadStats] = useState<UploadStats[]>([])

  const loadUploadData = async () => {
    if (user?.city) {
      // Do not use hardcoded showroom ids. Use the showroom id attached to the logged-in user.
      const showroomId = (user as any)?.showroom_id || (user as any)?.showroomId
      if (!showroomId) {
        console.warn('Skipping upload history load: user has no showroom_id configured')
        return
      }
      const [history, stats] = await Promise.all([
        getUploadHistory(showroomId),
        getUploadStats(showroomId),
      ])
      setUploadHistory(history)
      setUploadStats(stats)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      if (user?.city) {
        const [ro, ops, war, booking] = await Promise.all([
          getRoBillingReports(user.city),
          getOperationsReports(user.city),
          getWarrantyReports(user.city),
          getServiceBookingReports(user.city),
        ])
        setRoBillingData(ro)
        setOperationsData(ops)
        setWarrantyData(war)
        setBookingData(booking)
        
        // Also load upload data
        loadUploadData()
      }
    }
    loadData()
  }, [user?.city])

  if (user?.role !== "service_manager") {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <p className="text-lg font-semibold">Access Denied</p>
        <p className="text-muted-foreground">Only Service Managers can upload files</p>
      </div>
    )
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, reportType: ReportType) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.name.endsWith(".xlsx") || selectedFile.name.endsWith(".xls")) {
        setFiles((prev) => ({ ...prev, [reportType]: selectedFile }))
        setMessages((prev) => ({ ...prev, [reportType]: null }))
      } else {
        setMessages((prev) => ({
          ...prev,
          [reportType]: { type: "error", text: "Please select an Excel file (.xlsx or .xls)" },
        }))
        setFiles((prev) => ({ ...prev, [reportType]: null }))
      }
    }
  }

  const handleUpload = async (reportType: ReportType) => {
    const file = files[reportType]
    if (!file || !user?.city || !user?.email) return

    setIsLoading((prev) => ({ ...prev, [reportType]: true }))
    try {
      // Use organisation & showroom ids from the authenticated user. Do not use hardcoded ids.
      const orgId = (user as any)?.org_id || (user as any)?.orgId
      const showroomId = (user as any)?.showroom_id || (user as any)?.showroomId

      if (!orgId || !showroomId) {
        setMessages((prev) => ({
          ...prev,
          [reportType]: { type: "error", text: "Org or Showroom not configured for current user. Please configure your showroom before uploading." },
        }))
        return
      }

      const result = await uploadServiceData(
        file,
        user.city,
        reportType,
        user.email,
        orgId,
        showroomId
      )
      
      if (result.success) {
        setMessages((prev) => ({ 
          ...prev, 
          [reportType]: { 
            type: "success", 
            text: result.message + (result.data ? ` (${result.data.totalProcessed} rows processed using ${result.data.uploadCase})` : '')
          } 
        }))
        setFiles((prev) => ({ ...prev, [reportType]: null }))
        
        // Reload upload history after successful upload
        loadUploadData()
      } else {
        setMessages((prev) => ({
          ...prev,
          [reportType]: { type: "error", text: result.message || "Upload failed. Please try again." },
        }))
      }
    } catch (error) {
      console.error('Upload error:', error)
      setMessages((prev) => ({
        ...prev,
        [reportType]: { type: "error", text: "An error occurred during upload" },
      }))
    } finally {
      setIsLoading((prev) => ({ ...prev, [reportType]: false }))
    }
  }

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; border: string; text: string }> = {
      blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-900" },
      green: { bg: "bg-green-50", border: "border-green-200", text: "text-green-900" },
      purple: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-900" },
      orange: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-900" },
    }
    return colors[color] || colors.blue
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Upload Service Reports</h1>
        <p className="text-muted-foreground mt-2">Upload Excel files for {user?.city} service center</p>
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">📋 Upload Instructions</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>File Format:</strong> Only Excel files (.xlsx, .xls) are supported</li>
            <li>• <strong>File Size:</strong> Maximum 50MB per file</li>
            <li>• <strong>Smart Processing:</strong> System automatically detects new, updated, or mixed data</li>
            <li>• <strong>Required Columns:</strong> Each file type has specific required columns (see descriptions below)</li>
            <li>• <strong>Data Handling:</strong> Duplicate records are updated, new records are inserted</li>
          </ul>
        </div>
      </div>

      {/* Upload Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {reportSections.map((section) => {
          const colorClasses = getColorClasses(section.color)
          const file = files[section.type]
          const message = messages[section.type]
          const loading = isLoading[section.type]

          return (
            <Card key={section.type} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${colorClasses.bg}`}>{section.icon}</div>
                  <div>
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 flex-1">
                {/* Upload Area */}
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition-colors ${colorClasses.border}`}
                >
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => handleFileChange(e, section.type)}
                    className="hidden"
                    id={`file-input-${section.type}`}
                  />
                  <label htmlFor={`file-input-${section.type}`} className="cursor-pointer">
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="font-semibold text-sm mb-1">Click to upload</p>
                    <p className="text-xs text-muted-foreground">Excel files (.xlsx, .xls)</p>
                  </label>
                </div>

                {/* Selected File */}
                {file && (
                  <div
                    className={`${colorClasses.bg} border ${colorClasses.border} rounded-lg p-3 flex items-center justify-between`}
                  >
                    <div>
                      <p className={`font-semibold text-sm ${colorClasses.text}`}>{file.name}</p>
                      <p className={`text-xs ${colorClasses.text}`}>{(file.size / 1024).toFixed(2)} KB</p>
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                )}

                {/* Messages */}
                {message && (
                  <div
                    className={`rounded-lg p-3 flex items-center gap-2 text-sm ${
                      message.type === "success"
                        ? "bg-green-50 border border-green-200 text-green-800"
                        : "bg-red-50 border border-red-200 text-red-800"
                    }`}
                  >
                    {message.type === "success" ? (
                      <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    )}
                    <p>{message.text}</p>
                  </div>
                )}

                {/* Upload Button */}
                <Button
                  onClick={() => handleUpload(section.type)}
                  disabled={!file || loading}
                  className="w-full"
                  size="sm"
                >
                  {loading ? "Uploading..." : "Upload File"}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Upload History and Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Statistics</CardTitle>
            <CardDescription>Summary of file uploads for {user?.city}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {uploadStats.length > 0 ? (
                uploadStats.map((stat) => (
                  <div key={stat._id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-semibold capitalize">{stat._id.replace('_', ' ')}</p>
                      <p className="text-sm text-muted-foreground">
                        {stat.totalFiles} files • {stat.totalRows} rows
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-green-600">
                        {stat.successfulUploads} successful
                      </p>
                      {stat.failedUploads > 0 && (
                        <p className="text-sm font-medium text-red-600">
                          {stat.failedUploads} failed
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">No upload statistics available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Upload History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Uploads</CardTitle>
            <CardDescription>Latest file uploads and their status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {uploadHistory.slice(0, 5).map((upload) => (
                <div key={upload._id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{upload.uploaded_file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {upload.rows_count} rows • {(upload.file_size / 1024).toFixed(1)} KB
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(upload.uploaded_at).toLocaleDateString()} by {upload.uploaded_by}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        upload.processing_status === "completed"
                          ? "bg-green-100 text-green-800"
                          : upload.processing_status === "failed"
                            ? "bg-red-100 text-red-800"
                            : upload.processing_status === "processing"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {upload.processing_status}
                    </span>
                  </div>
                </div>
              ))}
              {uploadHistory.length === 0 && (
                <p className="text-muted-foreground text-center py-4">No upload history available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Tables */}
      <div className="space-y-6">
        {/* RO Billing Table */}
        <Card>
          <CardHeader>
            <CardTitle>RO Billing Records</CardTitle>
            <CardDescription>Repair Order billing details for {user?.city}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-semibold">RO Number</th>
                    <th className="text-left py-3 px-4 font-semibold">Vehicle</th>
                    <th className="text-left py-3 px-4 font-semibold">Customer</th>
                    <th className="text-right py-3 px-4 font-semibold">Labour</th>
                    <th className="text-right py-3 px-4 font-semibold">Parts</th>
                    <th className="text-right py-3 px-4 font-semibold">Total</th>
                    <th className="text-center py-3 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {roBillingData.length > 0 ? (
                    roBillingData.map((record) => (
                      <tr key={record.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-mono text-xs">{record.roNumber}</td>
                        <td className="py-3 px-4 font-mono text-xs">{record.vehicleNumber}</td>
                        <td className="py-3 px-4">{record.customerName}</td>
                        <td className="text-right py-3 px-4">₹{record.labourCost}</td>
                        <td className="text-right py-3 px-4">₹{record.partsCost}</td>
                        <td className="text-right py-3 px-4 font-semibold">₹{record.totalAmount}</td>
                        <td className="text-center py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              record.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : record.status === "pending"
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        No RO Billing records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Operations Table */}
        <Card>
          <CardHeader>
            <CardTitle>Operations Records</CardTitle>
            <CardDescription>Service operations and technician tracking for {user?.city}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-semibold">Vehicle</th>
                    <th className="text-left py-3 px-4 font-semibold">Service Type</th>
                    <th className="text-left py-3 px-4 font-semibold">Technician</th>
                    <th className="text-center py-3 px-4 font-semibold">Start Time</th>
                    <th className="text-center py-3 px-4 font-semibold">End Time</th>
                    <th className="text-right py-3 px-4 font-semibold">Hours</th>
                    <th className="text-center py-3 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {operationsData.length > 0 ? (
                    operationsData.map((record) => (
                      <tr key={record.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-mono text-xs">{record.vehicleNumber}</td>
                        <td className="py-3 px-4">{record.serviceType}</td>
                        <td className="py-3 px-4">{record.technician}</td>
                        <td className="text-center py-3 px-4">{record.startTime}</td>
                        <td className="text-center py-3 px-4">{record.endTime}</td>
                        <td className="text-right py-3 px-4 font-semibold">{record.hoursSpent.toFixed(2)}</td>
                        <td className="text-center py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              record.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : "bg-orange-100 text-orange-800"
                            }`}
                          >
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        No Operations records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Warranty Table */}
        <Card>
          <CardHeader>
            <CardTitle>Warranty Claims</CardTitle>
            <CardDescription>Warranty claims and approvals for {user?.city}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-semibold">Vehicle</th>
                    <th className="text-left py-3 px-4 font-semibold">Customer</th>
                    <th className="text-left py-3 px-4 font-semibold">Warranty Type</th>
                    <th className="text-right py-3 px-4 font-semibold">Claim Amount</th>
                    <th className="text-center py-3 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {warrantyData.length > 0 ? (
                    warrantyData.map((record) => (
                      <tr key={record.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-mono text-xs">{record.vehicleNumber}</td>
                        <td className="py-3 px-4">{record.customerName}</td>
                        <td className="py-3 px-4">{record.warrantyType}</td>
                        <td className="text-right py-3 px-4 font-semibold">₹{record.claimAmount}</td>
                        <td className="text-center py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              record.status === "approved"
                                ? "bg-green-100 text-green-800"
                                : record.status === "rejected"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-orange-100 text-orange-800"
                            }`}
                          >
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">
                        No Warranty records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Service Booking Table */}
        <Card>
          <CardHeader>
            <CardTitle>Service Bookings</CardTitle>
            <CardDescription>Service bookings and scheduling for {user?.city}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-semibold">Vehicle</th>
                    <th className="text-left py-3 px-4 font-semibold">Customer</th>
                    <th className="text-left py-3 px-4 font-semibold">Service Type</th>
                    <th className="text-center py-3 px-4 font-semibold">Service Date</th>
                    <th className="text-right py-3 px-4 font-semibold">Estimated</th>
                    <th className="text-right py-3 px-4 font-semibold">Actual</th>
                    <th className="text-center py-3 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookingData.length > 0 ? (
                    bookingData.map((record) => (
                      <tr key={record.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-mono text-xs">{record.vehicleNumber}</td>
                        <td className="py-3 px-4">{record.customerName}</td>
                        <td className="py-3 px-4">{record.serviceType}</td>
                        <td className="text-center py-3 px-4">{record.serviceDate}</td>
                        <td className="text-right py-3 px-4">₹{record.estimatedCost}</td>
                        <td className="text-right py-3 px-4 font-semibold">
                          {record.actualCost > 0 ? `₹${record.actualCost}` : "-"}
                        </td>
                        <td className="text-center py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              record.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : record.status === "cancelled"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        No Service Booking records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
