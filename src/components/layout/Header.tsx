//src/components/layout/Header.tsx
'use client';

import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  HiOutlineBell,
  HiOutlineUserCircle,
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineArrowRightOnRectangle,
  HiOutlineChevronDown,
  HiOutlineStar,
} from 'react-icons/hi2';
import { useEffect, useRef, useState } from 'react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function Header({ title, subtitle, children }: HeaderProps) {
  const { user, logout } = useAuth();
  const [isDark, setIsDark] = useState(true);
  const [open, setOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('bidnest-theme');
    if (stored === 'light') {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    } else {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    localStorage.setItem('bidnest-theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  const displayName = user?.name || user?.username || '';
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3.5 border-b border-border"
      style={{ background: 'var(--header-bg)', backdropFilter: 'blur(12px)' }}
    >
      {/* Title */}
      <div className="min-w-0 mr-4">
        <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">{title}</h1>
        {subtitle && <p className="text-xs sm:text-sm text-foreground-muted mt-0.5 truncate">{subtitle}</p>}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {children}

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl hover:bg-surface-hover transition-colors text-foreground-muted hover:text-foreground"
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? <HiOutlineSun className="w-5 h-5" /> : <HiOutlineMoon className="w-5 h-5" />}
        </button>

        {/* GitHub link as Star*/}
        <a
          href={process.env.NEXT_PUBLIC_GITHUB_URL || 'https://Krishna-Vijay-G.github.io/Portfolio'}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-xl hover:bg-surface-hover transition-colors text-foreground-muted hover:text-foreground"
          title="Open GitHub"
        >
          <HiOutlineStar className="w-5 h-5" />
        </a>

        {/* User dropdown */}
        <div className="relative" ref={dropRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-xl glass hover:bg-surface-hover transition-all text-sm"
          >
            {/* Avatar */}
            <div className="w-7 h-7 rounded-lg bg-linear-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
              {initials}
            </div>
            <span className="text-foreground-secondary font-medium hidden sm:block max-w-27.5 truncate">
              {displayName}
            </span>
            <HiOutlineChevronDown
              className={`w-3.5 h-3.5 text-foreground-muted hidden sm:block transition-transform duration-200 ${
                open ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Dropdown panel */}
          {open && (
            <div
              className="absolute right-0 top-full mt-2 w-52 glass-strong rounded-2xl border border-border shadow-xl shadow-black/40 overflow-hidden z-50"
              style={isDark
                ? { background: 'rgba(5,5,16,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }
                : { background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }
              }
            >
              {/* User info */}
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
                <p className="text-xs text-foreground-muted truncate mt-0.5">{user?.email}</p>
              </div>

              {/* Profile */}
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground-secondary hover:bg-surface-hover hover:text-foreground transition-colors"
              >
                <HiOutlineUserCircle className="w-4 h-4 shrink-0" />
                My Profile
              </Link>

              {/* Sign out */}
              <button
                onClick={() => { setOpen(false); logout(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground-secondary hover:bg-red-500/10 hover:text-red-400 transition-colors"
              >
                <HiOutlineArrowRightOnRectangle className="w-4 h-4 shrink-0" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}