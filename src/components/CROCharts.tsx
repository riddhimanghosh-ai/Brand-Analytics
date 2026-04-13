'use client';

import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface CROChartsProps {
  revenueData: Array<{ date: string; revenue: number }>;
  customersData?: { new: number; returning: number };
}

export function CROCharts({ revenueData, customersData }: CROChartsProps) {
  return (
    <>
      {/* Revenue Trend */}
      <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '20px', marginBottom: '32px' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>Daily Revenue Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis dataKey="date" stroke="var(--text-secondary)" />
            <YAxis stroke="var(--text-secondary)" />
            <Tooltip contentStyle={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }} formatter={(v) => `₹${(v as number).toLocaleString()}`} />
            <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Customer Breakdown */}
      {customersData && (
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '20px', marginBottom: '32px' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>New vs Returning Customers</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie 
                data={[
                  { name: 'New', value: customersData.new },
                  { name: 'Returning', value: customersData.returning }
                ]}
                cx="50%"
                cy="50%"
                label
              >
                <Cell fill="#3b82f6" />
                <Cell fill="#8b5cf6" />
              </Pie>
              <Tooltip formatter={(value) => (value as number).toLocaleString()} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  );
}
