// // API Configuration  
// // Temporarily using local backend (deployed backend has 500 errors)
// export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050'

// // Helper function to build API URLs
// export const getApiUrl = (endpoint: string) => {
//   return `${API_BASE_URL}${endpoint}`
// }


import axios, { AxiosInstance } from "axios"

/* =========================================================
   API CONFIGURATION
   Temporarily using local backend (deployed backend has 500 errors)
========================================================= */

const DEFAULT_API_URL = "http://localhost:5050"

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "development"
    ? DEFAULT_API_URL
    : DEFAULT_API_URL)

// Helper function to build API URLs (optional utility)
export const getApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`
}

/* =========================================================
   AXIOS INSTANCE
========================================================= */

const api: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
})

// Request interceptor (future auth ready)
api.interceptors.request.use(
  (config) => {
    // const token = localStorage.getItem("token")
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`
    // }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor (central error handling)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error("API Error:", error.response.data)
      return Promise.reject(error.response.data)
    } else if (error.request) {
      console.error("Network Error:", error.message)
      return Promise.reject({
        message: "Network error. Please check your connection.",
      })
    } else {
      console.error("Error:", error.message)
      return Promise.reject({ message: error.message })
    }
  }
)

/* =========================================================
   CAR SERVICE APIs
========================================================= */

export const carServiceAPI = {
  createService(serviceData: unknown) {
    return api.post("/services", serviceData)
  },

  getServicesByAdvisor(advisorId: string, page = 1, limit = 7) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    })

    return api.get(
      `/services/advisor/${encodeURIComponent(advisorId)}?${params}`
    )
  },

  getServiceById(id: string) {
    return api.get(`/services/${id}`)
  },

  updateService(id: string, updateData: unknown) {
    return api.put(`/services/${id}`, updateData)
  },

  deleteService(id: string) {
    return api.delete(`/services/${id}`)
  },

  healthCheck() {
    return api.get("/health")
  },
}

/* =========================================================
   EXPORT DEFAULT AXIOS INSTANCE
========================================================= */

export default api
