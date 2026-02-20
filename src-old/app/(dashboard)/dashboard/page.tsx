'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Header } from '@/components/layout/Header';
import { StatCard, Card, PageLoader } from '@/components/ui';
import { formatCurrency } from '@/lib/calculations';
import {
  HiOutlineUserGroup,
  HiOutlineUsers,
  HiOutlineCurrencyRupee,
  HiOutlineBanknotes,
  HiOutlineExclamationTriangle,
  HiOutlineCheckCircle,
  HiOutlineTrophy,
  HiOutlineArrowTrendingUp,
} from 'react-icons/hi2';
import Link from 'next/link';
import { StatusBadge } from '@/components/ui/Badge';
import { fetchDashboardData as apiFetchDashboard } from '@/lib/api';
import type { DashboardData, DashboardStats } from '@/lib/api';
import type { ChitGroup, MonthlyAuction, Payment } from '@/types';

export default function DashboardPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentAuctions, setRecentAuctions] = useState<MonthlyAuction[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [groups, setGroups] = useState<ChitGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasFetched = useRef(false);

  const loadData = useCallback(async (force = false) => {
    if (!force && (hasFetched.current || sessionStorage.getItem('dashboard-fetched'))) return;
    hasFetched.current = true;
    sessionStorage.setItem('dashboard-fetched', 'true');
    sessionStorage.setItem('dashboard-last-fetch', Date.now().toString());

    const { data } = await apiFetchDashboard();
    setStats(data.stats);
    setGroups(data.recentGroups);
    setRecentAuctions(data.recentAuctions);
    setRecentPayments(data.recentPayments);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading) loadData();
  }, [authLoading, loadData]);

  // Refresh data when tab becomes visible (if it's been more than 5 minutes)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user && !isLoading) {
        const lastFetch = sessionStorage.getItem('dashboard-last-fetch');
        if (!lastFetch || Date.now() - parseInt(lastFetch) > 5 * 60 * 1000) {
          loadData(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, isLoading, loadData]);

  if (authLoading || isLoading) {
    return (
      <>
        <Header title="Dashboard" />
        <PageLoader />
      </>
    );
  }

  return (
    <>
      <Header
        title={`Welcome, ${user?.full_name || 'User'}`}
        subtitle={isAdmin ? 'Admin Dashboard' : 'Member Dashboard'}
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
          <StatCard
            title="Active Groups"
            value={stats?.activeGroups || 0}
            icon={<HiOutlineUserGroup className="w-6 h-6" />}
            change={`${stats?.totalGroups || 0} total`}
            changeType="neutral"
          />
          <StatCard
            title="Total Members"
            value={stats?.totalMembers || 0}
            icon={<HiOutlineUsers className="w-6 h-6" />}
          />
          <StatCard
            title="Total Collected"
            value={formatCurrency(stats?.totalCollected || 0)}
            icon={<HiOutlineCurrencyRupee className="w-6 h-6" />}
            change="from contributions"
            changeType="positive"
          />
          <StatCard
            title="Total Payouts"
            value={formatCurrency(stats?.totalPayouts || 0)}
            icon={<HiOutlineBanknotes className="w-6 h-6" />}
          />
        </div>

        {/* Secondary stats */}
        {isAdmin && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-children">
            <StatCard
              title="Commission Earned"
              value={formatCurrency(stats?.totalCommissions || 0)}
              icon={<HiOutlineArrowTrendingUp className="w-6 h-6" />}
              changeType="positive"
            />
            <StatCard
              title="Pending Payments"
              value={stats?.pendingPayments || 0}
              icon={<HiOutlineExclamationTriangle className="w-6 h-6" />}
              changeType="negative"
            />
            <StatCard
              title="Completed Groups"
              value={stats?.completedGroups || 0}
              icon={<HiOutlineCheckCircle className="w-6 h-6" />}
              changeType="positive"
            />
          </div>
        )}

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Chit Groups */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-foreground">Chit Groups</h3>
              <Link
                href="/groups"
                className="text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
              >
                View All
              </Link>
            </div>
            {groups.length === 0 ? (
              <p className="text-sm text-foreground-muted py-4 text-center">No chit groups yet</p>
            ) : (
              <div className="space-y-2">
                {groups.map((group) => (
                  <Link
                    key={group.id}
                    href={`/groups/${group.id}`}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-hover transition-all border border-border hover:border-cyan-500/20"
                  >
                    <div>
                      <p className="font-medium text-foreground text-sm">{group.name}</p>
                      <p className="text-xs text-foreground-muted">
                        {formatCurrency(group.total_amount)} &middot; {group.num_members} members
                      </p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={group.status} />
                      <p className="text-xs text-foreground-muted mt-1">
                        Month {group.current_month}/{group.duration_months}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Recent Auctions */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-foreground">Recent Auctions</h3>
              <Link
                href="/auctions"
                className="text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
              >
                View All
              </Link>
            </div>
            {recentAuctions.length === 0 ? (
              <p className="text-sm text-foreground-muted py-4 text-center">No auctions completed yet</p>
            ) : (
              <div className="space-y-2">
                {recentAuctions.map((auction) => (
                  <div
                    key={auction.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400">
                        <HiOutlineTrophy className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          Month {auction.month_number}
                        </p>
                        <p className="text-xs text-foreground-muted">
                          {(auction.chit_group as ChitGroup | undefined)?.name || 'Group'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-emerald-400 text-sm">
                        {formatCurrency(auction.winner_payout || 0)}
                      </p>
                      <p className="text-xs text-foreground-muted">
                        Discount: {formatCurrency(auction.bid_amount || 0)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Recent Payments */}
        <Card padding={false}>
          <div className="flex items-center justify-between p-6 pb-0">
            <h3 className="text-base font-semibold text-foreground">Recent Payments</h3>
            <Link
              href="/payments"
              className="text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
            >
              View All
            </Link>
          </div>
          {recentPayments.length === 0 ? (
            <p className="text-sm text-foreground-muted py-8 text-center">No payment records yet</p>
          ) : (
            <div className="overflow-x-auto p-6 pt-4">
              <table className="glass-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Group</th>
                    <th>Month</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map((payment) => {
                    const memberData = payment.member as (typeof payment.member & { app_member?: { name?: string } }) | undefined;
                    const groupData = payment.chit_group as (typeof payment.chit_group & { name?: string }) | undefined;
                    return (
                      <tr key={payment.id}>
                        <td className="font-medium text-foreground">
                          {(memberData as any)?.app_member?.name || 'N/A'}
                        </td>
                        <td>{groupData?.name || 'N/A'}</td>
                        <td>{payment.month_number}</td>
                        <td className="text-foreground">
                          {formatCurrency(payment.net_payable)}
                        </td>
                        <td>
                          <StatusBadge status={payment.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
