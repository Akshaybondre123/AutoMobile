"use client"

import React, { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { usePermissions } from "@/hooks/usePermissions"
import { getAllCities } from "@/lib/api"
import { useDashboardData } from "@/hooks/useDashboardData"
import { getApiUrl } from "@/lib/config"
import { useAppSelector, useAppDispatch } from "@/lib/store/hooks"
import { addTarget, CityTarget } from "@/lib/store/slices/targetsSlice"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card"
import { 
  Button 
} from "@/components/ui/button"
import { 
  Input 
} from "@/components/ui/input"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Badge 
} from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Progress
} from "@/components/ui/progress"
import { 
  AlertCircle, 
  Loader2,
  Target,
  TrendingUp,
  DollarSign,
  Truck,
  CheckCircle,
  Calendar,
  BarChart3,
  X,
  Check,
  AlertTriangle,
  Users,
  Wrench,
  Package,
  Car,
  ShieldCheck,
  Download
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"


type Achievement = {
  achievedLabour: number
  achievedParts: number
  achievedTotalVehicles: number
  achievedPaidService: number
  achievedFreeService: number
  achievedRR: number
  roData: any[]
  bookingData: any[]
  warrantyData: any[]
}

export default function GMFieldTargetsPage() {
  const { user } = useAuth()
  const { hasPermission } = usePermissions()
  const dispatch = useAppDispatch()
  const targets = useAppSelector((state) => state.targets.targets)
  const [cities, setCities] = useState<string[]>([])
  const [city, setCity] = useState("")
  const [month, setMonth] = useState(new Date().toLocaleString("default", { month: "long", year: "numeric" }))
  const [form, setForm] = useState({ 
    labour: "", 
    parts: "", 
    totalVehicles: "", 
    paidService: "", 
    freeService: "", 
    rr: "" 
  })
  const [isLoading, setIsLoading] = useState(false)
  const [citiesLoading, setCitiesLoading] = useState(true)
  const [computingAchievement, setComputingAchievement] = useState<string | null>(null)
  const [achievementDialogOpen, setAchievementDialogOpen] = useState(false)
  const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null)
  const [currentTarget, setCurrentTarget] = useState<CityTarget | null>(null)

  // Fetch cities from database
  useEffect(() => {
    const fetchCities = async () => {
      try {
        setCitiesLoading(true)
        console.log('🔄 Fetching cities from API...')
        const citiesList = await getAllCities()
        console.log('✅ Cities fetched:', citiesList)
        
        if (citiesList && citiesList.length > 0) {
          setCities(citiesList)
          setCity(citiesList[0])
        } else {
          console.warn('⚠️ No cities from API, using fallback')
          const fallbackCities = ['Palanpur', 'Patan']
          setCities(fallbackCities)
          setCity(fallbackCities[0])
        }
      } catch (error) {
        console.error('❌ Error fetching cities:', error)
        const fallbackCities = ['Palanpur', 'Patan']
        setCities(fallbackCities)
        setCity(fallbackCities[0])
      } finally {
        setCitiesLoading(false)
      }
    }
    fetchCities()
  }, [])


  if (!hasPermission('target_report') && !hasPermission('manage_users') && !hasPermission('manage_roles') && user?.role !== "owner") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/50">
        <div className="text-center py-12 max-w-md mx-auto">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-lg text-muted-foreground mb-4">Currently, you have not been assigned any role.</p>
          <p className="text-sm text-muted-foreground">Please contact your admin for role assignment.</p>
        </div>
      </div>
    )
  }

  const saveTargets = () => {
    const newTarget: CityTarget = {
      id: `ct-${Date.now()}`,
      city,
      month,
      labour: Number(form.labour) || 0,
      parts: Number(form.parts) || 0,
      totalVehicles: Number(form.totalVehicles) || 0,
      paidService: Number(form.paidService) || 0,
      freeService: Number(form.freeService) || 0,
      rr: Number(form.rr) || 0,
      createdBy: user?.id || "gm",
      createdAt: new Date().toISOString(),
    }

    dispatch(addTarget(newTarget))
    setForm({ labour: "", parts: "", totalVehicles: "", paidService: "", freeService: "", rr: "" })
  }

  const computeAchievement = async (t: CityTarget): Promise<Achievement> => {
    setComputingAchievement(t.id)
    try {
      console.log('🔄 Computing achievement for:', { city: t.city, month: t.month })
      
      // Normalize city name (handle abbreviations like "Ptn" -> "Patan")
      const normalizeCity = (city: string): string => {
        const cityMap: Record<string, string> = {
          'ptn': 'Patan',
          'pln': 'Palanpur',
          'pune': 'Pune',
          'mum': 'Mumbai',
          'mumbai': 'Mumbai',
          'nag': 'Nagpur',
          'nagpur': 'Nagpur'
        }
        const normalized = city.toLowerCase().trim()
        return cityMap[normalized] || city
      }
      
      const normalizedCity = normalizeCity(t.city)
      console.log('📍 Normalized city:', t.city, '→', normalizedCity)
      
      // Fetch all cities data first (don't filter by city in query), then extract the specific city
      // This ensures we get data even if city name doesn't match exactly in the query
      const response = await fetch(getApiUrl(`/api/service-manager/gm-dashboard-data?dataType=average`), {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        console.error('❌ Failed to fetch GM dashboard data:', response.status)
        throw new Error(`Failed to fetch data: ${response.status}`)
      }

      const result = await response.json()
      console.log('📊 GM Dashboard API response (full):', JSON.stringify(result, null, 2))
      console.log('📊 Available cities in citiesData:', result.citiesData ? Object.keys(result.citiesData) : 'no citiesData')
      console.log('📊 Looking for city:', t.city)

      // Extract city-specific data from citiesData structure
      // Try different city name variations (case-insensitive, normalized)
      let cityData = null
      const cityKeys = result.citiesData ? Object.keys(result.citiesData) : []
      
      // Find matching city (case-insensitive) - try normalized first, then original
      const cityVariations = [normalizedCity, t.city]
      let matchingCityKey: string | undefined = undefined
      
      for (const cityVar of cityVariations) {
        matchingCityKey = cityKeys.find(key => 
          key.toLowerCase().trim() === cityVar.toLowerCase().trim()
        )
        if (matchingCityKey) {
          console.log(`✅ Found city data for: "${matchingCityKey}" (searched for: "${cityVar}")`)
          break
        }
      }
      
      if (matchingCityKey) {
        cityData = result.citiesData[matchingCityKey]
      } else {
        console.warn('⚠️ City not found in citiesData. Available cities:', cityKeys)
        console.warn('⚠️ Searched for:', cityVariations)
        // If no citiesData or empty, try overallMetrics as fallback
        if (result.overallMetrics && cityKeys.length === 0) {
          console.log('⚠️ No citiesData, using overallMetrics as fallback')
          // Use overallMetrics if available (all cities combined)
          cityData = {
            ro_billing: {
              totalLabour: result.overallMetrics.totalRevenue || 0, // Approximation
              totalParts: 0,
              roCount: result.overallMetrics.totalROs || 0
            },
            service_booking: {
              totalBookings: result.overallMetrics.totalBookings || 0
            },
            warranty: {
              totalClaims: result.overallMetrics.totalWarrantyClaims || 0
            }
          }
        } else if (cityKeys.length > 0) {
          // Use first available city as fallback
          cityData = result.citiesData[cityKeys[0]]
          console.log('⚠️ Using fallback city:', cityKeys[0])
        }
      }
      
      const roBilling = cityData?.ro_billing || {}
      const serviceBooking = cityData?.service_booking || {}
      const warranty = cityData?.warranty || {}

      console.log('📊 City data extracted:', { 
        cityData, 
        roBilling, 
        serviceBooking, 
        warranty,
        roBillingKeys: Object.keys(roBilling),
        serviceBookingKeys: Object.keys(serviceBooking),
        warrantyKeys: Object.keys(warranty)
      })

      // Get totals directly from aggregated stats
      const achievedLabour = roBilling.totalLabour || 0
      const achievedParts = roBilling.totalParts || 0
      const achievedTotalVehicles = roBilling.roCount || 0
      
      // For paid service, we use total ROs as a proxy (since we don't have exact paid/free breakdown in aggregated stats)
      // This is an approximation - in reality, paid service should be ROs with totalAmount > 0
      const achievedPaidService = achievedTotalVehicles // Approximation: all ROs are considered "paid service"
      
      // For free service, we use service booking count as proxy
      const achievedFreeService = serviceBooking.totalBookings || 0
      
      // R&R cases are warranty claims
      const achievedRR = warranty.totalClaims || 0

      console.log('✅ Achievements calculated from aggregated stats:', {
        achievedLabour,
        achievedParts,
        achievedTotalVehicles,
        achievedPaidService,
        achievedFreeService,
        achievedRR
      })

      // Create placeholder arrays for data (since we're using aggregated stats)
      // These are used for display purposes only
      const roData = Array(achievedTotalVehicles).fill(null).map((_, i) => ({
        id: `ro-${i}`,
        labourCost: achievedTotalVehicles > 0 ? achievedLabour / achievedTotalVehicles : 0,
        partsCost: achievedTotalVehicles > 0 ? achievedParts / achievedTotalVehicles : 0,
        totalAmount: achievedTotalVehicles > 0 ? (achievedLabour + achievedParts) / achievedTotalVehicles : 0,
        status: 'completed'
      }))

      const bookingData = Array(achievedFreeService).fill(null).map((_, i) => ({
        id: `book-${i}`,
        actualCost: 0
      }))

      const warrantyData = Array(achievedRR).fill(null).map((_, i) => ({
        id: `warr-${i}`
      }))

      return {
        achievedLabour,
        achievedParts,
        achievedTotalVehicles,
        achievedPaidService,
        achievedFreeService,
        achievedRR,
        roData,
        bookingData,
        warrantyData
      }
    } catch (error) {
      console.error('❌ Error computing achievement:', error)
      return {
        achievedLabour: 0,
        achievedParts: 0,
        achievedTotalVehicles: 0,
        achievedPaidService: 0,
        achievedFreeService: 0,
        achievedRR: 0,
        roData: [],
        bookingData: [],
        warrantyData: []
      }
    } finally {
      setComputingAchievement(null)
    }
  }

  const getProgressColor = (achieved: number, target: number) => {
    if (target === 0) return "bg-gray-200"
    const percentage = (achieved / target) * 100
    if (percentage >= 100) return "bg-green-500"
    if (percentage >= 80) return "bg-yellow-500"
    if (percentage >= 50) return "bg-orange-500"
    return "bg-red-500"
  }

  const getStatus = (achieved: number, target: number) => {
    if (target === 0) return { text: "Not Set", color: "text-gray-500" }
    const percentage = (achieved / target) * 100
    if (percentage >= 100) return { text: "Exceeded", color: "text-green-600" }
    if (percentage >= 80) return { text: "On Track", color: "text-green-500" }
    if (percentage >= 50) return { text: "Needs Attention", color: "text-yellow-600" }
    return { text: "At Risk", color: "text-red-600" }
  }

  const handleViewAchievement = async (target: CityTarget) => {
    setCurrentTarget(target)
    const achievement = await computeAchievement(target)
    setCurrentAchievement(achievement)
    setAchievementDialogOpen(true)
  }

  const exportToCSV = () => {
    if (!currentTarget || !currentAchievement) return
    
    const data = [
      ["Category", "Target", "Achieved", "Percentage", "Status"],
      ["Labour", currentTarget.labour, currentAchievement.achievedLabour, 
       ((currentAchievement.achievedLabour / currentTarget.labour) * 100 || 0).toFixed(2) + "%", 
       getStatus(currentAchievement.achievedLabour, currentTarget.labour).text],
      ["Parts", currentTarget.parts, currentAchievement.achievedParts, 
       ((currentAchievement.achievedParts / currentTarget.parts) * 100 || 0).toFixed(2) + "%", 
       getStatus(currentAchievement.achievedParts, currentTarget.parts).text],
      ["Total Vehicles", currentTarget.totalVehicles, currentAchievement.achievedTotalVehicles, 
       ((currentAchievement.achievedTotalVehicles / currentTarget.totalVehicles) * 100 || 0).toFixed(2) + "%", 
       getStatus(currentAchievement.achievedTotalVehicles, currentTarget.totalVehicles).text],
      ["Paid Service", currentTarget.paidService, currentAchievement.achievedPaidService, 
       ((currentAchievement.achievedPaidService / currentTarget.paidService) * 100 || 0).toFixed(2) + "%", 
       getStatus(currentAchievement.achievedPaidService, currentTarget.paidService).text],
      ["Free Service", currentTarget.freeService, currentAchievement.achievedFreeService, 
       ((currentAchievement.achievedFreeService / currentTarget.freeService) * 100 || 0).toFixed(2) + "%", 
       getStatus(currentAchievement.achievedFreeService, currentTarget.freeService).text],
      ["R&R Cases", currentTarget.rr, currentAchievement.achievedRR, 
       ((currentAchievement.achievedRR / currentTarget.rr) * 100 || 0).toFixed(2) + "%", 
       getStatus(currentAchievement.achievedRR, currentTarget.rr).text],
    ]
    
    const csvContent = data.map(row => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `achievement-${currentTarget.city}-${currentTarget.month}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="container mx-auto py-8 px-4 lg:px-0 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">GM Field Targets</h1>
              <p className="text-muted-foreground">Assign and track Labour, Parts, and Service targets per city</p>
            </div>
          </div>
        </div>
        <Badge variant="secondary" className="text-sm px-4 py-2">
          {targets.length} Target{targets.length !== 1 ? 's' : ''} Active
        </Badge>
      </div>

      {/* Create Target Form */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Create New City Target
          </CardTitle>
          <CardDescription>Set monthly targets for your field teams</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Select value={city} onValueChange={setCity} disabled={citiesLoading}>
                <SelectTrigger id="city" className="w-full">
                  {citiesLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading cities...</span>
                    </div>
                  ) : (
                    <SelectValue placeholder="Select city" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {cities.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="month">Target Month</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="month"
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { key: 'labour', label: 'Labour ₹', icon: DollarSign },
              { key: 'parts', label: 'Parts ₹', icon: DollarSign },
              { key: 'totalVehicles', label: 'Vehicles', icon: Truck },
              { key: 'paidService', label: 'Paid Svc', icon: CheckCircle },
              { key: 'freeService', label: 'Free Svc', icon: CheckCircle },
              { key: 'rr', label: 'R&R', icon: Target }
            ].map(({ key, label, icon: Icon }) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</Label>
                <div className="relative">
                  <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="0"
                    value={form[key as keyof typeof form] as string}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end mt-8">
            <Button 
              onClick={saveTargets} 
              size="lg" 
              className="px-8 gap-2 font-semibold"
              disabled={!city || citiesLoading}
            >
              <Target className="h-4 w-4" />
              Save Target
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Targets Table */}
      {targets.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              Assigned Field Targets
            </CardTitle>
            <CardDescription>Track achievement against set targets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b-2 border-border">
                    <TableHead className="w-32 font-semibold">City</TableHead>
                    <TableHead className="w-24 font-semibold">Month</TableHead>
                    <TableHead className="text-right font-semibold">Labour</TableHead>
                    <TableHead className="text-right font-semibold">Parts</TableHead>
                    <TableHead className="text-right font-semibold">Vehicles</TableHead>
                    <TableHead className="text-right font-semibold">Paid</TableHead>
                    <TableHead className="text-right font-semibold">Free</TableHead>
                    <TableHead className="text-right font-semibold">R&R</TableHead>
                    <TableHead className="text-center w-32 font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {targets.map((t) => (
                    <TableRow key={t.id} className="hover:bg-accent/50 border-b transition-all duration-200">
                      <TableCell className="font-medium">{t.city}</TableCell>
                      <TableCell>{t.month}</TableCell>
                      <TableCell className="text-right font-mono text-lg font-semibold text-primary">₹{t.labour.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-lg font-semibold text-primary">₹{t.parts.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-lg font-semibold">{t.totalVehicles.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-lg font-semibold">{t.paidService}</TableCell>
                      <TableCell className="text-right font-mono text-lg font-semibold">{t.freeService}</TableCell>
                      <TableCell className="text-right font-mono text-lg font-semibold">{t.rr}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewAchievement(t)}
                          disabled={computingAchievement === t.id}
                          className="gap-1.5"
                        >
                          {computingAchievement === t.id ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Computing...
                            </>
                          ) : (
                            <>
                              <BarChart3 className="h-3 w-3" />
                              View Achievement
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Achievement Dialog */}
      <Dialog open={achievementDialogOpen} onOpenChange={setAchievementDialogOpen}>
      <DialogContent
  className="w-[129vw] md:w-[125vw] max-w-[19vw] md:max-w-[65vw] max-h-[90vh] overflow-y-auto"
>






          {currentTarget && currentAchievement && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <BarChart3 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <DialogTitle className="text-2xl">
                        Achievement Report: {currentTarget.city}
                      </DialogTitle>
                      <DialogDescription>
                        {currentTarget.month} • Generated on {new Date().toLocaleDateString()}
                      </DialogDescription>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportToCSV}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
              </DialogHeader>

              <Separator className="my-4" />

              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview" className="gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="details" className="gap-2">
                    <Users className="h-4 w-4" />
                    Details
                  </TabsTrigger>
                  <TabsTrigger value="breakdown" className="gap-2">
                    <Package className="h-4 w-4" />
                    Breakdown
                  </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[
                      {
                        title: "Labour",
                        icon: DollarSign,
                        target: currentTarget.labour,
                        achieved: currentAchievement.achievedLabour,
                        color: "bg-blue-500",
                        unit: "₹"
                      },
                      {
                        title: "Parts",
                        icon: Package,
                        target: currentTarget.parts,
                        achieved: currentAchievement.achievedParts,
                        color: "bg-green-500",
                        unit: "₹"
                      },
                      {
                        title: "Total Vehicles",
                        icon: Truck,
                        target: currentTarget.totalVehicles,
                        achieved: currentAchievement.achievedTotalVehicles,
                        color: "bg-purple-500",
                        unit: ""
                      },
                      {
                        title: "Paid Service",
                        icon: CheckCircle,
                        target: currentTarget.paidService,
                        achieved: currentAchievement.achievedPaidService,
                        color: "bg-emerald-500",
                        unit: ""
                      },
                      {
                        title: "Free Service",
                        icon: CheckCircle,
                        target: currentTarget.freeService,
                        achieved: currentAchievement.achievedFreeService,
                        color: "bg-cyan-500",
                        unit: ""
                      },
                      {
                        title: "R&R Cases",
                        icon: ShieldCheck,
                        target: currentTarget.rr,
                        achieved: currentAchievement.achievedRR,
                        color: "bg-amber-500",
                        unit: ""
                      },
                    ].map((item, index) => {
                      const percentage = item.target > 0 
                        ? Math.min((item.achieved / item.target) * 100, 100)
                        : 0
                      const status = getStatus(item.achieved, item.target)
                      
                      return (
                        <Card key={index} className="border shadow-sm">
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 ${item.color.replace('bg-', 'bg-').replace('500', '100')} rounded-lg`}>
                                  <item.icon className={`h-5 w-5 ${item.color.replace('bg-', 'text-')}`} />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground">{item.title}</p>
                                  <p className="text-2xl font-bold">
                                    {item.unit}{item.achieved.toLocaleString()}
                                    <span className="text-sm font-normal text-muted-foreground ml-2">
                                      / {item.unit}{item.target.toLocaleString()}
                                    </span>
                                  </p>
                                </div>
                              </div>
                              <Badge variant="outline" className={status.color}>
                                {status.text}
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Progress</span>
                                <span className="font-semibold">{percentage.toFixed(1)}%</span>
                              </div>
                              <Progress value={percentage} className="h-2" />
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>

                  {/* Summary Card */}
                  <Card className="border shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Performance Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="text-center p-4 bg-green-50 rounded-lg border">
                          <div className="text-2xl font-bold text-green-600">
                            {Object.values({
                              labour: getStatus(currentAchievement.achievedLabour, currentTarget.labour).text === "Exceeded" || getStatus(currentAchievement.achievedLabour, currentTarget.labour).text === "On Track",
                              parts: getStatus(currentAchievement.achievedParts, currentTarget.parts).text === "Exceeded" || getStatus(currentAchievement.achievedParts, currentTarget.parts).text === "On Track",
                              vehicles: getStatus(currentAchievement.achievedTotalVehicles, currentTarget.totalVehicles).text === "Exceeded" || getStatus(currentAchievement.achievedTotalVehicles, currentTarget.totalVehicles).text === "On Track",
                              paid: getStatus(currentAchievement.achievedPaidService, currentTarget.paidService).text === "Exceeded" || getStatus(currentAchievement.achievedPaidService, currentTarget.paidService).text === "On Track",
                              free: getStatus(currentAchievement.achievedFreeService, currentTarget.freeService).text === "Exceeded" || getStatus(currentAchievement.achievedFreeService, currentTarget.freeService).text === "On Track",
                              rr: getStatus(currentAchievement.achievedRR, currentTarget.rr).text === "Exceeded" || getStatus(currentAchievement.achievedRR, currentTarget.rr).text === "On Track"
                            }).filter(Boolean).length}
                          </div>
                          <p className="text-sm text-muted-foreground">Targets On Track</p>
                        </div>
                        <div className="text-center p-4 bg-amber-50 rounded-lg border">
                          <div className="text-2xl font-bold text-amber-600">
                            {Object.values({
                              labour: getStatus(currentAchievement.achievedLabour, currentTarget.labour).text === "Needs Attention",
                              parts: getStatus(currentAchievement.achievedParts, currentTarget.parts).text === "Needs Attention",
                              vehicles: getStatus(currentAchievement.achievedTotalVehicles, currentTarget.totalVehicles).text === "Needs Attention",
                              paid: getStatus(currentAchievement.achievedPaidService, currentTarget.paidService).text === "Needs Attention",
                              free: getStatus(currentAchievement.achievedFreeService, currentTarget.freeService).text === "Needs Attention",
                              rr: getStatus(currentAchievement.achievedRR, currentTarget.rr).text === "Needs Attention"
                            }).filter(Boolean).length}
                          </div>
                          <p className="text-sm text-muted-foreground">Needs Attention</p>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg border">
                          <div className="text-2xl font-bold text-red-600">
                            {Object.values({
                              labour: getStatus(currentAchievement.achievedLabour, currentTarget.labour).text === "At Risk",
                              parts: getStatus(currentAchievement.achievedParts, currentTarget.parts).text === "At Risk",
                              vehicles: getStatus(currentAchievement.achievedTotalVehicles, currentTarget.totalVehicles).text === "At Risk",
                              paid: getStatus(currentAchievement.achievedPaidService, currentTarget.paidService).text === "At Risk",
                              free: getStatus(currentAchievement.achievedFreeService, currentTarget.freeService).text === "At Risk",
                              rr: getStatus(currentAchievement.achievedRR, currentTarget.rr).text === "At Risk"
                            }).filter(Boolean).length}
                          </div>
                          <p className="text-sm text-muted-foreground">At Risk</p>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-lg border">
                          <div className="text-2xl font-bold text-blue-600">
                            ₹{(currentAchievement.achievedLabour + currentAchievement.achievedParts).toLocaleString()}
                          </div>
                          <p className="text-sm text-muted-foreground">Total Revenue</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Details Tab */}
                <TabsContent value="details" className="space-y-6 mt-6">
                  <Card className="border shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Data Sources
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-4 p-4 bg-slate-50 rounded-lg border">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold">RO Billing Reports</h3>
                            <Badge variant="secondary">{currentAchievement.roData.length}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Total repair orders processed in {currentTarget.month}
                          </p>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Completed:</span>
                              <span className="font-semibold">
                                {currentAchievement.roData.filter(r => r.status === "completed").length}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Pending:</span>
                              <span className="font-semibold">
                                {currentAchievement.roData.filter(r => r.status !== "completed").length}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4 p-4 bg-slate-50 rounded-lg border">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold">Service Bookings</h3>
                            <Badge variant="secondary">{currentAchievement.bookingData.length}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Total service bookings in {currentTarget.month}
                          </p>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Paid Service:</span>
                              <span className="font-semibold">
                                {currentAchievement.bookingData.filter(b => b.actualCost > 0).length}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Free Service:</span>
                              <span className="font-semibold">
                                {currentAchievement.bookingData.filter(b => b.actualCost === 0).length}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4 p-4 bg-slate-50 rounded-lg border">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold">Warranty Cases</h3>
                            <Badge variant="secondary">{currentAchievement.warrantyData.length}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Total R&R cases handled in {currentTarget.month}
                          </p>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Resolved:</span>
                              <span className="font-semibold">
                                {currentAchievement.warrantyData.filter(w => w.status === "resolved").length}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Pending:</span>
                              <span className="font-semibold">
                                {currentAchievement.warrantyData.filter(w => w.status !== "resolved").length}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Breakdown Tab */}
                <TabsContent value="breakdown" className="space-y-6 mt-6">
                  <Card className="border shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Financial Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div>
                          <h3 className="font-semibold mb-3">Revenue Analysis</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                                <span className="font-medium">Labour Revenue</span>
                                <span className="font-bold text-blue-700">
                                  ₹{currentAchievement.achievedLabour.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                                <span className="font-medium">Parts Revenue</span>
                                <span className="font-bold text-green-700">
                                  ₹{currentAchievement.achievedParts.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                                <span className="font-medium">Total Revenue</span>
                                <span className="font-bold text-purple-700">
                                  ₹{(currentAchievement.achievedLabour + currentAchievement.achievedParts).toLocaleString()}
                                </span>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <div className="flex justify-between mb-2">
                                  <span className="font-medium">Labour Target</span>
                                  <span>₹{currentTarget.labour.toLocaleString()}</span>
                                </div>
                                <Progress 
                                  value={(currentAchievement.achievedLabour / currentTarget.labour) * 100} 
                                  className="h-2" 
                                />
                              </div>
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <div className="flex justify-between mb-2">
                                  <span className="font-medium">Parts Target</span>
                                  <span>₹{currentTarget.parts.toLocaleString()}</span>
                                </div>
                                <Progress 
                                  value={(currentAchievement.achievedParts / currentTarget.parts) * 100} 
                                  className="h-2" 
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <Separator />

                        <div>
                          <h3 className="font-semibold mb-3">Service Volume Analysis</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="text-center p-4 bg-emerald-50 rounded-lg border">
                              <div className="text-2xl font-bold text-emerald-600 mb-2">
                                {currentAchievement.achievedPaidService}
                              </div>
                              <p className="text-sm font-medium">Paid Services</p>
                              <p className="text-xs text-muted-foreground">
                                Target: {currentTarget.paidService}
                              </p>
                            </div>
                            <div className="text-center p-4 bg-cyan-50 rounded-lg border">
                              <div className="text-2xl font-bold text-cyan-600 mb-2">
                                {currentAchievement.achievedFreeService}
                              </div>
                              <p className="text-sm font-medium">Free Services</p>
                              <p className="text-xs text-muted-foreground">
                                Target: {currentTarget.freeService}
                              </p>
                            </div>
                            <div className="text-center p-4 bg-amber-50 rounded-lg border">
                              <div className="text-2xl font-bold text-amber-600 mb-2">
                                {currentAchievement.achievedRR}
                              </div>
                              <p className="text-sm font-medium">R&R Cases</p>
                              <p className="text-xs text-muted-foreground">
                                Target: {currentTarget.rr}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-3 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={() => setAchievementDialogOpen(false)}
                >
                  Close
                </Button>
                <Button onClick={exportToCSV} className="gap-2">
                  <Download className="h-4 w-4" />
                  Export Report
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}