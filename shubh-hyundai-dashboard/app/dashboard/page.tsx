"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    // Redirect based on user role
    if (user?.role === "service_manager") {
      router.push("/dashboard/sm")
    } else if (user?.role === "general_manager") {
      router.push("/dashboard/gm")
    } else if (user?.role === "service_advisor") {
      router.push("/dashboard/sa")
    } else {
      router.push("/dashboard/sm")
    }
  }, [user, router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to your dashboard...</p>
      </div>
    </div>
  )
}
