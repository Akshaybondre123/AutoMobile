"use client"

import { useEffect, useState } from "react"
import {
  getPerformanceMetrics,
  getMonthlyTrends,
  getServiceTypeAnalytics,
  type PerformanceMetrics,
  type MonthlyTrend,
  type ServiceTypeAnalytics,
} from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

export function AnalyticsCharts() {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([])
  const [trends, setTrends] = useState<MonthlyTrend[]>([])
  const [serviceAnalytics, setServiceAnalytics] = useState<ServiceTypeAnalytics[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [metricsData, trendsData, analyticsData] = await Promise.all([
          getPerformanceMetrics(),
          getMonthlyTrends(),
          getServiceTypeAnalytics(),
        ])
        setMetrics(metricsData)
        setTrends(trendsData)
        setServiceAnalytics(analyticsData)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  if (isLoading) {
    return <div className="text-center py-12">Loading analytics...</div>
  }

  const colors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ]

  const totalRevenue = trends.reduce((sum, t) => sum + t.revenue, 0)
  const totalServices = trends.reduce((sum, t) => sum + t.services, 0)
  const avgCompletionRate = Math.round(trends.reduce((sum, t) => sum + t.completionRate, 0) / trends.length)

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue (6 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(totalRevenue / 100000).toFixed(1)}L</div>
            <p className="text-xs text-muted-foreground">Across all service centers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalServices}</div>
            <p className="text-xs text-muted-foreground">Services completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgCompletionRate}%</div>
            <p className="text-xs text-muted-foreground">Service completion</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue & Services Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue & Services Trend</CardTitle>
          <CardDescription>Monthly performance over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={trends}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip formatter={(value) => (typeof value === "number" ? `₹${value}` : value)} />
              <Legend />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--chart-1))"
                fillOpacity={1}
                fill="url(#colorRevenue)"
                name="Revenue (₹)"
              />
              <Line yAxisId="right" type="monotone" dataKey="services" stroke="hsl(var(--chart-2))" name="Services" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Service Type Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Service Type Distribution</CardTitle>
            <CardDescription>Revenue by service type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={serviceAnalytics}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ serviceType, revenue }) => `${serviceType}: ₹${(revenue / 1000).toFixed(0)}K`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="revenue"
                >
                  {serviceAnalytics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `₹${value}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service Count by Type</CardTitle>
            <CardDescription>Number of services performed</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={serviceAnalytics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="serviceType" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--chart-2))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics Radar */}
      <Card>
        <CardHeader>
          <CardTitle>City Performance Metrics</CardTitle>
          <CardDescription>Multi-dimensional performance comparison</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={metrics}>
              <PolarGrid />
              <PolarAngleAxis dataKey="city" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar
                name="Service Quality"
                dataKey="serviceQuality"
                stroke={colors[0]}
                fill={colors[0]}
                fillOpacity={0.25}
              />
              <Radar
                name="Customer Satisfaction"
                dataKey="customerSatisfaction"
                stroke={colors[1]}
                fill={colors[1]}
                fillOpacity={0.25}
              />
              <Radar name="Efficiency" dataKey="efficiency" stroke={colors[2]} fill={colors[2]} fillOpacity={0.25} />
              <Radar
                name="Profitability"
                dataKey="profitability"
                stroke={colors[3]}
                fill={colors[3]}
                fillOpacity={0.25}
              />
              <Radar name="Timeliness" dataKey="timeliness" stroke={colors[4]} fill={colors[4]} fillOpacity={0.25} />
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Service Analytics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Service Type Analytics</CardTitle>
          <CardDescription>Detailed metrics for each service type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">Service Type</th>
                  <th className="text-right py-3 px-4 font-semibold">Count</th>
                  <th className="text-right py-3 px-4 font-semibold">Revenue</th>
                  <th className="text-right py-3 px-4 font-semibold">Avg Time (hrs)</th>
                  <th className="text-right py-3 px-4 font-semibold">Profit Margin</th>
                </tr>
              </thead>
              <tbody>
                {serviceAnalytics.map((service) => (
                  <tr key={service.serviceType} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4 font-medium">{service.serviceType}</td>
                    <td className="text-right py-3 px-4">{service.count}</td>
                    <td className="text-right py-3 px-4 font-semibold">₹{service.revenue.toLocaleString()}</td>
                    <td className="text-right py-3 px-4">{service.averageTime}</td>
                    <td className="text-right py-3 px-4">{service.profitMargin}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
