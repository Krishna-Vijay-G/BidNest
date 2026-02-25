//src/app/auctions/page.tsx
 'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { Header } from '@/components/layout/Header';
import { Card, Button, Modal, Input, PageLoader, EmptyState, Select } from '@/components/ui';
import { HiOutlineTrophy, HiOutlinePlus } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { calculateAuction } from '@/utils/dividend';
import { useLang } from '@/lib/i18n/LanguageContext';

interface ChitGroup {
  id: string;
  name: string;
  total_amount: string;
  total_members: number;
  monthly_amount: string;
  commission_type: 'PERCENT' | 'FIXED';
  commission_value: string;
  round_off_value: number;
  status: string;
  duration_months: number;
}

interface ChitMember {
  id: string;
  ticket_number: number;
  member: {
    name: { value: string };
  };
}

interface Auction {
  id: string;
  chit_group_id: string;
  month_number: number;
  original_bid: string;
  winning_amount: string;
  commission: string;
  carry_previous: string;
  raw_dividend: string;
  roundoff_dividend: string;
  carry_next: string;
  calculation_data: {
    amount_to_collect: number;
    dividend_per_member: number;
    monthly_contribution: number;
  };
  created_at: string;
  winner_chit_member_id?: string;
  winner_chit_member?: {
    id?: string;
    ticket_number: number;
    member: { name: { value: string } };
  };
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function AuctionsPage() {
  const { user } = useAuth();
  const { t } = useLang();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [groups, setGroups] = useState<ChitGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterGroup, setFilterGroup] = useState('all');
  const [groupStatusFilter, setGroupStatusFilter] = useState('ACTIVE');
  const hasFetched = useRef(false);

  // Load filters from localStorage on mount
  useEffect(() => {
    const savedFilterGroup = localStorage.getItem('auctions-filterGroup');
    const savedGroupStatus = localStorage.getItem('auctions-groupStatusFilter');
    
    if (savedFilterGroup) {
      setFilterGroup(savedFilterGroup);
    }
    if (savedGroupStatus) {
      setGroupStatusFilter(savedGroupStatus);
    }
  }, []);

  // Custom setters for filters that save to localStorage
  const updateFilterGroup = (value: string) => {
    setFilterGroup(value);
    localStorage.setItem('auctions-filterGroup', value);
  };

  const updateGroupStatusFilter = (value: string) => {
    setGroupStatusFilter(value);
    localStorage.setItem('auctions-groupStatusFilter', value);
  };

  const loadData = useCallback(async (force = false) => {
    if (!user) return;
    if (!force && hasFetched.current) return;
    hasFetched.current = true;
    try {
      const [auctionsRes, groupsRes] = await Promise.all([
        fetch(`/api/auctions?user_id=${user.id}`),
        fetch(`/api/chit-groups?user_id=${user.id}`),
      ]);
      const auctionsData = await auctionsRes.json();
      const groupsData = await groupsRes.json();
      setAuctions(Array.isArray(auctionsData) ? auctionsData : []);
      setGroups(Array.isArray(groupsData) ? groupsData : []);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshData = useCallback(async () => {
    if (!user) return;
    const [auctionsRes, groupsRes] = await Promise.all([
      fetch(`/api/auctions?user_id=${user.id}`),
      fetch(`/api/chit-groups?user_id=${user.id}`),
    ]);
    const a = await auctionsRes.json();
    const g = await groupsRes.json();
    setAuctions(Array.isArray(a) ? a : []);
    setGroups(Array.isArray(g) ? g : []);
  }, [user]);

  // If no specific group is selected, limit auctions to groups matching selected status
  const allowedGroupIds = new Set(
    groups
      .filter((g) => (groupStatusFilter === 'all' ? true : g.status === groupStatusFilter))
      .map((g) => g.id)
  );

  const filteredAuctions = auctions
    .filter((a) =>
      filterGroup === 'all' ? allowedGroupIds.has(a.chit_group_id) : a.chit_group_id === filterGroup
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Build a localized label for the "All groups" option depending on status
  const getAllGroupsLabel = (status: string) => {
    if (status === 'all') return t('allGroups');
    if (status === 'ACTIVE') return `${t('all')} ${t('statusActive')} ${t('groups')}`;
    if (status === 'PENDING') return `${t('all')} ${t('statusPending')} ${t('groups')}`;
    if (status === 'COMPLETED') return `${t('all')} ${t('statusCompleted')} ${t('groups')}`;
    if (status === 'CANCELLED') return `${t('all')} ${t('statusCancelled')} ${t('groups')}`;
    return t('allGroups');
  };

  if (isLoading) {
    return (
      <>
        <Header title={t('auctions')} />
        <PageLoader />
      </>
    );
  }

  return (
    <>
      <Header
        title={t('auctions')}
        subtitle={t('totalAuctions').replace('{count}', String(auctions.length))}
      >
        <Button
          icon={<HiOutlinePlus className="w-4 h-4" />}
          onClick={() => setShowCreateModal(true)}
        >
          {t('conductAuction')}
        </Button>
      </Header>

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Filter */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="w-48">
            <Select
              value={groupStatusFilter}
              onChange={(e) => {
                updateGroupStatusFilter(e.target.value);
                // reset group selection when status changes
                updateFilterGroup('all');
              }}
              options={[
                { value: 'ACTIVE', label: t('statusActive') },
                { value: 'PENDING', label: t('statusPending') },
                { value: 'COMPLETED', label: t('statusCompleted') },
                { value: 'CANCELLED', label: t('statusCancelled') },
                    { value: 'all', label: t('allStatus') },
              ]}
            />
          </div>

          <div className="w-64">
            <Select
              value={filterGroup}
              onChange={(e) => updateFilterGroup(e.target.value)}
              options={[
                { value: 'all', label: getAllGroupsLabel(groupStatusFilter) },
                ...groups
                  .filter((g) => (groupStatusFilter === 'all' ? true : g.status === groupStatusFilter))
                  .map((g) => ({
                    value: g.id,
                    label: `${g.name} — ${formatCurrency(Number(g.total_amount))}`,
                  })),
              ]}
            />
          </div>
        </div>

        {filteredAuctions.length === 0 ? (
          <EmptyState
            icon={<HiOutlineTrophy className="w-8 h-8" />}
            title={t('noAuctions')}
            description={t('noAuctionsDescription')}
          />
        ) : (
          <Card padding={false}>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="glass-table w-full">
                <thead>
                  <tr>
                    <th>{t('group')}</th>
                    <th>{t('winner')}</th>
                    <th>{t('originalBid')}</th>
                    <th>{t('winnerPayout')}</th>
                    <th>{t('commission')}</th>
                    <th>{t('carryFromPrev')}</th>
                    <th>{t('dividend')}</th>
                    <th>{t('roundoffDividend')}</th>
                    <th>{t('carryNext')}</th>
                    <th>{t('perMember')}</th>
                    <th>{t('toCollect')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAuctions.map((auction) => {
                    const group = groups.find(g => g.id === auction.chit_group_id);
                    const winnerId = auction.winner_chit_member?.id ?? auction.winner_chit_member_id;
                    return (
                      <tr key={auction.id}>
                        <td className="font-medium text-foreground">
                          <div className="flex flex-col">
                            <span>
                              {group?.id ? (
                                <Link href={`/groups/${group.id}`} className="font-medium hover:underline">
                                  {group.name}
                                </Link>
                              ) : (
                                'N/A'
                              )}
                            </span>
                            <span className="text-xs text-foreground-muted">{t('month')} {auction.month_number}</span>
                          </div>
                        </td>
                        <td className="font-medium text-foreground">
                          {winnerId ? (
                            <>
                              <Link href={`/members/${winnerId}`} className="font-medium hover:underline">
                                {auction.winner_chit_member?.member?.name?.value || 'N/A'}
                              </Link>{' '}
                              <span className="text-green-400 font-semibold">#{auction.winner_chit_member?.ticket_number}</span>
                            </>
                          ) : (
                            <>{auction.winner_chit_member?.member?.name?.value || 'N/A'} <span className="text-green-400 font-semibold">#{auction.winner_chit_member?.ticket_number}</span></>
                          )}
                        </td>
                        <td>
                          <span className="text-blue-400 font-semibold">
                            {formatCurrency(Number(auction.original_bid))}
                          </span>
                        </td>
                        <td>
                          <span className="text-emerald-400 font-semibold">
                            {formatCurrency(Number(auction.winning_amount))}
                          </span>
                        </td>
                        <td>
                          <span className="text-red-400 font-semibold">
                            {formatCurrency(Number(auction.commission))}
                          </span>
                        </td>
                        <td>
                          <span className="text-foreground-muted font-semibold">
                            {formatCurrency(Number(auction.carry_previous))}
                          </span>
                        </td>
                        <td>
                          <span className="text-foreground-secondary font-semibold">
                            {formatCurrency(Number(auction.raw_dividend))}
                          </span>
                        </td>
                        <td>
                          <span className="text-cyan-400 font-semibold">
                            {formatCurrency(Number(auction.roundoff_dividend))}
                          </span>
                        </td>
                        <td>
                          <span className="text-amber-400 font-semibold">
                            {formatCurrency(Number(auction.carry_next))}
                          </span>
                        </td>
                        <td>
                          <span className="text-purple-400 font-semibold">
                            {formatCurrency(auction.calculation_data?.dividend_per_member || 0)}
                          </span>
                        </td>
                        <td>
                          <span className="font-semibold text-foreground">
                            {formatCurrency(auction.calculation_data?.amount_to_collect || 0)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile table */}
            <div className="md:hidden">
              <table className="glass-table w-full">
                <thead>
                  <tr>
                    <th>{t('group')}</th>
                    <th>{t('winner')}</th>
                    <th>{t('originalBid')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAuctions.map((auction) => (
                    <AuctionMobileRow key={auction.id} auction={auction} groups={groups} />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Create Auction Modal */}
      <AuctionFormModal
        isOpen={showCreateModal}
        groups={groups}
        auctions={auctions}
        onClose={() => setShowCreateModal(false)}
        onSaved={() => {
          setShowCreateModal(false);
          refreshData();
        }}
      />
    </>
  );
}

// ─── Auction Form Modal ─────────────────────────────────────────────────────

function AuctionFormModal({
  isOpen,
  groups,
  auctions,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  groups: ChitGroup[];
  auctions: Auction[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLang();
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [monthNumber, setMonthNumber] = useState('');
  const [originalBid, setOriginalBid] = useState('');
  const [isLastMonthFixed, setIsLastMonthFixed] = useState(false);
  const [winnerChitMemberId, setWinnerChitMemberId] = useState('');
  const [chitMembers, setChitMembers] = useState<ChitMember[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [carryPrevious, setCarryPrevious] = useState(0);
  const [groupAuctions, setGroupAuctions] = useState<any[]>([]);
  const [availableMembers, setAvailableMembers] = useState<ChitMember[]>([]);
  const [auctionDate, setAuctionDate] = useState('');

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  // load chit members and last carry_previous when group selected
  useEffect(() => {
    if (!selectedGroupId) return;
    Promise.all([
      fetch(`/api/chit-members?chit_group_id=${selectedGroupId}`).then((r) => r.json()),
      fetch(`/api/auctions?chit_group_id=${selectedGroupId}`).then((r) => r.json()),
    ]).then(([members, auctions]) => {
      const membersList = Array.isArray(members) ? members : [];
      const auctionsList = Array.isArray(auctions) ? auctions : [];
      setChitMembers(membersList);
      setGroupAuctions(auctionsList);
      if (auctionsList.length > 0) {
        const lastAuction = auctionsList.reduce((a: any, b: any) =>
          a.month_number > b.month_number ? a : b
        );
        setCarryPrevious(Number(lastAuction.carry_next));
        setMonthNumber(String(lastAuction.month_number + 1));
      } else {
        setCarryPrevious(0);
        setMonthNumber('1');
      }
    });
  }, [selectedGroupId]);

  // Initialize auction date when modal opens
  useEffect(() => {
    if (isOpen) {
      setAuctionDate(new Date().toISOString().slice(0, 10));
    }
  }, [isOpen]);

  // When group or monthNumber changes, determine if this is the last month
  // and if so, auto-fill & lock the original bid to the commission cap.
  useEffect(() => {
    const group = groups.find((g) => g.id === selectedGroupId);
    if (!group || !monthNumber) {
      setIsLastMonthFixed(false);
      return;
    }

    const isLast = Number(monthNumber) === Number(group.duration_months);
    if (!isLast) {
      setIsLastMonthFixed(false);
      return;
    }

    // compute cap: fixed commission value, or percent of total_amount
    const cap =
      group.commission_type === 'FIXED'
        ? Number(group.commission_value)
        : Math.floor((Number(group.total_amount) * Number(group.commission_value)) / 100);

    setOriginalBid(String(cap));
    setIsLastMonthFixed(true);
  }, [selectedGroupId, monthNumber, groups]);

  // compute available members (exclude tickets that already won)
  useEffect(() => {
    const winners = new Set<string>();
    for (const a of groupAuctions) {
      const wid = a && (a.winner_chit_member_id || (a.winner_chit_member && a.winner_chit_member.id));
      if (wid) winners.add(String(wid));
    }
    const available = (chitMembers || []).filter((cm) => !winners.has(cm.id));
    setAvailableMembers(available);
    if (winnerChitMemberId && !available.find((m) => m.id === winnerChitMemberId)) {
      setWinnerChitMemberId('');
    }
  }, [chitMembers, groupAuctions]);

  // calculate preview
  useEffect(() => {
    if (!selectedGroupId || !originalBid || !monthNumber) {
      setPreview(null);
      return;
    }
    const group = groups.find((g) => g.id === selectedGroupId);
    if (!group) return;

    const isFinalMonth = Number(monthNumber) === Number(group.duration_months);
    const calc = calculateAuction({
      total_amount: Number(group.total_amount),
      total_members: group.total_members,
      original_bid: Number(originalBid),
      commission_type: group.commission_type,
      commission_value: Number(group.commission_value),
      round_off_value: group.round_off_value,
      carry_previous: carryPrevious,
      no_round_off: isFinalMonth,
    });

    // per_member_dividend now returned directly by calculateAuction
    const dividend_per_member = calc.per_member_dividend;
    const monthly_due = Number(group.monthly_amount) - dividend_per_member;

    // Force final-month preview to show zero carry (no next month)
    setPreview({
      ...calc,
      dividend_per_member,
      monthly_due,
      total_members: group.total_members,
      carry_next: isFinalMonth ? 0 : calc.carry_next,
      roundoff_dividend: isFinalMonth ? calc.raw_dividend : calc.roundoff_dividend,
      winner_payout: calc.winning_amount - monthly_due,
    });
  }, [selectedGroupId, originalBid, monthNumber, groups, carryPrevious]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validate bid is not below commission
    const group = groups.find(g => g.id === selectedGroupId);
    if (group) {
      const commissionCap =
        group.commission_type === 'FIXED'
          ? Number(group.commission_value)
          : Math.floor((Number(group.total_amount) * Number(group.commission_value)) / 100);
      
      if (Number(originalBid) < commissionCap) {
        toast.error(`Bid cannot be less than the commission amount: ₹${commissionCap}`);
        setIsSubmitting(false);
        return;
      }
    }

    const res = await fetch('/api/auctions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chit_group_id: selectedGroupId,
        month_number: Number(monthNumber),
        winner_chit_member_id: winnerChitMemberId,
        original_bid: Number(originalBid),
        date: auctionDate,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      toast.error(data.error || 'Failed to create auction');
    } else {
      toast.success('Auction created!');
      onSaved();
    }

    setIsSubmitting(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('conductAuction')} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Chit Group"
          value={selectedGroupId}
          onChange={(e) => {
            setSelectedGroupId(e.target.value);
            setWinnerChitMemberId('');
          }}
          options={[
            { value: '', label: t('selectGroup') },
              // only active groups with remaining auctions should be available
              ...groups
                .filter((g) => {
                  if (g.status !== 'ACTIVE') return false;
                  const conducted = auctions.filter((a) => a.chit_group_id === g.id).length;
                  // keep if conducted auctions are less than the group's duration
                  return conducted < (g.duration_months ?? Infinity);
                })
                .map((g) => ({
                  value: g.id,
                  label: `${g.name} — ${formatCurrency(Number(g.total_amount))} · ${g.total_members}M`,
                })),
          ]}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t('monthNumber')}
            type="number"
            value={monthNumber}
            onChange={(e) => setMonthNumber(e.target.value)}
            placeholder="e.g. 1"
            required
          />
          <Input
            label={t('originalBid')}
            type="number"
            value={originalBid}
            onChange={(e) => setOriginalBid(e.target.value)}
            disabled={isLastMonthFixed}
            placeholder="e.g. 643"
            required
            helperText={isLastMonthFixed ? t('lastMonthBidFixed') : undefined}
          />
        </div>

        <Select
          label={t('winner')}
          value={winnerChitMemberId}
          onChange={(e) => setWinnerChitMemberId(e.target.value)}
          options={
            availableMembers.length === 0
              ? [{ value: '', label: t('noEligibleTickets') }]
              : [
                  { value: '', label: t('selectWinner') },
                  ...availableMembers.map((cm) => ({
                    value: cm.id,
                    label: `#${cm.ticket_number} — ${cm.member?.name?.value || 'Unknown'}`,
                  })),
                ]
          }
          required={availableMembers.length > 0}
        />

        <Input
          label={t('date')}
          type="date"
          value={auctionDate}
          onChange={(e) => setAuctionDate(e.target.value)}
        />

        {carryPrevious > 0 && (
          <p className="text-xs text-amber-400">{t('carryFromPrev')}: {formatCurrency(carryPrevious)}</p>
        )}

        {/* Preview */}
        {preview && (
          <div className="bg-surface border border-border rounded-xl p-4">
            <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-3">
              {t('calculationPreview')}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <p className="text-xs text-foreground-muted">{t('winnerPayout')}</p>
                <p className="text-sm font-semibold text-emerald-400">
                  {formatCurrency(preview.winning_amount)}
                  <span className="text-xs text-foreground-muted ml-2">(- {formatCurrency(preview.monthly_due)})</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-foreground-muted">{t('originalBid')}</p>
                <p className="text-sm font-semibold text-foreground">{formatCurrency(Number(originalBid))}</p>
              </div>
              <div>
                <p className="text-xs text-foreground-muted">{t('commission')}</p>
                <p className="text-sm font-semibold text-red-400">{formatCurrency(preview.commission)}</p>
              </div>
              <div>
                <p className="text-xs text-foreground-muted">{t('rawDividend')}</p>
                <p className="text-sm font-semibold text-foreground">
                  {formatCurrency(preview.raw_dividend)}
                  {preview.carry_previous > 0 && (
                    <span className="text-xs text-foreground-muted ml-2">({formatCurrency(Number(originalBid) - preview.commission)} + {formatCurrency(preview.carry_previous)})</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-foreground-muted">{t('rawPerMemberDiv')}</p>
                <p className="text-sm font-semibold text-foreground">{formatCurrency(preview.raw_dividend / (selectedGroup?.total_members || 1))}</p>
              </div>
              <div>
                <p className="text-xs text-foreground-muted">{t('perMemberDiv')}</p>
                <p className="text-sm font-semibold text-purple-400">{formatCurrency(preview.per_member_dividend)}</p>
              </div>
              <div>
                <p className="text-xs text-foreground-muted">{t('roundoffCarry')}</p>
                <p className="text-sm font-semibold text-orange-400">
                  {formatCurrency(preview.carry_next)}
                  {preview.carry_next > 0 && (
                    <span className="text-xs text-foreground-muted ml-2">({formatCurrency(preview.carry_next / (selectedGroup?.total_members || 1))} per person)</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-foreground-muted">{t('eachMemberPays')}</p>
                <p className="text-sm font-bold text-cyan-400">{formatCurrency(preview.monthly_due)}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} type="button">
            {t('cancel')}
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {t('conductAuction')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Mobile Auction Row ─────────────────────────────────────────────────────

function AuctionMobileRow({ auction, groups }: { auction: Auction; groups: ChitGroup[] }) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useLang();
  const group = groups.find(g => g.id === auction.chit_group_id);
  const winnerId = auction.winner_chit_member?.id ?? auction.winner_chit_member_id;

  return (
    <>
      <tr className="cursor-pointer hover:bg-surface/50" onClick={() => setExpanded(!expanded)}>
        <td className="font-medium text-foreground whitespace-nowrap">
          <div className="flex flex-col">
            <span>
              {group?.id ? (
                <Link href={`/groups/${group.id}`} className="font-medium hover:underline">
                  {group.name}
                </Link>
              ) : (
                'N/A'
              )}
            </span>
            <span className="text-xs text-foreground-muted">{t('month')} {auction.month_number}</span>
          </div>
        </td>
        <td className="font-medium text-foreground whitespace-nowrap">
          {winnerId ? (
            <>
              <Link href={`/members/${winnerId}`} className="font-medium hover:underline">
                {auction.winner_chit_member?.member?.name?.value || 'N/A'}
              </Link>{' '}
              <span className="text-green-400 font-semibold">#{auction.winner_chit_member?.ticket_number}</span>
            </>
          ) : (
            <>{auction.winner_chit_member?.member?.name?.value || 'N/A'} <span className="text-green-400 font-semibold">#{auction.winner_chit_member?.ticket_number}</span></>
          )}
        </td>
        <td className="text-foreground-secondary whitespace-nowrap">
          {formatCurrency(Number(auction.original_bid))}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={3} className="bg-surface/30 p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-foreground-muted">{t('winnerPayout')}:</span>
                <span className="text-emerald-400 font-semibold ml-2">{formatCurrency(Number(auction.winning_amount))}</span>
              </div>
              <div>
                <span className="text-foreground-muted">{t('commission')}:</span>
                <span className="text-red-400 font-semibold ml-2">{formatCurrency(Number(auction.commission))}</span>
              </div>
              <div>
                <span className="text-foreground-muted">{t('carryFromPrev')}:</span>
                <span className="text-foreground-muted font-semibold ml-2">{formatCurrency(Number(auction.carry_previous))}</span>
              </div>
              <div>
                <span className="text-foreground-muted">{t('dividend')}:</span>
                <span className="text-foreground-secondary font-semibold ml-2">{formatCurrency(Number(auction.raw_dividend))}</span>
              </div>
              <div>
                <span className="text-foreground-muted">{t('roundoffDividend')}:</span>
                <span className="text-cyan-400 font-semibold ml-2">{formatCurrency(Number(auction.roundoff_dividend))}</span>
              </div>
              <div>
                <span className="text-foreground-muted">{t('carryNext')}:</span>
                <span className="text-amber-400 font-semibold ml-2">{formatCurrency(Number(auction.carry_next))}</span>
              </div>
              <div>
                <span className="text-foreground-muted">{t('perMember')}:</span>
                <span className="text-purple-400 font-semibold ml-2">{formatCurrency(auction.calculation_data?.dividend_per_member || 0)}</span>
              </div>
              <div>
                <span className="text-foreground-muted">{t('toCollect')}:</span>
                <span className="text-foreground font-semibold ml-2">{formatCurrency(auction.calculation_data?.amount_to_collect || 0)}</span>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}