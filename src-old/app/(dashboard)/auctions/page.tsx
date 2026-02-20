'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, PageLoader, EmptyState, StatusBadge, Select } from '@/components/ui';
import { formatCurrency } from '@/lib/calculations';
import { HiOutlineTrophy } from 'react-icons/hi2';
import Link from 'next/link';
import { fetchAuctionsPageData } from '@/lib/api';
import type { MonthlyAuction, ChitGroup } from '@/types';

export default function AuctionsPage() {
  const [auctions, setAuctions] = useState<MonthlyAuction[]>([]);
  const [groups, setGroups] = useState<ChitGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterGroup, setFilterGroup] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const hasFetched = useRef(false);

  const loadData = useCallback(async (force = false) => {
    if (!force && (hasFetched.current || sessionStorage.getItem('auctions-fetched'))) return;
    hasFetched.current = true;
    sessionStorage.setItem('auctions-fetched', 'true');
    sessionStorage.setItem('auctions-last-fetch', Date.now().toString());

    const { data } = await fetchAuctionsPageData();
    setAuctions(data.auctions);
    setGroups(data.groups);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh data when tab becomes visible (if it's been more than 5 minutes)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isLoading) {
        const lastFetch = sessionStorage.getItem('auctions-last-fetch');
        if (!lastFetch || Date.now() - parseInt(lastFetch) > 5 * 60 * 1000) {
          loadData(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isLoading, loadData]);

  const filteredAuctions = auctions.filter((a) => {
    if (filterGroup !== 'all' && a.chit_group_id !== filterGroup) return false;
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    return true;
  });

  if (isLoading) {
    return (
      <>
        <Header title="Auctions" />
        <PageLoader />
      </>
    );
  }

  return (
    <>
      <Header title="Auctions" subtitle={`${auctions.length} total auctions`} />

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="w-48">
            <Select
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              options={[
                { value: 'all', label: 'All Groups' },
                ...groups.map((g) => ({ value: g.id, label: g.name })),
              ]}
            />
          </div>
          <div className="w-48">
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'scheduled', label: 'Scheduled' },
                { value: 'open', label: 'Open' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
            />
          </div>
        </div>

        {filteredAuctions.length === 0 ? (
          <EmptyState
            icon={<HiOutlineTrophy className="w-8 h-8" />}
            title="No auctions found"
            description="Auctions will appear here once they are scheduled."
          />
        ) : (
          <Card padding={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface">
                  <tr className="text-left text-foreground-muted border-b border-border">
                    <th className="px-4 py-3 font-medium">Group</th>
                    <th className="px-4 py-3 font-medium">Month</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Winner</th>
                    <th className="px-4 py-3 font-medium">Bid Discount</th>
                    <th className="px-4 py-3 font-medium">Winner Payout</th>
                    <th className="px-4 py-3 font-medium">Commission</th>
                    <th className="px-4 py-3 font-medium">Dividend/Member</th>
                    <th className="px-4 py-3 font-medium">Eff. Contribution</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredAuctions.map((auction) => {
                    type GroupData = { name?: string };
                    type WinnerData = { app_member?: { name?: string } };
                    const groupData = auction.chit_group as GroupData | undefined;
                    const winnerData = auction.winning_member as WinnerData | undefined;
                    return (
                      <tr key={auction.id} className="hover:bg-surface-hover">
                        <td className="px-4 py-3 font-medium">
                          <Link
                            href={`/groups/${auction.chit_group_id}`}
                            className="text-cyan-400 hover:text-cyan-300"
                          >
                            {groupData?.name || 'Group'}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-foreground-secondary">{auction.month_number}</td>
                        <td className="px-4 py-3 text-foreground-muted">{auction.auction_date}</td>
                        <td className="px-4 py-3 font-medium text-foreground-secondary">
                          {winnerData?.app_member?.name || '-'}
                        </td>
                        <td className="px-4 py-3 text-foreground-secondary">{formatCurrency(auction.bid_amount || 0)}</td>
                        <td className="px-4 py-3 font-medium text-cyan-400">
                          {formatCurrency(auction.winner_payout || 0)}
                        </td>
                        <td className="px-4 py-3 text-foreground-muted">
                          {formatCurrency(auction.foreman_commission || 0)}
                        </td>
                        <td className="px-4 py-3 text-cyan-400">
                          {formatCurrency(auction.per_member_dividend || 0)}
                        </td>
                        <td className="px-4 py-3 text-foreground-secondary">
                          {formatCurrency(auction.effective_contribution || 0)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={auction.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
