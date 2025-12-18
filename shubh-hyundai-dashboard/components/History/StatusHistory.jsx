import React, { useMemo, useState } from 'react';
import { Clock, User, ChevronDown, ChevronUp, History } from 'lucide-react';
import { getStatusLabel, getStatusColor } from '../constants/statusConstants';
import './StatusHistory.css';

const StatusHistory = ({ statusHistory = [], currentStatus }) => {
  const [expanded, setExpanded] = useState(false);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const allStatuses = useMemo(() => {
    const history = [...(statusHistory || [])].sort(
      (a, b) => new Date(b.changedAt) - new Date(a.changedAt)
    );

    const hasCurrentInHistory = history.length > 0 && history[0].status === currentStatus;

    const list = history.map((item, index) => ({
      ...item,
      isCurrent: index === 0 && hasCurrentInHistory
    }));

    if (!hasCurrentInHistory && currentStatus) {
      list.unshift({
        status: currentStatus,
        changedAt: new Date(),
        changedBy: 'Current',
        isCurrent: true
      });
    }

    return list;
  }, [statusHistory, currentStatus]);

  const totalCount = allStatuses.length;

  return (
    <div className="status-history-container">
      <div className="status-history-header" onClick={() => setExpanded(!expanded)}>
        <div className="status-history-title">
          <History size={16} />
          Status History ({totalCount})
        </div>
        <button className="status-history-toggle">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {expanded && (
        <div className="status-history-content">
          {totalCount === 0 ? (
            <div className="status-history-empty">
              <Clock size={14} />
              No status history available
            </div>
          ) : (
            <div className="status-history-list">
              {allStatuses.map((item, index) => (
                <div key={index} className={`status-history-item ${item.isCurrent ? 'current' : ''}`}>
                  <div className="status-indicator">
                    <div
                      className="status-dot"
                      style={{ backgroundColor: getStatusColor(item.status) || '#6b7280' }}
                    />
                    {index < allStatuses.length - 1 && (
                      <div className="status-line" />
                    )}
                  </div>

                  <div className="status-details">
                    <div className="status-info">
                      <span
                        className="status-badge"
                        style={{
                          backgroundColor: (getStatusColor(item.status) || '#6b7280') + '20',
                          color: getStatusColor(item.status) || '#6b7280',
                          border: `1px solid ${(getStatusColor(item.status) || '#6b7280')}40`
                        }}
                      >
                        {getStatusLabel(item.status)}
                      </span>
                      {item.isCurrent && (
                        <span className="current-badge">Current</span>
                      )}
                    </div>

                    <div className="status-meta">
                      <div className="status-user">
                        {/* {<User size={12} /> }
                        {{item.changedBy || 'System'}} */}
                      </div>
                      <div className="status-time">
                        <Clock size={12} />
                        {formatDate(item.changedAt)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StatusHistory;
