'use client';

import Link from 'next/link';
import { useState } from 'react';

interface BrandCardProps {
  id: string;
  name: string;
  slug: string;
  shopifyStoreUrl?: string | null;
  ga4PropertyId?: string | null;
  metaAccessToken?: string | null;
  googleAdsCustomerId?: string | null;
  onDelete?: (id: string, name: string) => void;
}

export function BrandCard({
  id,
  name,
  slug,
  shopifyStoreUrl,
  ga4PropertyId,
  metaAccessToken,
  googleAdsCustomerId,
  onDelete,
}: BrandCardProps) {
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/brands/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onDelete?.(id, name);
      } else {
        alert('Failed to delete brand');
        setDeleting(false);
      }
    } catch {
      alert('Failed to delete brand');
      setDeleting(false);
    }
  };

  return (
    <div style={{
      position: 'relative',
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-color)',
      borderRadius: '8px',
      padding: '20px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    }}>
      {/* Menu Button - Outside the Link */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 20,
        }}
        onMouseLeave={() => {
          setShowDeleteMenu(false);
        }}
      >
        {showDeleteMenu ? (
          confirmDelete ? (
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid #ef4444',
              borderRadius: '6px',
              padding: '8px',
              fontSize: '11px',
              minWidth: '140px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}>
              <div style={{ marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Confirm delete <strong>{name}</strong>?
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{
                    flex: 1,
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '6px 8px',
                    fontSize: '11px',
                    cursor: deleting ? 'not-allowed' : 'pointer',
                    opacity: deleting ? 0.7 : 1,
                  }}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setConfirmDelete(false);
                  }}
                  disabled={deleting}
                  style={{
                    flex: 1,
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    padding: '6px 8px',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleDelete}
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 8px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: '500',
              }}
            >
              🗑️ Delete
            </button>
          )
        ) : (
          <button
            onMouseEnter={() => setShowDeleteMenu(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '4px 6px',
              borderRadius: '4px',
              transition: 'background 0.2s',
            }}
            onMouseOver={(e) => {
              (e.target as HTMLButtonElement).style.background = 'var(--bg-primary)';
            }}
            onMouseOut={(e) => {
              (e.target as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            ⋯
          </button>
        )}
      </div>

      {/* Card Content - Link */}
      <Link
        href={`/dashboard/${slug}`}
        style={{
          display: 'block',
          textDecoration: 'none',
          color: 'inherit',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget.parentElement as HTMLDivElement;
          if (el) {
            el.style.borderColor = 'var(--accent-blue)';
            el.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.1)';
          }
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget.parentElement as HTMLDivElement;
          if (el) {
            el.style.borderColor = 'var(--border-color)';
            el.style.boxShadow = 'none';
          }
        }}
      >
        <div className="brand-card-header">
          <div className="brand-avatar">
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3>{name}</h3>
            {shopifyStoreUrl && (
              <div className="brand-url">{shopifyStoreUrl}</div>
            )}
          </div>
        </div>
        <div className="brand-connections">
          <div className="connection-dot">
            <span className={`dot ${shopifyStoreUrl ? 'connected' : 'disconnected'}`} />
            Shopify
          </div>
          <div className="connection-dot">
            <span className={`dot ${ga4PropertyId ? 'connected' : 'disconnected'}`} />
            GA4
          </div>
          <div className="connection-dot">
            <span className={`dot ${metaAccessToken ? 'connected' : 'disconnected'}`} />
            Meta Ads
          </div>
          <div className="connection-dot">
            <span className={`dot ${googleAdsCustomerId ? 'connected' : 'disconnected'}`} />
            Google Ads
          </div>
        </div>
      </Link>
    </div>
  );
}
