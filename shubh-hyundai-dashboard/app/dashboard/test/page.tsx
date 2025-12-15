"use client"

import { useAuth } from "@/lib/auth-context"
import { usePermissions } from "@/hooks/usePermissions"

export default function TestPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { permissions, isLoading: permissionsLoading } = usePermissions()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Dashboard Debug Page</h1>
      
      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded">
          <h2 className="font-semibold">Auth Status:</h2>
          <p>Auth Loading: {authLoading ? 'Yes' : 'No'}</p>
          <p>User: {user ? JSON.stringify(user, null, 2) : 'No user'}</p>
        </div>

        <div className="bg-green-50 p-4 rounded">
          <h2 className="font-semibold">Permissions Status:</h2>
          <p>Permissions Loading: {permissionsLoading ? 'Yes' : 'No'}</p>
          <p>Permissions Count: {permissions.length}</p>
          <p>Permissions: {JSON.stringify(permissions, null, 2)}</p>
        </div>

        <div className="bg-yellow-50 p-4 rounded">
          <h2 className="font-semibold">Navigation Links:</h2>
          <div className="space-x-2">
            <a href="/dashboard/gm" className="text-blue-600 underline">GM Dashboard</a>
            <a href="/dashboard/sm" className="text-blue-600 underline">SM Dashboard</a>
            <a href="/dashboard/sa" className="text-blue-600 underline">SA Dashboard</a>
          </div>
        </div>
      </div>
    </div>
  )
}
