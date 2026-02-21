//src/app/dashboard/page.tsx
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Header } from '@/components/layout/Header';
import { StatCard, Card, PageLoader } from '@/components/ui';
import { StatusBadge } from '@/components/ui/Badge';
import {
  HiOutlineUserGroup,
  HiOutlineUsers,
  HiOutlineCurrencyRupee,
  HiOutlineBanknotes,
  HiOutlineTrophy,
} from 'react-icons/hi2';
import { useLang } from '@/lib/i18n/LanguageContext';

interface DashboardStats {
  totalGroups: number;
  activeGroups: number;
  totalMembers: number;
  totalCollected: number;
  totalPayouts: number;
}

interface RecentAuction {
  id: string;
  month_number: number;
  original_bid: string;
  winning_amount: string;
  created_at: string;
  winner_chit_member: {
    ticket_number: number;
    member: { name: { value: string } };
  } | null;
}

interface RecentPayment {
  id: string;
  month_number: number;
  amount_paid: string;
  status: string;
  created_at: string;
  chit_member: {
    ticket_number: number;
    member: { name: { value: string } };
  };
}

interface RecentGroup {
  id: string;
  name: string;
  total_amount: string;
  total_members: number;
  status: string;
  created_at: string;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { t } = useLang();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentAuctions, setRecentAuctions] = useState<RecentAuction[]>([]);
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [recentGroups, setRecentGroups] = useState<RecentGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasFetched = useRef(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    if (hasFetched.current) return;
    hasFetched.current = true;

    try {
      const [groupsRes, membersRes, auctionsRes, paymentsRes] = await Promise.all([
        fetch(`/api/chit-groups?user_id=${user.id}`),
        fetch(`/api/members?user_id=${user.id}`),
        fetch(`/api/auctions?user_id=${user.id}`),
        fetch(`/api/payments?user_id=${user.id}`),
      ]);

      const groups = await groupsRes.json();
      const members = await membersRes.json();
      const auctions = await auctionsRes.json();
      const payments = await paymentsRes.json();

      // Guard against API returning error objects instead of arrays
      const safeGroups = Array.isArray(groups) ? groups : [];
      const safeMembers = Array.isArray(members) ? members : [];
      const safeAuctions = Array.isArray(auctions) ? auctions : [];
      const safePayments = Array.isArray(payments) ? payments : [];

      setStats({
        totalGroups: safeGroups.length,
        activeGroups: safeGroups.filter((g: any) => g.status === 'ACTIVE').length,
        totalMembers: safeMembers.length,
        totalCollected: safePayments.reduce((sum: number, p: any) => sum + Number(p.amount_paid), 0),
        totalPayouts: safeAuctions.reduce((sum: number, a: any) => sum + Number(a.winning_amount), 0),
      });

      setRecentGroups(safeGroups.slice(0, 5));
      setRecentAuctions(safeAuctions.slice(0, 5));
      setRecentPayments(safePayments.slice(0, 5));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) loadData();
  }, [authLoading, loadData]);

  if (authLoading || isLoading) {
    return (
      <>
        <Header title={t('dashboard')} />
        <PageLoader />
      </>
    );
  }

  return (
    <>
      <Header
        title={`${user?.name || user?.username}`}
        subtitle={t('dashboardSubtitle')}
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
          <StatCard
            title={t('activeGroups')}
            
            value={stats?.activeGroups || 0}
            icon={<HiOutlineUserGroup className="w-6 h-6" />}  
            changeType="neutral"
          />
          <StatCard
            title={t('totalMembers')}
            value={stats?.totalMembers || 0}
            icon={<HiOutlineUsers className="w-6 h-6" />}
          />
          <StatCard
            title={t('totalCollected')}
            value={formatCurrency(stats?.totalCollected || 0)}
            icon={<HiOutlineCurrencyRupee className="w-6 h-6" />}
            changeType="positive"
          />
          <StatCard
            title={t('totalPayouts')}
            value={formatCurrency(stats?.totalPayouts || 0)}
            icon={<HiOutlineBanknotes className="w-6 h-6" />}
          />
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Chit Groups */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-foreground">{t('groups')}</h3>
            </div>
            {recentGroups.length === 0 ? (
              <p className="text-sm text-foreground-muted py-4 text-center">{t('noGroups')}</p>
            ) : (
              <div className="space-y-2">
                {recentGroups.map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border"
                  >
                    <div>
                      <p className="font-medium text-foreground text-sm">
                        {group.name || formatCurrency(Number(group.total_amount))}
                      </p>
                      <p className="text-xs text-foreground-muted">
                        {formatCurrency(Number(group.total_amount))} · {group.total_members} {t('members')}
                      </p>
                    </div>
                    <StatusBadge
                      status={group.status}
                      label={t((`status${group.status[0] + group.status.slice(1).toLowerCase()}`) as any)}
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Recent Auctions */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-foreground">{t('auctions')}</h3>
            </div>
            {recentAuctions.length === 0 ? (
              <p className="text-sm text-foreground-muted py-4 text-center">{t('noAuctions')}</p>
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
                          {t('month')} {auction.month_number}
                        </p>
                        <p className="text-xs text-foreground-muted">
                          {t('winner')}: {auction.winner_chit_member?.member?.name?.value || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-emerald-400 text-sm">
                        {formatCurrency(Number(auction.winning_amount))}
                      </p>
                      <p className="text-xs text-foreground-muted">
                        {t('originalBid')}: {formatCurrency(Number(auction.original_bid))}
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
          <div className="flex items-center justify-between p-6 pb-4">
            <h3 className="text-base font-semibold text-foreground">{t('payments')}</h3>
          </div>
          {recentPayments.length === 0 ? (
            <p className="text-sm text-foreground-muted py-8 text-center">{t('noPayments')}</p>
          ) : (
            <div className="overflow-x-auto px-6 pb-6">
              <table className="glass-table w-full">
                <thead>
                  <tr>
                    <th>{t('memberName')}</th>
                    <th>{t('ticketNumber')}</th>
                    <th>{t('month')}</th>
                    <th>{t('amountPaid')}</th>
                    <th>{t('status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="font-medium text-foreground">
                        {payment.chit_member?.member?.name?.value || 'N/A'}
                      </td>
                      <td>#{payment.chit_member?.ticket_number}</td>
                      <td>{payment.month_number}</td>
                      <td className="text-foreground">
                        {formatCurrency(Number(payment.amount_paid))}
                      </td>
                      <td>
                        <StatusBadge
                          status={payment.status}
                          label={t((`status${payment.status[0] + payment.status.slice(1).toLowerCase()}`) as any)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}