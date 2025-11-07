// API Configuration
// Using deployed Vercel backend with MongoDB Atlas
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://auto-mobile-mblq.vercel.app'

// Helper function to build API URLs
export const getApiUrl = (endpoint: string) => {
  return `${API_BASE_URL}${endpoint}`
}
