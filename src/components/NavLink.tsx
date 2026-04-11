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

  return (
    <Link
      href={disabled ? '#' : href}
      className={`nav-link ${isActive ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
    >
      {children}
    </Link>
  );
}
