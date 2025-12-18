// src/constants/statusConstants.js

export const STATUS_OPTIONS = [
  { id: 1, label: 'In Progress', value: 'inprogress', color: '#f97316' },
  { id: 2, label: 'Insurance Approval Pending', value: 'insurance-approval-pending', color: '#eab308' },
  { id: 3, label: 'Insurance Survey Pending', value: 'insurance-survey-pending', color: '#8b5cf6' },
  { id: 4, label: 'Claim Intimation Pending', value: 'claim-intimation-pending', color: '#8b5cf6' },
  { id: 5, label: 'Parts Order Pending', value: 'parts-order-pending', color: '#06b6d4' },
  { id: 6, label: 'Parts Order', value: 'parts-order', color: '#a855f7' },
  { id: 7, label: 'Painting', value: 'painting', color: '#22c55e' },
  { id: 8, label: 'Denting', value: 'denting', color: '#ef4444' },
  { id: 9, label: 'Dismantling', value: 'dismantling', color: '#f59e0b' },
  { id: 10, label: 'Re-Inspection', value: 're-inspection', color: '#3b82f6' },
  { id: 11, label: 'Fitting & Polishing', value: 'fitting-polishing', color: '#10b981' },
  { id: 12, label: 'Insurance Liability Pending', value: 'insurance-liability-pending', color: '#ec4899' },
  { id: 13, label: 'Kept Open', value: 'kept-open', color: '#6b7280' },
  { id: 14, label: 'Deliver', value: 'done', color: '#22c55e' },
//   { id: 15, label: 'Completed', value: 'completed', color: '#16a34a' }
];

// Current status options (exclude "In Progress" from selection)
export const CURRENT_STATUS_OPTIONS = STATUS_OPTIONS.filter(option => option.value !== 'inprogress');

// Helper function to get status label
export const getStatusLabel = (statusValue) => {
  const status = STATUS_OPTIONS.find(s => s.value === statusValue);
  return status ? status.label : 'Delivered';
};

// Helper function to get status color
export const getStatusColor = (statusValue) => {
  const status = STATUS_OPTIONS.find(s => s.value === statusValue);
  return status ? status.color : '#22c55e';
};