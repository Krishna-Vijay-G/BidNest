//src/components/layout/Sidebar.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { HiOutlineStar } from 'react-icons/hi2';
import { usePathname } from 'next/navigation';
import {
  HiOutlineSquares2X2,
  HiOutlineUsers,
  HiOutlineUserGroup,
  HiOutlineTrophy,
  HiOutlineBanknotes,
  HiOutlineClipboardDocumentList,
} from 'react-icons/hi2';
import { useLang } from '@/lib/i18n/LanguageContext';

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useLang();

  const navItems = [
    { href: '/dashboard', labelKey: 'dashboard' as const, icon: HiOutlineSquares2X2, exact: false },
    { href: '/members', labelKey: 'members' as const, icon: HiOutlineUsers, exact: false },
    { href: '/groups', labelKey: 'groups' as const, icon: HiOutlineUserGroup, exact: false },
    { href: '/auctions', labelKey: 'auctions' as const, icon: HiOutlineTrophy, exact: false },
    { href: '/payments', labelKey: 'payments' as const, icon: HiOutlineBanknotes, exact: true },
    { href: '/payments/tracking', labelKey: 'tracking' as const, icon: HiOutlineClipboardDocumentList, extra: true, exact: false },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="sidebar-glass hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 border-r border-border z-40">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
          <Image
            src="/icons/icon-96x96.png"
            alt="BidNest"
            width={36}
            height={36}
            className="rounded-xl shadow-lg shadow-cyan-500/20"
          />
          <span className="text-foreground font-bold text-lg tracking-tight">
            Bid<span className="neon-text">Nest</span>
          </span>
          <a
            href={process.env.NEXT_PUBLIC_GITHUB_URL || 'https://Krishna-Vijay-G.github.io/Portfolio'}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto p-1.5 rounded-xl hover:bg-surface-hover transition-colors text-foreground-muted hover:text-yellow-400"
            title="Founder Page"
          >
            <HiOutlineStar className="w-4 h-4" />
          </a>
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
                {t(item.labelKey)}
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400" />
                )}
              </Link>
            );
          })}
        </nav>

      </aside>

      {/* Mobile Bottom Nav */}
      <nav
        className="sidebar-glass lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border flex items-center justify-around px-1 py-1.5"
      >
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 flex-1 py-1.5 rounded-xl transition-all ${
                isActive ? 'text-cyan-400' : 'text-foreground-muted'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium leading-tight text-center">
                {t(item.labelKey)}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}