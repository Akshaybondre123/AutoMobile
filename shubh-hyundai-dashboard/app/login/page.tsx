"use client"

import type React from "react"
import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      // Perform login
      await login(email, password)

      // Redirect based on role or email
      if (email === "gm@shubh.com") {
        router.push("/dashboard/gm")
      } else if (email.startsWith("sm.")) {
        router.push("/dashboard/sm")
      } else if (email.startsWith("bdm.")) {
        router.push("/dashboard/bdm")
      } else if (email.startsWith("sa.")) {
        router.push("/dashboard/sa")
      } else {
        router.push("/dashboard") // fallback (optional)
      }
    } catch (err) {
      setError("Invalid email or password")
    } finally {
      setIsLoading(false)
    }
  }

  const demoAccounts = [
    { email: "gm@shubh.com", role: "General Manager", city: "All Cities", password: "password" },
    { email: "sm.pune@shubh.com", role: "Service Manager", city: "Pune", password: "password" },
    { email: "sm.mumbai@shubh.com", role: "Service Manager", city: "Mumbai", password: "password" },
    { email: "sm.nagpur@shubh.com", role: "Service Manager", city: "Nagpur", password: "password" },
    { email: "bdm.pune@shub.com", role: "Body Shop Manager", city: "Pune", password: "bodyshop" },
    { email: "bdm.mumbai@shub.com", role: "Body Shop Manager", city: "Mumbai", password: "bodyshopmumbai" },
    { email: "sa.pune@shubh.com", role: "Service Advisor", city: "Pune", password: "password" },
    { email: "sa.mumbai@shubh.com", role: "Service Advisor", city: "Mumbai", password: "password" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-semibold">Shubh Hyundai</CardTitle>
            <CardDescription>Service Management Dashboard</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
                  <AlertCircle size={18} />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </form>

            <div className="border-t pt-6">
              <p className="text-sm font-medium mb-3">Demo Accounts</p>
              <div className="space-y-2">
                {demoAccounts.map((account) => (
                  <button
                    key={account.email}
                    onClick={() => {
                      setEmail(account.email)
                      setPassword(account.password)
                    }}
                    className="w-full text-left p-3 rounded-lg border border-border hover:bg-secondary transition-colors"
                  >
                    <p className="text-sm font-medium">{account.role}</p>
                    <p className="text-xs text-muted-foreground">{account.email}</p>
                    {account.password !== "password" && (
                      <p className="text-xs text-muted-foreground">Password: {account.password}</p>
                    )}
                    <p className="text-xs text-accent">{account.city}</p>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
