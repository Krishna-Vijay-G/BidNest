'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  HiOutlineSquares2X2,
  HiOutlineUsers,
  HiOutlineUserGroup,
  HiOutlineTrophy,
  HiOutlineBanknotes,
  HiOutlineArrowRightOnRectangle,
  HiOutlineUserCircle,
  HiOutlineClipboardDocumentList,
} from 'react-icons/hi2';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: HiOutlineSquares2X2, exact: false },
  { href: '/members', label: 'Members', icon: HiOutlineUsers, exact: false },
  { href: '/groups', label: 'Chit Groups', icon: HiOutlineUserGroup, exact: false },
  { href: '/auctions', label: 'Auctions', icon: HiOutlineTrophy, exact: false },
  { href: '/payments', label: 'Payments', icon: HiOutlineBanknotes, exact: true },
  { href: '/payments/tracking', label: 'Payment Tracker', icon: HiOutlineClipboardDocumentList, exact: false },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 border-r border-border z-40"
        style={{ background: 'var(--sidebar-bg)', backdropFilter: 'blur(20px)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-linear-to-br from-cyan-400 to-purple-500 shadow-lg shadow-cyan-500/20">
            <span className="text-white font-black text-base">B</span>
          </div>
          <span className="text-foreground font-bold text-lg tracking-tight">
            Bid<span className="neon-text">Nest</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                    : 'text-foreground-secondary hover:bg-surface-hover hover:text-foreground'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-cyan-400' : ''}`} />
                {item.label}
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="px-3 py-4 border-t border-border space-y-1">
          <Link
            href="/profile"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground-secondary hover:bg-surface-hover hover:text-foreground transition-all"
          >
            <HiOutlineUserCircle className="w-5 h-5" />
            {user?.name || user?.username}
          </Link>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground-secondary hover:bg-red-500/10 hover:text-red-400 transition-all"
          >
            <HiOutlineArrowRightOnRectangle className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border px-2 py-2 flex items-center justify-around"
        style={{ background: 'var(--sidebar-bg)', backdropFilter: 'blur(20px)' }}
      >
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${
                isActive ? 'text-cyan-400' : 'text-foreground-muted'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}