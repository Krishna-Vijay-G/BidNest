//src/app/auctions/page.tsx
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
  winner_chit_member: {
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

  const filteredAuctions = auctions.filter((a) =>
    filterGroup === 'all' ? allowedGroupIds.has(a.chit_group_id) : a.chit_group_id === filterGroup
  );

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
      <Header title={t('auctions')} subtitle={`${auctions.length} total auctions`}>
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
                setGroupStatusFilter(e.target.value);
                // reset group selection when status changes
                setFilterGroup('all');
              }}
              options={[
                { value: 'ACTIVE', label: t('statusActive') },
                { value: 'PENDING', label: t('statusPending') },
                { value: 'COMPLETED', label: t('statusCompleted') },
                { value: 'CANCELLED', label: t('statusCancelled') },
                { value: 'all', label: 'All Statuses' },
              ]}
            />
          </div>

          <div className="w-64">
            <Select
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              options={[
                { value: 'all', label: groupStatusFilter === 'all' ? 'All Groups' : `All ${groupStatusFilter} Groups` },
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
            description="Conduct your first auction to get started."
          />
        ) : (
          <Card padding={false}>
            <div className="overflow-x-auto">
              <table className="glass-table w-full">
                <thead>
                  <tr>
                    <th>{t('month')}</th>
                    <th>{t('winner')}</th>
                    <th>{t('ticketNumber')}</th>
                    <th>{t('originalBid')}</th>
                    <th>{t('winnerPayout')}</th>
                    <th>{t('commission')}</th>
                    <th>{t('carryFromPrev')}</th>
                    <th>{t('dividend')}</th>
                    <th>{`Roundoff ${t('dividend')}`}</th>
                    <th>{t('carryNext')}</th>
                    <th>{t('perMember')}</th>
                    <th>{t('toCollect')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAuctions.map((auction) => (
                    <tr key={auction.id}>
                      <td className="font-semibold text-cyan-400">
                        {t('month')} {auction.month_number}
                      </td>
                      <td className="font-medium text-foreground">
                        {auction.winner_chit_member?.member?.name?.value || 'N/A'}
                      </td>
                      <td>#{auction.winner_chit_member?.ticket_number}</td>
                      <td className="text-foreground-secondary">
                        {formatCurrency(Number(auction.original_bid))}
                      </td>
                      <td className="font-semibold text-emerald-400">
                        {formatCurrency(Number(auction.winning_amount))}
                      </td>
                      <td className="text-red-400">
                        {formatCurrency(Number(auction.commission))}
                      </td>
                      <td className="text-foreground-muted">
                        {formatCurrency(Number(auction.carry_previous))}
                      </td>
                      <td className="text-foreground-secondary">
                        {formatCurrency(Number(auction.raw_dividend))}
                      </td>
                      <td className="text-cyan-400">
                        {formatCurrency(Number(auction.roundoff_dividend))}
                      </td>
                      <td className="text-amber-400">
                        {formatCurrency(Number(auction.carry_next))}
                      </td>
                      <td className="text-purple-400">
                        {formatCurrency(auction.calculation_data?.dividend_per_member || 0)}
                      </td>
                      <td className="font-semibold text-foreground">
                        {formatCurrency(auction.calculation_data?.amount_to_collect || 0)}
                      </td>
                    </tr>
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
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  groups: ChitGroup[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLang();
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [monthNumber, setMonthNumber] = useState('');
  const [originalBid, setOriginalBid] = useState('');
  const [winnerChitMemberId, setWinnerChitMemberId] = useState('');
  const [chitMembers, setChitMembers] = useState<ChitMember[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [carryPrevious, setCarryPrevious] = useState(0);
  const [groupAuctions, setGroupAuctions] = useState<any[]>([]);
  const [availableMembers, setAvailableMembers] = useState<ChitMember[]>([]);

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

    const calc = calculateAuction({
      total_amount: Number(group.total_amount),
      total_members: group.total_members,
      original_bid: Number(originalBid),
      commission_type: group.commission_type,
      commission_value: Number(group.commission_value),
      round_off_value: group.round_off_value,
      carry_previous: carryPrevious,
    });

    // per_member_dividend now returned directly by calculateAuction
    const dividend_per_member = calc.per_member_dividend;
    const monthly_due = Number(group.monthly_amount) - dividend_per_member;

    setPreview({ ...calc, dividend_per_member, monthly_due, total_members: group.total_members });
  }, [selectedGroupId, originalBid, monthNumber, groups, carryPrevious]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const res = await fetch('/api/auctions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chit_group_id: selectedGroupId,
        month_number: Number(monthNumber),
        winner_chit_member_id: winnerChitMemberId,
        original_bid: Number(originalBid),
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
            { value: '', label: 'Select a group...' },
            // only active groups should be available for conducting auctions
            ...groups
              .filter((g) => g.status === 'ACTIVE')
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
            placeholder="e.g. 643"
            required
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

        {carryPrevious > 0 && (
          <p className="text-xs text-amber-400">{t('carryFromPrev')}: {formatCurrency(carryPrevious)}</p>
        )}

        {/* Preview */}
        {preview && (
          <div className="bg-surface border border-border rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-3">
              {t('calculationPreview')}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <p className="text-xs text-foreground-muted">{t('winnerGets')}</p>
                <p className="text-sm font-semibold text-emerald-400">
                  {formatCurrency(preview.winning_amount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-foreground-muted">{t('commission')}</p>
                <p className="text-sm font-semibold text-red-400">
                  {formatCurrency(preview.commission)}
                </p>
              </div>
              <div>
                <p className="text-xs text-foreground-muted">{t('winnerPayout')}</p>
                <p className="text-sm font-semibold text-cyan-400">
                  {formatCurrency(preview.winning_amount - preview.commission)}
                </p>
              </div>
              <div>
                <p className="text-xs text-foreground-muted">{t('dividend')}</p>
                <p className="text-sm font-semibold text-foreground">
                  {formatCurrency(preview.raw_dividend)}
                </p>
              </div>
              <div>
                <p className="text-xs text-foreground-muted">Roundoff {t('dividend')}</p>
                <p className="text-sm font-semibold text-amber-400">
                  {formatCurrency(preview.roundoff_dividend)}
                </p>
              </div>
              <div>
                <p className="text-xs text-foreground-muted">{t('carryNext')}</p>
                <p className="text-sm font-semibold text-orange-400">
                  {formatCurrency(preview.carry_next)}
                </p>
              </div>
              <div>
                <p className="text-xs text-foreground-muted">{t('perMember')}</p>
                <p className="text-sm font-semibold text-purple-400">
                  {formatCurrency(preview.dividend_per_member)}
                </p>
              </div>
              <div>
                <p className="text-xs text-foreground-muted">{t('toCollect')}</p>
                <p className="text-sm font-semibold text-cyan-400">
                  {formatCurrency(preview.monthly_due)}
                </p>
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