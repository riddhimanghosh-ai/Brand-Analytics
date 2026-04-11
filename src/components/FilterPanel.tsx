'use client';

import { useState } from 'react';
import type { FilterState } from '@/lib/filters';

interface FilterPanelProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  showSegmentFilter?: boolean;
  showChannelFilter?: boolean;
  showPaymentStatusFilter?: boolean;
  showFulfillmentStatusFilter?: boolean;
}

const DATE_RANGES = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '1y', label: '1 year' },
] as const;

const SEGMENTS = [
  { value: 'all', label: 'All Customers' },
  { value: 'new', label: 'New Customers' },
  { value: 'returning', label: 'Returning Customers' },
] as const;

const CHANNELS = [
  { value: 'online_store', label: 'Online Store' },
  { value: 'pos', label: 'Point of Sale' },
  { value: 'mobile_app', label: 'Mobile App' },
] as const;

const PAYMENT_STATUSES = [
  { value: 'all', label: 'All' },
  { value: 'paid', label: 'Paid' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'refunded', label: 'Refunded' },
] as const;

const FULFILLMENT_STATUSES = [
  { value: 'all', label: 'All' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: 'unfulfilled', label: 'Unfulfilled' },
  { value: 'partial', label: 'Partial' },
] as const;

export function FilterPanel({
  filters,
  onFiltersChange,
  showSegmentFilter,
  showChannelFilter,
  showPaymentStatusFilter,
  showFulfillmentStatusFilter,
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleDateRangeChange = (value: string) => {
    onFiltersChange({ ...filters, dateRange: value as any });
  };

  const handleSegmentChange = (value: string) => {
    onFiltersChange({ ...filters, segment: value as any });
  };

  const handleChannelChange = (value: string) => {
    onFiltersChange({ ...filters, channel: value });
  };

  const handlePaymentStatusChange = (value: string) => {
    onFiltersChange({ ...filters, paymentStatus: value as any });
  };

  const handleFulfillmentStatusChange = (value: string) => {
    onFiltersChange({ ...filters, fulfillmentStatus: value as any });
  };

  return (
    <div className="filter-panel">
      <button
        className="filter-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>⚙️</span> Filters {isOpen ? '▼' : '▶'}
      </button>

      {isOpen && (
        <div className="filter-content">
          {/* Date Range */}
          <div className="filter-group">
            <label className="filter-label">Date Range</label>
            <div className="filter-buttons">
              {DATE_RANGES.map((dr) => (
                <button
                  key={dr.value}
                  className={`filter-btn${filters.dateRange === dr.value ? ' active' : ''}`}
                  onClick={() => handleDateRangeChange(dr.value)}
                >
                  {dr.label}
                </button>
              ))}
            </div>
          </div>

          {/* Segment Filter */}
          {showSegmentFilter && (
            <div className="filter-group">
              <label className="filter-label">Customer Segment</label>
              <select
                value={filters.segment || 'all'}
                onChange={(e) => handleSegmentChange(e.target.value)}
                className="filter-select"
              >
                {SEGMENTS.map((seg) => (
                  <option key={seg.value} value={seg.value}>
                    {seg.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Channel Filter */}
          {showChannelFilter && (
            <div className="filter-group">
              <label className="filter-label">Sales Channel</label>
              <select
                value={filters.channel || ''}
                onChange={(e) => handleChannelChange(e.target.value)}
                className="filter-select"
              >
                <option value="">All Channels</option>
                {CHANNELS.map((ch) => (
                  <option key={ch.value} value={ch.value}>
                    {ch.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Payment Status Filter */}
          {showPaymentStatusFilter && (
            <div className="filter-group">
              <label className="filter-label">Payment Status</label>
              <select
                value={filters.paymentStatus || 'all'}
                onChange={(e) => handlePaymentStatusChange(e.target.value)}
                className="filter-select"
              >
                {PAYMENT_STATUSES.map((ps) => (
                  <option key={ps.value} value={ps.value}>
                    {ps.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Fulfillment Status Filter */}
          {showFulfillmentStatusFilter && (
            <div className="filter-group">
              <label className="filter-label">Fulfillment Status</label>
              <select
                value={filters.fulfillmentStatus || 'all'}
                onChange={(e) => handleFulfillmentStatusChange(e.target.value)}
                className="filter-select"
              >
                {FULFILLMENT_STATUSES.map((fs) => (
                  <option key={fs.value} value={fs.value}>
                    {fs.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .filter-panel {
          margin-bottom: 1.5rem;
        }

        .filter-toggle {
          padding: 0.5rem 1rem;
          background-color: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-primary);
          transition: all 0.2s ease;
        }

        .filter-toggle:hover {
          background-color: var(--bg-hover);
          border-color: var(--accent-blue);
        }

        .filter-content {
          margin-top: 1rem;
          padding: 1rem;
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .filter-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .filter-buttons {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .filter-btn {
          flex: 1;
          padding: 0.5rem;
          background-color: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--text-primary);
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .filter-btn:hover {
          background-color: var(--bg-hover);
          border-color: var(--accent-blue);
        }

        .filter-btn.active {
          background-color: var(--accent-blue);
          color: white;
          border-color: var(--accent-blue);
        }

        .filter-select {
          padding: 0.5rem;
          background-color: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: 4px;
          color: var(--text-primary);
          font-size: 0.875rem;
          cursor: pointer;
        }

        .filter-select:hover {
          border-color: var(--accent-blue);
        }

        .filter-select:focus {
          outline: none;
          border-color: var(--accent-blue);
        }
      `}</style>
    </div>
  );
}
