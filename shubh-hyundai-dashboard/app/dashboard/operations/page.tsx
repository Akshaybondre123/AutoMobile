"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, AlertCircle, FileText, DollarSign, CheckCircle, Trash2, Eye, Search, Calendar } from "lucide-react"
import { Input } from "@/components/ui/input"
import { getApiUrl } from "@/lib/config"
import { Badge } from "@/components/ui/badge"

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

export default function OperationsPage() {
  const { user } = useAuth()
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
        // Fetch RO Billing data to get unique advisors
        const response = await fetch(
          getApiUrl(`/api/service-manager/dashboard-data?uploadedBy=${user.email}&city=${user.city}&dataType=ro_billing`)
        )

        if (response.ok) {
          const data = await response.json()
          const uniqueAdvisors = [...new Set(data.data?.map((item: any) => item.serviceAdvisor) || [])]
            .filter(Boolean)
            .sort()
          setAdvisors(uniqueAdvisors)
        }

        // Fetch operations data
        await fetchOperationsData()
      } catch (err) {
        setError("Failed to load advisors")
        console.error("Error loading advisors:", err)
      } finally {
        setIsLoading(false)
      }
    }

    loadAdvisors()
  }, [user?.email, user?.city])

  // Fetch operations data
  const fetchOperationsData = async () => {
    if (!user?.email || !user?.city) return

    try {
      const response = await fetch(
        getApiUrl(`/api/service-manager/advisor-operations?uploadedBy=${user.email}&city=${user.city}&viewMode=${viewMode}`)
      )

      if (response.ok) {
        const data = await response.json()
        setOperationsData(Array.isArray(data.data) ? data.data : [])
      }
    } catch (err) {
      console.error("Error fetching operations data:", err)
    }
  }

  // Update operations data when view mode changes
  useEffect(() => {
    fetchOperationsData()
  }, [viewMode, user?.email, user?.city])

  // Handle file upload
  const handleFileUpload = async (advisorName: string, file: File) => {
    if (!user?.email || !user?.city) return

    setUploadingAdvisor(advisorName)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('advisorName', advisorName)
      formData.append('uploadedBy', user.email)
      formData.append('city', user.city)

      const response = await fetch(
        getApiUrl('/api/service-manager/upload-operations'),
        {
          method: 'POST',
          body: formData
        }
      )

      if (response.ok) {
        await fetchOperationsData() // Refresh data
      } else {
        setError("Failed to upload file")
      }
    } catch (err) {
      setError("Error uploading file")
      console.error("Upload error:", err)
    } finally {
      setUploadingAdvisor(null)
    }
  }

  // Delete operations data
  const handleDelete = async (advisorName: string) => {
    if (!user?.email || !user?.city) return

    try {
      const response = await fetch(
        getApiUrl(`/api/service-manager/advisor-operations?uploadedBy=${user.email}&city=${user.city}&advisorName=${encodeURIComponent(advisorName)}`),
        {
          method: 'DELETE'
        }
      )

      if (response.ok) {
        await fetchOperationsData() // Refresh data
      } else {
        setError("Failed to delete data")
      }
    } catch (err) {
      setError("Error deleting data")
      console.error("Delete error:", err)
    }
  }

  // Filter advisors based on search
  const filteredAdvisors = advisors.filter(advisor =>
    advisor.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Get operations data for specific advisor
  const getAdvisorOperations = (advisorName: string) => {
    return operationsData.find(op => op.advisorName === advisorName)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Advisor Operations Upload</h1>
          <p className="text-gray-600">Upload operations data for each service advisor</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'cumulative' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('cumulative')}
            >
              Cumulative
            </Button>
            <Button
              variant={viewMode === 'specific' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('specific')}
            >
              Specific Date
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Service Advisors</CardTitle>
              <CardDescription>Upload operations data for each advisor</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <Input
                placeholder="Search advisors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading advisors...</p>
            </div>
          ) : filteredAdvisors.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No advisors found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAdvisors.map((advisor) => {
                const operations = getAdvisorOperations(advisor)
                return (
                  <div key={advisor} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold">
                            {advisor.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold">{advisor}</h3>
                          {operations && (
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>Uploaded: {operations.uploadDate || 'Unknown'}</span>
                              <span>Data Date: {operations.dataDate || 'Unknown'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {operations && (
                          <div className="text-right">
                            <p className="text-lg font-semibold text-green-600">
                              ₹{(operations.totalMatchedAmount / 100000).toFixed(2)}L
                            </p>
                            <p className="text-sm text-gray-600">
                              {operations.matchedOperations?.length || 0} operations
                            </p>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            ref={(el) => fileInputRefs.current[advisor] = el}
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleFileUpload(advisor, file)
                            }}
                            accept=".xlsx,.xls"
                            className="hidden"
                          />
                          
                          <Button
                            size="sm"
                            onClick={() => fileInputRefs.current[advisor]?.click()}
                            disabled={uploadingAdvisor === advisor}
                          >
                            {uploadingAdvisor === advisor ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            ) : (
                              <Upload className="h-4 w-4 mr-2" />
                            )}
                            {uploadingAdvisor === advisor ? 'Uploading...' : 'Upload'}
                          </Button>
                          
                          {operations && (
                            <>
                              <Button size="sm" variant="outline">
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleDelete(advisor)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {operations?.matchedOperations && operations.matchedOperations.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="font-medium mb-2">Matched Operations</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {operations.matchedOperations.slice(0, 8).map((op, idx) => (
                            <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                              <span className="text-sm truncate">{op.operation}</span>
                              <span className="text-sm font-medium text-green-600 ml-2">
                                ₹{(op.amount / 100000).toFixed(2)}L
                              </span>
                            </div>
                          ))}
                          {operations.matchedOperations.length > 8 && (
                            <div className="text-sm text-gray-500 p-2">
                              +{operations.matchedOperations.length - 8} more...
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
