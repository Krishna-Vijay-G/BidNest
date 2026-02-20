'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  HiOutlineHome,
  HiOutlineUserGroup,
  HiOutlineUsers,
  HiOutlineCurrencyRupee,
  HiOutlineBanknotes,
  HiOutlineBell,
  HiOutlineCog6Tooth,
  HiOutlineArrowRightOnRectangle,
  HiOutlineBars3,
  HiOutlineXMark,
  HiOutlineTrophy,
  HiOutlineUserCircle,
} from 'react-icons/hi2';
import { useAuth } from '@/components/providers/AuthProvider';

const adminNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: HiOutlineHome },
  { href: '/groups', label: 'Chit Groups', icon: HiOutlineUserGroup },
  { href: '/members', label: 'Members', icon: HiOutlineUsers },
  { href: '/auctions', label: 'Auctions', icon: HiOutlineTrophy },
  { href: '/payments', label: 'Payments', icon: HiOutlineCurrencyRupee },
  { href: '/transactions', label: 'Transactions', icon: HiOutlineBanknotes },
  { href: '/notifications', label: 'Notifications', icon: HiOutlineBell },
  { href: '/profile', label: 'Profile', icon: HiOutlineUserCircle },
  { href: '/settings', label: 'Settings', icon: HiOutlineCog6Tooth },
];

const memberNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: HiOutlineHome },
  { href: '/groups', label: 'My Groups', icon: HiOutlineUserGroup },
  { href: '/payments', label: 'Payments', icon: HiOutlineCurrencyRupee },
  { href: '/notifications', label: 'Notifications', icon: HiOutlineBell },
  { href: '/profile', label: 'Profile', icon: HiOutlineUserCircle },
  { href: '/settings', label: 'Settings', icon: HiOutlineCog6Tooth },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, isAdmin, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = isAdmin ? adminNavItems : memberNavItems;

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-linear-to-br from-cyan-400 to-purple-500 shadow-lg shadow-cyan-500/20">
          <span className="text-white font-black text-lg">B</span>
        </div>
        <div>
          <h1 className="text-foreground font-bold text-xl tracking-tight">
            Bid<span className="text-cyan-400">Nest</span>
          </h1>
          <p className="text-foreground-muted text-[10px] uppercase tracking-widest">Chit Fund Manager</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(0,240,255,0.1)]'
                  : 'text-foreground-muted hover:bg-surface-hover hover:text-foreground'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(0,240,255,0.6)]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-border p-4">
        <Link
          href="/profile"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 mb-3 p-2 -m-2 rounded-xl hover:bg-surface-hover transition-all"
        >
          <div className="w-9 h-9 bg-linear-to-br from-cyan-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg shadow-cyan-500/20">
            {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-foreground text-sm font-medium truncate">{user?.full_name || 'User'}</p>
            <p className="text-foreground-muted text-xs capitalize">{user?.role || 'member'}</p>
          </div>
        </Link>
        <button
          onClick={signOut}
          className="flex items-center gap-2 px-3 py-2 w-full rounded-xl text-foreground-muted hover:bg-red-500/10 hover:text-red-400 transition-all text-sm cursor-pointer"
        >
          <HiOutlineArrowRightOnRectangle className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 glass rounded-xl text-foreground-secondary hover:text-cyan-400 transition-colors cursor-pointer"
      >
        <HiOutlineBars3 className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`lg:hidden fixed top-0 left-0 h-full w-64 bg-page-alt/95 backdrop-blur-xl border-r border-border z-50 transform transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 text-foreground-muted hover:text-cyan-400 transition-colors cursor-pointer"
        >
          <HiOutlineXMark className="w-6 h-6" />
        </button>
        <NavContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block fixed top-0 left-0 h-full w-64 bg-page-alt/80 backdrop-blur-xl border-r border-border z-30">
        <NavContent />
      </aside>
    </>
  );
}
