//src/app/groups/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Header } from '@/components/layout/Header';
import { Card, PageLoader, StatusBadge, Button } from '@/components/ui';
import {
  HiOutlineArrowLeft,
  HiOutlineUserGroup,
  HiOutlineTrophy,
  HiOutlineBanknotes,
  HiOutlineTicket,
  HiOutlinePlus,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { Modal, Input, Select } from '@/components/ui';
import { calculateAuction } from '@/utils/dividend';
import { useLang } from '@/lib/i18n/LanguageContext';

interface ChitGroup {
  id: string;
  name: string;
  total_amount: string;
  total_members: number;
  monthly_amount: string;
  duration_months: number;
  commission_type: 'PERCENT' | 'FIXED';
  commission_value: string;
  round_off_value: number;
  status: string;
  created_at: string;
}

interface ChitMember {
  id: string;
  ticket_number: number;
  is_active: boolean;
  member: {
    id: string;
    name: { value: string };
    mobile: { value: string };
  };
}

interface Auction {
  id: string;
  month_number: number;
  original_bid: string;
  winning_amount: string;
  carry_next: string;
  calculation_data: {
    amount_to_collect: number;
    dividend_per_member: number;
  };
  winner_chit_member: {
    ticket_number: number;
    member: { name: { value: string } };
  };
}

interface Payment {
  id: string;
  month_number: number;
  amount_paid: string;
  status: string;
  chit_member: {
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

export default function GroupDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLang();
  const [group, setGroup] = useState<ChitGroup | null>(null);
  const [chitMembers, setChitMembers] = useState<ChitMember[]>([]);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddTicketModal, setShowAddTicketModal] = useState(false);
  const [showConductAuction, setShowConductAuction] = useState(false);

  const load = async () => {
    try {
      const [groupRes, chitMembersRes, auctionsRes, paymentsRes] = await Promise.all([
        fetch(`/api/chit-groups/${id}`),
        fetch(`/api/chit-members?chit_group_id=${id}`),
        fetch(`/api/auctions?chit_group_id=${id}`),
        fetch(`/api/payments?chit_group_id=${id}`),
      ]);

      const groupData = await groupRes.json();
      const chitMembersData = await chitMembersRes.json();
      const auctionsData = await auctionsRes.json();
      const paymentsData = await paymentsRes.json();

      // Only set group if it looks valid (has an id)
      setGroup(groupData?.id ? groupData : null);
      setChitMembers(Array.isArray(chitMembersData) ? chitMembersData : []);
      setAuctions(Array.isArray(auctionsData) ? auctionsData : []);
      setPayments(Array.isArray(paymentsData) ? paymentsData : []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  if (isLoading) {
    return (
      <>
        <Header title={t('groups')} />
        <PageLoader />
      </>
    );
  }

  if (!group) {
    return (
      <>
        <Header title={t('notFound')} />
        <div className="p-8 text-center text-foreground-muted">{t('groupNotFoundDescription')}</div>
      </>
    );
  }

  const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount_paid), 0);
  const completedMonths = auctions.length;
  const progressPercent = Math.round((completedMonths / group.duration_months) * 100);

  function translateStatusLabel(status?: string) {
    if (!status) return '';
    const s = String(status).toUpperCase();
    const map: Record<string, string> = {
      ACTIVE: 'statusActive',
      CANCELLED: 'statusCancelled',
      COMPLETED: 'statusCompleted',
      PENDING: 'statusPending',
      PAID: 'statusPaid',
      UNPAID: 'statusUnpaid',
      RECONCILED: 'statusReconciled',
    };
    const key = map[s] || s.toLowerCase();
    return t(key as any) || status;
  }

  return (
    <>
      <Header title={group.name || t('groupDetails')} subtitle={`${formatCurrency(Number(group.total_amount))} · ${group.total_members} ${t('members')}`} />

      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl space-y-6">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-foreground-muted hover:text-cyan-400 transition-colors"
        >
          <HiOutlineArrowLeft className="w-4 h-4" />
          {t('back')}
        </button>

        {/* Group Summary */}
        <Card>
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <HiOutlineUserGroup className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    {group.name || t('groupDetails')}
                  </h2>
                  <p className="text-foreground-muted text-sm">
                    {formatCurrency(Number(group.total_amount))} · {group.total_members} {t('members')} · {group.duration_months} {t('month')}
                  </p>
                </div>
              </div>
            </div>
            <StatusBadge status={group.status} label={translateStatusLabel(group.status)} />
          </div>

          {/* Progress */}
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-foreground-muted">{t('progress')}</span>
              <span className="text-foreground font-medium">
                {t('month')} {completedMonths}/{group.duration_months}
              </span>
            </div>
            <div className="neon-progress">
              <div className="neon-progress-bar" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="bg-surface border border-border rounded-xl p-3">
              <p className="text-xs text-foreground-muted">{t('monthly')}</p>
              <p className="text-base font-bold text-foreground">
                {formatCurrency(Number(group.monthly_amount))}
              </p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-3">
              <p className="text-xs text-foreground-muted">{t('commission')}</p>
              <p className="text-base font-bold text-foreground">
                {group.commission_type === 'PERCENT'
                  ? `${group.commission_value}%`
                  : formatCurrency(Number(group.commission_value))}
              </p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-3">
              <p className="text-xs text-foreground-muted">{t('roundOff')}</p>
              <p className="text-base font-bold text-foreground">₹{group.round_off_value}</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-3">
              <p className="text-xs text-foreground-muted">{t('totalCollected')}</p>
              <p className="text-base font-bold text-cyan-400">
                {formatCurrency(totalCollected)}
              </p>
            </div>
          </div>
        </Card>

        {/* Tickets / Members */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <HiOutlineTicket className="w-5 h-5 text-cyan-400" />
              {t('tickets')} ({chitMembers.length}/{group.total_members})
            </h3>
            {chitMembers.length < group.total_members && (
              <Button
                size="sm"
                icon={<HiOutlinePlus className="w-4 h-4" />}
                onClick={() => setShowAddTicketModal(true)}
              >
                {t('addTicket')}
              </Button>
            )}
          </div>
          {chitMembers.length === 0 ? (
            <p className="text-sm text-foreground-muted text-center py-4">
              {t('noTicketsAssigned')}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {chitMembers.map((cm) => (
                <div
                  key={cm.id}
                  className="flex items-center gap-3 p-3 bg-surface border border-border rounded-xl"
                >
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 font-bold text-sm shrink-0">
                    #{cm.ticket_number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">
                      {cm.member?.name?.value || t('unknown')}
                    </p>
                    <p className="text-xs text-foreground-muted">
                      {cm.member?.mobile?.value || '—'}
                    </p>
                  </div>
                  <StatusBadge
                    status={cm.is_active ? 'ACTIVE' : 'CANCELLED'}
                    label={translateStatusLabel(cm.is_active ? 'ACTIVE' : 'CANCELLED')}
                  />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Auctions */}
        <Card padding={false}>
          <div className="p-6 pb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <HiOutlineTrophy className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-semibold text-foreground">{t('auctions')} ({auctions.length}/{group.duration_months})</h3>
            </div>
            {auctions.length < group.duration_months && (
              <Button
                size="sm"
                icon={<HiOutlinePlus className="w-4 h-4" />}
                onClick={() => setShowConductAuction(true)}
              >
                {t('conductAuction')}
              </Button>
            )}
          </div>
          {auctions.length === 0 ? (
            <p className="text-sm text-foreground-muted text-center py-8">{t('noAuctions')}</p>
          ) : (
            <div className="overflow-x-auto px-6 pb-6">
              <table className="glass-table w-full">
                <thead>
                  <tr>
                    <th>{t('month')}</th>
                    <th>{t('winner')}</th>
                    <th>{t('ticketNumber')}</th>
                    <th>{t('originalBid')}</th>
                    <th>{t('winnerPayout')}</th>
                    <th>{t('perMember')}</th>
                    <th>{t('toCollect')}</th>
                    <th>{t('carryNext')}</th>
                  </tr>
                </thead>
                <tbody>
                  {auctions.map((a) => (
                    <tr key={a.id}>
                      <td className="font-semibold text-cyan-400">{t('month')} {a.month_number}</td>
                      <td className="font-medium text-foreground">
                        {a.winner_chit_member?.member?.name?.value || 'N/A'}
                      </td>
                      <td>#{a.winner_chit_member?.ticket_number}</td>
                      <td>{formatCurrency(Number(a.original_bid))}</td>
                      <td className="text-emerald-400 font-semibold">
                        {formatCurrency(Number(a.winning_amount))}
                      </td>
                      <td className="text-purple-400">
                        {formatCurrency(a.calculation_data?.dividend_per_member || 0)}
                      </td>
                      <td className="text-foreground font-semibold">
                        {formatCurrency(a.calculation_data?.amount_to_collect || 0)}
                      </td>
                      <td className="text-amber-400">
                        {formatCurrency(Number(a.carry_next))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Payments */}
        <Card padding={false}>
          <div className="p-6 pb-4 flex items-center gap-2">
            <HiOutlineBanknotes className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-semibold text-foreground">{t('payments')}</h3>
          </div>
          {payments.length === 0 ? (
            <p className="text-sm text-foreground-muted text-center py-8">{t('noPayments')}</p>
          ) : (
            <div className="overflow-x-auto px-6 pb-6">
              <table className="glass-table w-full">
                <thead>
                  <tr>
                    <th>{t('member')}</th>
                    <th>{t('ticketNumber')}</th>
                    <th>{t('month')}</th>
                    <th>{t('amountPaid')}</th>
                    <th>{t('status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="font-medium text-foreground">
                        {p.chit_member?.member?.name?.value || 'N/A'}
                      </td>
                      <td>#{p.chit_member?.ticket_number}</td>
                      <td>{t('month')} {p.month_number}</td>
                      <td className="text-cyan-400 font-semibold">
                        {formatCurrency(Number(p.amount_paid))}
                      </td>
                      <td>
                        <StatusBadge status={p.status} label={translateStatusLabel(p.status)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Add Ticket Modal */}
      <AddTicketModal
        isOpen={showAddTicketModal}
        groupId={group.id}
        userId={user?.id || ''}
        existingTickets={chitMembers.map((cm) => cm.ticket_number)}
        totalMembers={group.total_members}
        onClose={() => setShowAddTicketModal(false)}
        onSaved={() => {
          setShowAddTicketModal(false);
          load();
        }}
      />

      {/* Conduct Auction Modal */}
      <ConductAuctionModal
        isOpen={showConductAuction}
        group={group}
        chitMembers={chitMembers}
        lastCarryNext={
          auctions.length > 0
            ? Number(auctions.reduce((a, b) => (a.month_number > b.month_number ? a : b)).carry_next)
            : 0
        }
        nextMonth={
          auctions.length > 0
            ? auctions.reduce((a, b) => (a.month_number > b.month_number ? a : b)).month_number + 1
            : 1
        }
        onClose={() => setShowConductAuction(false)}
        onSaved={() => {
          setShowConductAuction(false);
          load();
        }}
      />
    </>
  );
}

// ─── Add Ticket Modal ───────────────────────────────────────────────────────

function AddTicketModal({
  isOpen,
  groupId,
  userId,
  existingTickets,
  totalMembers,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  groupId: string;
  userId: string;
  existingTickets: number[];
  totalMembers: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [members, setMembers] = useState<{ id: string; name: { value: string } }[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useLang();

  useEffect(() => {
    if (isOpen) {
      fetch(userId ? `/api/members?user_id=${userId}` : '/api/members')
        .then((r) => r.json())
        .then((data) => setMembers(Array.isArray(data) ? data : []));

      // auto-suggest next ticket number
      const used = new Set(existingTickets);
      for (let i = 1; i <= totalMembers; i++) {
        if (!used.has(i)) {
          setTicketNumber(String(i));
          break;
        }
      }
    }
  }, [isOpen, existingTickets, totalMembers, userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const res = await fetch('/api/chit-members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        member_id: selectedMemberId,
        chit_group_id: groupId,
        ticket_number: Number(ticketNumber),
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || 'Failed to add ticket');
    } else {
      toast.success('Ticket added!');
      onSaved();
    }

    setIsSubmitting(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('addTicket')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label={t('member')}
          value={selectedMemberId}
          onChange={(e) => setSelectedMemberId(e.target.value)}
          options={[
            { value: '', label: t('selectMember') },
            ...members.map((m) => ({
              value: m.id,
              label: m.name.value,
            })),
          ]}
        />
        <Input
          label={t('ticketNumber')}
          type="number"
          value={ticketNumber}
          onChange={(e) => setTicketNumber(e.target.value)}
          required
        />
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} type="button">{t('cancel')}</Button>
          <Button type="submit" isLoading={isSubmitting}>{t('addTicket')}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Conduct Auction Modal ────────────────────────────────────────────────────

function ConductAuctionModal({
  isOpen,
  group,
  chitMembers,
  lastCarryNext,
  nextMonth,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  group: ChitGroup;
  chitMembers: ChitMember[];
  lastCarryNext: number;
  nextMonth: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [monthNumber, setMonthNumber] = useState('');
  const [originalBid, setOriginalBid] = useState('');
  const [winnerChitMemberId, setWinnerChitMemberId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [groupAuctions, setGroupAuctions] = useState<any[]>([]);
  const [availableMembers, setAvailableMembers] = useState<ChitMember[]>([]);
  const { t } = useLang();

  useEffect(() => {
    if (isOpen) {
      setMonthNumber(String(nextMonth));
      setOriginalBid('');
      setWinnerChitMemberId('');
      setPreview(null);
      // fetch auctions for this group to determine tickets that already won
      fetch(`/api/auctions?chit_group_id=${group.id}`)
        .then((r) => r.json())
        .then((data) => {
          const list = Array.isArray(data) ? data : [];
          setGroupAuctions(list);
        })
        .catch(() => setGroupAuctions([]));
    }
  }, [isOpen, nextMonth]);

  // recompute availableMembers whenever chitMembers or groupAuctions change
  useEffect(() => {
    const winners = new Set<string>();
    for (const a of groupAuctions) {
      const wid = (a && (a.winner_chit_member_id || (a.winner_chit_member && a.winner_chit_member.id)));
      if (wid) winners.add(String(wid));
    }
    const available = (chitMembers || []).filter((cm) => !winners.has(cm.id));
    setAvailableMembers(available);
    // clear selection if previously selected member is no longer available
    if (winnerChitMemberId && !available.find((m) => m.id === winnerChitMemberId)) {
      setWinnerChitMemberId('');
    }
  }, [chitMembers, groupAuctions]);

  // live preview
  useEffect(() => {
    if (!originalBid) { setPreview(null); return; }
    const bid = Number(originalBid);
    if (isNaN(bid) || bid <= 0) return;

    const calc = calculateAuction({
      total_amount: Number(group.total_amount),
      total_members: group.total_members,
      original_bid: bid,
      commission_type: group.commission_type,
      commission_value: Number(group.commission_value),
      round_off_value: group.round_off_value,
      carry_previous: lastCarryNext,
    });

    // per_member_dividend is now returned directly by calculateAuction
    setPreview({
      ...calc,
      monthly_due: Number(group.monthly_amount) - calc.per_member_dividend,
    });
  }, [originalBid, group, lastCarryNext]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if ((availableMembers || []).length === 0) {
      toast.error('No eligible tickets available — all tickets have already won');
      setIsSubmitting(false);
      return;
    }

    if (!winnerChitMemberId) {
      toast.error('Please select a winner (ticket)');
      setIsSubmitting(false);
      return;
    }

    const res = await fetch('/api/auctions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chit_group_id: group.id,
        month_number: Number(monthNumber),
        winner_chit_member_id: winnerChitMemberId,
        original_bid: Number(originalBid),
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || 'Failed to conduct auction');
    } else {
      toast.success(`Month ${monthNumber} auction completed!`);
      onSaved();
    }
    setIsSubmitting(false);
  };

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${t('conductAuction')} — ${group.name}`} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t('monthNumber')}
            type="number"
            value={monthNumber}
            onChange={(e) => setMonthNumber(e.target.value)}
            required
          />
          <Input
            label={`${t('originalBid')} (₹)`}
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

        {availableMembers.length === 0 && (
          <p className="text-sm text-red-400">{t('noEligibleTickets')}</p>
        )}

        {lastCarryNext > 0 && (
          <p className="text-xs text-amber-400">{t('carryFromPrev')}: {formatCurrency(lastCarryNext)}</p>
        )}

        {/* Full Preview */}
        {preview && (
          <div className="bg-surface border border-border rounded-xl p-4">
            <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-3">
              {t('calculationPreview')}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <p className="text-xs text-foreground-muted">{t('winnerPayout')}</p>
                <p className="text-sm font-semibold text-emerald-400">{formatCurrency(preview.winning_amount)}</p>
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
                <p className="text-sm font-semibold text-foreground">{formatCurrency(preview.raw_dividend / group.total_members)}</p>
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
                    <span className="text-xs text-foreground-muted ml-2">({formatCurrency(preview.carry_next / group.total_members)} per person)</span>
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
          <Button variant="outline" onClick={onClose} type="button">{t('cancel')}</Button>
          <Button type="submit" isLoading={isSubmitting}>
            {t('conductAuction')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}