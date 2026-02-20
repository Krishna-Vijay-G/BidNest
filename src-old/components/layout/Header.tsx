'use client';

import { useEffect, useState } from 'react';
import { HiOutlineBell, HiOutlineSun, HiOutlineMoon } from 'react-icons/hi2';
import { useAuth } from '@/components/providers/AuthProvider';
import { useTheme } from '@/components/providers/ThemeProvider';
import { fetchNotifications } from '@/lib/api';
import Link from 'next/link';

interface HeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function Header({ title, subtitle, children }: HeaderProps) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    fetchNotifications().then(({ data }) => {
      const unread = data.filter((n: any) => !n.is_read).length;
      setUnreadCount(unread);
    });
  }, [user?.id]);

  return (
    <header className="border-b border-border px-4 sm:px-6 lg:px-8 py-4 bg-page/50 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="pl-12 lg:pl-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-foreground-muted mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {children}
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 text-foreground-muted hover:text-amber-400 dark:hover:text-amber-300 transition-colors rounded-xl hover:bg-surface-hover"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <HiOutlineSun className="w-5 h-5" />
            ) : (
              <HiOutlineMoon className="w-5 h-5" />
            )}
          </button>
          <Link
            href="/notifications"
            className="relative p-2 text-foreground-muted hover:text-cyan-400 transition-colors rounded-xl hover:bg-surface-hover"
          >
            <HiOutlineBell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-cyan-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold shadow-[0_0_8px_rgba(0,240,255,0.5)]">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
          <Link
            href="/profile"
            className="hidden sm:flex items-center gap-2 pl-3 border-l border-border hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-linear-to-br from-cyan-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-xs">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <span className="text-sm font-medium text-foreground-secondary">
              {user?.full_name || 'User'}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
