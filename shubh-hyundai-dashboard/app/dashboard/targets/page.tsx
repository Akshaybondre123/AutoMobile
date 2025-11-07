"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { getAdvisorTargets, type ServiceAdvisorTarget } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle, TrendingUp } from "lucide-react"

export default function TargetTrackingPage() {
  const { user } = useAuth()
  const [targets, setTargets] = useState<ServiceAdvisorTarget[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      if (user?.id) {
        const data = await getAdvisorTargets(user.id)
        setTargets(data)
        if (data.length > 0) {
          setSelectedMonth(data[data.length - 1].month)
        }
      }
      setIsLoading(false)
    }
    loadData()
  }, [user?.id])

  if (isLoading) {
    return <div className="text-center py-12">Loading targets...</div>
  }

  const currentTarget = targets.find((t) => t.month === selectedMonth)

  if (!currentTarget) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-lg font-semibold">No targets found</p>
      </div>
    )
  }

  const revenuePercent = Math.round((currentTarget.achievedRevenue / currentTarget.targetRevenue) * 100)
  const servicePercent = Math.round((currentTarget.completedServices / currentTarget.targetServices) * 100)
  const satisfactionPercent = Math.round(
    (currentTarget.achievedCustomerSatisfaction / currentTarget.targetCustomerSatisfaction) * 100,
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Target Tracking</h1>
        <p className="text-muted-foreground mt-2">Monitor your monthly targets and performance</p>
      </div>

      {/* Month Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Month</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {targets.map((target) => (
              <Button
                key={target.month}
                variant={selectedMonth === target.month ? "default" : "outline"}
                onClick={() => setSelectedMonth(target.month)}
              >
                {target.month}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Target Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Revenue Target */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revenue Target</CardTitle>
            <CardDescription>Monthly revenue goal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm font-bold">{revenuePercent}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className="bg-primary h-3 rounded-full transition-all"
                  style={{ width: `${Math.min(revenuePercent, 100)}%` }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Target:</span>
                <span className="font-semibold">₹{currentTarget.targetRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Achieved:</span>
                <span className="font-semibold text-primary">₹{currentTarget.achievedRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Remaining:</span>
                <span className="font-semibold">
                  ₹{(currentTarget.targetRevenue - currentTarget.achievedRevenue).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              {revenuePercent >= 100 ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-green-600 font-medium">Target Achieved!</span>
                </>
              ) : (
                <>
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                  <span className="text-sm text-orange-600 font-medium">In Progress</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Service Target */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Service Target</CardTitle>
            <CardDescription>Number of services</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm font-bold">{servicePercent}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className="bg-chart-2 h-3 rounded-full transition-all"
                  style={{ width: `${Math.min(servicePercent, 100)}%` }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Target:</span>
                <span className="font-semibold">{currentTarget.targetServices}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Completed:</span>
                <span className="font-semibold text-chart-2">{currentTarget.completedServices}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Remaining:</span>
                <span className="font-semibold">{currentTarget.targetServices - currentTarget.completedServices}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              {servicePercent >= 100 ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-green-600 font-medium">Target Achieved!</span>
                </>
              ) : (
                <>
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                  <span className="text-sm text-orange-600 font-medium">In Progress</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Satisfaction Target */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Customer Satisfaction</CardTitle>
            <CardDescription>Satisfaction score</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm font-bold">{satisfactionPercent}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className="bg-chart-3 h-3 rounded-full transition-all"
                  style={{ width: `${Math.min(satisfactionPercent, 100)}%` }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Target:</span>
                <span className="font-semibold">{currentTarget.targetCustomerSatisfaction}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Achieved:</span>
                <span className="font-semibold text-chart-3">{currentTarget.achievedCustomerSatisfaction}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Gap:</span>
                <span className="font-semibold">
                  {currentTarget.targetCustomerSatisfaction - currentTarget.achievedCustomerSatisfaction}%
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              {satisfactionPercent >= 100 ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-green-600 font-medium">Target Achieved!</span>
                </>
              ) : (
                <>
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                  <span className="text-sm text-orange-600 font-medium">In Progress</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Target Info */}
      <Card>
        <CardHeader>
          <CardTitle>Target Details for {currentTarget.month}</CardTitle>
          <CardDescription>Complete breakdown of your monthly targets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="border-b pb-4">
                <p className="text-sm text-muted-foreground mb-1">Revenue Target</p>
                <p className="text-2xl font-bold">₹{currentTarget.targetRevenue.toLocaleString()}</p>
              </div>
              <div className="border-b pb-4">
                <p className="text-sm text-muted-foreground mb-1">Revenue Achieved</p>
                <p className="text-2xl font-bold text-primary">₹{currentTarget.achievedRevenue.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Revenue Achievement Rate</p>
                <p className="text-2xl font-bold">{revenuePercent}%</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="border-b pb-4">
                <p className="text-sm text-muted-foreground mb-1">Service Target</p>
                <p className="text-2xl font-bold">{currentTarget.targetServices} services</p>
              </div>
              <div className="border-b pb-4">
                <p className="text-sm text-muted-foreground mb-1">Services Completed</p>
                <p className="text-2xl font-bold text-chart-2">{currentTarget.completedServices} services</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Service Completion Rate</p>
                <p className="text-2xl font-bold">{servicePercent}%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
