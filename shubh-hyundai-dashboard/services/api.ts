import { API_BASE_URL } from "@/lib/config"

export interface ServicePagination {
  currentPage: number
  totalPages: number
  totalCount: number
  limit: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface StatusHistoryEntry {
  status: string
  changedAt: string
  changedBy: string
}

export interface CarServiceRecord {
  _id: string
  vehicleRegistrationNumber: string
  vehicleModel: string
  typeOfWork: string
  serviceAdvisorId: string
  serviceDate: string
  ownerName: string
  contactInfo: string
  roDate?: string | null
  roNumber?: string | null
  TAT?: number
  tatActiveSince?: string | null
  status?: string
  serviceStatus?: string
  statusHistory?: StatusHistoryEntry[]
  additionalNotes?: string
  createdAt?: string
  updatedAt?: string
}

export interface CreateServicePayload {
  vehicleRegistrationNumber: string
  vehicleModel: string
  typeOfWork: string
  serviceAdvisorId: string
  serviceDate: string
  ownerName: string
  contactInfo: string
  changedBy?: string
}

export interface UpdateServicePayload {
  roDate?: string | null
  roNumber?: string | null
  status?: string
  serviceStatus?: string
  changedBy?: string
}

export interface ApiResponse<T> {
  success: boolean
  message?: string
  data?: T
  pagination?: ServicePagination
}

const defaultPagination: ServicePagination = {
  currentPage: 1,
  totalPages: 1,
  totalCount: 0,
  limit: 7,
  hasNextPage: false,
  hasPrevPage: false,
}

const buildUrl = (path: string) => `${API_BASE_URL}${path}`

const request = async <T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> => {
  try {
    const response = await fetch(buildUrl(path), {
      cache: "no-store",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    })

    const payload = await response.json().catch(() => undefined)

    if (!response.ok || payload?.success === false) {
      return {
        success: false,
        message: payload?.message || payload?.error || response.statusText,
      }
    }

    if (payload && typeof payload === "object") {
      return {
        success: true,
        data: payload.data as T,
        pagination: payload.pagination ?? defaultPagination,
        message: payload.message,
      }
    }

    return {
      success: true,
      data: payload as T,
      pagination: defaultPagination,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network error"
    return { success: false, message }
  }
}

export const carServiceAPI = {
  async createService(payload: CreateServicePayload): Promise<ApiResponse<CarServiceRecord>> {
    return request<CarServiceRecord>("/api/services", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  async getServicesByAdvisor(
    advisorId: string,
    page = 1,
    limit = 7,
  ): Promise<ApiResponse<CarServiceRecord[]>> {
    const query = new URLSearchParams({ page: page.toString(), limit: limit.toString() })
    return request<CarServiceRecord[]>(`/api/services/advisor/${advisorId}?${query.toString()}`)
  },

  async updateService(id: string, payload: UpdateServicePayload): Promise<ApiResponse<CarServiceRecord>> {
    return request<CarServiceRecord>(`/api/services/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
  },

  async deleteService(id: string): Promise<ApiResponse<null>> {
    return request<null>(`/api/services/${id}`, {
      method: "DELETE",
    })
  },

  async getServiceById(id: string): Promise<ApiResponse<CarServiceRecord>> {
    return request<CarServiceRecord>(`/api/services/${id}`)
  },
}

export type { ServicePagination as CarServicePagination }
