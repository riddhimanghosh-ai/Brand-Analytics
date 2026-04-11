'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface DeleteBrandButtonProps {
  brandId: string;
  brandName: string;
}

export function DeleteBrandButton({ brandId, brandName }: DeleteBrandButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setLoading(true);

    try {
      const res = await fetch('/api/brands/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId }),
      });

      if (!res.ok) {
        throw new Error('Failed to delete brand');
      }

      router.refresh();
      setShowConfirm(false);
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete brand');
    } finally {
      setLoading(false);
    }
  };

  if (!showConfirm) {
    return (
      <button
        onClick={(e) => {
          e.preventDefault();
          setShowConfirm(true);
        }}
        style={{
          padding: '6px 12px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '4px',
          color: '#ef4444',
          fontSize: '12px',
          fontWeight: '500',
          cursor: 'pointer',
        }}
      >
        Delete
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999,
    }}>
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '32px',
        maxWidth: '400px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>
          Delete {brandName}?
        </h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px' }}>
          This action cannot be undone. All analytics data associated with this brand will be deleted.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setShowConfirm(false)}
            disabled={loading}
            style={{
              padding: '10px 16px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              opacity: loading ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            style={{
              padding: '10px 16px',
              background: '#ef4444',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Deleting...' : 'Delete Brand'}
          </button>
        </div>
      </div>
    </div>
  );
}
