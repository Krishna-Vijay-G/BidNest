//src/app/payments/tracking/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Header } from '@/components/layout/Header';
import { Card, Button, Modal, Input, PageLoader, EmptyState, Select } from '@/components/ui';
import {
  HiOutlineClipboardDocumentList,
  HiOutlineBanknotes,
  HiOutlineTrophy,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { useLang } from '@/lib/i18n/LanguageContext';

// ─── Types ────────────────────────────────────────────────

interface ChitGroup {
  id: string;
  name: string;
  total_amount: string;
  total_members: number;
  monthly_amount: string;
  status: string;
}

interface Auction {
  id: string;
  month_number: number;
  winner_chit_member_id: string;
  calculation_data: {
    amount_to_collect: number;
    dividend_per_member: number;
    monthly_contribution: number;
  };
}

interface ChitMember {
  id: string;
  ticket_number: number;
  is_active: boolean;
  member: {
    id: string;
    name: { value: string };
  };
}

interface Payment {
  id: string;
  chit_member_id: string;
  month_number: number;
  amount_paid: string;
  status: string;
}

interface MemberRow {
  chitMemberId: string;
  ticketNumber: number;
  memberName: string;
  isWinner: boolean;
  monthlyDue: number;
  totalPaid: number;
  remaining: number;
  status: 'WINNER' | 'COMPLETED' | 'PARTIAL' | 'PENDING';
}

// All-months aggregated row
interface AggregatedRow {
  chitMemberId: string;
  ticketNumber: number;
  memberName: string;
  totalDue: number;       // sum of amount_to_collect for non-winner months
  totalPaid: number;      // sum of all payments across all months
  remaining: number;      // totalDue - totalPaid
  wonMonths: number[];    // months this member won
  monthBreakdown: {
    month: number;
    due: number;
    paid: number;
    remaining: number;
    isWinner: boolean;
  }[];
  status: 'CLEAR' | 'COMPLETED' | 'PARTIAL' | 'PENDING';
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Main Page ────────────────────────────────────────────

export default function PaymentTrackingPage() {
  const { user } = useAuth();
  const { t } = useLang();
  const [groups, setGroups] = useState<ChitGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(() => {
    try {
      return localStorage.getItem('payments-tracking:group') || '';
    } catch {
      return '';
    }
  });
  const [groupStatusFilter, setGroupStatusFilter] = useState<string>(() => {
    try {
      return localStorage.getItem('payments-tracking:status') || 'ACTIVE';
    } catch {
      return 'ACTIVE';
    }
  });
  const [auctions, setAuctions] = useState<Auction[]>([]);
  // 'all' = aggregated view across all months
  const [selectedMonth, setSelectedMonth] = useState<number | 'all' | null>(() => {
    try {
      const v = localStorage.getItem('payments-tracking:month');
      if (!v) return null;
      if (v === 'all') return 'all';
      const n = Number(v);
      return Number.isNaN(n) ? null : n;
    } catch {
      return null;
    }
  });
  const [chitMembers, setChitMembers] = useState<ChitMember[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [payingMember, setPayingMember] = useState<MemberRow | null>(null);
  const [payingMemberBreakdown, setPayingMemberBreakdown] = useState<AggregatedRow['monthBreakdown']>([]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Load user's groups
  useEffect(() => {
    if (!user) return;
    fetch(`/api/chit-groups?user_id=${user.id}`)
      .then((r) => r.json())
      .then((data) => setGroups(Array.isArray(data) ? data : []))
      .finally(() => setIsLoadingGroups(false));
  }, [user]);

  // Load auctions when group changes
  useEffect(() => {
    if (!selectedGroupId) {
      setAuctions([]);
      setSelectedMonth(null);
      return;
    }
    fetch(`/api/auctions?chit_group_id=${selectedGroupId}`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setAuctions(list);
        // Restore stored month if valid for this group's auctions, else default
        try {
          const stored = localStorage.getItem('payments-tracking:month');
          if (list.length > 0) {
            if (stored) {
              if (stored === 'all') setSelectedMonth('all');
              else {
                const n = Number(stored);
                if (!Number.isNaN(n) && list.some((a) => a.month_number === n)) setSelectedMonth(n);
                else setSelectedMonth('all');
              }
            } else {
              setSelectedMonth('all');
            }
          } else {
            setSelectedMonth(null);
          }
        } catch {
          setSelectedMonth(list.length > 0 ? 'all' : null);
        }
      });
  }, [selectedGroupId]);

  // If stored selectedGroupId is not present in fetched groups, clear it
  useEffect(() => {
    if (!groups || groups.length === 0) return;
    if (selectedGroupId && !groups.some((g) => g.id === selectedGroupId)) {
      setSelectedGroupId('');
    }
  }, [groups]);

  // Clear selected group when status filter changes only if it no longer matches
  useEffect(() => {
    if (!selectedGroupId) return;
    if (!groups || groups.length === 0) return;
    const g = groups.find((x) => x.id === selectedGroupId);
    if (!g) {
      setSelectedGroupId('');
      return;
    }
    if (groupStatusFilter !== 'ALL' && g.status !== groupStatusFilter) {
      setSelectedGroupId('');
    }
  }, [groupStatusFilter, selectedGroupId, groups]);

  // Load chit members + payments when group/month changes
  const loadMonthData = useCallback(async () => {
    if (!selectedGroupId || selectedMonth === null) return;
    setIsLoadingData(true);
    try {
      // For 'all' mode, fetch all payments (no month filter)
      const paymentsUrl =
        selectedMonth === 'all'
          ? `/api/payments?chit_group_id=${selectedGroupId}`
          : `/api/payments?chit_group_id=${selectedGroupId}&month_number=${selectedMonth}`;

      const [membersRes, paymentsRes] = await Promise.all([
        fetch(`/api/chit-members?chit_group_id=${selectedGroupId}`),
        fetch(paymentsUrl),
      ]);
      const membersData = await membersRes.json();
      const paymentsData = await paymentsRes.json();
      setChitMembers(Array.isArray(membersData) ? membersData : []);
      setPayments(Array.isArray(paymentsData) ? paymentsData : []);
    } finally {
      setIsLoadingData(false);
    }
  }, [selectedGroupId, selectedMonth]);

  useEffect(() => {
    loadMonthData();
  }, [loadMonthData]);

  // Persist filters/state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('payments-tracking:status', groupStatusFilter);
    } catch {}
  }, [groupStatusFilter]);

  useEffect(() => {
    try {
      localStorage.setItem('payments-tracking:group', selectedGroupId);
    } catch {}
  }, [selectedGroupId]);

  useEffect(() => {
    try {
      if (selectedMonth === null) localStorage.setItem('payments-tracking:month', '');
      else localStorage.setItem('payments-tracking:month', String(selectedMonth));
    } catch {}
  }, [selectedMonth]);

  // Derive per-member rows (single-month mode)
  const currentAuction = selectedMonth !== 'all'
    ? auctions.find((a) => a.month_number === selectedMonth)
    : undefined;

  const memberRows: MemberRow[] = chitMembers.map((cm) => {
    const isWinner = currentAuction?.winner_chit_member_id === cm.id;
    const monthlyDue = currentAuction?.calculation_data?.amount_to_collect ?? 0;

    const memberPayments = payments.filter((p) => p.chit_member_id === cm.id);
    const totalPaid = memberPayments.reduce((s, p) => s + Number(p.amount_paid), 0);
    const remaining = Math.max(0, monthlyDue - totalPaid);

    let status: MemberRow['status'];
    if (isWinner) {
      status = 'WINNER';
    } else if (totalPaid >= monthlyDue && monthlyDue > 0) {
      status = 'COMPLETED';
    } else if (totalPaid > 0) {
      status = 'PARTIAL';
    } else {
      status = 'PENDING';
    }

    return {
      chitMemberId: cm.id,
      ticketNumber: cm.ticket_number,
      memberName: cm.member?.name?.value || 'Unknown',
      isWinner,
      monthlyDue,
      totalPaid,
      remaining,
      status,
    };
  });

  // Summary counts
  const isAllMode = selectedMonth === 'all';

  // ── All-months aggregated rows ──
  const aggregatedRows: AggregatedRow[] = chitMembers.map((cm) => {
    let totalDue = 0;
    const wonMonths: number[] = [];
    const monthBreakdown: AggregatedRow['monthBreakdown'] = [];

    for (const auction of auctions.slice().sort((a, b) => a.month_number - b.month_number)) {
      const isWinner = auction.winner_chit_member_id === cm.id;
      const monthDue = isWinner ? 0 : (auction.calculation_data?.amount_to_collect ?? 0);
      const monthPayments = payments.filter(
        (p) => p.chit_member_id === cm.id && p.month_number === auction.month_number
      );
      const monthPaid = monthPayments.reduce((s, p) => s + Number(p.amount_paid), 0);
      const monthRemaining = isWinner ? 0 : Math.max(0, monthDue - monthPaid);

      if (isWinner) wonMonths.push(auction.month_number);
      totalDue += monthDue;
      monthBreakdown.push({ month: auction.month_number, due: monthDue, paid: monthPaid, remaining: monthRemaining, isWinner });
    }

    const totalPaid = payments
      .filter((p) => p.chit_member_id === cm.id)
      .reduce((s, p) => s + Number(p.amount_paid), 0);
    const remaining = Math.max(0, totalDue - totalPaid);

    let status: AggregatedRow['status'];
    if (auctions.length === 0) status = 'PENDING';
    else if (remaining <= 0 && totalDue > 0) status = 'COMPLETED';
    else if (totalDue === 0 && wonMonths.length === auctions.length) status = 'CLEAR';
    else if (totalPaid > 0 && remaining > 0) status = 'PARTIAL';
    else status = 'PENDING';

    return { chitMemberId: cm.id, ticketNumber: cm.ticket_number, memberName: cm.member?.name?.value || 'Unknown', totalDue, totalPaid, remaining, wonMonths, monthBreakdown, status };
  });

  const counts = isAllMode
    ? {
        total: aggregatedRows.length,
        completed: aggregatedRows.filter((r) => r.status === 'COMPLETED').length,
        partial: aggregatedRows.filter((r) => r.status === 'PARTIAL').length,
        pending: aggregatedRows.filter((r) => r.status === 'PENDING').length,
        winner: 0,
      }
    : {
    total: memberRows.length,
    completed: memberRows.filter((r) => r.status === 'COMPLETED').length,
    partial: memberRows.filter((r) => r.status === 'PARTIAL').length,
    pending: memberRows.filter((r) => r.status === 'PENDING').length,
    winner: memberRows.filter((r) => r.status === 'WINNER').length,
  };

  const totalCollected = isAllMode
    ? aggregatedRows.reduce((s, r) => s + r.totalPaid, 0)
    : memberRows.reduce((s, r) => s + r.totalPaid, 0);
  const totalExpected = isAllMode
    ? aggregatedRows.reduce((s, r) => s + r.totalDue, 0)
    : memberRows.filter((r) => !r.isWinner).reduce((s, r) => s + r.monthlyDue, 0);

  if (isLoadingGroups) {
    return (
      <>
        <Header title={t('tracking')} />
        <PageLoader />
      </>
    );
  }

  return (
    <>
      <Header
        title={t('tracking')}
        subtitle="Track monthly payment status for each member"
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Filters */}
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label={t('status')}
              value={groupStatusFilter}
              onChange={(e) => setGroupStatusFilter(e.target.value)}
              options={[
                { value: 'ACTIVE', label: t('statusActive') },
                { value: 'PENDING', label: t('statusPending') },
                { value: 'COMPLETED', label: t('statusCompleted') },
                { value: 'CANCELLED', label: t('statusCancelled') },
                { value: 'ALL', label: 'All statuses' },
              ]}
            />

            <Select
              label={t('groups')}
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              options={[
                { value: '', label: 'Select a group...' },
                ...groups
                  .filter((g) => groupStatusFilter === 'ALL' ? true : g.status === groupStatusFilter)
                  .map((g) => ({
                    value: g.id,
                    label: `${g.name} — ${formatCurrency(Number(g.total_amount))} · ${g.total_members}M`,
                  })),
              ]}
            />

            <Select
              label={t('month')}
              value={selectedMonth?.toString() ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                setSelectedMonth(v === 'all' ? 'all' : Number(v));
              }}
              options={[
                { value: '', label: 'Select month...' },
                ...(auctions.length > 0 ? [{ value: 'all', label: '📊 All Months (Combined)' }] : []),
                ...auctions
                  .slice()
                  .sort((a, b) => a.month_number - b.month_number)
                  .map((a) => ({
                    value: String(a.month_number),
                    label: `Month ${a.month_number}`,
                  })),
              ]}
              disabled={auctions.length === 0}
            />
          </div>
        </Card>

        {!selectedGroupId && (
          <EmptyState
            icon={<HiOutlineClipboardDocumentList className="w-8 h-8" />}
            title="Select a group"
            description="Choose a chit group to see payment status."
          />
        )}

        {selectedGroupId && auctions.length === 0 && (
          <EmptyState
            icon={<HiOutlineTrophy className="w-8 h-8" />}
            title="No auctions yet"
            description="Conduct the first auction before tracking payments."
          />
        )}

        {selectedGroupId && selectedMonth !== null && !isLoadingData && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="glass rounded-2xl border border-border p-4">
                <p className="text-xs text-foreground-muted mb-1">{t('totalCollected')}</p>
                <p className="text-xl font-bold text-cyan-400">{formatCurrency(totalCollected)}</p>
                <p className="text-xs text-foreground-muted mt-1">of {formatCurrency(totalExpected)}</p>
              </div>
              <div className="glass rounded-2xl border border-border p-4">
                <p className="text-xs text-foreground-muted mb-1">{t('completed')}</p>
                <p className="text-xl font-bold text-emerald-400">{counts.completed}</p>
                <p className="text-xs text-foreground-muted mt-1">members</p>
              </div>
              <div className="glass rounded-2xl border border-border p-4">
                <p className="text-xs text-foreground-muted mb-1">{t('partial')}</p>
                <p className="text-xl font-bold text-amber-400">{counts.partial}</p>
                <p className="text-xs text-foreground-muted mt-1">members</p>
              </div>
              <div className="glass rounded-2xl border border-border p-4">
                <p className="text-xs text-foreground-muted mb-1">{t('pending')}</p>
                <p className="text-xl font-bold text-red-400">{counts.pending}</p>
                <p className="text-xs text-foreground-muted mt-1">members</p>
              </div>
            </div>

            {/* Progress bar */}
            {totalExpected > 0 && (
              <Card>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-foreground-muted">
                    {isAllMode
                      ? `Overall Collection Progress (${auctions.length} months)`
                      : `Month ${selectedMonth} Progress`}
                  </span>
                  <span className="text-foreground font-medium">
                    {formatCurrency(totalCollected)} / {formatCurrency(totalExpected)}
                    <span className="text-foreground-muted ml-2">
                      ({Math.round((totalCollected / totalExpected) * 100)}%)
                    </span>
                  </span>
                </div>
                <div className="neon-progress">
                  <div
                    className="neon-progress-bar"
                    style={{ width: `${Math.min(100, (totalCollected / totalExpected) * 100)}%` }}
                  />
                </div>
              </Card>
            )}

            {/* ── ALL MONTHS TABLE ── */}
            {isAllMode && (
              aggregatedRows.length === 0 ? (
                <EmptyState
                  icon={<HiOutlineClipboardDocumentList className="w-8 h-8" />}
                  title="No tickets assigned"
                  description="Add members to this group first."
                />
              ) : (
                <Card padding={false}>
                  <div className="p-6 pb-4 flex items-center gap-2">
                    <HiOutlineBanknotes className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-base font-semibold text-foreground">
                      All {auctions.length} Month{auctions.length !== 1 ? 's' : ''} — Combined Balance
                    </h3>
                    <span className="ml-2 text-xs text-foreground-muted">(click a row to expand month breakdown)</span>
                  </div>
                  <div className="overflow-x-auto px-6 pb-6">
                    <table className="glass-table w-full">
                      <thead>
                        <tr>
                          <th>{t('ticketNumber')}</th>
                          <th>{t('member')}</th>
                          <th>{t('totalDue')}</th>
                          <th>{t('totalPaid')}</th>
                          <th>{t('remaining')}</th>
                          <th>{t('wonMonths')}</th>
                          <th>{t('status')}</th>
                          <th>{t('actions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aggregatedRows
                          .slice()
                          .sort((a, b) => a.ticketNumber - b.ticketNumber)
                          .map((row) => (
                            <>
                              <tr
                                key={row.chitMemberId}
                                className="cursor-pointer hover:bg-surface/50"
                                onClick={() => setExpandedRow(expandedRow === row.chitMemberId ? null : row.chitMemberId)}
                              >
                                <td className="font-semibold text-cyan-400">#{row.ticketNumber}</td>
                                <td className="font-medium text-foreground">{row.memberName}</td>
                                <td className="text-foreground">{formatCurrency(row.totalDue)}</td>
                                <td>
                                  {row.totalPaid > 0
                                    ? <span className="text-emerald-400 font-semibold">{formatCurrency(row.totalPaid)}</span>
                                    : <span className="text-foreground-muted">₹0</span>}
                                </td>
                                <td>
                                  {row.remaining > 0
                                    ? <span className="text-red-400 font-semibold">{formatCurrency(row.remaining)}</span>
                                    : <span className="text-emerald-400">₹0</span>}
                                </td>
                                <td className="text-amber-400 text-sm">
                                  {row.wonMonths.length > 0 ? row.wonMonths.map(m => `M${m}`).join(', ') : '—'}
                                </td>
                                <td><AggregatedStatusBadge status={row.status} /></td>
                                <td onClick={(e) => e.stopPropagation()}>
                                  {row.remaining > 0 && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        const firstDue = row.monthBreakdown.find(mb => mb.remaining > 0 && !mb.isWinner);
                                        if (firstDue) {
                                          setPayingMemberBreakdown(row.monthBreakdown);
                                          setPayingMember({
                                            chitMemberId: row.chitMemberId,
                                            ticketNumber: row.ticketNumber,
                                            memberName: row.memberName,
                                            isWinner: false,
                                            monthlyDue: firstDue.due,
                                            totalPaid: firstDue.paid,
                                            remaining: firstDue.remaining,
                                            status: firstDue.paid > 0 ? 'PARTIAL' : 'PENDING',
                                          });
                                        }
                                      }}
                                    >
                                      Record Payment
                                    </Button>
                                  )}
                                </td>
                              </tr>

                              {/* per-month breakdown sub-rows */}
                              {expandedRow === row.chitMemberId && (
                                <tr key={`${row.chitMemberId}-breakdown`}>
                                  <td colSpan={9} className="bg-surface/40 px-4 py-3">
                                    <div className="rounded-xl border border-border overflow-hidden">
                                      <table className="glass-table w-full text-sm">
                                        <thead>
                                          <tr className="border-b border-border">
                                            <th className="text-left! px-4 py-2 text-foreground-muted font-medium">Month</th>
                                            <th className="text-right! px-4 py-2 text-foreground-muted font-medium">Due</th>
                                            <th className="text-right! px-4 py-2 text-foreground-muted font-medium">Paid</th>
                                            <th className="text-right! px-4 py-2 text-foreground-muted font-medium">Remaining</th>
                                            <th className="text-center! px-4 py-2 text-foreground-muted font-medium">Note</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {row.monthBreakdown.map((mb) => (
                                            <tr key={mb.month} className="border-b border-border/50 last:border-0">
                                              <td className="px-4 py-2 text-left! text-cyan-400 font-medium">{t('month')} {mb.month}</td>
                                              <td className="px-4 py-2 text-right! text-foreground">
                                                {mb.isWinner ? <span className="text-foreground-muted">—</span> : formatCurrency(mb.due)}
                                              </td>
                                              <td className="px-4 py-2 text-right!">
                                                {mb.paid > 0
                                                  ? <span className="text-emerald-400">{formatCurrency(mb.paid)}</span>
                                                  : <span className="text-foreground-muted">₹0</span>}
                                              </td>
                                              <td className="px-4 py-2 text-right!">
                                                {mb.isWinner
                                                  ? <span className="text-foreground-muted">—</span>
                                                  : mb.remaining > 0
                                                    ? <span className="text-red-400">{formatCurrency(mb.remaining)}</span>
                                                    : <span className="text-emerald-400">₹0</span>}
                                              </td>
                                              <td className="px-4 py-2 text-center!">
                                                {mb.isWinner ? (
                                                  <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">🏆 Winner</span>
                                                ) : (
                                                  <span className="text-foreground-muted">—</span>
                                                )}
                                              </td>
                                            </tr>
                                          ))}
                                          <tr className="bg-surface border-t-2 border-border font-semibold">
                                            <td className="px-4 py-2 text-left! text-foreground-muted">Total</td>
                                            <td className="px-4 py-2 text-right! text-foreground">{formatCurrency(row.totalDue)}</td>
                                            <td className="px-4 py-2 text-right! text-emerald-400">{formatCurrency(row.totalPaid)}</td>
                                            <td className="px-4 py-2 text-right! text-red-400">{formatCurrency(row.remaining)}</td>
                                            <td className="px-4 py-2 text-center!">
                                              <span className="text-foreground-muted">—</span>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )
            )}

            {/* ── SINGLE MONTH TABLE ── */}
            {!isAllMode && (
              memberRows.length === 0 ? (
                <EmptyState
                  icon={<HiOutlineClipboardDocumentList className="w-8 h-8" />}
                  title="No tickets assigned"
                  description="Add members to this group first."
                />
              ) : (
              <Card padding={false}>
                <div className="p-6 pb-4 flex items-center gap-2">
                  <HiOutlineBanknotes className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-base font-semibold text-foreground">
                    {t('month')} {selectedMonth} — Member Payment Status
                  </h3>
                </div>
                <div className="overflow-x-auto px-6 pb-6">
                  <table className="glass-table w-full">
                    <thead>
                      <tr>
                        <th>{t('ticketNumber')}</th>
                        <th>{t('member')}</th>
                        <th>{t('amountDue')}</th>
                        <th>{t('totalPaid')}</th>
                        <th>{t('remaining')}</th>
                        <th>{t('status')}</th>
                        <th>{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {memberRows
                        .sort((a, b) => a.ticketNumber - b.ticketNumber)
                        .map((row) => (
                          <tr key={row.chitMemberId}>
                            <td className="font-semibold text-cyan-400">#{row.ticketNumber}</td>
                            <td className="font-medium text-foreground">{row.memberName}</td>
                            <td>
                              {row.isWinner ? (
                                <span className="text-foreground-muted text-xs">—</span>
                              ) : (
                                <span className="text-foreground">{formatCurrency(row.monthlyDue)}</span>
                              )}
                            </td>
                            <td>
                              {row.totalPaid > 0 ? (
                                <span className="text-emerald-400 font-semibold">
                                  {formatCurrency(row.totalPaid)}
                                </span>
                              ) : (
                                <span className="text-foreground-muted">₹0</span>
                              )}
                            </td>
                            <td>
                              {row.isWinner ? (
                                <span className="text-foreground-muted text-xs">—</span>
                              ) : row.remaining > 0 ? (
                                <span className="text-red-400 font-semibold">
                                  {formatCurrency(row.remaining)}
                                </span>
                              ) : (
                                <span className="text-emerald-400">₹0</span>
                              )}
                            </td>
                            <td>
                              <MemberStatusBadge status={row.status} />
                            </td>
                            <td>
                              {!row.isWinner && row.status !== 'COMPLETED' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setPayingMember(row)}
                                >
                                  Record Payment
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </Card>
              )
            )}
          </>
        )}

        {isLoadingData && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {payingMember && selectedGroupId && selectedMonth !== null && (
        <RecordPaymentModal
          isOpen={!!payingMember}
          row={payingMember}
          chit_group_id={selectedGroupId}
          month_number={
            isAllMode
              ? (auctions
                  .slice()
                  .sort((a, b) => a.month_number - b.month_number)
                  .find(
                    (a) =>
                      a.winner_chit_member_id !== payingMember.chitMemberId &&
                      payments
                        .filter((p) => p.chit_member_id === payingMember.chitMemberId && p.month_number === a.month_number)
                        .reduce((s, p) => s + Number(p.amount_paid), 0) < (a.calculation_data?.amount_to_collect ?? 0)
                  )?.month_number ?? 1)
              : (selectedMonth as number)
          }
          auctions={isAllMode ? auctions.filter(a => a.winner_chit_member_id !== payingMember.chitMemberId) : []}
          monthBreakdown={isAllMode ? payingMemberBreakdown : []}
          allowMonthSelect={isAllMode}
          onClose={() => { setPayingMember(null); setPayingMemberBreakdown([]); }}
          onSaved={() => {
            setPayingMember(null);
            setPayingMemberBreakdown([]);
            loadMonthData();
          }}
        />
      )}
    </>
  );
}

// ─── Status Badge ─────────────────────────────────────────

function MemberStatusBadge({ status }: { status: MemberRow['status'] }) {
  const { t } = useLang();
  const map: Record<MemberRow['status'], { label: string; cls: string }> = {
    WINNER: { label: t('winner'), cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    COMPLETED: { label: t('completed'), cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    PARTIAL: { label: t('partial'), cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    PENDING: { label: t('pending'), cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
  };
  const { label, cls } = map[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  );
}

function AggregatedStatusBadge({ status }: { status: AggregatedRow['status'] }) {
  const { t } = useLang();
  const map: Record<AggregatedRow['status'], { label: string; cls: string }> = {
    CLEAR: { label: t('settled'), cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    COMPLETED: { label: t('fullySettled'), cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    PARTIAL: { label: t('partial'), cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    PENDING: { label: t('pending'), cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
  };
  const { label, cls } = map[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  );
}

// ─── Record Payment Modal ─────────────────────────────────

function RecordPaymentModal({
  isOpen,
  row,
  chit_group_id,
  month_number,
  auctions,
  monthBreakdown,
  allowMonthSelect,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  row: MemberRow;
  chit_group_id: string;
  month_number: number;
  auctions: Auction[];
  monthBreakdown: AggregatedRow['monthBreakdown'];
  allowMonthSelect: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [upiId, setUpiId] = useState('');
  const [selectedMonthForPayment, setSelectedMonthForPayment] = useState(month_number);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useLang();

  // Look up the selected month's figures from the breakdown (all-months mode)
  // or fall back to the row prop (single-month mode)
  const activeLine = monthBreakdown.find((mb) => mb.month === selectedMonthForPayment);
  const displayDue = activeLine ? activeLine.due : row.monthlyDue;
  const displayPaid = activeLine ? activeLine.paid : row.totalPaid;
  const displayRemaining = activeLine ? activeLine.remaining : row.remaining;

  useEffect(() => {
    if (isOpen) {
      setPaymentMethod('CASH');
      setUpiId('');
      setSelectedMonthForPayment(month_number);
      // initial amount = remaining for the initial month
      const initial = monthBreakdown.find((mb) => mb.month === month_number);
      setAmountPaid(String(initial ? initial.remaining : row.remaining));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // When month selector changes, update the pre-filled amount to that month's remaining
  useEffect(() => {
    if (!isOpen) return;
    const line = monthBreakdown.find((mb) => mb.month === selectedMonthForPayment);
    if (line) setAmountPaid(String(line.remaining));
  }, [selectedMonthForPayment, monthBreakdown, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chit_group_id,
        chit_member_id: row.chitMemberId,
        month_number: selectedMonthForPayment,
        amount_paid: Number(amountPaid),
        payment_method: paymentMethod,
        upi_id: paymentMethod === 'UPI' ? upiId : undefined,
        payment_date: new Date().toISOString(),
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || 'Failed to record payment');
    } else {
      toast.success(`Payment recorded for ${row.memberName}`);
      onSaved();
    }
    setIsSubmitting(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${t('recordPayment')} — #${row.ticketNumber} ${row.memberName}`}>
      <div className="mb-4 p-3 bg-surface border border-border rounded-xl space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-foreground-muted">{t('amountDue')}</span>
          <span className="font-semibold text-foreground">{formatCurrency(displayDue)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-foreground-muted">{t('totalPaid')}</span>
          <span className="font-semibold text-emerald-400">{formatCurrency(displayPaid)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-foreground-muted">{t('remaining')}</span>
          <span className="font-semibold text-red-400">{formatCurrency(displayRemaining)}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {allowMonthSelect && auctions.length > 0 && (
          <Select
            label="Month to Pay For"
            value={String(selectedMonthForPayment)}
            onChange={(e) => setSelectedMonthForPayment(Number(e.target.value))}
            options={auctions
              .slice()
              .sort((a, b) => a.month_number - b.month_number)
              .map((a) => ({ value: String(a.month_number), label: `Month ${a.month_number}` }))}
          />
        )}
        <Input
          label={`Amount to Pay (max ${formatCurrency(displayRemaining)})`}
          type="number"
          value={amountPaid}
          onChange={(e) => setAmountPaid(e.target.value)}
          required
        />

        <Select
          label="Payment Method"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          options={[
            { value: 'CASH', label: 'Cash' },
            { value: 'UPI', label: 'UPI' },
            { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
          ]}
        />

        {paymentMethod === 'UPI' && (
          <Input
            label={t('upiId')}
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            placeholder="name@upi"
            required
          />
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} type="button">{t('cancel')}</Button>
          <Button type="submit" isLoading={isSubmitting}>{t('recordPayment')}</Button>
        </div>
      </form>
    </Modal>
  );
}
