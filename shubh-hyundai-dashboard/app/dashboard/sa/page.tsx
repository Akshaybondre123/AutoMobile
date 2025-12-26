"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useDashboardData } from "@/hooks/useDashboardData"
import { getApiUrl } from "@/lib/config"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Calendar, FileText, TrendingUp, Users, CheckCircle, XCircle, Clock, Car, AlertCircle } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface BookingData {
  _id?: string
  booking_number?: string
  bt_number?: string
  customer_name?: string
  Reg_No?: string
  vehicle_number?: string
  vin_number?: string
  vin?: string
  service_advisor?: string
  bt_date_time?: string
  appointment_date?: string
  booking_date?: string
  service_type?: string
  booking_status?: string
  status?: string
  estimated_cost?: number
  actual_cost?: number
  work_type?: string
  vinMatchStatus?: string
  isMatched?: boolean
  vin_matched?: boolean
  computed_status?: string
  status_category?: string
  [key: string]: any
}

export default function ServiceAdvisorDashboard() {
  const { user, isLoading: authLoading } = useAuth()
  const [selectedDate, setSelectedDate] = useState<string>("latest")
  
  // Fetch service booking data for this advisor
  const {
    data: dashboardData,
    isLoading,
    error,
    hasData,
    refreshData
  } = useDashboardData({
    dataType: "service_booking",
    autoFetch: true,
    backgroundRevalidation: true
  })

  // Calculate summary metrics
  const calculateMetrics = () => {
    if (!dashboardData?.data || !Array.isArray(dashboardData.data)) {
      return {
        totalBookings: 0,
        totalRevenue: 0,
        completedBookings: 0,
        pendingBookings: 0,
        averageBookingValue: 0,
        matchedVINs: 0,
        unmatchedVINs: 0
      }
    }

    const bookings = dashboardData.data as BookingData[]
    const totalBookings = bookings.length
    const totalRevenue = bookings.reduce((sum, b) => {
      const cost = Number(b.actual_cost) || Number(b.estimated_cost) || Number(b.estimated_amount) || 0
      return sum + cost
    }, 0)
    const completedBookings = bookings.filter(b => {
      const status = (b.booking_status || b.status || '').toLowerCase()
      return status === 'completed' || status === 'done' || status === 'closed' || status === 'close'
    }).length
    const pendingBookings = totalBookings - completedBookings
    const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0

    // Calculate VIN matching stats
    const vinMatching = dashboardData.vinMatching || {}
    const matchedVINs = vinMatching.matchedVINs || 0
    const unmatchedVINs = vinMatching.unmatchedVINs || 0

    return {
      totalBookings,
      totalRevenue,
      completedBookings,
      pendingBookings,
      averageBookingValue,
      matchedVINs,
      unmatchedVINs
    }
  }

  const metrics = calculateMetrics()
  const bookings = (dashboardData?.data as BookingData[]) || []
  const vinMatching = dashboardData?.vinMatching || {}

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Format number
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num)
  }

  // Format date - handles multiple date field formats
  const formatDate = (booking: BookingData) => {
    const dateStr = booking.bt_date_time || booking.appointment_date || booking.booking_date || ''
    if (!dateStr) return 'N/A'
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) {
        return dateStr
      }
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    } catch {
      return dateStr || 'N/A'
    }
  }

  // Get status badge color
  const getStatusColor = (booking: BookingData) => {
    const status = (booking.booking_status || booking.status || '').toLowerCase()
    if (status.includes('completed') || status.includes('done') || status.includes('closed') || status === 'close') {
      return 'bg-green-100 text-green-800'
    }
    if (status.includes('pending') || status.includes('in progress') || status === 'open') {
      return 'bg-yellow-100 text-yellow-800'
    }
    if (status.includes('cancelled') || status.includes('canceled') || status === 'cancel') {
      return 'bg-red-100 text-red-800'
    }
    return 'bg-gray-100 text-gray-800'
  }
  
  // Get status display text
  const getStatusText = (booking: BookingData) => {
    return booking.booking_status || booking.status || 'Unknown'
  }
  
  // Get vehicle number
  const getVehicleNumber = (booking: BookingData) => {
    return booking.Reg_No || booking.vehicle_number || 'N/A'
  }
  
  // Get VIN
  const getVIN = (booking: BookingData) => {
    return booking.vin_number || booking.vin || 'N/A'
  }
  
  // Get booking number
  const getBookingNumber = (booking: BookingData) => {
    return booking.bt_number || booking.booking_number || 'N/A'
  }
  
  // Get amount
  const getAmount = (booking: BookingData) => {
    return Number(booking.actual_cost) || Number(booking.estimated_cost) || Number(booking.estimated_amount) || 0
  }

  // Check if VIN is matched (from backend VIN matching service)
  const isVINMatched = (booking: BookingData) => {
    // Backend adds vin_matched field during VIN matching
    return booking.vin_matched === true
  }

  // Group bookings by work type
  const groupByWorkType = () => {
    const grouped: Record<string, BookingData[]> = {}
    bookings.forEach(booking => {
      const workType = booking.work_type || 'Unknown'
      if (!grouped[workType]) {
        grouped[workType] = []
      }
      grouped[workType].push(booking)
    })
    return grouped
  }

  const workTypeGroups = groupByWorkType()

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg font-semibold text-red-600">Please log in to view your dashboard</p>
        </div>
      </div>
    )
  }

  const conversionRate = metrics.totalBookings > 0 
    ? Math.round((metrics.matchedVINs / metrics.totalBookings) * 100) 
    : 0

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Service Bookings</h1>
        <p className="text-muted-foreground mt-2">
          Welcome, <span className="font-semibold">{user.name}</span> - View your booking data and performance
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
              <XCircle className="h-5 w-5" />
              <p className="font-medium">Error loading data: {error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalBookings}</div>
            <p className="text-xs text-muted-foreground">All time bookings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">From all bookings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.completedBookings}</div>
            <p className="text-xs text-muted-foreground">Completed bookings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{metrics.pendingBookings}</div>
            <p className="text-xs text-muted-foreground">Pending bookings</p>
          </CardContent>
        </Card>
      </div>

      {/* VIN Matching Summary Card */}
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-white to-blue-50/30 shadow-lg">
          <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <Car className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-blue-900">VIN Matching Summary</CardTitle>
              <CardDescription>Service booking analysis with VIN matching status</CardDescription>
            </div>
          </div>
          </CardHeader>
          <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border border-blue-200 shadow-sm">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{vinMatching.totalBookings || metrics.totalBookings || 0}</p>
                <p className="text-sm text-blue-700 font-medium">Total Bookings</p>
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200 shadow-sm">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{vinMatching.matchedVINs || metrics.matchedVINs || 0}</p>
                <p className="text-sm text-green-700 font-medium">Matched with RO</p>
                <p className="text-xs text-green-600">VIN Found</p>
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 shadow-sm">
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{vinMatching.unmatchedVINs || metrics.unmatchedVINs || 0}</p>
                <p className="text-sm text-orange-700 font-medium">Unmatched</p>
                <p className="text-xs text-orange-600">No RO Found</p>
              </div>
            </div>
          </div>
          {metrics.totalBookings > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Conversion Rate</span>
                <span className="text-2xl font-bold text-blue-600">{conversionRate}%</span>
              </div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all"
                  style={{ width: `${conversionRate}%` }}
                ></div>
              </div>
            </div>
          )}
          </CardContent>
        </Card>

      {/* Work Type Breakdown */}
      {Object.keys(workTypeGroups).length > 0 && (
        <Card className="border-2 border-emerald-200 bg-gradient-to-br from-white to-emerald-50/30 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100 p-2">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-emerald-900">Work Type Breakdown</CardTitle>
                <CardDescription>Bookings grouped by work type</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(workTypeGroups).map(([workType, typeBookings]) => {
                const matched = typeBookings.filter(b => isVINMatched(b)).length
                const conversionRate = typeBookings.length > 0 
                  ? Math.round((matched / typeBookings.length) * 100) 
                  : 0
                
                return (
                  <div key={workType} className="p-4 bg-white rounded-lg border border-gray-200 hover:border-emerald-300 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-gray-900">{workType}</h3>
                      <Badge variant="outline">{typeBookings.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Total:</span>
                        <span className="font-semibold">{formatNumber(typeBookings.length)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-green-600">Matched:</span>
                        <span className="font-semibold text-green-700">{formatNumber(matched)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-orange-600">Unmatched:</span>
                        <span className="font-semibold text-orange-700">{formatNumber(typeBookings.length - matched)}</span>
                      </div>
                      <div className="pt-2 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Conversion:</span>
                          <span className={`text-sm font-bold ${
                            conversionRate >= 80 ? 'text-green-600' :
                            conversionRate >= 60 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {conversionRate}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bookings Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>My Bookings</CardTitle>
              <CardDescription>
                {bookings.length} booking{bookings.length !== 1 ? 's' : ''} found
              </CardDescription>
            </div>
            <button
              onClick={() => refreshData()}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 inline animate-spin mr-2" />
                  Refreshing...
                </>
              ) : (
                'Refresh'
              )}
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && !hasData ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mr-3" />
              <p className="text-gray-600">Loading your bookings...</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-600">No bookings found</p>
              <p className="text-sm text-gray-500 mt-2">
                Your bookings will appear here once data is uploaded
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking #</TableHead>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Vehicle Number</TableHead>
                    <TableHead>VIN</TableHead>
                    <TableHead>Booking Date</TableHead>
                    <TableHead>Service Type</TableHead>
                    <TableHead>Work Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">VIN Match</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking, index) => {
                    const matched = isVINMatched(booking)
                    return (
                      <TableRow key={booking._id || booking.bt_number || booking.booking_number || index}>
                        <TableCell className="font-medium">
                          {getBookingNumber(booking)}
                        </TableCell>
                        <TableCell>{booking.customer_name || 'N/A'}</TableCell>
                        <TableCell>{getVehicleNumber(booking)}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {getVIN(booking)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-gray-400" />
                            {formatDate(booking)}
                          </div>
                        </TableCell>
                        <TableCell>{booking.service_type || 'N/A'}</TableCell>
                        <TableCell>{booking.work_type || 'N/A'}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking)}`}>
                            {getStatusText(booking)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {matched ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Matched
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-orange-50 text-orange-800 border-orange-200">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Unmatched
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(getAmount(booking))}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      {dashboardData?.summary && (
      <Card>
        <CardHeader>
            <CardTitle>Summary Statistics</CardTitle>
            <CardDescription>Overall booking statistics</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Bookings</p>
                <p className="text-2xl font-bold">{dashboardData.summary.totalBookings || metrics.totalBookings || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Matched with RO</p>
                <p className="text-2xl font-bold text-green-600">
                  {dashboardData.summary.matchedCount || vinMatching.matchedVINs || metrics.matchedVINs || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unmatched</p>
                <p className="text-2xl font-bold text-orange-600">
                  {dashboardData.summary.unmatchedCount || vinMatching.unmatchedVINs || metrics.unmatchedVINs || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Match Rate</p>
                <p className="text-2xl font-bold text-blue-600">
                  {conversionRate}%
                </p>
              </div>
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  )
}
