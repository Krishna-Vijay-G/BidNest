'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import { HiOutlineBell, HiOutlineUserCircle } from 'react-icons/hi2';

interface HeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function Header({ title, subtitle, children }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4 border-b border-border"
      style={{ background: 'var(--header-bg)', backdropFilter: 'blur(12px)' }}
    >
      <div>
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-foreground-muted mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {children}
        <button className="p-2 rounded-xl hover:bg-surface-hover transition-colors text-foreground-muted hover:text-foreground">
          <HiOutlineBell className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass text-sm">
          <HiOutlineUserCircle className="w-5 h-5 text-cyan-400" />
          <span className="text-foreground-secondary font-medium hidden sm:block">
            {user?.name || user?.username}
          </span>
        </div>
      </div>
    </header>
  );
}