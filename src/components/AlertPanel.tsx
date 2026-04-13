'use client';

import { useState } from 'react';

export interface Alert {
  id?: string;
  metric: string;
  previousValue: number;
  currentValue: number;
  changePercent: number;
  severity: 'warning' | 'critical';
}

interface AlertPanelProps {
  alerts: Alert[];
  onDismiss?: (metric: string) => void;
}

const metricLabels: Record<string, string> = {
  conversionRate: 'Conversion Rate',
  cartAbandonmentRate: 'Cart Abandonment Rate',
  averageOrderValue: 'Average Order Value',
  totalRevenue: 'Total Revenue',
  totalCustomers: 'Total Customers',
  refundRate: 'Refund Rate',
};

export function AlertPanel({ alerts, onDismiss }: AlertPanelProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visibleAlerts = alerts.filter(a => !dismissed.has(a.metric));

  if (visibleAlerts.length === 0) {
    return null;
  }

  const handleDismiss = (metric: string) => {
    const newDismissed = new Set(dismissed);
    newDismissed.add(metric);
    setDismissed(newDismissed);
    onDismiss?.(metric);
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
        ⚠️ Active Alerts ({visibleAlerts.length})
      </h3>
      <div style={{ display: 'grid', gap: '8px' }}>
        {visibleAlerts.map((alert) => (
          <div
            key={alert.metric}
            style={{
              background: alert.severity === 'critical' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
              border: `1px solid ${alert.severity === 'critical' ? '#ef4444' : '#f59e0b'}`,
              borderRadius: '6px',
              padding: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '13px', fontWeight: '500', color: alert.severity === 'critical' ? '#dc2626' : '#d97706' }}>
                {metricLabels[alert.metric] || alert.metric}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {alert.previousValue.toFixed(2)} → {alert.currentValue.toFixed(2)} ({alert.changePercent > 0 ? '+' : ''}{alert.changePercent.toFixed(1)}%)
              </div>
            </div>
            <button
              onClick={() => handleDismiss(alert.metric)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '4px 8px',
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
