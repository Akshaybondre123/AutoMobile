"use client"

import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wrench, Clock, CheckCircle2, AlertTriangle, Car, TrendingUp } from "lucide-react"

export default function BodyShopManagerDashboard() {
  const { user } = useAuth()

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const kpis = [
    {
      title: "Open Bodyshop Jobs",
      value: "18",
      sub: "Awaiting work / parts",
      icon: <Clock className="h-5 w-5" />,
      color: "bg-orange-100 text-orange-700",
    },
    {
      title: "In Progress",
      value: "9",
      sub: "Currently in repair",
      icon: <Wrench className="h-5 w-5" />,
      color: "bg-blue-100 text-blue-700",
    },
    {
      title: "Delivered Today",
      value: "6",
      sub: "Completed vehicles",
      icon: <CheckCircle2 className="h-5 w-5" />,
      color: "bg-green-100 text-green-700",
    },
    {
      title: "Escalations",
      value: "2",
      sub: "Need approval",
      icon: <AlertTriangle className="h-5 w-5" />,
      color: "bg-red-100 text-red-700",
    },
  ]

  const recentJobs = [
    {
      jobId: "BDM-PUN-1024",
      regNo: "MH12 AB 2345",
      model: "Creta",
      stage: "Paint Booth",
      eta: "Today 6:30 PM",
      priority: "High",
      city: "Pune",
    },
    {
      jobId: "BDM-PUN-1031",
      regNo: "MH14 XY 7711",
      model: "Venue",
      stage: "Denting",
      eta: "Tomorrow 1:00 PM",
      priority: "Normal",
      city: "Pune",
    },
    {
      jobId: "BDM-MUM-2047",
      regNo: "MH01 CD 9087",
      model: "i20",
      stage: "QC",
      eta: "Today 5:00 PM",
      priority: "Normal",
      city: "Mumbai",
    },
    {
      jobId: "BDM-MUM-2052",
      regNo: "MH02 ZZ 1122",
      model: "Verna",
      stage: "Parts Pending",
      eta: "In 2 days",
      priority: "High",
      city: "Mumbai",
    },
  ]

  if (!user) return null

  if (user.role !== "body_shop_manager") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Access Denied</CardTitle>
            <CardDescription className="text-center">This page is for Body Shop Managers only.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Body Shop Dashboard</h1>
        <p className="text-muted-foreground">
          {today} • {user.city ? `${user.city} Bodyshop` : "Bodyshop"} • {user.email}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title} className="border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">{kpi.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{kpi.value}</p>
                  <p className="text-xs text-gray-500">{kpi.sub}</p>
                </div>
                <div className={`p-3 rounded-lg ${kpi.color}`}>{kpi.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Recent Jobs
            </CardTitle>
            <CardDescription>Dummy data for the Body Shop Manager view</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Job ID</th>
                    <th className="text-left py-3 px-4 font-semibold">Reg No</th>
                    <th className="text-left py-3 px-4 font-semibold">Model</th>
                    <th className="text-left py-3 px-4 font-semibold">Stage</th>
                    <th className="text-left py-3 px-4 font-semibold">ETA</th>
                    <th className="text-left py-3 px-4 font-semibold">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {recentJobs.map((job) => (
                    <tr key={job.jobId} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">{job.jobId}</td>
                      <td className="py-3 px-4">{job.regNo}</td>
                      <td className="py-3 px-4">{job.model}</td>
                      <td className="py-3 px-4">{job.stage}</td>
                      <td className="py-3 px-4">{job.eta}</td>
                      <td className="py-3 px-4">
                        <Badge variant={job.priority === "High" ? "destructive" : "secondary"}>{job.priority}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Quick Summary
            </CardTitle>
            <CardDescription>Dummy operational snapshot</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Avg. Turnaround</span>
              <span className="font-semibold">2.4 days</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Parts Pending</span>
              <span className="font-semibold">5</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">QC Pending</span>
              <span className="font-semibold">3</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Rework Cases</span>
              <span className="font-semibold">1</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
