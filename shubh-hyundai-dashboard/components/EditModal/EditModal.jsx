"use client";

import { useState, useEffect } from "react";
import { X, Calendar, FileText, Activity } from "lucide-react";
import { CURRENT_STATUS_OPTIONS } from "../constants/statusConstants";
import styles from "./EditModal.module.css";

const cx = (...names) => names.filter(Boolean).map((name) => styles[name]).join(" ");

const EditModal = ({
  showEditModal,
  editingService,
  editFormData,
  handleEditInputChange,
  handleUpdateService,
  handleCloseModal,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  useEffect(() => {
    if (!showEditModal) {
      setIsSubmitting(false);
      setErrors({});
      setTouched({});
    }
  }, [showEditModal]);

  const validateField = (name, value) => {
    switch (name) {
      case "roDate":
        if (!value) return "RO Date is required";
        if (new Date(value) > new Date()) return "RO Date cannot be in the future";
        return "";

      case "roNumber":
        if (!value?.trim()) return "RO Number is required";
        if (value.trim().length < 3) return "RO Number must be at least 3 characters";
        return "";

      case "status":
        if (!value) return "Current Status is required";
        return "";

      default:
        return "";
    }
  };

  const validateForm = () => {
    const newErrors = {};
    Object.keys(editFormData).forEach((key) => {
      const error = validateField(key, editFormData[key]);
      if (error) newErrors[key] = error;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onInputChange = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    handleEditInputChange?.(e);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await handleUpdateService?.(e);
      setErrors({});
      setTouched({});
    } catch {
      setErrors((prev) => ({
        ...prev,
        submit: "Failed to update service. Please try again.",
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!showEditModal || !editingService) return null;

  return (
    <div className={cx("edit-modal-overlay")} onClick={handleCloseModal}>
      <div className={cx("edit-modal-content")} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={cx("edit-modal-header")}>
          <h3 className={cx("edit-modal-title")}>Edit Service Record</h3>
          <button
            className={cx("edit-close-button")}
            onClick={handleCloseModal}
            disabled={isSubmitting}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} noValidate>
          <div className={cx("edit-modal-body")}>
            <div className={cx("edit-modal-info")}>
              <strong>{editingService.vehicleRegistrationNumber}</strong> –{" "}
              {editingService.vehicleModel}
            </div>

            {errors.submit && (
              <div className={cx("edit-error-message")}>
                <X size={14} /> {errors.submit}
              </div>
            )}

            {/* RO Date */}
            <div className={cx("edit-form-group")}>
              <label className={cx("edit-modal-label")}>
                <Calendar size={16} className={cx("edit-label-icon")} /> RO Date <span className={cx("required-star")}>*</span>
              </label>
              <input
                type="date"
                name="roDate"
                value={editFormData.roDate || ""}
                onChange={onInputChange}
                className={cx("edit-modal-input")}
                max={new Date().toISOString().split("T")[0]}
                disabled={isSubmitting}
              />
              {touched.roDate && errors.roDate && (
                <div className={cx("edit-error-message")}>{errors.roDate}</div>
              )}
            </div>

            {/* RO Number */}
            <div className={cx("edit-form-group")}>
              <label className={cx("edit-modal-label")}>
                <FileText size={16} className={cx("edit-label-icon")} /> RO Number <span className={cx("required-star")}>*</span>
              </label>
              <input
                type="text"
                name="roNumber"
                placeholder="RO-2024-001"
                value={editFormData.roNumber || ""}
                onChange={onInputChange}
                className={cx("edit-modal-input")}
                disabled={isSubmitting}
              />
              {touched.roNumber && errors.roNumber && (
                <div className={cx("edit-error-message")}>{errors.roNumber}</div>
              )}
            </div>

            {/* Status */}
            <div className={cx("edit-form-group")}>
              <label className={cx("edit-modal-label")}>
                <Activity size={16} className={cx("edit-label-icon")} /> Current Status <span className={cx("required-star")}>*</span>
              </label>
              <select
                name="status"
                value={editFormData.status || ""}
                onChange={onInputChange}
                className={cx("edit-modal-select")}
                disabled={isSubmitting}
              >
                <option value="">Select Status</option>
                {CURRENT_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {touched.status && errors.status && (
                <div className={cx("edit-error-message")}>{errors.status}</div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className={cx("edit-modal-footer")}>
            <button
              type="button"
              className={cx("edit-cancel-button")}
              onClick={handleCloseModal}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={cx("edit-save-button", isSubmitting && "loading")}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditModal;
