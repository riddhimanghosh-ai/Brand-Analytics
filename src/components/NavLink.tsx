'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavLinkProps {
  href: string;
  disabled?: boolean;
  children: React.ReactNode;
  exact?: boolean;
}

export function NavLink({ href, disabled, children, exact = false }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href) && href !== '/';

  if (disabled) {
    return (
      <span
        className="nav-link disabled"
        style={{ pointerEvents: 'none', cursor: 'default', userSelect: 'none' }}
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={`nav-link${isActive ? ' active' : ''}`}
    >
      {children}
    </Link>
  );
}
