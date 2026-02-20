'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Header } from '@/components/layout/Header';
import { Card, Button, Modal, Input, PageLoader, EmptyState, Select } from '@/components/ui';
import { HiOutlineTrophy, HiOutlinePlus } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { calculateAuction } from '@/utils/dividend';

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
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [groups, setGroups] = useState<ChitGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterGroup, setFilterGroup] = useState('all');
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

  const filteredAuctions = auctions.filter((a) =>
    filterGroup === 'all' ? true : a.chit_group_id === filterGroup
  );

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
      <Header title="Auctions" subtitle={`${auctions.length} total auctions`}>
        <Button
          icon={<HiOutlinePlus className="w-4 h-4" />}
          onClick={() => setShowCreateModal(true)}
        >
          New Auction
        </Button>
      </Header>

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Filter */}
        <div className="mb-6 w-64">
          <Select
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            options={[
              { value: 'all', label: 'All Groups' },
              ...groups.map((g) => ({
                value: g.id,
                label: `${g.name} — ${formatCurrency(Number(g.total_amount))}`,
              })),
            ]}
          />
        </div>

        {filteredAuctions.length === 0 ? (
          <EmptyState
            icon={<HiOutlineTrophy className="w-8 h-8" />}
            title="No auctions yet"
            description="Conduct your first auction to get started."
          />
        ) : (
          <Card padding={false}>
            <div className="overflow-x-auto">
              <table className="glass-table w-full">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Winner</th>
                    <th>Ticket</th>
                    <th>Original Bid</th>
                    <th>Winning Amount</th>
                    <th>Commission</th>
                    <th>Carry Prev</th>
                    <th>Raw Dividend</th>
                    <th>Roundoff Div</th>
                    <th>Carry Next</th>
                    <th>Per Member</th>
                    <th>To Collect</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAuctions.map((auction) => (
                    <tr key={auction.id}>
                      <td className="font-semibold text-cyan-400">
                        Month {auction.month_number}
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
      original_bid: Number(originalBid),
      commission_type: group.commission_type,
      commission_value: Number(group.commission_value),
      round_off_value: group.round_off_value,
      carry_previous: carryPrevious,
    });

    const dividend_per_member = calc.roundoff_dividend / group.total_members;
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
    <Modal isOpen={isOpen} onClose={onClose} title="Conduct Auction" size="lg">
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
            ...groups
              .filter((g) => g.status === 'ACTIVE' || g.status === 'PENDING')
              .map((g) => ({
                value: g.id,
                label: `${g.name} — ${formatCurrency(Number(g.total_amount))} · ${g.total_members}M`,
              })),
          ]}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Month Number"
            type="number"
            value={monthNumber}
            onChange={(e) => setMonthNumber(e.target.value)}
            placeholder="e.g. 1"
            required
          />
          <Input
            label="Original Bid (₹)"
            type="number"
            value={originalBid}
            onChange={(e) => setOriginalBid(e.target.value)}
            placeholder="e.g. 643"
            required
          />
        </div>

        <Select
          label="Winner (Ticket Holder)"
          value={winnerChitMemberId}
          onChange={(e) => setWinnerChitMemberId(e.target.value)}
          options={
            availableMembers.length === 0
              ? [{ value: '', label: 'No eligible tickets (all have won)' }]
              : [
                  { value: '', label: 'Select winner...' },
                  ...availableMembers.map((cm) => ({
                    value: cm.id,
                    label: `#${cm.ticket_number} — ${cm.member?.name?.value || 'Unknown'}`,
                  })),
                ]
          }
          required={availableMembers.length > 0}
        />

        {carryPrevious > 0 && (
          <p className="text-xs text-amber-400">Carry from previous month: {formatCurrency(carryPrevious)}</p>
        )}

        {/* Preview */}
        {preview && (
          <div className="bg-surface border border-border rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-3">
              Calculation Preview
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <p className="text-xs text-foreground-muted">Winning Amount</p>
                <p className="text-sm font-semibold text-emerald-400">
                  {formatCurrency(preview.winning_amount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-foreground-muted">Commission</p>
                <p className="text-sm font-semibold text-red-400">
                  {formatCurrency(preview.commission)}
                </p>
              </div>
              <div>
                <p className="text-xs text-foreground-muted">Net Win (Payout)</p>
                <p className="text-sm font-semibold text-cyan-400">
                  {formatCurrency(preview.winning_amount - preview.commission)}
                </p>
              </div>
              <div>
                <p className="text-xs text-foreground-muted">Raw Dividend</p>
                <p className="text-sm font-semibold text-foreground">
                  {formatCurrency(preview.raw_dividend)}
                </p>
              </div>
              <div>
                <p className="text-xs text-foreground-muted">Roundoff Dividend</p>
                <p className="text-sm font-semibold text-amber-400">
                  {formatCurrency(preview.roundoff_dividend)}
                </p>
              </div>
              <div>
                <p className="text-xs text-foreground-muted">Carry Next</p>
                <p className="text-sm font-semibold text-orange-400">
                  {formatCurrency(preview.carry_next)}
                </p>
              </div>
              <div>
                <p className="text-xs text-foreground-muted">Per Member Div.</p>
                <p className="text-sm font-semibold text-purple-400">
                  {formatCurrency(preview.dividend_per_member)}
                </p>
              </div>
              <div>
                <p className="text-xs text-foreground-muted">Each Member Pays</p>
                <p className="text-sm font-semibold text-cyan-400">
                  {formatCurrency(preview.monthly_due)}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Conduct Auction
          </Button>
        </div>
      </form>
    </Modal>
  );
}