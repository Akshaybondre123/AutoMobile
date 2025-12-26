"use client"

import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Mail, Shield } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function UnauthorizedPage() {
  const { user } = useAuth()
  const router = useRouter()

  // Helper to check if user is Service Advisor
  const isServiceAdvisor = () => {
    if (!user?.role) {
      console.log('🔍 Unauthorized page - No user role found')
      return false
    }
    const roleStr = String(user.role).toLowerCase().trim()
    console.log('🔍 Unauthorized page - Checking role:', user.role, '-> normalized:', roleStr)
    const roleParts = roleStr.split('|').map(p => p.trim())
    const isAdvisor = roleParts.some(part => 
      part.includes('service advisor') || 
      part === 'service_advisor' ||
      part.includes('service_advisor') ||
      part === 'advisor' ||
      part.includes('advisor')
    ) || roleStr.includes('service advisor') || roleStr.includes('service_advisor') || roleStr === 'service advisor'
    console.log('🔍 Unauthorized page - Is Service Advisor?', isAdvisor)
    return isAdvisor
  }

  // Service Advisors should never see this page - redirect them immediately
  useEffect(() => {
    if (user) {
      console.log('🔍 Unauthorized page - User loaded:', user.email, 'Role:', user.role)
      if (isServiceAdvisor()) {
        console.log('👤 Service Advisor detected on unauthorized page - redirecting to SA dashboard')
        router.replace("/dashboard/sa")
      }
    }
  }, [user, router])

  // Don't render the page if user is a Service Advisor (they should be redirected)
  if (user && isServiceAdvisor()) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Redirecting to your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 p-4">
      <Card className="w-full max-w-2xl border-2 border-red-200 shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-red-100 p-4">
              <Shield className="h-12 w-12 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-red-900">
            Access Denied
          </CardTitle>
          <CardDescription className="text-lg mt-2">
            You do not have access to any dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  No Dashboard Access
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Your account does not have permission to access any dashboard. 
                  Please contact your owner or administrator to get the appropriate permissions assigned to your role.
                </p>
              </div>
            </div>
          </div>

          {user && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Your Account Information:</p>
              <div className="space-y-1 text-sm text-gray-600">
                <p><span className="font-medium">Name:</span> {user.name}</p>
                <p><span className="font-medium">Email:</span> {user.email}</p>
                {user.role && (
                  <p><span className="font-medium">Role:</span> {user.role}</p>
                )}
              </div>
            </div>
          )}

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
            <div className="flex items-start">
              <Mail className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800 mb-1">
                  Need Help?
                </p>
                <p className="text-sm text-blue-700">
                  Contact your system administrator or owner to request dashboard access. 
                  They can assign the appropriate permissions to your account.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <Link
              href="/"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Return to Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
