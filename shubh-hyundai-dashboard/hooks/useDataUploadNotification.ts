"use client"

import { useEffect } from 'react'
import { useDashboard } from '@/contexts/DashboardContext'
import { useAuth } from '@/lib/auth-context'

/**
 * Hook to handle data upload notifications and cache invalidation
 * Call this hook in upload components to automatically invalidate cache when data is uploaded
 */
export const useDataUploadNotification = () => {
  const { user } = useAuth()
  const { markForRefresh } = useDashboard()

  // Function to call when data is uploaded
  const notifyDataUploaded = (dataType?: string) => {
    if (user?.email) {
      console.log('📤 Data uploaded - marking for refresh:', dataType || 'all data types')
      if (dataType) {
        markForRefresh(user.email, dataType as any, user.city)
      } else {
        // Mark all data types for refresh
        markForRefresh(user.email, undefined, user.city)
      }
    }
  }

  // Function to call when user explicitly wants to refresh
  const notifyForceRefresh = (dataType?: string) => {
    if (user?.email) {
      console.log('🔄 Force refresh requested:', dataType || 'all data types')
      if (dataType) {
        markForRefresh(user.email, dataType as any, user.city)
      } else {
        markForRefresh(user.email, undefined, user.city)
      }
    }
  }

  return {
    notifyDataUploaded,
    notifyForceRefresh
  }
}

/**
 * Hook to listen for storage events and invalidate cache when other tabs upload data
 * This enables cross-tab cache invalidation
 */
export const useCrossTabCacheInvalidation = () => {
  const { user } = useAuth()
  const { markForRefresh } = useDashboard()

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Listen for upload notifications from other tabs
      if (e.key === 'data_upload_notification' && e.newValue && user?.email) {
        try {
          const notification = JSON.parse(e.newValue)
          if (notification.userEmail === user.email) {
            console.log('📡 Cross-tab upload notification received:', notification.dataType)
            markForRefresh(user.email, notification.dataType, user.city)
            
            // Clear the notification
            localStorage.removeItem('data_upload_notification')
          }
        } catch (error) {
          console.warn('Failed to parse upload notification:', error)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [user?.email, user?.city, markForRefresh])

  // Function to broadcast upload notification to other tabs
  const broadcastUploadNotification = (dataType?: string) => {
    if (user?.email) {
      const notification = {
        userEmail: user.email,
        dataType,
        timestamp: Date.now()
      }
      localStorage.setItem('data_upload_notification', JSON.stringify(notification))
      
      // Remove after a short delay to trigger storage event
      setTimeout(() => {
        localStorage.removeItem('data_upload_notification')
      }, 100)
    }
  }

  return {
    broadcastUploadNotification
  }
}
