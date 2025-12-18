"use client"

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

import {
  Plus,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Activity,
  Grid,
  List,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

import styles from "./page.module.css"
import { carServiceAPI, type CarServiceRecord, type CarServicePagination } from "@/services/api"
import ServiceCard from "@/components/ServiceCard/ServiceCard"
import EditModal from "@/components/EditModal/EditModal"

const PAGE_LIMIT = 7

const cx = (...names: Array<string | false | null | undefined>) =>
  names
    .filter(Boolean)
    .map((name) => (name ? styles[name] ?? name : ""))
    .join(" ")

const defaultPagination: CarServicePagination = {
  currentPage: 1,
  totalPages: 1,
  totalCount: 0,
  limit: PAGE_LIMIT,
  hasNextPage: false,
  hasPrevPage: false,
}

export default function Dashboard() {
  const router = useRouter()
  const { user } = useAuth()

  const advisorId = user?.id || "Surjeet08274"

  const [services, setServices] = useState<CarServiceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [currentAdvisor] = useState("Surjeet08274")

  const [activeTab, setActiveTab] = useState<"active" | "completed">("active")
  const [layoutMode, setLayoutMode] = useState<"grid" | "horizontal">("grid")

  const [showEditModal, setShowEditModal] = useState(false)
  const [editingService, setEditingService] = useState<CarServiceRecord | null>(null)

  const [editFormData, setEditFormData] = useState({
    roDate: "",
    roNumber: "",
    status: "insurance-approval-pending",
  })

  const [pagination, setPagination] = useState<CarServicePagination>(defaultPagination)

  useEffect(() => {
    fetchServices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advisorId])

  const fetchServices = async (page = 1) => {
    setLoading(true)
    setError("")
    const response = await carServiceAPI.getServicesByAdvisor(advisorId, page, PAGE_LIMIT)

    if (response.success && response.data) {
      setServices(response.data)
      setPagination(response.pagination ?? defaultPagination)
    } else {
      setError(response.message || "Failed to fetch services")
    }
    setLoading(false)
  }

  const getStatusValue = (service: CarServiceRecord) => service.status ?? service.serviceStatus ?? ""

  const isCompleted = (service: CarServiceRecord) => {
    const status = getStatusValue(service)
    return status === "done" || status === "completed"
  }

  const filteredServices = useMemo(
    () =>
      services.filter((service) => (activeTab === "active" ? !isCompleted(service) : isCompleted(service))),
    [services, activeTab],
  )

  const counts = useMemo(
    () => ({
      active: services.filter((service) => !isCompleted(service)).length,
      completed: services.filter((service) => isCompleted(service)).length,
      total: pagination.totalCount,
    }),
    [services, pagination.totalCount],
  )

  const handleEditClick = (service: CarServiceRecord) => {
    setEditingService(service)
    setEditFormData({
      roDate: service.roDate ? new Date(service.roDate).toISOString().split("T")[0] : "",
      roNumber: service.roNumber || "",
      status: service.status || "insurance-approval-pending",
    })
    setShowEditModal(true)
  }

  const handleUpdateService = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    if (!editingService) return

    if (!editFormData.roDate || !editFormData.roNumber) {
      setError("RO Date and RO Number are required")
      return
    }

    const response = await carServiceAPI.updateService(editingService._id, {
      ...editFormData,
      changedBy: currentAdvisor,
    })

    if (response.success && response.data) {
      setServices((prev) => prev.map((service) => (service._id === editingService._id ? response.data! : service)))
      setShowEditModal(false)
      setError("")
    } else {
      setError(response.message || "Failed to update service")
    }
  }

  const handleDeleteService = async (id: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this service?")
    if (!confirmed) return

    const response = await carServiceAPI.deleteService(id)
    if (response.success) {
      setServices((prev) => prev.filter((service) => service._id !== id))
    } else {
      setError(response.message || "Failed to delete service")
    }
  }

  const handleNextPage = () => {
    if (pagination.hasNextPage) {
      fetchServices(pagination.currentPage + 1)
    }
  }

  const handlePrevPage = () => {
    if (pagination.hasPrevPage) {
      fetchServices(pagination.currentPage - 1)
    }
  }

  const handleCloseModal = () => {
    setShowEditModal(false)
    setEditingService(null)
    setError("")
  }

  const handleEditInputChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target
    setEditFormData((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <div className={cx("dashboard-container")}>
      <div className={cx("dashboard-wrapper")}>
        {/* Header with Stats */}
        <div className={cx("dashboard-header")}>
          <div>
            <h1 className={cx("dashboard-title")}>Service Dashboard</h1>
            <p className={cx("dashboard-subtitle")}>Manage and track all service records</p>
          </div>
          <div className={cx("dashboard-header-actions")}>
            <button 
              className={cx("dashboard-layout-toggle")}
              onClick={() => setLayoutMode(layoutMode === 'grid' ? 'horizontal' : 'grid')}
              title={`Switch to ${layoutMode === 'grid' ? 'horizontal' : 'grid'} view`}
            >
              {layoutMode === 'grid' ? <List size={18} /> : <Grid size={18} />}
            </button>
            <button
              className={cx("dashboard-add-button")}
              onClick={() => router.push("/dashboard/sa/create-service")}
            >
              <Plus size={20} />
              <span className="dashboard-add-button-text">Add New Service</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className={cx("dashboard-stats-grid")}>
          <div className={cx("dashboard-stat-card")}>
            <div className={cx("dashboard-stat-icon-wrapper")}>
              <TrendingUp className={cx("dashboard-stat-icon")} />
            </div>
            <div>
              <div className={cx("dashboard-stat-label")}>Total Services</div>
              <div className={cx("dashboard-stat-value")}>{counts.total}</div>
            </div>
          </div>

          <div className={cx("dashboard-stat-card")}>
            <div className={cx("dashboard-stat-icon-wrapper")} style={{ backgroundColor: '#fef3c7' }}>
              <Clock className={cx("dashboard-stat-icon")} style={{ color: '#eab308' }} />
            </div>
            <div>
              <div className={cx("dashboard-stat-label")}>Active Services</div>
              <div className={cx("dashboard-stat-value")}>{counts.active}</div>
            </div>
          </div>

          <div className={cx("dashboard-stat-card")}>
            <div className={cx("dashboard-stat-icon-wrapper")} style={{ backgroundColor: '#d1fae5' }}>
              <CheckCircle className={cx("dashboard-stat-icon")} style={{ color: '#22c55e' }} />
            </div>
            <div>
              <div className={cx("dashboard-stat-label")}>Completed</div>
              <div className={cx("dashboard-stat-value")}>{counts.completed}</div>
            </div>
          </div>

          <div className={cx("dashboard-stat-card")}>
            <div className={cx("dashboard-stat-icon-wrapper")} style={{ backgroundColor: '#e0e7ff' }}>
              <Activity className={cx("dashboard-stat-icon")} style={{ color: '#6366f1' }} />
            </div>
            <div>
              <div className={cx("dashboard-stat-label")}>Service Advisor</div>
              <div className={cx("dashboard-stat-value-small")}>{currentAdvisor}</div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className={cx("dashboard-error-alert")}>
            <AlertCircle size={20} className={cx("dashboard-alert-icon")} />
            <p className={cx("dashboard-error-text")}>{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className={cx("dashboard-tabs-container")}>
          <button
            className={cx("dashboard-tab", activeTab === "active" && "dashboard-tab-active")}
            onClick={() => setActiveTab('active')}
            data-tab="active"
          >
            <span className={cx("dashboard-tab-label")}>Active Services</span>
            <span className={cx("dashboard-tab-badge")}>{counts.active}</span>
          </button>
          <button
            className={cx("dashboard-tab", activeTab === "completed" && "dashboard-tab-active")}
            onClick={() => setActiveTab('completed')}
            data-tab="completed"
          >
            <span className={cx("dashboard-tab-label")}>Completed Services</span>
            <span className={cx("dashboard-tab-badge")}>{counts.completed}</span>
          </button>
        </div>

        {/* Services Grid */}
        {loading && <div className={cx("dashboard-loading")}>Loading service records...</div>}

        {!loading && filteredServices.length === 0 && (
          <div className={cx("dashboard-empty-state")}>
            <FileText size={48} className={cx("dashboard-empty-icon")} />
            <h3 className={cx("dashboard-empty-title")}>No {activeTab} services found</h3>
            <p className={cx("dashboard-empty-text")}>
              {activeTab === 'active' 
                ? 'All services are completed or you haven\'t added any services yet.'
                : 'No services have been completed yet.'}
            </p>
          </div>
        )}

        {!loading && filteredServices.length > 0 && (
          <>
            <div
              className={cx(
                "dashboard-services-grid",
                layoutMode === "horizontal" && "dashboard-horizontal-layout",
              )}
            >
              {filteredServices.map((service) => (
                <ServiceCard
                  key={`${service._id}-${service.status}`}
                  service={service}
                  onEdit={handleEditClick}
                  onDelete={handleDeleteService}
                  layoutMode={layoutMode}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            <div className={cx("dashboard-pagination-container")}>
              <div className={cx("dashboard-pagination-info")}>
                <span className={cx("dashboard-pagination-text")}>
                  Showing {filteredServices.length} of {pagination.totalCount} records
                </span>
                <span className={cx("dashboard-pagination-page")}>
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
              </div>
              
              <div className={cx("dashboard-pagination-buttons")}>
                <button
                  className={cx(
                    "dashboard-pagination-button",
                    "dashboard-pagination-prev",
                    !pagination.hasPrevPage && "dashboard-pagination-disabled",
                  )}
                  onClick={handlePrevPage}
                  disabled={!pagination.hasPrevPage}
                  title="Previous page"
                >
                  <ChevronLeft size={18} />
                  <span>Previous</span>
                </button>
                
                <button
                  className={cx(
                    "dashboard-pagination-button",
                    "dashboard-pagination-next",
                    !pagination.hasNextPage && "dashboard-pagination-disabled",
                  )}
                  onClick={handleNextPage}
                  disabled={!pagination.hasNextPage}
                  title="Next page"
                >
                  <span>Next</span>
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        )}

        {/* Edit Modal */}
        <EditModal
          showEditModal={showEditModal}
          editingService={editingService}
          editFormData={editFormData}
          handleEditInputChange={handleEditInputChange}
          handleUpdateService={handleUpdateService}
          handleCloseModal={handleCloseModal}
        />
      </div>
    </div>
  )
}