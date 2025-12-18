import React from 'react';
import { Edit2, Trash2, Car, User, Wrench, FileText, Activity, Clock } from 'lucide-react';
import { getStatusLabel, getStatusColor } from '../constants/statusConstants';
import StatusHistory from '../History/StatusHistory';
import './ServiceCard.css';

const ServiceCard = ({ service, onEdit, onDelete, layoutMode = 'grid' }) => {
  // Date formatting utility
  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return 'Invalid Date';
      
      return dateObj.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid Date';
    }
  };

  // Safe value getter with fallback
  const getValue = (value, fallback = 'N/A') => {
    return value && value.trim() !== '' ? value : fallback;
  };

  const getDaysSince = (date) => {
    if (!date) return 'N/A';
    const from = new Date(date);
    if (isNaN(from.getTime())) return 'N/A';
    const now = new Date();
    const msPerDay = 1000 * 60 * 60 * 24;
    const days = Math.max(0, Math.floor((now.getTime() - from.getTime()) / msPerDay));
    return String(days);
  };

  // Helpers
  const isCompletedStatus = React.useCallback(
    (value) => value === 'done' || value === 'completed',
    []
  );

  // Header badge: always show "In Progress" for active items, "Completed" for completed items
  const headerStatusValue = React.useMemo(
    () => (isCompletedStatus(service?.status) ? 'completed' : 'inprogress'),
    [service?.status, isCompletedStatus]
  );
  const headerStatusLabel = React.useMemo(
    () => getStatusLabel(headerStatusValue),
    [headerStatusValue]
  );
  const headerStatusColor = React.useMemo(
    () => getStatusColor(headerStatusValue),
    [headerStatusValue]
  );

  // Body current status (actual current status)
  const currentStatusLabel = React.useMemo(() => getStatusLabel(service?.status), [service?.status]);
  const currentStatusColor = React.useMemo(() => getStatusColor(service?.status), [service?.status]);

  // Handle edit action
  const handleEdit = () => {
    if (onEdit && typeof onEdit === 'function') {
      onEdit(service);
    }
  };

  // Handle delete action
  const handleDelete = () => {
    if (onDelete && typeof onDelete === 'function' && service?._id) {
      // Add confirmation for better UX
      if (window.confirm('Are you sure you want to delete this service record?')) {
        onDelete(service._id);
      }
    }
  };

  // Validate service object
  if (!service) {
    return (
      <div className="service-card" style={{ padding: '20px', textAlign: 'center' }}>
        <p style={{ color: '#6b7280' }}>No service data available</p>
      </div>
    );
  }

  return (
    <div className={`service-card ${layoutMode === 'horizontal' ? 'service-card-horizontal' : ''}`}>
      {/* Card Header */}
      <div className="service-card-header">
        <div className="service-card-header-left">
          <div className="service-card-date-wrapper">
            {/* Header Status Badge */}
            <span 
              className="service-status-badge"
              style={{
                backgroundColor: `${headerStatusColor}15`,
                color: headerStatusColor,
                borderColor: headerStatusColor
              }}
              title={`Current Status: ${headerStatusLabel}`}
            >
              {headerStatusLabel}
            </span>
            {/* Service Date */}
            <span className="service-card-date" title="Service Date">
              {formatDate(service.serviceDate)}
            </span>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="service-card-actions">
          <button 
            className="service-icon-button"
            onClick={handleEdit}
            title="Edit Service"
            aria-label={`Edit service for ${getValue(service.vehicleRegistrationNumber)}`}
            disabled={!onEdit}
          >
            <Edit2 size={18} strokeWidth={2.5} />
          </button>
          <button 
            className="service-icon-button service-icon-button-danger"
            onClick={handleDelete}
            title="Delete Service"
            aria-label={`Delete service for ${getValue(service.vehicleRegistrationNumber)}`}
            disabled={!onDelete || !service._id}
          >
            <Trash2 size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Card Body - Information Grid */}
      <div className="service-card-body">
        {/* Vehicle Information */}
        <div className="service-card-row">
          <div className="service-card-icon-wrapper">
            <Car size={20} className="service-card-icon" />
          </div>
          <div className="service-card-content">
            <div className="service-card-label">Vehicle</div>
            <div className="service-card-value">
              {getValue(service.vehicleRegistrationNumber)}
            </div>
            {service.vehicleModel && (
              <div className="service-card-subtext">
                {getValue(service.vehicleModel)}
              </div>
            )}
          </div>
        </div>

        {/* Owner Information */}
        <div className="service-card-row">
          <div className="service-card-icon-wrapper">
            <User size={20} className="service-card-icon" />
          </div>
          <div className="service-card-content">
            <div className="service-card-label">Owner</div>
            <div className="service-card-value">
              {getValue(service.ownerName)}
            </div>
            {service.contactInfo && (
              <div className="service-card-subtext">
                {getValue(service.contactInfo)}
              </div>
            )}
          </div>
        </div>

        {/* Type of Work */}
        <div className="service-card-row">
          <div className="service-card-icon-wrapper">
            <Wrench size={20} className="service-card-icon" />
          </div>
          <div className="service-card-content">
            <div className="service-card-label">Type of Work</div>
            <div className="service-card-value">
              {getValue(service.typeOfWork)}
            </div>
          </div>
        </div>

        {/* No. of Days */}
        <div className="service-card-row">
          <div className="service-card-icon-wrapper">
            <Clock size={20} className="service-card-icon" />
          </div>
          <div className="service-card-content">
            <div className="service-card-label">No. of days</div>
            <div className="service-card-value">
              {getDaysSince(service.serviceDate)}
            </div>
            <div className="service-card-subtext">Since service registration</div>
          </div>
        </div>

        {/* Current Status */}
        <div className="service-card-row">
          <div className="service-card-icon-wrapper">
            <Activity size={20} className="service-card-icon" />
          </div>
          <div className="service-card-content">
            <div className="service-card-label">Current Status</div>
            <div 
              className="service-status-box"
              style={{ 
                backgroundColor: `${currentStatusColor}15`,
                color: currentStatusColor,
                borderColor: currentStatusColor
              }}
              title={`Current Status: ${currentStatusLabel}`}
            >
              {currentStatusLabel}
            </div>
          </div>
        </div>

        {/* RO Number Section */}
        <div className="service-card-row">
          <div className="service-card-icon-wrapper">
            <FileText size={20} className="service-card-icon" />
          </div>
          <div className="service-card-content">
            <div className="service-card-label">RO Number</div>
            <div className="service-card-value">
              {service.roNumber ? getValue(service.roNumber) : 'RO Number not mentioned'}
            </div>
            <div className="service-card-subtext">
              {service.roDate ? formatDate(service.roDate) : 'RO Date not mentioned'}
            </div>
          </div>
        </div>

        {/* Additional Information (if available) */}
        {service.additionalNotes && (
          <div className="service-card-row" style={{ gridColumn: '1 / -1' }}>
            <div className="service-card-icon-wrapper">
              <Activity size={20} className="service-card-icon" />
            </div>
            <div className="service-card-content">
              <div className="service-card-label">Notes</div>
              <div className="service-card-subtext">
                {getValue(service.additionalNotes)}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Status History Section */}
      {(Array.isArray(service.statusHistory) || service.status) && (
        <StatusHistory 
          statusHistory={Array.isArray(service.statusHistory) ? service.statusHistory : []} 
          currentStatus={service.status}
        />
      )}
    </div>
  );
};

// Default props for better error handling
ServiceCard.defaultProps = {
  layoutMode: 'grid',
  service: {},
  onEdit: null,
  onDelete: null
};

export default ServiceCard;