"use client"

import React, { useEffect, useState, useRef, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { usePermissions } from "@/hooks/usePermissions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { TrendingUp, Upload, FileText, DollarSign, Clock, Shield, Calendar, BarChart3, Loader2, CheckCircle, Car, Wrench, Gauge, Activity, Users, AlertCircle, Search, CalendarIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import { getApiUrl } from "@/lib/config"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

type DataType = "ro_billing" | "operations" | "warranty" | "service_booking" | "average"

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

interface DashboardData {
  dataType: string
  count?: number
  data?: any[]
  summary?: any
  uploads?: any[]
}

interface AdvisorOperation {
  advisorName: string
  fileName?: string
  uploadDate?: string
  dataDate?: string
  totalMatchedAmount: number
  matchedOperations?: Array<{
    operation: string
    amount: number
  }>
}

// Advisor Operations Section Component
const AdvisorOperationsSection = ({ user }: { user: any }) => {
  const [advisors, setAdvisors] = useState<string[]>([])
  const [operationsData, setOperationsData] = useState<AdvisorOperation[]>([])
  const [roData, setRoData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadingAdvisor, setUploadingAdvisor] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [viewMode, setViewMode] = useState<'cumulative' | 'specific'>('cumulative')
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})

  // Fetch unique advisors from RO Billing
  useEffect(() => {
    const loadAdvisors = async () => {
      if (!user?.email || !user?.city) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(
          getApiUrl(`/api/service-manager/dashboard-data?uploadedBy=${user.email}&city=${user.city}&dataType=ro_billing`)
        )

        if (!response.ok) {
          throw new Error("Failed to fetch RO Billing data")
        }

        const result = await response.json()
        const roBillingData = Array.isArray(result.data) ? result.data : []
        setRoData(roBillingData)

        const uniqueAdvisorNames = Array.from(
          new Set(roBillingData.map((r: any) => r.serviceAdvisor).filter(Boolean))
        ) as string[]

        setAdvisors(uniqueAdvisorNames.sort())
      } catch (err) {
        console.error("Error loading advisors:", err)
        setError("Failed to load advisors. Please ensure RO Billing data is uploaded.")
      } finally {
        setIsLoading(false)
      }
    }

    loadAdvisors()
  }, [user?.email, user?.city])

  // Fetch existing operations data
  useEffect(() => {
    const loadOperationsData = async () => {
      if (!user?.email || !user?.city) return

      try {
        const response = await fetch(
          getApiUrl(`/api/service-manager/advisor-operations?uploadedBy=${user.email}&city=${user.city}&dataDate=${selectedDate}&viewMode=${viewMode}`)
        )

        if (response.ok) {
          const result = await response.json()
          setOperationsData(result.data || [])
        }
      } catch (err) {
        console.error("Error loading operations data:", err)
      }
    }

    loadOperationsData()
  }, [user?.email, user?.city, selectedDate, viewMode])

  const handleFileUpload = async (advisorName: string, file: File) => {
    if (!user?.email || !user?.city) return

    setUploadingAdvisor(advisorName)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("advisorName", advisorName)
      formData.append("uploadedBy", user.email)
      formData.append("city", user.city)
      formData.append("dataDate", selectedDate)

      const response = await fetch(
        getApiUrl("/api/service-manager/advisor-operations/upload"),
        {
          method: "POST",
          body: formData,
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Upload failed")
      }

      const result = await response.json()

      alert(`✅ Upload successful!\n\nAdvisor: ${advisorName}\nDate: ${selectedDate}\nMatched Operations: ${result.matchedCount}\nTotal Amount: ₹${result.totalMatchedAmount.toLocaleString()}`)

      if (fileInputRefs.current[advisorName]) {
        fileInputRefs.current[advisorName]!.value = ""
      }

      const refreshResponse = await fetch(
        getApiUrl(`/api/service-manager/advisor-operations?uploadedBy=${user.email}&city=${user.city}&dataDate=${selectedDate}&viewMode=${viewMode}`)
      )

      if (refreshResponse.ok) {
        const refreshResult = await refreshResponse.json()
        setOperationsData(refreshResult.data || [])
      }
    } catch (err: any) {
      console.error("Upload error:", err)
      alert(`❌ Upload failed: ${err.message}`)
    } finally {
      setUploadingAdvisor(null)
    }
  }

  const handleFileChange = (advisorName: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileUpload(advisorName, file)
    }
  }

  const getAdvisorData = (advisorName: string): AdvisorOperation | undefined => {
    return operationsData.find((op) => op.advisorName === advisorName)
  }

  const getOverallLabourAmount = (advisorName: string): number => {
    return roData
      .filter((r: any) => r.serviceAdvisor === advisorName)
      .reduce((sum: number, r: any) => sum + (Number(r.labourAmt) || 0), 0)
  }

  const getWithoutVAS = (advisorName: string): number => {
    const overallLabour = getOverallLabourAmount(advisorName)
    const advisorData = getAdvisorData(advisorName)
    const vasAmount = advisorData?.totalMatchedAmount || 0
    return overallLabour - vasAmount
  }

  const filteredAdvisors = advisors.filter((advisor) =>
    advisor.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalVAS = operationsData.reduce((sum, op) => sum + (op.totalMatchedAmount || 0), 0)
  const totalWithoutVAS = advisors.reduce((sum, advisor) => {
    const advisorData = getAdvisorData(advisor)
    if (advisorData) {
      return sum + getWithoutVAS(advisor)
    }
    return sum
  }, 0)

  return (
    <Card className="border-2 border-green-200 bg-gradient-to-br from-white to-green-50/30 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2">
              <Wrench className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-xl text-gray-900">Advisor Operations Upload</CardTitle>
              <CardDescription>Upload Excel files for each advisor to calculate VAS amounts</CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            {advisors.length} Advisors
          </Badge>
        </div>

        {/* Controls */}
        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-green-600" />
                Select Date:
              </label>
              <Input
                type="date"
                value={selectedDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                View Mode:
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => setViewMode('cumulative')}
                  className={`flex-1 ${
                    viewMode === 'cumulative'
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                  size="sm"
                >
                  Cumulative
                </Button>
                <Button
                  type="button"
                  onClick={() => setViewMode('specific')}
                  className={`flex-1 ${
                    viewMode === 'specific'
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                  size="sm"
                >
                  Date-Specific
                </Button>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search advisors by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 w-full"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Summary Stats - Moved to Top */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-green-100 p-2">
                  <FileText className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Total Advisors</p>
                  <p className="text-2xl font-bold text-gray-900">{advisors.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-blue-100 p-2">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Uploaded</p>
                  <p className="text-2xl font-bold text-gray-900">{operationsData.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-emerald-100 p-2">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Total VAS</p>
                  <p className="text-2xl font-bold text-gray-900">₹{totalVAS.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-purple-100 p-2">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Total Without VAS</p>
                  <p className="text-2xl font-bold text-gray-900">₹{totalWithoutVAS.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
              <div className="animate-spin">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <p className="text-gray-600">Loading advisors...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-300 rounded-lg p-6 text-center">
            <AlertCircle className="h-10 w-10 text-red-600 mx-auto mb-3" />
            <p className="text-red-800 font-semibold">{error}</p>
            <p className="text-red-700 text-sm mt-2">Please upload RO Billing data first to see advisors.</p>
          </div>
        ) : advisors.length === 0 ? (
          <div className="bg-blue-50 border border-blue-300 rounded-lg p-8 text-center">
            <FileText className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <p className="text-gray-800 font-semibold text-lg">No advisors found</p>
            <p className="text-gray-600 text-sm mt-2">Please upload RO Billing data first to see advisors and their operations.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Table */}
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-green-600 to-emerald-600">
                    <th className="text-left py-4 px-4 font-bold text-white border-r border-green-500 w-1/4">
                      Advisor Name
                    </th>
                    <th className="text-left py-4 px-4 font-bold text-white border-r border-green-500 w-1/4">
                      Upload Excel File
                    </th>
                    <th className="text-right py-4 px-4 font-bold text-white border-r border-green-500 w-1/4">
                      VAS
                    </th>
                    <th className="text-right py-4 px-4 font-bold text-white w-1/4">
                      Without VAS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdvisors.map((advisor, index) => {
                    const advisorData = getAdvisorData(advisor)
                    const isUploading = uploadingAdvisor === advisor

                    return (
                      <tr
                        key={advisor}
                        className={`border-b hover:bg-green-50/50 transition-colors ${
                          index % 2 === 0 ? "bg-white" : "bg-gray-50"
                        }`}
                      >
                        <td className="py-4 px-4 border-r border-gray-200">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                              <span className="text-green-700 font-bold text-sm">
                                {advisor.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-semibold text-gray-900">{advisor}</span>
                          </div>
                        </td>

                        <td className="py-4 px-4 border-r border-gray-200">
                          <div className="space-y-2">
                            <input
                              type="file"
                              ref={(el) => {
                                fileInputRefs.current[advisor] = el
                              }}
                              accept=".xlsx,.xls"
                              onChange={(e) => handleFileChange(advisor, e)}
                              disabled={isUploading}
                              className="hidden"
                              id={`file-${advisor}`}
                            />
                            <label htmlFor={`file-${advisor}`}>
                              <Button
                                type="button"
                                onClick={() => fileInputRefs.current[advisor]?.click()}
                                disabled={isUploading}
                                className="bg-green-600 hover:bg-green-700 text-white w-full"
                                size="sm"
                              >
                                {isUploading ? (
                                  <>
                                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                    Uploading...
                                  </>
                                ) : (
                                  <>
                                    <Upload className="mr-2 h-4 w-4" />
                                    {advisorData ? "Re-upload" : "Upload"}
                                  </>
                                )}
                              </Button>
                            </label>
                            {advisorData?.fileName && (
                              <div className="flex items-center gap-2 text-xs text-gray-600">
                                <CheckCircle className="h-3 w-3 text-green-600" />
                                <span className="truncate">{advisorData.fileName}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-4 border-r border-gray-200 text-right">
                          {advisorData ? (
                            <div className="space-y-1">
                              <div className="text-xl font-bold text-green-700">
                                ₹{advisorData.totalMatchedAmount.toLocaleString()}
                              </div>
                              {advisorData.dataDate && (
                                <div className="text-xs text-gray-500">
                                  Data: {new Date(advisorData.dataDate).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">No data</span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-right">
                          {advisorData ? (
                            (() => {
                              const overallLabour = getOverallLabourAmount(advisor)
                              const withoutVAS = getWithoutVAS(advisor)
                              
                              return (
                                <div className="space-y-1">
                                  <div className="text-xl font-bold text-blue-700">
                                    ₹{withoutVAS.toLocaleString()}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Labour: ₹{overallLabour.toLocaleString()}
                                  </div>
                                </div>
                              )
                            })()
                          ) : (
                            <span className="text-gray-400 text-sm">No data</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function SMDashboard() {
  const { user } = useAuth()
  const { hasPermission } = usePermissions()
  const router = useRouter()
  
  // Declare ALL useState hooks first (before any conditional logic)
  const [selectedDataType, setSelectedDataType] = useState<DataType>("average")
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [workTypeData, setWorkTypeData] = useState([
    { name: 'Paid Service', value: 0, color: '#0ea5e9', description: 'Regular paid services' },
    { name: 'Free Service', value: 0, color: '#10b981', description: 'Complimentary services' },
    { name: 'Running Repair', value: 0, color: '#f59e0b', description: 'Ongoing repairs' },
  ])
  const [selectedDate, setSelectedDate] = useState<string>("latest")
  const [showOverall, setShowOverall] = useState<boolean>(false)
  const [hoveredAdvisor, setHoveredAdvisor] = useState<string | null>(null)
  const [showWithTax, setShowWithTax] = useState<boolean>(false)
  const [dataFetched, setDataFetched] = useState<Set<string>>(new Set())
  
  // Clear cache immediately to fetch all records (temporary for this fix)
  useEffect(() => {
    setDataFetched(new Set())
    // Force a refresh by clearing any cached data
    setDashboardData(null)
    // Clear only dashboard-specific cache, not authentication
    if (typeof window !== 'undefined') {
      // Only clear dashboard-specific cache keys, not auth
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.includes('dashboard') || key.includes('sm_') || key.includes('cache'))) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key))
      
      // Clear session storage dashboard cache
      const sessionKeysToRemove = []
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && (key.includes('dashboard') || key.includes('sm_') || key.includes('cache'))) {
          sessionKeysToRemove.push(key)
        }
      }
      sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key))
    }
    console.log('🔄 Dashboard cache cleared, forcing fresh data fetch')
  }, [])

  // Function definitions (before useEffect hooks) - memoized to prevent infinite re-renders
  const fetchDashboardData = useCallback(async (dataType: DataType) => {
    if (!user?.email || !user?.city) return
    
    // Check if this data type has already been fetched recently
    const fetchKey = `${dataType}-${user.email}`
    // Temporarily disable duplicate call prevention to force fresh data
    // if (dataFetched.has(fetchKey)) {
    //   console.log(`⏭️ Skipping duplicate API call for ${dataType}`)
    //   return
    // }

    setIsLoading(true)
    setError(null)

    try {
      const apiUrl = getApiUrl(`/api/service-manager/dashboard-data?uploadedBy=${user.email}&city=${user.city}&dataType=${dataType}`)
      console.log('🔗 Making API call to:', apiUrl)
      console.log('📧 User email:', user.email)
      console.log('🏙️ User city:', user.city)
      console.log('📊 Data type:', dataType)
      
      const response = await fetch(apiUrl)

      if (!response.ok) {
        throw new Error("Failed to fetch data")
      }

      const data = await response.json()
      
      console.log('✅ SM Dashboard Data Received:', data)
      console.log('📈 Data Type:', dataType)
      console.log('📊 Summary:', data?.summary)
      console.log('📋 Data count:', data?.count)
      console.log('📁 Uploads count:', data?.uploads?.length)
      
      // Ensure data has the correct structure
      if (data && typeof data === 'object') {
        setDashboardData({
          ...data,
          data: Array.isArray(data.data) ? data.data : []
        })
        
        // Mark this data type as fetched
        setDataFetched(prev => new Set(prev).add(fetchKey))
      } else {
        setDashboardData(null)
      }
    } catch (err) {
      setError("Failed to load data. Please try again.")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [user?.email, user?.city, dataFetched])

  // ALL useEffect hooks must be declared here (before any conditional returns)
  
  // Check if user has permission to access SM dashboard
  useEffect(() => {
    if (!hasPermission('can_access_sm_dashboard')) {
      console.log('❌ User does not have permission to access SM dashboard')
      // Don't redirect automatically to prevent infinite loops
      // Just show the access denied UI instead
      return
    }
  }, [hasPermission])

  // Clear fetch cache when user changes
  useEffect(() => {
    setDataFetched(new Set())
  }, [user?.email])

  // Fetch dashboard data when selectedDataType changes or component mounts
  useEffect(() => {
    if (selectedDataType && user?.email && user?.city && !isLoading && hasPermission('can_access_sm_dashboard')) {
      // Add a small delay to prevent rapid successive calls
      const timeoutId = setTimeout(() => {
        fetchDashboardData(selectedDataType)
      }, 100)
      
      return () => clearTimeout(timeoutId)
    }
  }, [selectedDataType, user?.email, user?.city]) // Add user dependencies to trigger on mount

  // Fetch work type data for Average dashboard - only once when component mounts
  useEffect(() => {
    const fetchWorkTypeData = async () => {
      if (!user?.email || !user?.city) {
        console.log('⚠️ User email or city not available for work type data fetch')
        return
      }
      
      try {
        console.log('🔄 Fetching work type data for user:', user.email)
        const apiUrl = getApiUrl(`/api/service-manager/dashboard-data?uploadedBy=${user.email}&city=${user.city}&dataType=service_booking`)
        console.log('🔗 Work type API URL:', apiUrl)
        
        const response = await fetch(apiUrl)
        
        if (response.ok) {
          const result = await response.json()
          const bookingData = Array.isArray(result.data) ? result.data : []
          
          // Count work types from actual data
          const workTypeCounts = bookingData.reduce((acc: any, record: any) => {
            const workType = record.workType || 'Unknown'
            acc[workType] = (acc[workType] || 0) + 1
            return acc
          }, {})

          setWorkTypeData([
            { name: 'Paid Service', value: workTypeCounts['Paid Service'] || 0, color: '#0ea5e9', description: 'Regular paid services' },
            { name: 'Free Service', value: workTypeCounts['Free Service'] || 0, color: '#10b981', description: 'Complimentary services' },
            { name: 'Running Repair', value: workTypeCounts['Running Repair'] || 0, color: '#f59e0b', description: 'Ongoing repairs' },
          ])
        }
      } catch (error) {
        console.error('❌ Error fetching work type data:', error)
        console.error('❌ Error details:', {
          userEmail: user?.email,
          userCity: user?.city,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        })
        // Set default work type data on error
        setWorkTypeData([
          { name: 'Paid Service', value: 0, color: '#3b82f6', description: 'Regular paid services' },
          { name: 'Free Service', value: 0, color: '#10b981', description: 'Complimentary services' },
          { name: 'Running Repair', value: 0, color: '#f59e0b', description: 'Ongoing repairs' },
          { name: 'Accidental Repair', value: 0, color: '#ef4444', description: 'Accident-related repairs' }
        ])
      }
    }

    // Only fetch once when user data is available
    if (user?.email && user?.city) {
      fetchWorkTypeData()
    }
  }, []) // Empty dependency array - only run once

  // Set default to latest date for RO Billing
  useEffect(() => {
    if (selectedDataType === "ro_billing" && dashboardData?.data && selectedDate === "latest") {
      const dateGroups: Record<string, any> = {}
      dashboardData.data.forEach((record: any) => {
        const date = record.billDate || record.uploadDate || 'Unknown'
        if (!dateGroups[date]) {
          dateGroups[date] = []
        }
        dateGroups[date].push(record)
      })
      
      const latestDate = Object.keys(dateGroups).sort().reverse()[0]
      if (latestDate && latestDate !== "Unknown") {
        setSelectedDate(latestDate)
      }
    }
  }, [selectedDataType, dashboardData, selectedDate])

  // Show loading or access denied if no permission
  if (!hasPermission('can_access_sm_dashboard')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              You don't have permission to access the Service Manager Dashboard.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Please contact your administrator to request access.
            </p>
            <Button 
              onClick={() => router.push('/dashboard')}
              variant="outline"
              className="w-full"
            >
              Go Back to Main Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderMetricCard = (title: string, value: string | number, icon: React.ReactNode, color: string) => {
    const colorClasses: Record<string, { bg: string; icon: string; gradient: string; border: string }> = {
      blue: { 
        bg: "bg-gradient-to-br from-blue-50 to-blue-100/50", 
        icon: "bg-blue-500 text-white shadow-lg shadow-blue-500/50", 
        gradient: "from-blue-600 to-blue-700",
        border: "border-blue-200"
      },
      green: { 
        bg: "bg-gradient-to-br from-green-50 to-green-100/50", 
        icon: "bg-green-500 text-white shadow-lg shadow-green-500/50", 
        gradient: "from-green-600 to-green-700",
        border: "border-green-200"
      },
      purple: { 
        bg: "bg-gradient-to-br from-purple-50 to-purple-100/50", 
        icon: "bg-purple-500 text-white shadow-lg shadow-purple-500/50", 
        gradient: "from-purple-600 to-purple-700",
        border: "border-purple-200"
      },
      orange: { 
        bg: "bg-gradient-to-br from-orange-50 to-orange-100/50", 
        icon: "bg-orange-500 text-white shadow-lg shadow-orange-500/50", 
        gradient: "from-orange-600 to-orange-700",
        border: "border-orange-200"
      },
      emerald: { 
        bg: "bg-gradient-to-br from-emerald-50 to-emerald-100/50", 
        icon: "bg-emerald-500 text-white shadow-lg shadow-emerald-500/50", 
        gradient: "from-emerald-600 to-emerald-700",
        border: "border-emerald-200"
      },
      red: { 
        bg: "bg-gradient-to-br from-red-50 to-red-100/50", 
        icon: "bg-red-500 text-white shadow-lg shadow-red-500/50", 
        gradient: "from-red-600 to-red-700",
        border: "border-red-200"
      },
    }

    const colors = colorClasses[color] || colorClasses.blue

    return (
      <Card className={`border-2 ${colors.border} ${colors.bg} shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden group`}>
        <CardContent className="p-6 relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{title}</p>
              <p className="text-3xl font-bold text-gray-900 tabular-nums">{value}</p>
            </div>
            <div className={`p-3 rounded-xl ${colors.icon} transform group-hover:rotate-12 transition-transform duration-300`}>
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderDataContent = () => {
    if (!selectedDataType) {
      return (
        <Card className="border-gray-200 bg-gradient-to-br from-gray-50 to-white">
          <CardContent className="p-12 text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Data Selected</h3>
            <p className="text-gray-500">
              Please select a data type from the dropdown above to view your uploaded data
            </p>
          </CardContent>
        </Card>
      )
    }

    if (isLoading) {
      return (
        <Card className="border-gray-200">
          <CardContent className="p-12 text-center">
            <Loader2 className="h-12 w-12 mx-auto mb-4 text-blue-600 animate-spin" />
            <p className="text-gray-600">Loading data...</p>
          </CardContent>
        </Card>
      )
    }

    if (error) {
      return (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-12 text-center">
            <p className="text-red-600 font-medium">{error}</p>
          </CardContent>
        </Card>
      )
    }

    if (!dashboardData) {
      return null
    }

    // Render based on data type
    if (selectedDataType === "average") {
      return renderAverageView()
    } else {
      return renderSpecificDataView()
    }
  }

  const renderAverageView = () => {
    if (isLoading) {
      return (
        <Card className="border-gray-200">
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard data...</p>
          </CardContent>
        </Card>
      )
    }
    
    if (!dashboardData?.summary) {
      return (
        <Card className="border-gray-200">
          <CardContent className="p-12 text-center">
            <p className="text-gray-600">No data available. Please refresh the page.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Refresh Page
            </button>
          </CardContent>
        </Card>
      )
    }

    const { ro_billing, operations, warranty, service_booking } = dashboardData.summary

    // Use workTypeData from component state
    const totalWorkType = workTypeData.reduce((sum, item) => sum + item.value, 0)

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Main 3 Metric Cards - Only Amounts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {renderMetricCard(
            "RO Billing Amount",
            `₹${((ro_billing?.totalRevenue || 0) / 100000).toFixed(2)}L`,
            <DollarSign className="h-5 w-5" />,
            "blue"
          )}
          {renderMetricCard(
            "Service Bookings",
            service_booking?.totalBookings || 0,
            <Calendar className="h-5 w-5" />,
            "purple"
          )}
          {renderMetricCard(
            "Warranty Amount",
            `₹${(((warranty?.totalLabourAmount || 0) + (warranty?.totalPartAmount || 0)) / 100000).toFixed(2)}L`,
            <Shield className="h-5 w-5" />,
            "orange"
          )}
        </div>

        {/* Detailed Metrics in Compact Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Labour & Parts Stats - RO Billing Dashboard */}
          {hasPermission("ro_billing_dashboard") && (
            <Card className="border-2 border-emerald-200 bg-gradient-to-br from-white to-emerald-50/30 shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-100 p-2">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                  </div>
                  <CardTitle className="text-lg">Labour & Parts</CardTitle>
                </div>
              </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-emerald-50 to-white border border-emerald-200">
                <div>
                  <p className="text-xs text-gray-600">Avg Labour</p>
                  <p className="text-2xl font-bold text-emerald-700">
                    ₹{ro_billing?.count ? ((ro_billing?.totalLabour || 0) / ro_billing.count).toFixed(0) : 0}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-600">Total</p>
                  <p className="text-lg font-semibold text-emerald-600">
                    ₹{((ro_billing?.totalLabour || 0) / 100000).toFixed(1)}L
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-blue-50 to-white border border-blue-200">
                <div>
                  <p className="text-xs text-gray-600">Avg Parts</p>
                  <p className="text-2xl font-bold text-blue-700">
                    ₹{ro_billing?.count ? ((ro_billing?.totalParts || 0) / ro_billing.count).toFixed(0) : 0}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-600">Total</p>
                  <p className="text-lg font-semibold text-blue-600">
                    ₹{((ro_billing?.totalParts || 0) / 100000).toFixed(1)}L
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          )}

          {/* Operations Stats */}
          {hasPermission("operations_dashboard") && (
          <Card className="border-2 border-purple-200 bg-gradient-to-br from-white to-purple-50/30 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-100 p-2">
                  <Wrench className="h-5 w-5 text-purple-600" />
                </div>
                <CardTitle className="text-lg">Operations</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-purple-50 to-white border border-purple-200">
                <div>
                  <p className="text-xs text-gray-600">Total Operations</p>
                  <p className="text-2xl font-bold text-purple-700">{operations?.totalOperations || 0}</p>
                </div>
                <div className="p-3 rounded-lg bg-purple-100">
                  <Activity className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-indigo-50 to-white border border-indigo-200">
                <div>
                  <p className="text-xs text-gray-600">Total Amount</p>
                  <p className="text-xl font-bold text-indigo-700">
                    ₹{((operations?.totalAmount || 0) / 100000).toFixed(1)}L
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-indigo-100">
                  <DollarSign className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          )}

          {/* Warranty Stats */}
          {hasPermission("warranty_dashboard") && (
          <Card className="border-2 border-orange-200 bg-gradient-to-br from-white to-orange-50/30 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-orange-100 p-2">
                  <Shield className="h-5 w-5 text-orange-600" />
                </div>
                <CardTitle className="text-lg">Warranty</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-orange-50 to-white border border-orange-200">
                <div>
                  <p className="text-xs text-gray-600">Total Claims</p>
                  <p className="text-2xl font-bold text-orange-700">{warranty?.totalClaims || 0}</p>
                </div>
                <div className="p-3 rounded-lg bg-orange-100">
                  <FileText className="h-6 w-6 text-orange-600" />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-red-50 to-white border border-red-200">
                <div>
                  <p className="text-xs text-gray-600">Total Amount</p>
                  <p className="text-xl font-bold text-red-700">
                    ₹{(((warranty?.totalLabourAmount || 0) + (warranty?.totalPartAmount || 0)) / 100000).toFixed(2)}L
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-red-100">
                  <DollarSign className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-blue-50 to-white border border-blue-200">
                  <div>
                    <p className="text-xs text-gray-600">Labour</p>
                    <p className="text-lg font-bold text-blue-700">
                      ₹{((warranty?.totalLabourAmount || 0) / 100000).toFixed(2)}L
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-blue-100">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-green-50 to-white border border-green-200">
                  <div>
                    <p className="text-xs text-gray-600">Parts</p>
                    <p className="text-lg font-bold text-green-700">
                      ₹{((warranty?.totalPartAmount || 0) / 100000).toFixed(2)}L
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-green-100">
                    <BarChart3 className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          )}
        </div>

        {/* Work Type Breakdown - Full Width */}
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-white via-blue-50/30 to-white shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-3">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-2xl">Work Type Breakdown</CardTitle>
                <CardDescription className="text-base">Service Type Distribution</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {totalWorkType > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Pie Chart */}
                <div className="flex items-center justify-center">
                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={workTypeData}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={120}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ percent }: any) => `${(percent * 100).toFixed(0)}%`}
                        >
                          {workTypeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Legend with Details */}
                <div className="space-y-4 flex flex-col justify-center">
                  {workTypeData.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-gray-50 to-white border-2 border-gray-200 hover:shadow-lg hover:scale-105 transition-all duration-300"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-6 h-6 rounded-full shadow-lg"
                          style={{ backgroundColor: item.color }}
                        />
                        <div>
                          <p className="text-base font-bold text-gray-900">{item.name}</p>
                          <p className="text-sm text-gray-600">{item.description}</p>
                        </div>
                      </div>
                      <span className="text-4xl font-bold" style={{ color: item.color }}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-4 mt-2 border-t-2 border-gray-300">
                    <span className="text-xl font-bold text-gray-800">Total Services</span>
                    <span className="text-5xl font-bold text-blue-600">{totalWorkType}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <BarChart3 className="h-16 w-16 mx-auto mb-3 opacity-50" />
                <p className="text-lg">No service booking data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderSpecificDataView = () => {
    // For operations, always show the advisor operations interface
    if (selectedDataType === "operations") {
      return <AdvisorOperationsSection user={user} />
    }

    if (!dashboardData?.data || dashboardData.data.length === 0) {
      return (
        <Card className="border-gray-200">
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">No data uploaded yet for this category</p>
            <Button
              onClick={() => router.push("/dashboard/sm/upload")}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Data
            </Button>
          </CardContent>
        </Card>
      )
    }

    const dataTypeLabels: Record<string, string> = {
      ro_billing: "RO Billing",
      operations: "Operations",
      warranty: "Warranty",
      service_booking: "Service Booking",
    }

    // Calculate metrics for cards
    const calculateMetrics = () => {
      const data = Array.isArray(dashboardData.data) ? dashboardData.data : []
      
      if (!data.length) {
        return { count: 0 }
      }
      
      if (selectedDataType === "ro_billing") {
        let totalLabour = 0
        let totalParts = 0
        
        // Debug: Log first record to check tax fields
        if (data.length > 0) {
          console.log("Sample RO Billing record - ALL FIELDS:", JSON.stringify(data[0], null, 2))
          console.log("Has labourTax?", data[0].labourTax)
          console.log("Has partTax?", data[0].partTax)
        }
        
        data.forEach((row: any) => {
          const labourAmt = row.labourAmt || 0
          const partAmt = row.partAmt || 0
          const labourTax = row.labourTax || 0
          const partTax = row.partTax || 0
          
          if (showWithTax) {
            totalLabour += labourAmt + labourTax
            totalParts += partAmt + partTax
          } else {
            totalLabour += labourAmt
            totalParts += partAmt
          }
        })
        
        console.log("Tax toggle state:", showWithTax)
        console.log("Total Labour:", totalLabour, "Total Parts:", totalParts)
        
        const totalRevenue = totalLabour + totalParts
        return { totalRevenue, totalLabour, totalParts, count: data.length }
      } else if (selectedDataType === "operations") {
        const totalAmount = data.reduce((sum: number, row: any) => sum + (row.amount || 0), 0)
        const totalCount = data.reduce((sum: number, row: any) => sum + (row.count || 0), 0)
        return { totalAmount, totalCount, count: data.length }
      } else if (selectedDataType === "warranty") {
        // Use API summary data instead of calculating from raw data
        const totalLabour = dashboardData.summary?.totalLabourAmount || 0
        const totalPart = dashboardData.summary?.totalPartAmount || 0
        const totalClaims = dashboardData.summary?.totalClaimAmount || 0
        const totalCount = dashboardData.summary?.totalClaims || 0
        return { totalClaims, totalLabour, totalPart, count: totalCount }
      } else if (selectedDataType === "service_booking") {
        // Use API summary data for status breakdown
        const statusBreakdown = dashboardData.summary?.statusBreakdown || []
        
        const completed = statusBreakdown.find(s => s.status?.toLowerCase() === "close")?.count || 0
        const pending = statusBreakdown.find(s => s.status?.toLowerCase() === "in progress")?.count || 0
        const open = statusBreakdown.find(s => s.status?.toLowerCase() === "open")?.count || 0
        const cancelled = statusBreakdown.find(s => s.status?.toLowerCase() === "cancel")?.count || 0
        
        // Work type counts
        const paidService = data.filter((row: any) => row.workType?.toLowerCase().includes("paid")).length
        const freeService = data.filter((row: any) => row.workType?.toLowerCase().includes("free")).length
        const runningRepair = data.filter((row: any) => row.workType?.toLowerCase().includes("running")).length
        
        return { completed, pending, open, cancelled, paidService, freeService, runningRepair, count: data.length }
      }
      return { count: data.length }
    }

    const metrics = calculateMetrics()

    return (
      <div className="space-y-6">
        {selectedDataType === "ro_billing" && (
          <div className="flex justify-end">
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border-2 border-gray-200 shadow-sm">
              <span className="text-sm font-medium text-gray-700">
                {showWithTax ? "With Tax" : "Without Tax"}
              </span>
              <button
                onClick={() => setShowWithTax(!showWithTax)}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  showWithTax ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    showWithTax ? 'translate-x-8' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {selectedDataType === "ro_billing" && (
            <>
              {renderMetricCard("Total Records", metrics.count, <FileText className="h-5 w-5" />, "blue")}
              {renderMetricCard("Total Labour Amount", `₹${((metrics.totalLabour || 0) / 100000).toFixed(2)}L`, <TrendingUp className="h-5 w-5" />, "green")}
              {renderMetricCard("Total Parts Amount", `₹${((metrics.totalParts || 0) / 100000).toFixed(2)}L`, <BarChart3 className="h-5 w-5" />, "orange")}
              {renderMetricCard("Total Revenue (Labour + Parts)", `₹${((metrics.totalRevenue || 0) / 100000).toFixed(2)}L`, <DollarSign className="h-5 w-5" />, "emerald")}
            </>
          )}
          {selectedDataType === "operations" && (
            <>
              {renderMetricCard("Total Records", metrics.count, <FileText className="h-5 w-5" />, "blue")}
              {renderMetricCard("Total Amount", `₹${((metrics.totalAmount || 0) / 100000).toFixed(2)}L`, <DollarSign className="h-5 w-5" />, "emerald")}
              {renderMetricCard("Total Count", metrics.totalCount || 0, <BarChart3 className="h-5 w-5" />, "purple")}
              {renderMetricCard("Avg per Item", `₹${metrics.totalCount ? ((metrics.totalAmount || 0) / metrics.totalCount).toFixed(0) : 0}`, <TrendingUp className="h-5 w-5" />, "orange")}
            </>
          )}
          {selectedDataType === "warranty" && (
            <>
              {renderMetricCard("Total Claims", metrics.count, <Shield className="h-5 w-5" />, "blue")}
              {renderMetricCard("Total Amount", `₹${(((metrics.totalLabour || 0) + (metrics.totalPart || 0)) / 100000).toFixed(2)}L`, <DollarSign className="h-5 w-5" />, "emerald")}
              {renderMetricCard("Labour", `₹${((metrics.totalLabour || 0) / 100000).toFixed(2)}L`, <TrendingUp className="h-5 w-5" />, "green")}
              {renderMetricCard("Parts", `₹${((metrics.totalPart || 0) / 100000).toFixed(2)}L`, <BarChart3 className="h-5 w-5" />, "orange")}
            </>
          )}
          {selectedDataType === "service_booking" && (
            <>
              {renderMetricCard("Total Bookings", metrics.count, <Calendar className="h-5 w-5" />, "blue")}
              {renderMetricCard("Completed (Close)", metrics.completed || 0, <CheckCircle className="h-5 w-5" />, "emerald")}
              {renderMetricCard("Pending (In Progress)", metrics.pending || 0, <Clock className="h-5 w-5" />, "orange")}
              {renderMetricCard("Open", metrics.open || 0, <FileText className="h-5 w-5" />, "blue")}
              {renderMetricCard("Cancelled", metrics.cancelled || 0, <TrendingUp className="h-5 w-5" />, "red")}
            </>
          )}
        </div>

        {/* Service Advisor Performance Table by Date - For RO Billing */}
        {selectedDataType === "ro_billing" && (() => {
          // Group data by date and service advisor with work types
          const dateGroups: Record<string, Record<string, { ros: number; labour: number; parts: number; total: number; workTypes: Record<string, number> }>> = {}
          
          // Filter out Accidental Repair and Running Repair BodyCare records for Service Advisor Performance
          const filteredData = dashboardData.data.filter((record: any) => 
            !record.workType?.toLowerCase().includes('accidental repair') &&
            !record.workType?.toLowerCase().includes('running repair bodycare')
          );

          filteredData.forEach((record: any) => {
            const date = record.billDate || 'Unknown'
            const advisor = record.serviceAdvisor || 'Unknown'
            const labourAmt = record.labourAmt || 0
            const partAmt = record.partAmt || 0
            const labourTax = record.labourTax || 0
            const partTax = record.partTax || 0
            const workType = record.workType || 'Unknown'
            
            // Calculate amounts based on tax toggle
            const labour = showWithTax ? labourAmt + labourTax : labourAmt
            const parts = showWithTax ? partAmt + partTax : partAmt
            
            if (!dateGroups[date]) {
              dateGroups[date] = {}
            }
            
            if (!dateGroups[date][advisor]) {
              dateGroups[date][advisor] = { ros: 0, labour: 0, parts: 0, total: 0, workTypes: {} }
            }
            
            dateGroups[date][advisor].ros += 1
            dateGroups[date][advisor].labour += labour
            dateGroups[date][advisor].parts += parts
            dateGroups[date][advisor].total += labour + parts
            
            // Track work types
            if (!dateGroups[date][advisor].workTypes[workType]) {
              dateGroups[date][advisor].workTypes[workType] = 0
            }
            dateGroups[date][advisor].workTypes[workType] += 1
          })
          
          // Get all dates sorted
          const allDates = Object.keys(dateGroups).sort()
          
          // Calculate data based on selected date or overall toggle
          const getDisplayData = () => {
            if (showOverall) {
              // Combine all advisors across all dates
              const overallAdvisors: Record<string, { ros: number; labour: number; parts: number; total: number; workTypes: Record<string, number> }> = {}
              
              Object.values(dateGroups).forEach(dateAdvisors => {
                Object.entries(dateAdvisors).forEach(([advisor, data]) => {
                  if (!overallAdvisors[advisor]) {
                    overallAdvisors[advisor] = { ros: 0, labour: 0, parts: 0, total: 0, workTypes: {} }
                  }
                  overallAdvisors[advisor].ros += data.ros
                  overallAdvisors[advisor].labour += data.labour
                  overallAdvisors[advisor].parts += data.parts
                  overallAdvisors[advisor].total += data.total
                  
                  // Merge work types
                  Object.entries(data.workTypes).forEach(([wt, count]) => {
                    if (!overallAdvisors[advisor].workTypes[wt]) {
                      overallAdvisors[advisor].workTypes[wt] = 0
                    }
                    overallAdvisors[advisor].workTypes[wt] += count
                  })
                })
              })
              
              return { [allDates[0] + ' to ' + allDates[allDates.length - 1]]: overallAdvisors }
            } else {
              // Show specific date
              return { [selectedDate]: dateGroups[selectedDate] || {} }
            }
          }
          
          const displayData = getDisplayData()
          const displayDate = Object.keys(displayData)[0]
          const advisors = displayData[displayDate] || {}
          
          // Calculate totals
          const totalROs = Object.values(advisors).reduce((sum, adv) => sum + adv.ros, 0)
          const totalLabour = Object.values(advisors).reduce((sum, adv) => sum + adv.labour, 0)
          const totalParts = Object.values(advisors).reduce((sum, adv) => sum + adv.parts, 0)
          const totalAmount = totalLabour + totalParts
          
          return (
            <Card className="border-2 border-blue-200 bg-gradient-to-br from-white to-blue-50/30 shadow-lg">
              <CardHeader>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-blue-100 p-2">
                        <BarChart3 className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">Service Advisor Performance</CardTitle>
                        <CardDescription>Analyze performance by date or view overall statistics</CardDescription>
                      </div>
                    </div>
                  </div>
                  
                  {/* Date Selector with Overall Toggle */}
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-gray-600" />
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`w-full max-w-md h-11 border-2 bg-white transition-colors justify-start text-left font-normal ${
                            showOverall 
                              ? 'border-gray-300 opacity-50 cursor-not-allowed' 
                              : 'border-blue-300 hover:border-blue-400'
                          }`}
                          disabled={showOverall}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate === "latest" ? "Latest Date" : selectedDate}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <div className="p-3">
                          <div className="text-sm font-medium text-gray-900 mb-3">📅 Available Dates</div>
                          <div className="grid gap-1 max-h-60 overflow-y-auto">
                            <Button
                              variant={selectedDate === "latest" ? "default" : "ghost"}
                              className="justify-start h-8 px-2 text-sm"
                              onClick={() => setSelectedDate("latest")}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span>📍 Latest Date</span>
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  Auto
                                </Badge>
                              </div>
                            </Button>
                            {allDates.map(date => {
                              const advisorCount = Object.keys(dateGroups[date] || {}).length
                              const isSelected = selectedDate === date
                              return (
                                <Button
                                  key={date}
                                  variant={isSelected ? "default" : "ghost"}
                                  className="justify-start h-8 px-2 text-sm"
                                  onClick={() => setSelectedDate(date)}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span className="font-medium">📅 {date}</span>
                                    <Badge variant="outline" className="ml-2 text-xs">
                                      {advisorCount} advisors
                                    </Badge>
                                  </div>
                                </Button>
                              )
                            })}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    
                    {/* Overall Toggle Button */}
                    <Button
                      onClick={() => setShowOverall(!showOverall)}
                      className={`h-11 px-6 font-semibold transition-all ${
                        showOverall
                          ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg'
                          : 'bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300'
                      }`}
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Overall {showOverall ? 'ON' : 'OFF'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="border-2 border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                  {/* Table Header */}
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-white">
                        {showOverall ? "Overall Performance" : displayDate}
                      </h3>
                      <div className="flex items-center gap-4 text-white text-sm">
                        <div className="text-center">
                          <p className="text-xs opacity-90">Advisors</p>
                          <p className="text-lg font-bold">{Object.keys(advisors).length}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs opacity-90">Avg/RO</p>
                          <p className="text-lg font-bold">₹{totalROs > 0 ? (totalAmount / totalROs).toFixed(0) : 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Advisors Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b-2 border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Service Advisor</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">ROs</th>
                          <th className="text-right py-3 px-4 font-semibold text-emerald-700 text-sm">Labour Amt</th>
                          <th className="text-right py-3 px-4 font-semibold text-blue-700 text-sm">Parts Amt</th>
                          <th className="text-right py-3 px-4 font-semibold text-purple-700 text-sm">Total</th>
                          <th className="text-right py-3 px-4 font-semibold text-orange-700 text-sm">Avg Labour/RO</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(advisors)
                          .sort((a, b) => b[1].total - a[1].total)
                          .map(([advisor, data]) => (
                          <tr key={advisor} className="border-b border-gray-100 hover:bg-blue-50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                <span className="font-medium text-gray-900">{advisor}</span>
                              </div>
                            </td>
                            <td 
                              className="py-3 px-4 text-center relative"
                              onMouseEnter={() => setHoveredAdvisor(advisor)}
                              onMouseLeave={() => setHoveredAdvisor(null)}
                            >
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm cursor-help">
                                {data.ros}
                              </span>
                              {hoveredAdvisor === advisor && Object.keys(data.workTypes).length > 0 && (
                                <div className="absolute z-50 left-1/2 transform -translate-x-1/2 top-full mt-2 bg-white border-2 border-blue-300 rounded-lg shadow-2xl p-4 min-w-[250px]">
                                  <div className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">Work Type Breakdown</div>
                                  <div className="space-y-2">
                                    {Object.entries(data.workTypes)
                                      .sort((a, b) => b[1] - a[1])
                                      .map(([workType, count]) => (
                                        <div key={workType} className="flex items-center justify-between text-xs">
                                          <span className="font-medium text-gray-700">{workType}</span>
                                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold">{count}</span>
                                        </div>
                                      ))}
                                  </div>
                                  <div className="mt-3 pt-2 border-t border-gray-200 flex items-center justify-between text-xs font-bold">
                                    <span className="text-gray-800">Total ROs</span>
                                    <span className="bg-blue-600 text-white px-2 py-1 rounded">{data.ros}</span>
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                              ₹{data.labour.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-blue-600">
                              ₹{data.parts.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-purple-700">
                              ₹{data.total.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-orange-600">
                              ₹{(data.labour / data.ros).toFixed(0)}
                            </td>
                          </tr>
                        ))}
                        {/* Total Row */}
                        <tr className="bg-gradient-to-r from-gray-100 to-gray-50 border-t-2 border-gray-300 font-bold">
                          <td className="py-3 px-4 text-gray-900">Total</td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm">
                              {totalROs}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-emerald-700">₹{totalLabour.toLocaleString()}</td>
                          <td className="py-3 px-4 text-right text-blue-700">₹{totalParts.toLocaleString()}</td>
                          <td className="py-3 px-4 text-right text-purple-800">₹{totalAmount.toLocaleString()}</td>
                          <td className="py-3 px-4 text-right text-orange-700">₹{totalROs > 0 ? (totalLabour / totalROs).toFixed(0) : 0}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })()}

        {/* RF Mechanical Performance Table by Date - For RO Billing */}
        {selectedDataType === "ro_billing" && (() => {
          // Group data by date and service advisor with work types - RF Mechanical only
          const rfDateGroups: Record<string, Record<string, { ros: number; labour: number; parts: number; total: number; workTypes: Record<string, number> }>> = {}
          
          // Filter for RF Mechanical work type only
          const rfMechanicalData = dashboardData.data.filter((record: any) => 
            record.workType?.toLowerCase().includes('rf mechanical')
          );

          if (rfMechanicalData.length === 0) {
            return null // Don't show if no RF Mechanical data
          }

          rfMechanicalData.forEach((record: any) => {
            const date = record.billDate || 'Unknown'
            const advisor = record.serviceAdvisor || 'Unknown'
            const labourAmt = record.labourAmt || 0
            const partAmt = record.partAmt || 0
            const labourTax = record.labourTax || 0
            const partTax = record.partTax || 0
            const workType = record.workType || 'Unknown'
            
            // Calculate amounts based on tax toggle
            const labour = showWithTax ? labourAmt + labourTax : labourAmt
            const parts = showWithTax ? partAmt + partTax : partAmt
            
            if (!rfDateGroups[date]) {
              rfDateGroups[date] = {}
            }
            
            if (!rfDateGroups[date][advisor]) {
              rfDateGroups[date][advisor] = { ros: 0, labour: 0, parts: 0, total: 0, workTypes: {} }
            }
            
            rfDateGroups[date][advisor].ros += 1
            rfDateGroups[date][advisor].labour += labour
            rfDateGroups[date][advisor].parts += parts
            rfDateGroups[date][advisor].total += labour + parts
            
            // Track work types
            if (!rfDateGroups[date][advisor].workTypes[workType]) {
              rfDateGroups[date][advisor].workTypes[workType] = 0
            }
            rfDateGroups[date][advisor].workTypes[workType] += 1
          })
          
          // Get all dates sorted
          const rfAllDates = Object.keys(rfDateGroups).sort()
          
          // Calculate data based on selected date or overall toggle
          const getRfDisplayData = () => {
            if (showOverall) {
              // Combine all advisors across all dates
              const overallAdvisors: Record<string, { ros: number; labour: number; parts: number; total: number; workTypes: Record<string, number> }> = {}
              
              Object.values(rfDateGroups).forEach(dateAdvisors => {
                Object.entries(dateAdvisors).forEach(([advisor, data]) => {
                  if (!overallAdvisors[advisor]) {
                    overallAdvisors[advisor] = { ros: 0, labour: 0, parts: 0, total: 0, workTypes: {} }
                  }
                  overallAdvisors[advisor].ros += data.ros
                  overallAdvisors[advisor].labour += data.labour
                  overallAdvisors[advisor].parts += data.parts
                  overallAdvisors[advisor].total += data.total
                  
                  // Merge work types
                  Object.entries(data.workTypes).forEach(([wt, count]) => {
                    if (!overallAdvisors[advisor].workTypes[wt]) {
                      overallAdvisors[advisor].workTypes[wt] = 0
                    }
                    overallAdvisors[advisor].workTypes[wt] += count
                  })
                })
              })
              
              return { [rfAllDates[0] + ' to ' + rfAllDates[rfAllDates.length - 1]]: overallAdvisors }
            } else {
              // Show specific date
              return { [selectedDate]: rfDateGroups[selectedDate] || {} }
            }
          }
          
          const rfDisplayData = getRfDisplayData()
          const rfDisplayDate = Object.keys(rfDisplayData)[0]
          const rfAdvisors = rfDisplayData[rfDisplayDate] || {}
          
          // Calculate totals
          const rfTotalROs = Object.values(rfAdvisors).reduce((sum, adv) => sum + adv.ros, 0)
          const rfTotalLabour = Object.values(rfAdvisors).reduce((sum, adv) => sum + adv.labour, 0)
          const rfTotalParts = Object.values(rfAdvisors).reduce((sum, adv) => sum + adv.parts, 0)
          const rfTotalAmount = rfTotalLabour + rfTotalParts
          
          return (
            <Card className="border-2 border-green-200 bg-gradient-to-br from-white to-green-50/30 shadow-lg">
              <CardHeader>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-green-100 p-2">
                        <Wrench className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">RF Mechanical Performance</CardTitle>
                        <CardDescription>RF Mechanical work type performance by advisor</CardDescription>
                      </div>
                    </div>
                  </div>
                  
                  {/* Date Selector with Overall Toggle */}
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-gray-600" />
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`w-full max-w-md h-11 border-2 bg-white transition-colors justify-start text-left font-normal ${
                            showOverall 
                              ? 'border-gray-300 opacity-50 cursor-not-allowed' 
                              : 'border-green-300 hover:border-green-400'
                          }`}
                          disabled={showOverall}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate === "latest" ? "Latest Date" : selectedDate}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <div className="p-3">
                          <div className="text-sm font-medium text-gray-900 mb-3">📅 Available Dates</div>
                          <div className="grid gap-1 max-h-60 overflow-y-auto">
                            <Button
                              variant={selectedDate === "latest" ? "default" : "ghost"}
                              className="justify-start h-8 px-2 text-sm"
                              onClick={() => setSelectedDate("latest")}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span>📍 Latest Date</span>
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  Auto
                                </Badge>
                              </div>
                            </Button>
                            {rfAllDates.map(date => {
                              const advisorCount = Object.keys(rfDateGroups[date] || {}).length
                              const isSelected = selectedDate === date
                              return (
                                <Button
                                  key={date}
                                  variant={isSelected ? "default" : "ghost"}
                                  className="justify-start h-8 px-2 text-sm"
                                  onClick={() => setSelectedDate(date)}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span className="font-medium">📅 {date}</span>
                                    <Badge variant="outline" className="ml-2 text-xs">
                                      {advisorCount} advisors
                                    </Badge>
                                  </div>
                                </Button>
                              )
                            })}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    
                    {/* Overall Toggle Button */}
                    <Button
                      onClick={() => setShowOverall(!showOverall)}
                      className={`h-11 px-6 font-semibold transition-all ${
                        showOverall
                          ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg'
                          : 'bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300'
                      }`}
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Overall {showOverall ? 'ON' : 'OFF'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="border-2 border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                  {/* Table Header */}
                  <div className="bg-gradient-to-r from-green-600 to-green-700 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-white">
                        {showOverall ? "Overall RF Mechanical Performance" : `RF Mechanical - ${rfDisplayDate}`}
                      </h3>
                      <div className="flex items-center gap-4 text-white text-sm">
                        <div className="text-center">
                          <p className="text-xs opacity-90">Advisors</p>
                          <p className="text-lg font-bold">{Object.keys(rfAdvisors).length}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs opacity-90">Avg/RO</p>
                          <p className="text-lg font-bold">₹{rfTotalROs > 0 ? (rfTotalAmount / rfTotalROs).toFixed(0) : 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Advisors Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b-2 border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Service Advisor</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">ROs</th>
                          <th className="text-right py-3 px-4 font-semibold text-emerald-700 text-sm">Labour Amt</th>
                          <th className="text-right py-3 px-4 font-semibold text-blue-700 text-sm">Parts Amt</th>
                          <th className="text-right py-3 px-4 font-semibold text-purple-700 text-sm">Total</th>
                          <th className="text-right py-3 px-4 font-semibold text-orange-700 text-sm">Avg Labour/RO</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(rfAdvisors)
                          .sort((a, b) => b[1].total - a[1].total)
                          .map(([advisor, data]) => (
                          <tr key={advisor} className="border-b border-gray-100 hover:bg-green-50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <span className="font-medium text-gray-900">{advisor}</span>
                              </div>
                            </td>
                            <td 
                              className="py-3 px-4 text-center relative"
                              onMouseEnter={() => setHoveredAdvisor(advisor)}
                              onMouseLeave={() => setHoveredAdvisor(null)}
                            >
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold text-sm cursor-help">
                                {data.ros}
                              </span>
                              {hoveredAdvisor === advisor && Object.keys(data.workTypes).length > 0 && (
                                <div className="absolute z-50 left-1/2 transform -translate-x-1/2 top-full mt-2 bg-white border-2 border-green-300 rounded-lg shadow-2xl p-4 min-w-[250px]">
                                  <div className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">RF Mechanical Work Types</div>
                                  <div className="space-y-2">
                                    {Object.entries(data.workTypes)
                                      .sort((a, b) => b[1] - a[1])
                                      .map(([workType, count]) => (
                                        <div key={workType} className="flex items-center justify-between text-xs">
                                          <span className="font-medium text-gray-700">{workType}</span>
                                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded font-bold">{count}</span>
                                        </div>
                                      ))}
                                  </div>
                                  <div className="mt-3 pt-2 border-t border-gray-200 flex items-center justify-between text-xs font-bold">
                                    <span className="text-gray-800">Total ROs</span>
                                    <span className="bg-green-600 text-white px-2 py-1 rounded">{data.ros}</span>
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                              ₹{data.labour.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-blue-600">
                              ₹{data.parts.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-purple-700">
                              ₹{data.total.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-orange-600">
                              ₹{(data.labour / data.ros).toFixed(0)}
                            </td>
                          </tr>
                        ))}
                        {/* Total Row */}
                        <tr className="bg-gradient-to-r from-gray-100 to-gray-50 border-t-2 border-gray-300 font-bold">
                          <td className="py-3 px-4 text-gray-900">Total</td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-600 text-white font-bold text-sm">
                              {rfTotalROs}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-emerald-700">₹{rfTotalLabour.toLocaleString()}</td>
                          <td className="py-3 px-4 text-right text-blue-700">₹{rfTotalParts.toLocaleString()}</td>
                          <td className="py-3 px-4 text-right text-purple-800">₹{rfTotalAmount.toLocaleString()}</td>
                          <td className="py-3 px-4 text-right text-orange-700">₹{rfTotalROs > 0 ? (rfTotalLabour / rfTotalROs).toFixed(0) : 0}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })()}

        {/* Bodyshop - Accidental Repair & Running Repair BodyCare Analysis */}
        {selectedDataType === "ro_billing" && (() => {
          // Filter for Accidental Repair and Running Repair BodyCare work types
          const bodyshopData = dashboardData.data.filter((record: any) => 
            record.workType?.toLowerCase().includes('accidental repair') ||
            record.workType?.toLowerCase().includes('running repair bodycare')
          )

          if (bodyshopData.length === 0) {
            return null // Don't show if no bodyshop data
          }

          // Group by advisor with work type breakdown
          const advisorStats: Record<string, { labour: number; parts: number; ros: number; workTypes: Record<string, { count: number; labour: number; parts: number }> }> = {}
          
          bodyshopData.forEach((record: any) => {
            const advisor = record.serviceAdvisor || 'Unknown'
            const labourAmt = record.labourAmt || 0
            const partAmt = record.partAmt || 0
            const labourTax = record.labourTax || 0
            const partTax = record.partTax || 0
            
            // Calculate amounts based on tax toggle (same as RO Billing table)
            const labour = showWithTax ? labourAmt + labourTax : labourAmt
            const parts = showWithTax ? partAmt + partTax : partAmt
            
            const workType = record.workType || 'Unknown'
            
            if (!advisorStats[advisor]) {
              advisorStats[advisor] = { labour: 0, parts: 0, ros: 0, workTypes: {} }
            }
            
            if (!advisorStats[advisor].workTypes[workType]) {
              advisorStats[advisor].workTypes[workType] = { count: 0, labour: 0, parts: 0 }
            }
            
            advisorStats[advisor].labour += labour
            advisorStats[advisor].parts += parts
            advisorStats[advisor].ros += 1
            advisorStats[advisor].workTypes[workType].count += 1
            advisorStats[advisor].workTypes[workType].labour += labour
            advisorStats[advisor].workTypes[workType].parts += parts
          })

          // Calculate totals
          let totalLabour = 0
          let totalParts = 0
          let totalROs = 0
          
          Object.values(advisorStats).forEach(stats => {
            totalLabour += stats.labour
            totalParts += stats.parts
            totalROs += stats.ros
          })

          return (
            <Card className="border-2 border-red-200 bg-gradient-to-br from-white to-red-50/30 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-red-100 p-2">
                      <Car className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Bodyshop - Accidental Repair & Running Repair BodyCare</CardTitle>
                      <CardDescription>Advisor-wise performance for bodyshop work types</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-red-300 bg-gradient-to-r from-red-50 to-red-100">
                        <th className="text-left py-3 px-4 font-bold text-gray-800">Service Advisor</th>
                        <th className="text-center py-3 px-4 font-bold text-gray-800">ROs</th>
                        <th className="text-right py-3 px-4 font-bold text-gray-800">Labour Amount</th>
                        <th className="text-right py-3 px-4 font-bold text-gray-800">Part Amount</th>
                        <th className="text-right py-3 px-4 font-bold text-gray-800">Total Amount</th>
                        <th className="text-right py-3 px-4 font-bold text-gray-800">Per RO Labour</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(advisorStats)
                        .sort((a, b) => (b[1].labour + b[1].parts) - (a[1].labour + a[1].parts))
                        .map(([advisor, stats], idx) => {
                          const total = stats.labour + stats.parts
                          const perROLabour = stats.ros > 0 ? stats.labour / stats.ros : 0
                          
                          return (
                            <tr key={idx} className="border-b border-gray-200 hover:bg-red-50 transition-colors">
                              <td className="py-3 px-4 font-semibold text-gray-900">{advisor}</td>
                              <td 
                              className="py-3 px-4 text-center relative"
                              onMouseEnter={() => setHoveredAdvisor(advisor)}
                              onMouseLeave={() => setHoveredAdvisor(null)}
                            >
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-600 text-white font-bold text-sm cursor-help">
                                {stats.ros}
                              </span>
                              {hoveredAdvisor === advisor && Object.keys(stats.workTypes).length > 0 && (
                                <div className="absolute z-50 left-1/2 transform -translate-x-1/2 top-full mt-2 bg-white border-2 border-red-300 rounded-lg shadow-2xl p-3 min-w-[200px]">
                                  <div className="font-bold text-gray-800 mb-2 text-sm border-b pb-2">Bodyshop Work Types</div>
                                  <div className="space-y-1">
                                    {Object.entries(stats.workTypes)
                                      .sort((a, b) => b[1].count - a[1].count)
                                      .map(([workType, wtStats]) => (
                                        <div key={workType} className="flex items-center justify-between text-sm">
                                          <span className="font-medium text-gray-700">{workType}</span>
                                          <span className="bg-red-100 text-red-800 px-2 py-1 rounded font-bold">{wtStats.count}</span>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              )}
                            </td>
                              <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                                ₹{stats.labour.toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-right font-semibold text-blue-600">
                                ₹{stats.parts.toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-purple-700">
                                ₹{total.toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-right font-semibold text-orange-600">
                                ₹{perROLabour.toFixed(0)}
                              </td>
                            </tr>
                          )
                        })}
                      {/* Overall Total Row */}
                      <tr className="bg-gradient-to-r from-red-100 to-red-50 border-t-2 border-red-300 font-bold">
                        <td className="py-3 px-4 text-gray-900">Overall Total</td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-700 text-white font-bold text-sm">
                            {totalROs}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-700">₹{totalLabour.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-blue-700">₹{totalParts.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-purple-800">₹{(totalLabour + totalParts).toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-orange-700">
                          ₹{totalROs > 0 ? (totalLabour / totalROs).toFixed(0) : 0}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )
        })()}
        
        {/* Advisor Operations Upload */}
        {selectedDataType === "operations" && (() => {
          return <AdvisorOperationsSection user={user} />
        })()}
        
        {/* Warranty Claims Analysis */}
        {selectedDataType === "warranty" && (() => {
          // Use API summary data for warranty breakdowns
          const claimTypeData = dashboardData.summary?.claimTypeBreakdown || []
          const claimStatusData = dashboardData.summary?.claimStatusBreakdown || []
          const claimTypeStatusData = dashboardData.summary?.claimTypeStatusBreakdown || []
          
          // Safety check for data
          if (claimTypeData.length === 0 && claimStatusData.length === 0) {
            return (
              <Card className="border-2 border-orange-200 bg-gradient-to-br from-white to-orange-50/30 shadow-lg">
                <CardContent className="p-12 text-center">
                  <Shield className="h-12 w-12 mx-auto mb-4 text-orange-400" />
                  <p className="text-gray-600">No warranty data available</p>
                </CardContent>
              </Card>
            )
          }

          // Get totals from API summary
          const overallLabour = dashboardData.summary?.totalLabourAmount || 0
          const overallPart = dashboardData.summary?.totalPartAmount || 0
          const overallTotal = dashboardData.summary?.totalClaimAmount || 0
          const totalClaims = dashboardData.summary?.totalClaims || 0
          
          return (
            <Card className="border-2 border-orange-200 bg-gradient-to-br from-white to-orange-50/30 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-orange-100 p-2">
                      <Shield className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Warranty Claims Overview</CardTitle>
                      <CardDescription>Claim types with labour and parts breakdown</CardDescription>
                    </div>
                  </div>
                  {hasPermission("warranty_report") && (
                  <Button
                    onClick={() => router.push("/dashboard/reports/warranty")}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    View Full Report →
                  </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                  <div className="space-y-6">
                    {/* Claim Types with Status Breakdown */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Claim Types & Status</h3>
                      <div className="space-y-4">
                        {claimTypeData.map((claimType: any, idx: number) => {
                          // Get status breakdown specific to this claim type
                          const typeSpecificStatus = claimTypeStatusData.filter(
                            (item: any) => item.claimType === claimType.type
                          )
                          
                          // Calculate total as labour + part
                          const totalAmount = (claimType.labourAmount || 0) + (claimType.partAmount || 0)
                          
                          return (
                            <div key={idx} className="p-4 rounded-lg bg-white border-2 border-gray-200 hover:border-orange-300 hover:shadow-lg transition-all">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white font-bold text-sm shadow-lg">
                                    {idx + 1}
                                  </div>
                                  <div>
                                    <span className="text-base font-bold text-gray-900">{claimType.type}</span>
                                    <p className="text-xs text-gray-500">{claimType.count} claims</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold text-orange-600">₹{(totalAmount / 100000).toFixed(2)}L</p>
                                  <p className="text-xs text-gray-500">Total</p>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-200">
                                <div className="text-center p-3 rounded bg-blue-50">
                                  <p className="text-xs text-gray-600 mb-1">Labour</p>
                                  <p className="text-sm font-bold text-blue-600">₹{((claimType.labourAmount || 0) / 100000).toFixed(2)}L</p>
                                </div>
                                <div className="text-center p-3 rounded bg-green-50">
                                  <p className="text-xs text-gray-600 mb-1">Part</p>
                                  <p className="text-sm font-bold text-green-600">₹{((claimType.partAmount || 0) / 100000).toFixed(2)}L</p>
                                </div>
                              </div>

                              {/* Status breakdown specific to this claim type */}
                              <div className="mt-4 pt-3 border-t border-gray-100">
                                <p className="text-sm font-medium text-gray-700 mb-2">Status Distribution:</p>
                                <div className="flex flex-wrap gap-2">
                                  {typeSpecificStatus.length > 0 ? (
                                    typeSpecificStatus.map((status: any, statusIdx: number) => (
                                      <div key={statusIdx} className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 border border-purple-200">
                                        <span className="text-xs font-medium text-purple-700">{status.claimStatus}</span>
                                        <span className="text-xs text-purple-600">({status.count})</span>
                                      </div>
                                    ))
                                  ) : (
                                    <span className="text-xs text-gray-500">No status data available</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Overall Status Summary */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Status Summary</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {claimStatusData.map((status: any, idx: number) => (
                          <div key={idx} className="p-3 rounded-lg bg-gradient-to-r from-purple-50 to-white border border-purple-200">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-bold text-gray-900">{status.status}</p>
                                <p className="text-xs text-gray-600">{status.count} claims</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-purple-600">₹{((status.totalAmount || 0) / 100000).toFixed(2)}L</p>
                                <p className="text-xs text-gray-500">L: ₹{((status.labourAmount || 0) / 100000).toFixed(2)}L | P: ₹{((status.partAmount || 0) / 100000).toFixed(2)}L</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
              </CardContent>
            </Card>
          )
        })()}
        
        {/* Service Booking Analysis */}
        {selectedDataType === "service_booking" && (() => {
          // Use the enhanced API data structure
          const serviceAdvisorData = dashboardData.summary?.serviceAdvisorBreakdown || []
          const workTypeData = dashboardData.summary?.workTypeBreakdown || []
          const statusData = dashboardData.summary?.statusBreakdown || []
          
          const topAdvisors = serviceAdvisorData.slice(0, 8)
          
          return (
            <Card className="border-2 border-emerald-200 bg-gradient-to-br from-white to-emerald-50/30 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-emerald-100 p-2">
                      <Calendar className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Service Advisor Performance</CardTitle>
                      <CardDescription>Booking completion rates by advisor</CardDescription>
                    </div>
                  </div>
                  {hasPermission("service_booking_report") && (
                  <Button
                    onClick={() => router.push("/dashboard/reports/service-booking")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    View Full Report →
                  </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Service Advisor Breakdown */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Advisors</h3>
                    <div className="space-y-3">
                      {topAdvisors.map((advisor, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-white border border-gray-200 hover:border-emerald-300 transition-all">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                <span className="text-sm font-bold text-emerald-700">{advisor.advisor.charAt(0)}</span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{advisor.advisor}</p>
                                <p className="text-xs text-gray-500">Service Advisor</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-emerald-700">{advisor.count}</p>
                              <p className="text-xs text-gray-500">Bookings</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Work Type & Status Breakdown */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Work Types & Status</h3>
                    <div className="space-y-4">
                      {/* Work Type */}
                      <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                        <h4 className="font-medium text-blue-900 mb-2">Work Types</h4>
                        <div className="space-y-2">
                          {workTypeData.map((type, idx) => (
                            <div key={idx} className="flex justify-between items-center">
                              <span className="text-sm text-blue-800">{type.type}</span>
                              <span className="font-semibold text-blue-900">{type.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Status */}
                      <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                        <h4 className="font-medium text-orange-900 mb-2">Status</h4>
                        <div className="space-y-2">
                          {statusData.map((status, idx) => (
                            <div key={idx} className="flex justify-between items-center">
                              <span className="text-sm text-orange-800">{status.status}</span>
                              <span className="font-semibold text-orange-900">{status.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })()}

      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="container mx-auto space-y-6 pb-8">
        {/* Compact Professional Header */}
        <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 shadow-xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                  <Car className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white drop-shadow-lg">
                    SM Dashboard
                  </h1>
                  <p className="text-blue-100 text-sm flex items-center gap-2 mt-0.5">
                    <Gauge className="h-3.5 w-3.5" />
                    {user?.city} • {user?.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden md:flex items-center gap-2 text-blue-100 text-sm bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm">
                  <Calendar className="h-4 w-4" />
                  {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </div>
                <Button
                  onClick={() => router.push("/dashboard/sm/upload")}
                  className="bg-white text-blue-700 hover:bg-blue-50 shadow-lg hover:shadow-xl transition-all h-10 px-5"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Data
                </Button>
              </div>
            </div>
            
            {/* Inline Data Selector */}
            <div className="mt-4 pt-4 border-t border-white/20">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-white" />
                <Select value={selectedDataType} onValueChange={(value) => setSelectedDataType(value as DataType)}>
                  <SelectTrigger className="flex-1 h-11 border-2 border-white/30 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-all">
                    <SelectValue placeholder="📊 Select data type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="average">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-purple-600" />
                        <span className="font-medium">Average of All Data</span>
                      </div>
                    </SelectItem>
                    {hasPermission("ro_billing_dashboard") && (
                    <SelectItem value="ro_billing">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span>RO Billing</span>
                      </div>
                    </SelectItem>
                    )}
                    {hasPermission("operations_dashboard") && (
                    <SelectItem value="operations">
                      <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-green-600" />
                        <span>Operations</span>
                      </div>
                    </SelectItem>
                    )}
                    {hasPermission("warranty_dashboard") && (
                    <SelectItem value="warranty">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-orange-600" />
                        <span>Warranty Claims</span>
                      </div>
                    </SelectItem>
                    )}
                    {hasPermission("service_booking_dashboard") && (
                    <SelectItem value="service_booking">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-emerald-600" />
                        <span>Service Booking</span>
                      </div>
                    </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Content */}
        {renderDataContent()}
      </div>
    </div>
  )
}