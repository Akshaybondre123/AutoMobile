"use client"

interface CachedData {
  data: any
  timestamp: number
  userEmail: string
  dataType: string
}

interface DashboardCache {
  [key: string]: CachedData
}

class DashboardCacheManager {
  private cache: DashboardCache = {}
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
  private readonly STORAGE_KEY = 'dashboard_cache'

  constructor() {
    // Load cache from localStorage on initialization
    this.loadFromStorage()
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        this.cache = JSON.parse(stored)
        // Clean expired entries
        this.cleanExpiredEntries()
      }
    } catch (error) {
      console.warn('Failed to load dashboard cache from storage:', error)
      this.cache = {}
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.cache))
    } catch (error) {
      console.warn('Failed to save dashboard cache to storage:', error)
    }
  }

  private cleanExpiredEntries() {
    const now = Date.now()
    Object.keys(this.cache).forEach(key => {
      if (now - this.cache[key].timestamp > this.CACHE_DURATION) {
        delete this.cache[key]
      }
    })
    this.saveToStorage()
  }

  private getCacheKey(userEmail: string, dataType: string, city?: string): string {
    return `${userEmail}-${dataType}-${city || 'default'}`
  }

  get(userEmail: string, dataType: string, city?: string): any | null {
    this.cleanExpiredEntries()
    
    const key = this.getCacheKey(userEmail, dataType, city)
    const cached = this.cache[key]
    
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      console.log('📦 Cache HIT for:', key, '- Age:', Math.round((Date.now() - cached.timestamp) / 1000), 'seconds')
      return cached.data
    }
    
    console.log('❌ Cache MISS for:', key)
    return null
  }

  set(userEmail: string, dataType: string, data: any, city?: string): void {
    const key = this.getCacheKey(userEmail, dataType, city)
    
    this.cache[key] = {
      data,
      timestamp: Date.now(),
      userEmail,
      dataType
    }
    
    console.log('💾 Cache SET for:', key, '- Data size:', JSON.stringify(data).length, 'chars')
    this.saveToStorage()
  }

  invalidate(userEmail: string, dataType?: string, city?: string): void {
    if (dataType) {
      // Invalidate specific cache entry
      const key = this.getCacheKey(userEmail, dataType, city)
      delete this.cache[key]
      console.log('🗑️ Cache INVALIDATED for:', key)
    } else {
      // Invalidate all entries for user
      Object.keys(this.cache).forEach(key => {
        if (this.cache[key].userEmail === userEmail) {
          delete this.cache[key]
        }
      })
      console.log('🗑️ Cache INVALIDATED for all data of user:', userEmail)
    }
    
    this.saveToStorage()
  }

  invalidateAll(): void {
    this.cache = {}
    localStorage.removeItem(this.STORAGE_KEY)
    console.log('🗑️ Cache CLEARED completely')
  }

  getStats(): { totalEntries: number, totalSize: number, oldestEntry: number | null } {
    const entries = Object.values(this.cache)
    const totalSize = JSON.stringify(this.cache).length
    const oldestEntry = entries.length > 0 
      ? Math.min(...entries.map(e => e.timestamp))
      : null

    return {
      totalEntries: entries.length,
      totalSize,
      oldestEntry
    }
  }

  // Check if data should be refreshed (for upload scenarios)
  shouldRefresh(userEmail: string, dataType: string, city?: string): boolean {
    const key = this.getCacheKey(userEmail, dataType, city)
    const cached = this.cache[key]
    
    // Always refresh if no cache
    if (!cached) return true
    
    // Refresh if older than 1 minute (for recent uploads)
    const age = Date.now() - cached.timestamp
    return age > 60 * 1000 // 1 minute
  }
}

// Export singleton instance
export const dashboardCache = new DashboardCacheManager()

// Export hook for React components
export function useDashboardCache() {
  return {
    get: dashboardCache.get.bind(dashboardCache),
    set: dashboardCache.set.bind(dashboardCache),
    invalidate: dashboardCache.invalidate.bind(dashboardCache),
    invalidateAll: dashboardCache.invalidateAll.bind(dashboardCache),
    shouldRefresh: dashboardCache.shouldRefresh.bind(dashboardCache),
    getStats: dashboardCache.getStats.bind(dashboardCache)
  }
}
