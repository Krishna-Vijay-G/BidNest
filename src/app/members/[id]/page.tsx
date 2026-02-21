'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Card, PageLoader, StatusBadge, Modal, Input, Button, Select } from '@/components/ui';
import Link from 'next/link';
import {
  HiOutlineArrowLeft,
  HiOutlinePhone,
  HiOutlineCreditCard,
  HiOutlineTicket,
  HiOutlineTrophy,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineChartBar,
  HiOutlineBanknotes,
  HiOutlineUser,
  HiOutlineCalendarDays,
  HiOutlinePencil,
} from 'react-icons/hi2';
import { useLang } from '@/lib/i18n/LanguageContext';
import toast from 'react-hot-toast';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Member {
  id: string;
  name: { value: string };
  nickname: { value: string };
  mobile: { value: string };
  upi_ids: { value: string; added_at: string; is_active: boolean }[];
  is_active: boolean;
  created_at: string;
}

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
}

interface ChitMemberTicket {
  id: string;
  ticket_number: number;
  is_active: boolean;
  chit_group: ChitGroup;
}

interface Auction {
  id: string;
  month_number: number;
  winner_chit_member_id: string;
  winning_amount: string;
  original_bid: string;
  calculation_data: {
    amount_to_collect: number;
    dividend_per_member: number;
  };
  winner_chit_member: {
    id: string;
    ticket_number: number;
    member: { name: { value: string } };
  };
}

interface Payment {
  id: string;
  chit_member_id: string;
  month_number: number;
  amount_paid: string;
  payment_method: string;
  payment_date: string;
  status: string;
}

// per month breakdown inside a group
interface MonthRow {
  month: number;
  amountDue: number;       // what this ticket owes (0 if they won this month)
  amountPaid: number;      // what they've actually paid
  balance: number;         // amountDue - amountPaid (negative = overpaid)
  wonThisMonth: boolean;
  wonAmount: number;       // winning_amount if they won
  paymentStatus: 'WON' | 'COMPLETED' | 'PARTIAL' | 'PENDING';
  payments: Payment[];
}

// full summary per group per ticket
interface GroupSummary {
  ticket: ChitMemberTicket;
  group: ChitGroup;
  auctions: Auction[];
  months: MonthRow[];        // one row per completed auction month
  totalOwed: number;
  totalPaid: number;
  totalBalance: number;
  wonMonth: number | null;
  wonAmount: number;
  completedMonths: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

function buildGroupSummary(
  ticket: ChitMemberTicket,
  auctions: Auction[],
  payments: Payment[]
): GroupSummary {
  const group = ticket.chit_group;
  const months: MonthRow[] = [];

  let totalOwed = 0;
  let totalPaid = 0;
  let wonMonth: number | null = null;
  let wonAmount = 0;

  // sort auctions chronologically
  const sorted = [...auctions].sort((a, b) => a.month_number - b.month_number);

  for (const auction of sorted) {
    const isWinner = auction.winner_chit_member_id === ticket.id;
    const monthPayments = payments.filter(p => p.month_number === auction.month_number);
    const amountPaid = monthPayments.reduce((s, p) => s + Number(p.amount_paid), 0);

    let amountDue = 0;
    if (isWinner) {
      wonMonth = auction.month_number;
      wonAmount = Number(auction.winning_amount);
      // winner doesn't pay this month
    } else {
      amountDue = auction.calculation_data?.amount_to_collect || 0;
      totalOwed += amountDue;
      totalPaid += amountPaid;
    }

    const balance = amountDue - amountPaid;

    let paymentStatus: MonthRow['paymentStatus'];
    if (isWinner) {
      paymentStatus = 'WON';
    } else if (amountPaid >= amountDue && amountDue > 0) {
      paymentStatus = 'COMPLETED';
    } else if (amountPaid > 0) {
      paymentStatus = 'PARTIAL';
    } else {
      paymentStatus = 'PENDING';
    }

    months.push({
      month: auction.month_number,
      amountDue,
      amountPaid,
      balance,
      wonThisMonth: isWinner,
      wonAmount: isWinner ? Number(auction.winning_amount) : 0,
      paymentStatus,
      payments: monthPayments,
    });
  }

  return {
    ticket,
    group,
    auctions,
    months,
    totalOwed,
    totalPaid,
    totalBalance: totalOwed - totalPaid,
    wonMonth,
    wonAmount,
    completedMonths: sorted.length,
  };
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MemberDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { t, lang } = useLang();

  const [member, setMember] = useState<Member | null>(null);
  const [summaries, setSummaries] = useState<GroupSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [mobile, setMobile] = useState('');
  const [upiId, setUpiId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function fetchAll() {
    setIsLoading(true);
    try {
      // 1. Member + chit tickets
      const [memberRes, ticketsRes] = await Promise.all([
        fetch(`/api/members/${id}`),
        fetch(`/api/chit-members?member_id=${id}`),
      ]);

      const memberData = await memberRes.json();
      const ticketsData: ChitMemberTicket[] = await ticketsRes.json();

      if (!memberData?.id) { setMember(null); setSummaries([]); return; }
      setMember(memberData);

      const tickets = Array.isArray(ticketsData) ? ticketsData : [];

      // 2. For each ticket: fetch group auctions + member payments in parallel
      const summaryResults = await Promise.all(
        tickets.map(async (ticket) => {
          const [auctionsRes, paymentsRes] = await Promise.all([
            fetch(`/api/auctions?chit_group_id=${ticket.chit_group.id}`),
            fetch(`/api/payments?chit_member_id=${ticket.id}`),
          ]);
          const auctions: Auction[] = await auctionsRes.json();
          const payments: Payment[] = await paymentsRes.json();
          return buildGroupSummary(
            ticket,
            Array.isArray(auctions) ? auctions : [],
            Array.isArray(payments) ? payments : []
          );
        })
      );

      setSummaries(summaryResults);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, [id]);

  if (isLoading) return <><Header title={t('members')} /><PageLoader /></>;
  if (!member) return (
    <>
      <Header title={t('notFound')} />
      <div className="p-8 text-center text-foreground-muted">Member not found.</div>
    </>
  );

  // ── Global stats across all groups ──
  const grandTotalOwed = summaries.reduce((s, g) => s + g.totalOwed, 0);
  const grandTotalPaid = summaries.reduce((s, g) => s + g.totalPaid, 0);
  const grandBalance   = grandTotalOwed - grandTotalPaid;
  const grandWon       = summaries.reduce((s, g) => s + g.wonAmount, 0);
  const totalTickets   = summaries.length;
  const groupsWon      = summaries.filter(g => g.wonMonth !== null).length;

  const tabs = [
    { id: 'overview', label: t('overview') },
    ...summaries.map(s => ({
      id: s.ticket.id,
      label: `${s.group.name} #${s.ticket.ticket_number}`,
    })),
  ];

  return (
    <>
      <Header
        title={member.name.value}
        subtitle={`"${member.nickname.value}" · ${member.mobile.value}`}
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl space-y-6">

        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-foreground-muted hover:text-cyan-400 transition-colors"
        >
          <HiOutlineArrowLeft className="w-4 h-4" />
          {t('back')}
        </button>

        {/* ── Profile Card ── */}
        <div className="glass rounded-2xl border border-border p-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-cyan-500/20 shrink-0">
              {member.name.value.charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h2 className="text-2xl font-bold text-foreground">{member.name.value}</h2>
                <StatusBadge status={member.is_active ? 'ACTIVE' : 'CANCELLED'} label={formatStatusLabel(member.is_active ? 'ACTIVE' : 'CANCELLED', t)} />
              </div>
              <p className="text-foreground-muted text-sm mb-4">"{member.nickname.value}"</p>

              <div className="flex flex-wrap gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-foreground-secondary">
                  <HiOutlinePhone className="w-4 h-4 text-cyan-400" />
                  {member.mobile.value}
                </span>
                {member.upi_ids?.filter(u => u.is_active).map(u => (
                  <span key={u.value} className="flex items-center gap-1.5 text-foreground-secondary">
                    <HiOutlineCreditCard className="w-4 h-4 text-purple-400" />
                    {u.value}
                  </span>
                ))}
                <span className="flex items-center gap-1.5 text-foreground-muted">
                  <HiOutlineCalendarDays className="w-4 h-4" />
                  {t('memberSince')}: {new Date(member.created_at).toLocaleDateString(lang === 'ta' ? 'ta-IN' : 'en-IN', { month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Grand Summary Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: t('totalTickets'), value: String(totalTickets), icon: <HiOutlineTicket className="w-5 h-5" />, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
            { label: t('groupsWon'), value: `${groupsWon}/${totalTickets}`, icon: <HiOutlineTrophy className="w-5 h-5" />, color: 'text-amber-400', bg: 'bg-amber-500/10' },
            { label: t('totalWon'), value: fmt(grandWon), icon: <HiOutlineBanknotes className="w-5 h-5" />, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: t('totalOwed'), value: fmt(grandTotalOwed), icon: <HiOutlineChartBar className="w-5 h-5" />, color: 'text-foreground', bg: 'bg-surface' },
            { label: t('totalPaid'), value: fmt(grandTotalPaid), icon: <HiOutlineCheckCircle className="w-5 h-5" />, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            {
              label: grandBalance > 0 ? t('balanceDue') : t('fullySettled'),
              value: fmt(Math.max(0, grandBalance)),
              icon: <HiOutlineExclamationCircle className="w-5 h-5" />,
              color: grandBalance > 0 ? 'text-red-400' : 'text-emerald-400',
              bg: grandBalance > 0 ? 'bg-red-500/10' : 'bg-emerald-500/10',
            },
          ].map(stat => (
            <div key={stat.label} className="glass rounded-2xl border border-border p-4 flex flex-col gap-2">
              <div className={`w-9 h-9 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                {stat.icon}
              </div>
              <p className="text-xs text-foreground-muted leading-tight">{stat.label}</p>
              <p className={`text-base font-bold ${stat.color} leading-tight`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        {summaries.length > 0 && (
          <>
            <div className="mb-4 w-full md:w-64">
              <Select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                options={tabs.map(tab => ({ value: tab.id, label: tab.label }))}
              />
            </div>

            {/* ── Overview Tab ── */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                {summaries.length === 0 ? (
                  <div className="text-center py-12 text-foreground-muted">
                    {t('notInAnyGroup')}
                  </div>
                ) : (
                  summaries.map(summary => (
                    <OverviewGroupCard
                      key={summary.ticket.id}
                      summary={summary}
                      onViewDetails={() => setActiveTab(summary.ticket.id)}
                    />
                  ))
                )}
              </div>
            )}

            {/* ── Group Detail Tabs ── */}
            {summaries.map(summary => (
              activeTab === summary.ticket.id && (
                <GroupDetailView key={summary.ticket.id} summary={summary} />
              )
            ))}
          </>
        )}

        {summaries.length === 0 && !isLoading && (
          <div className="glass rounded-2xl border border-border p-12 text-center">
            <HiOutlineTicket className="w-12 h-12 text-foreground-muted mx-auto mb-3" />
          <p className="text-foreground-muted">{t('notInAnyGroup')}</p>
          </div>
        )}

        {/* ── Contact Details ── */}
        <div className="glass rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">
              {t('memberInfo')}
            </h3>
            <button
              onClick={() => {
                setEditingMember(member);
                setName(member?.name.value ?? '');
                setNickname(member?.nickname.value ?? '');
                setMobile(member?.mobile.value ?? '');
                setUpiId(member?.upi_ids?.find(u => u.is_active)?.value ?? '');
              }}
              className="p-1.5 text-foreground-muted hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all"
              title={t('editMember')}
              aria-label={t('editMember')}
            >
              <HiOutlinePencil className="w-4 h-4" />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-border">
            <div className="space-y-0 sm:pr-6">
              {[
                { label: t('memberName'), value: member.name.value, icon: <HiOutlineUser className="w-4 h-4" /> },
                { label: t('nickname'), value: member.nickname.value, icon: <HiOutlineUser className="w-4 h-4" /> },
                { label: t('mobile'), value: member.mobile.value, icon: <HiOutlinePhone className="w-4 h-4" /> },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <span className="flex items-center gap-2 text-sm text-foreground-muted">
                    {row.icon}{row.label}
                  </span>
                  <span className="text-sm font-medium text-foreground">{row.value}</span>
                </div>
              ))}
            </div>
            <div className="sm:pl-6 pt-3 sm:pt-0">
              <p className="text-xs text-foreground-muted mb-3">{t('upiIds')}</p>
              {member.upi_ids?.filter(u => u.is_active).length === 0 ? (
                <p className="text-sm text-foreground-muted">—</p>
              ) : (
                <div className="space-y-2">
                  {member.upi_ids?.filter(u => u.is_active).map(u => (
                    <div key={u.value} className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-xl">
                      <HiOutlineCreditCard className="w-4 h-4 text-purple-400 shrink-0" />
                      <span className="text-sm text-foreground font-mono">{u.value}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-foreground-muted mt-4 mb-1">{t('memberId')}</p>
              <p className="text-xs font-mono text-foreground-muted break-all">{member.id}</p>
            </div>
          </div>
        </div>

      </div>
      {/* Edit Modal (inline) */}
      <Modal
        isOpen={!!editingMember}
        onClose={() => setEditingMember(null)}
        title={editingMember ? t('editMember') : t('addMember')}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!editingMember) return;
            setIsSubmitting(true);
            const now = new Date().toISOString();

            const res = await fetch(`/api/members/${editingMember.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: { value: name.trim(), updated_at: now },
                nickname: { value: nickname.trim(), updated_at: now },
                mobile: { value: mobile.trim(), updated_at: now },
                upi_ids: upiId.trim() ? [{ value: upiId.trim(), added_at: now, is_active: true }] : [],
              }),
            });

            const data = await res.json();
            if (!res.ok) {
              toast.error(data.error || 'Something went wrong');
            } else {
              toast.success(t('memberUpdated'));
              setEditingMember(null);
              await fetchAll();
            }
            setIsSubmitting(false);
          }}
          className="space-y-4"
        >
          <Input label={t('memberName')} value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label={t('nickname')} value={nickname} onChange={(e) => setNickname(e.target.value)} required />
          <Input label={t('mobile')} value={mobile} onChange={(e) => setMobile(e.target.value)} required />
          <Input label={`${t('upiId')} (${t('optional')})`} value={upiId} onChange={(e) => setUpiId(e.target.value)} />
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setEditingMember(null)} type="button">{t('cancel')}</Button>
            <Button type="submit" isLoading={isSubmitting}>{t('saveChanges')}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

// ─── Overview Group Card ──────────────────────────────────────────────────────

function OverviewGroupCard({
  summary,
  onViewDetails,
}: {
  summary: GroupSummary;
  onViewDetails: () => void;
}) {
  const { t } = useLang();
  const { group, ticket, months, totalOwed, totalPaid, totalBalance, wonMonth, wonAmount, completedMonths } = summary;
  const paidPct = totalOwed > 0 ? Math.min(100, Math.round((totalPaid / totalOwed) * 100)) : 100;
  const pendingMonths = months.filter(m => m.paymentStatus === 'PARTIAL' || m.paymentStatus === 'PENDING').length;

  return (
    <div className="glass rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-border">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-lg shrink-0">
            #{ticket.ticket_number}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/groups/${group.id}`} className="font-bold text-foreground hover:text-cyan-400 transition-colors">
                {group.name}
              </Link>
              <StatusBadge status={group.status} label={formatStatusLabel(group.status, t)} />
              {wonMonth && (
                <span className="flex items-center gap-1 text-xs font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  <HiOutlineTrophy className="w-3 h-3" />
                  {t('wonMonths')} {wonMonth}
                </span>
              )}
            </div>
            <p className="text-xs text-foreground-muted mt-0.5">
              {fmt(Number(group.total_amount))} · {group.total_members} {t('members')} · {group.duration_months} {t('months')} · {t('ticketShort')} {ticket.ticket_number}
            </p>
          </div>
        </div>
        <button
          onClick={onViewDetails}
          className="text-xs text-cyan-400 hover:underline shrink-0 ml-2"
        >
          {t('monthByMonth')} →
        </button>
      </div>

      {/* Progress */}
      <div className="px-5 pt-4">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-foreground-muted">{t('auctionsCompleted')}</span>
          <span className="text-foreground font-medium">{completedMonths}/{group.duration_months} {t('months')}</span>
        </div>
        <div className="neon-progress mb-4">
          <div className="neon-progress-bar" style={{ width: `${Math.round((completedMonths / group.duration_months) * 100)}%` }} />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 pb-5">
        <StatBox
          label={t('wonAuction')}
          value={wonAmount > 0 ? fmt(wonAmount) : '—'}
          color={wonAmount > 0 ? 'text-amber-400' : 'text-foreground-muted'}
          icon={<HiOutlineTrophy className="w-4 h-4" />}
        />
        <StatBox
          label={t('totalOwed')}
          value={fmt(totalOwed)}
          color="text-foreground"
          icon={<HiOutlineChartBar className="w-4 h-4" />}
        />
        <StatBox
          label={t('totalPaid')}
          value={fmt(totalPaid)}
          color="text-emerald-400"
          icon={<HiOutlineCheckCircle className="w-4 h-4" />}
        />
        <StatBox
          label={totalBalance > 0 ? t('balanceDue') : t('fullySettled')}
          value={fmt(Math.abs(totalBalance))}
          color={totalBalance > 0 ? 'text-red-400' : 'text-emerald-400'}
          icon={<HiOutlineExclamationCircle className="w-4 h-4" />}
        />
      </div>

      {/* Payment progress bar */}
      {totalOwed > 0 && (
        <div className="px-5 pb-5">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-foreground-muted">{t('paymentProgress')}</span>
            <span className={`font-semibold ${paidPct === 100 ? 'text-emerald-400' : pendingMonths > 0 ? 'text-amber-400' : 'text-foreground-muted'}`}>
              {paidPct}% {t('settled')}{pendingMonths > 0 ? ` · ${pendingMonths} ${pendingMonths > 1 ? t('months') : t('month')} ${t('pending')}` : ''}
            </span>
          </div>
          <div className="h-2 bg-surface border border-border rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${paidPct}%`,
                background: paidPct === 100
                  ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                  : 'linear-gradient(90deg, #00f0ff, #a855f7)',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Group Detail View (Month-by-Month) ──────────────────────────────────────

function GroupDetailView({ summary }: { summary: GroupSummary }) {
  const { t } = useLang();
  const { group, ticket, months, totalOwed, totalPaid, totalBalance, wonMonth, wonAmount } = summary;

  return (
    <div className="space-y-5">
      {/* Group header */}
      <div className="glass rounded-2xl border border-border p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/groups/${group.id}`} className="text-lg font-bold text-foreground hover:text-cyan-400 transition-colors">
                {group.name}
              </Link>
              <StatusBadge status={group.status} label={formatStatusLabel(group.status, t)} />
            </div>
            <p className="text-sm text-foreground-muted mt-0.5">
              {fmt(Number(group.total_amount))} · {group.total_members} {t('members')} · {group.duration_months} {t('months')} · {t('ticketShort')} {ticket.ticket_number}
            </p>
          </div>
          {wonMonth && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <HiOutlineTrophy className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-xs text-amber-400/70">{t('wonMonths')} {wonMonth}</p>
                <p className="text-base font-bold text-amber-400">{fmt(wonAmount)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="bg-surface border border-border rounded-xl p-3 text-center">
            <p className="text-xs text-foreground-muted mb-1">{t('totalOwed')}</p>
            <p className="text-base font-bold text-foreground">{fmt(totalOwed)}</p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-3 text-center">
            <p className="text-xs text-foreground-muted mb-1">{t('totalPaid')}</p>
            <p className="text-base font-bold text-emerald-400">{fmt(totalPaid)}</p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-3 text-center">
            <p className="text-xs text-foreground-muted mb-1">{totalBalance > 0 ? t('balanceDue') : t('fullySettled')}</p>
            <p className={`text-base font-bold ${totalBalance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {totalBalance > 0 ? fmt(totalBalance) : '✓ Cleared'}
            </p>
          </div>
        </div>
      </div>

      {/* Month-by-month table */}
      {months.length === 0 ? (
        <div className="glass rounded-2xl border border-border p-10 text-center text-foreground-muted text-sm">
          {t('noAuctions')}
        </div>
      ) : (
        <div className="glass rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <HiOutlineCalendarDays className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-semibold text-foreground">{t('monthByMonth')}</h3>
          </div>

          {/* Desktop table */}
          <div className="overflow-x-auto">
            <table className="glass-table w-full">
              <thead>
                <tr>
                  <th>{t('month')}</th>
                  <th>{t('status')}</th>
                  <th>{t('amountDue')}</th>
                  <th>{t('amountPaid')}</th>
                  <th>{t('balance')}</th>
                  <th>{t('paymentMethod')}</th>
                  <th>{t('date')}</th>
                </tr>
              </thead>
              <tbody>
                {months.map(row => (
                  <MonthTableRow key={row.month} row={row} />
                ))}
              </tbody>

              {/* Totals footer */}
              <tfoot>
                <tr className="border-t-2 border-border">
                  <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-foreground-muted">
                    {t('total')} ({months.filter(m => !m.wonThisMonth).length} {t('payingMonths')})
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-foreground">{fmt(totalOwed)}</td>
                  <td className="px-4 py-3 text-sm font-bold text-emerald-400">{fmt(totalPaid)}</td>
                  <td className={`px-4 py-3 text-sm font-bold ${totalBalance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {totalBalance > 0 ? `-${fmt(totalBalance)}` : `✓ ${t('settled')}`}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Month Table Row ──────────────────────────────────────────────────────────

function MonthTableRow({ row }: { row: MonthRow }) {
  const { t } = useLang();
  const [expanded, setExpanded] = useState(false);

  const statusConfig = {
    WON: { label: t('wonAuction'), color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    COMPLETED: { label: t('completed'), color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    PARTIAL: { label: t('partial'), color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
    PENDING: { label: t('pending'), color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  }[row.paymentStatus];

  const lastPayment = row.payments[row.payments.length - 1];

  return (
    <>
      <tr
        className={`cursor-pointer ${row.wonThisMonth ? 'bg-amber-500/5' : ''}`}
        onClick={() => row.payments.length > 0 && setExpanded(e => !e)}
      >
        <td className="font-semibold text-foreground">{t('month')} {row.month}</td>
        <td>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold border ${statusConfig.bg} ${statusConfig.color}`}>
            {row.paymentStatus === 'WON' && <HiOutlineTrophy className="w-3 h-3" />}
            {row.paymentStatus === 'COMPLETED' && <HiOutlineCheckCircle className="w-3 h-3" />}
            {statusConfig.label}
          </span>
        </td>
        <td>
          {row.wonThisMonth
            ? <span className="text-amber-400 font-semibold">{fmt(row.wonAmount)}</span>
            : <span className="text-foreground">{fmt(row.amountDue)}</span>
          }
        </td>
        <td>
          {row.wonThisMonth
            ? <span className="text-foreground-muted text-xs">—</span>
            : <span className={row.amountPaid > 0 ? 'text-emerald-400 font-semibold' : 'text-foreground-muted'}>{fmt(row.amountPaid)}</span>
          }
        </td>
        <td>
          {row.wonThisMonth ? (
            <span className="text-foreground-muted text-xs">—</span>
          ) : row.balance <= 0 ? (
            <span className="text-emerald-400 text-xs font-medium">✓ {t('settled')}</span>
          ) : (
            <span className="text-red-400 font-semibold">{fmt(row.balance)}</span>
          )}
        </td>
        <td className="text-foreground-muted text-sm">
          {lastPayment?.payment_method || '—'}
        </td>
        <td className="text-foreground-muted text-sm">
          {lastPayment
            ? new Date(lastPayment.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
            : '—'
          }
          {row.payments.length > 1 && (
            <span className="ml-1 text-xs text-cyan-400">+{row.payments.length - 1} {t('more')} {expanded ? '▲' : '▼'}</span>
          )}
        </td>
      </tr>

      {/* Expanded sub-payments */}
      {expanded && row.payments.length > 1 && row.payments.map((p, i) => (
        <tr key={p.id} className="bg-surface/50">
          <td colSpan={2} className="pl-10 py-2 text-xs text-foreground-muted">
            {t('payment')} {i + 1}
          </td>
          <td />
          <td className="py-2 text-xs text-emerald-400 font-medium">{fmt(Number(p.amount_paid))}</td>
          <td />
          <td className="py-2 text-xs text-foreground-muted">{p.payment_method}</td>
          <td className="py-2 text-xs text-foreground-muted">
            {new Date(p.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
          </td>
        </tr>
      ))}
    </>
  );
}

// ─── Stat Box ────────────────────────────────────────────────────────────────

function StatBox({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string;
  color: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-surface border border-border rounded-xl p-3">
      <div className={`flex items-center gap-1.5 mb-1 ${color} opacity-70 text-xs`}>
        {icon}
        {label}
      </div>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
    </div>
  );
}

function formatStatusLabel(status: string, t: (k: any) => string) {
  if (!status) return '';
  const lower = status.toLowerCase();
  const lowerLabel = t(lower as any);
  if (lowerLabel !== lower) return lowerLabel;
  const capitalized = status[0] + status.slice(1).toLowerCase();
  return t((`status${capitalized}`) as any);
}