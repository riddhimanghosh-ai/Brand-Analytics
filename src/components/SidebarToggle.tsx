'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function SidebarToggle() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar when route changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const toggleSidebar = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);

    // Update DOM class for overlay styling
    if (newState) {
      document.documentElement.classList.add('sidebar-open');
    } else {
      document.documentElement.classList.remove('sidebar-open');
    }
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
    document.documentElement.classList.remove('sidebar-open');
  };

  useEffect(() => {
    // Update sidebar DOM element classes
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      if (sidebarOpen) {
        sidebar.classList.add('active');
      } else {
        sidebar.classList.remove('active');
      }
    }
  }, [sidebarOpen]);

  return (
    <>
      {/* Hamburger Button */}
      <button
        className={`sidebar-hamburger ${sidebarOpen ? 'active' : ''}`}
        onClick={toggleSidebar}
        title={sidebarOpen ? 'Close menu' : 'Open menu'}
        aria-label="Toggle navigation menu"
      >
        <span />
        <span />
        <span />
      </button>

      {/* Overlay Backdrop */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay active"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Close sidebar when clicking on nav links */}
      <style jsx>{`
        :global(.sidebar.active .nav-link) {
          cursor: pointer;
        }
      `}</style>
    </>
  );
}
