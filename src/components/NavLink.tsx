'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavLinkProps {
  href: string;
  disabled?: boolean;
  disabledPlatform?: string;
  children: React.ReactNode;
  exact?: boolean;
}

export function NavLink({ href, disabled, disabledPlatform, children, exact = false }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href) && href !== '/';

  if (disabled) {
    const tooltipText = disabledPlatform
      ? `Connect ${disabledPlatform} in Settings`
      : 'Connect platform in Settings';
    return (
      <span
        className="nav-link disabled"
        title={tooltipText}
        style={{ pointerEvents: 'none', cursor: 'not-allowed', userSelect: 'none' }}
      >
        {children}
        <span style={{ marginLeft: 'auto', fontSize: '12px', opacity: 0.7 }}>🔒</span>
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={`nav-link${isActive ? ' active active-bright' : ''}`}
    >
      {children}
    </Link>
  );
}
