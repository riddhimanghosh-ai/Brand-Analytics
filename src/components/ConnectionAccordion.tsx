'use client';

import { useState } from 'react';

interface AccordionItemProps {
  id: string;
  title: string;
  icon: string;
  isConnected: boolean;
  children: React.ReactNode;
}

export function ConnectionAccordion({ id, title, icon, isConnected, children }: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ marginBottom: '12px' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '16px 20px',
          background: 'var(--glass-bg)',
          border: `1px solid var(--glass-border)`,
          borderRadius: 'var(--radius-lg)',
          color: 'var(--text-primary)',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all var(--transition-fast)',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255, 255, 255, 0.1)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'var(--glass-bg)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--glass-border)';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <span style={{ fontSize: '20px' }}>{icon}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{title}</span>
            <span
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isConnected ? 'var(--accent-emerald)' : 'var(--accent-rose)',
              }}
              title={isConnected ? 'Connected' : 'Not connected'}
            />
          </div>
        </div>
        <span
          style={{
            fontSize: '16px',
            transition: 'transform var(--transition-fast)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          ▼
        </span>
      </button>

      {/* Accordion Content */}
      <div
        style={{
          maxHeight: isOpen ? '1000px' : '0',
          overflow: 'hidden',
          transition: 'max-height var(--transition-normal)',
        }}
      >
        <div
          style={{
            background: 'rgba(17, 24, 39, 0.4)',
            border: `1px solid rgba(255, 255, 255, 0.03)`,
            borderTop: 'none',
            borderBottomLeftRadius: 'var(--radius-lg)',
            borderBottomRightRadius: 'var(--radius-lg)',
            padding: '20px',
            marginTop: '-1px',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
