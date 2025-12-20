"use client"

import React, { createContext, useContext, useEffect } from "react"
import { getApiUrl } from "./config"
import { useAppSelector, useAppDispatch } from "@/lib/store/hooks"
import { setUser, login as loginAction, logout as logoutAction, User } from "@/lib/store/slices/authSlice"

export type UserRole = "owner" | "general_manager" | "service_manager" | "service_advisor" | "body_shop_manager" | "gm_service"

// Re-export User type from slice
export type { User }

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)
  const token = useAppSelector((state) => state.auth.token)
  const [isLoading, setIsLoading] = React.useState(true)

  useEffect(() => {
    // After store rehydration, check if we have a token but no user
    if (token && !user) {
      // Try to refresh user from backend
      (async () => {
        try {
          const res = await fetch(getApiUrl('/api/auth/me'), {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (res.ok) {
            const json = await res.json()
            if (json.success && json.data && json.data.user) {
              const userData = json.data.user
              // Extract city from email if not present
              if (!userData.city) {
                const emailParts = userData.email?.split('.')
                if (emailParts && emailParts.length > 1) {
                  const cityPart = emailParts[1]?.split('@')[0]
                  if (cityPart) {
                    userData.city = cityPart.charAt(0).toUpperCase() + cityPart.slice(1).toLowerCase()
                  }
                }
                if (!userData.city && userData.address) {
                  const addressCity = userData.address.split(',').pop()?.trim()
                  if (addressCity) {
                    userData.city = addressCity
                  }
                }
                if (!userData.city) {
                  userData.city = "Pune" // Default city
                }
              }
              // Ensure showroom_id and showroom_city are included if present
              const userToSet = {
                ...userData,
                showroom_id: userData.showroom_id,
                showroom_city: userData.showroom_city
              }
              dispatch(setUser(userToSet))
            }
          } else {
            // token invalid - clear
            dispatch(logoutAction())
          }
        } catch (err) {
          console.warn('Failed to refresh user from backend', err)
        } finally {
          setIsLoading(false)
        }
      })()
    } else {
      setIsLoading(false)
    }
  }, [token, user, dispatch])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      // Validate inputs before making API call - ensure they're strings first
      const trimmedEmail = (email || '').toString().trim()
      const trimmedPassword = (password || '').toString().trim()
      
      if (!trimmedEmail || !trimmedPassword) {
        throw new Error('Email and password are required')
      }

      // Call backend auth endpoint
      const res = await fetch(getApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password: trimmedPassword })
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Invalid credentials')
      }

      const json = await res.json()
      if (!json.success || !json.data) throw new Error(json.message || 'Login failed')

      const { user: backendUser, token } = json.data
      
      // Validate required fields
      if (!backendUser || (!backendUser._id && !backendUser.id)) {
        throw new Error('Invalid user data received from server')
      }
      
      // Transform backend user to frontend User type
      // Backend uses _id, frontend expects id
      const userId = backendUser._id || backendUser.id
      const userEmail = backendUser.email || ''
      const userName = backendUser.name || backendUser.username || userEmail || 'User'
      
      if (!userEmail) {
        throw new Error('User email is required')
      }
      
      let loggedUser: User = {
        id: userId.toString(),
        name: userName,
        email: userEmail,
        role: backendUser.role || 'service_manager', // Default role if not provided
        city: backendUser.city,
        org_id: backendUser.org_id,
        showroom_id: backendUser.showroom_id,
        showroom_city: backendUser.showroom_city
      }
      
      // Extract city from email if not present (e.g., sm.pune@shubh.com -> Pune)
      if (!loggedUser.city) {
        const emailParts = loggedUser.email?.split('.')
        if (emailParts && emailParts.length > 1) {
          const cityPart = emailParts[1]?.split('@')[0]
          if (cityPart) {
            // Capitalize first letter (pune -> Pune)
            loggedUser.city = cityPart.charAt(0).toUpperCase() + cityPart.slice(1).toLowerCase()
          }
        }
        // If still no city, try to get from address or use default
        if (!loggedUser.city) {
          // Try to extract from address if available
          if (backendUser.address) {
            const addressCity = backendUser.address.split(',').pop()?.trim()
            if (addressCity) {
              loggedUser.city = addressCity
            }
          }
          // Final fallback - use a default city or leave empty
          if (!loggedUser.city) {
            loggedUser.city = "Pune" // Default city
          }
        }
      }
      
      // Store in RTK store (which will persist via redux-persist)
      dispatch(loginAction({ user: loggedUser, token: token || '' }))
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    dispatch(logoutAction())
  }

  return <AuthContext.Provider value={{ user, isLoading, login, logout }}>{children}</AuthContext.Provider>
}

// Export all demo users for use in other components
export const getAllDemoUsers = (): User[] => {
  return [
    {
      id: "1",
      name: "Rajesh Kumar",
      email: "gm@shubh.com",
      // Use owner as the top-level role instead of general_manager
      role: "owner",
      city: "All Cities",
      org_id: "shubh_hyundai"
    },
    {
      id: "2",
      name: "Amit Sharma",
      email: "sm.pune@shubh.com",
      role: "service_manager",
      city: "Pune",
      org_id: "shubh_hyundai"
    },
    {
      id: "3",
      name: "Priya Desai",
      email: "sm.mumbai@shubh.com",
      role: "service_manager",
      city: "Mumbai",
      org_id: "shubh_hyundai"
    },
    {
      id: "4",
      name: "Vikram Singh",
      email: "sm.nagpur@shubh.com",
      role: "service_manager",
      city: "Nagpur",
      org_id: "shubh_hyundai"
    },
    {
      id: "7",
      name: "Body Shop Manager",
      email: "bdm.pune@shub.com",
      role: "body_shop_manager",
      city: "Pune",
      org_id: "shubh_hyundai"
    },
    {
      id: "8",
      name: "Body Shop Manager",
      email: "bdm.mumbai@shub.com",
      role: "body_shop_manager",
      city: "Mumbai",
      org_id: "shubh_hyundai"
    },
    {
      id: "5",
      name: "Deepak Patel",
      email: "sa.pune@shubh.com",
      role: "service_advisor",
      city: "Pune",
      org_id: "shubh_hyundai"
    },
    {
      id: "6",
      name: "Kavya Nair",
      email: "sa.mumbai@shubh.com",
      role: "service_advisor",
      city: "Mumbai",
      org_id: "shubh_hyundai"
    }
  ]
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    // If used outside of an AuthProvider, return a safe noop context
    // to avoid a hard crash that would render a blank page. This
    // helps debugging and is safe because components should still
    // handle a null `user` and `isLoading` values.
    return {
      user: null,
      isLoading: false,
      login: async () => {},
      logout: () => {},
    }
  }

  return context
}
