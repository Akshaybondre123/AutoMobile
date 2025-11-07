"use client"

import { AnalyticsCharts } from "@/components/analytics-charts"

export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Analytics & Insights</h1>
        <p className="text-muted-foreground mt-2">Comprehensive data visualization and performance metrics</p>
      </div>

      <AnalyticsCharts />
    </div>
  )
}
