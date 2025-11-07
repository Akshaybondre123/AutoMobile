"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, AlertCircle, FileText, DollarSign, BarChart3, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"

export default function OperationsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<any[]>([])
  const [filteredData, setFilteredData] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      if (!user?.email || !user?.city) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(
          `http://localhost:5000/api/service-manager/dashboard-data?uploadedBy=${user.email}&city=${user.city}&dataType=operations`
        )

        if (!response.ok) {
          throw new Error("Failed to fetch data")
        }

        const result = await response.json()
        const dataArray = Array.isArray(result.data) ? result.data : []
        setData(dataArray)
        setFilteredData(dataArray)
      } catch (err) {
        setError("Failed to load data. Please try again.")
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [user?.email, user?.city])

  // Search filter effect
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredData(data)
      return
    }

    const filtered = data.filter((record) => {
      const searchLower = searchTerm.toLowerCase()
      return (
        record.opPartDescription?.toLowerCase().includes(searchLower) ||
        record.count?.toString().includes(searchLower) ||
        record.amount?.toString().includes(searchLower)
      )
    })
    setFilteredData(filtered)
  }, [searchTerm, data])

  if (user?.role !== "service_manager") {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <p className="text-lg font-semibold">Access Denied</p>
        <p className="text-muted-foreground">Only Service Managers can access this page</p>
      </div>
    )
  }

  const totalAmount = data.reduce((sum, row) => sum + (row.amount || 0), 0)
  const totalCount = data.reduce((sum, row) => sum + (row.count || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Operations Report</h1>
          <p className="text-muted-foreground mt-2">View operations data for {user?.city}</p>
        </div>
        <Button onClick={() => router.push("/dashboard/sm/upload")} className="bg-blue-600 hover:bg-blue-700">
          <Upload className="mr-2 h-4 w-4" />
          Upload Data
        </Button>
      </div>


      {/* Data Table */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Operations Records</CardTitle>
              <CardDescription>
                {filteredData.length} of {data.length} records
                {searchTerm && ` (filtered by "${searchTerm}")`}
              </CardDescription>
            </div>
          </div>
          {/* Search Bar */}
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by description, count, or amount..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 border-2 border-gray-300 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
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
                    <th className="text-left py-3 px-4 font-semibold">OP/Part Description</th>
                    <th className="text-right py-3 px-4 font-semibold">Count</th>
                    <th className="text-right py-3 px-4 font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((record, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">{record.opPartDescription}</td>
                      <td className="text-right py-3 px-4">{record.count}</td>
                      <td className="text-right py-3 px-4 font-semibold">₹{record.amount?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
