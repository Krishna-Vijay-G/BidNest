//src/app/payments/page.tsx
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Header } from '@/components/layout/Header';
import { Card, PageLoader, EmptyState, Select } from '@/components/ui';
import { StatusBadge } from '@/components/ui/Badge';
import Link from 'next/link';
import {
  HiOutlineBanknotes,
  HiOutlineArrowTrendingUp,
  HiOutlineArrowTrendingDown,
  HiOutlineCurrencyRupee,
  HiOutlineScissors,
  HiOutlineUserGroup,
} from 'react-icons/hi2';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChitGroup {
  id: string;
  name: string;
  total_amount: string;
  total_members: number;
  monthly_amount: string;
  duration_months: number;
  status: string;
}

interface Auction {
  id: string;
  chit_group_id: string;
  month_number: number;
  winning_amount: string;
  commission: string;
  original_bid: string;
}

interface Payment {
  id: string;
  chit_group_id: string;
  chit_member_id: string;
  month_number: number;
  amount_paid: string;
  payment_method: string;
  payment_date: string;
  status: string;
  chit_member: {
    ticket_number: number;
    member: { name: { value: string } };
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function pct(part: number, total: number) {
  if (!total) return '0%';
  return `${Math.round((part / total) * 100)}%`;
}

// ─── Per-group stats ─────────────────────────────────────────────────────────

interface GroupStats {
  group: ChitGroup;
  inflow: number;
  payouts: number;
  commission: number;
  net: number;
  auctionsCount: number;
}

function buildGroupStats(
  groups: ChitGroup[],
  payments: Payment[],
  auctions: Auction[]
): GroupStats[] {
  return groups.map((g) => {
    const gPayments = payments.filter((p) => p.chit_group_id === g.id);
    const gAuctions = auctions.filter((a) => a.chit_group_id === g.id);
    const inflow = gPayments.reduce((s, p) => s + Number(p.amount_paid), 0);
    const payouts = gAuctions.reduce((s, a) => s + Number(a.winning_amount), 0);
    const commission = gAuctions.reduce((s, a) => s + Number(a.commission), 0);
    return {
      group: g,
      inflow,
      payouts,
      commission,
      net: inflow - payouts - commission,
      auctionsCount: gAuctions.length,
    };
  });
}

// ─── Summary Card ────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="glass rounded-2xl border border-border p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-xl shrink-0 ${color}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-foreground-muted uppercase tracking-wide mb-1">{label}</p>
        <p className="text-2xl font-bold text-foreground truncate">{value}</p>
        {sub && <p className="text-xs text-foreground-muted mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Group Finance Card ───────────────────────────────────────────────────────

function GroupFinanceCard({ stats }: { stats: GroupStats }) {
  const { group, inflow, payouts, commission, net, auctionsCount } = stats;
  const isPositive = net >= 0;

  return (
    <Link href={`/groups/${group.id}`} className="block">
      <div className="glass glass-hover rounded-2xl border border-border p-5 space-y-4 transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-cyan-500/10 shrink-0">
            <HiOutlineUserGroup className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{group.name}</p>
            <p className="text-xs text-foreground-muted">
              {fmt(Number(group.total_amount))} · {group.total_members} members
            </p>
          </div>
        </div>
        <StatusBadge status={group.status} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
          <p className="text-xs text-foreground-muted mb-0.5">Inflow</p>
          <p className="text-base font-bold text-emerald-400">{fmt(inflow)}</p>
        </div>
        <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-3">
          <p className="text-xs text-foreground-muted mb-0.5">Payouts</p>
          <p className="text-base font-bold text-purple-400">{fmt(payouts)}</p>
        </div>
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
          <p className="text-xs text-foreground-muted mb-0.5">Commission</p>
          <p className="text-base font-bold text-amber-400">{fmt(commission)}</p>
        </div>
        <div className={`rounded-xl p-3 border ${isPositive ? 'bg-cyan-500/5 border-cyan-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
          <p className="text-xs text-foreground-muted mb-0.5">Net</p>
          <p className={`text-base font-bold ${isPositive ? 'text-cyan-400' : 'text-red-400'}`}>
            {fmt(net)}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div>
        <div className="flex justify-between text-xs text-foreground-muted mb-1.5">
          <span>Auctions conducted</span>
          <span>{auctionsCount} / {group.duration_months}</span>
        </div>
        <div className="neon-progress">
          <div
            className="neon-progress-bar"
            style={{ width: pct(auctionsCount, group.duration_months) }}
          />
        </div>
      </div>
      </div>
    </Link>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [groups, setGroups] = useState<ChitGroup[]>([]);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [groupStatusFilter, setGroupStatusFilter] = useState<string>('ALL');
  // Persist immediately when user changes the dropdowns
  const setAndPersistFilterGroup = (v: string) => {
    setFilterGroup(v);
    try {
      localStorage.setItem('payments:group', v);
    } catch {}
  };
  const setAndPersistStatusFilter = (v: string) => {
    setGroupStatusFilter(v);
    try {
      localStorage.setItem('payments:status', v);
    } catch {}
  };
  const hasFetched = useRef(false);

  const loadData = useCallback(async () => {
    if (!user || hasFetched.current) return;
    hasFetched.current = true;
    try {
      const [pRes, gRes, aRes] = await Promise.all([
        fetch(`/api/payments?user_id=${user.id}`),
        fetch(`/api/chit-groups?user_id=${user.id}`),
        fetch(`/api/auctions?user_id=${user.id}`),
      ]);
      const [p, g, a] = await Promise.all([pRes.json(), gRes.json(), aRes.json()]);
      setPayments(Array.isArray(p) ? p : []);
      setGroups(Array.isArray(g) ? g : []);
      setAuctions(Array.isArray(a) ? a : []);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // Validate stored status and filterGroup against fetched groups and set if valid
  useEffect(() => {
    if (!groups || groups.length === 0) return;
    try {
      const storedStatus = localStorage.getItem('payments:status') || 'ALL';
      setGroupStatusFilter(storedStatus);

      const storedGroup = localStorage.getItem('payments:group');
      if (storedGroup && storedGroup !== 'all') {
        const filteredGroups = groups.filter((g) => storedStatus === 'ALL' ? true : g.status === storedStatus);
        if (filteredGroups.some((g) => g.id === storedGroup)) {
          setFilterGroup(storedGroup);
        } else {
          setFilterGroup('all');
        }
      }
    } catch {}
  }, [groups]);

  // ── Derived data ──────────────────────────────────────────────────────────

  // groups visible given current status filter
  const visibleGroups = groups.filter((g) => (groupStatusFilter === 'ALL' ? true : g.status === groupStatusFilter));
  const groupStats = buildGroupStats(groups, payments, auctions);
  const visibleGroupStats = buildGroupStats(visibleGroups, payments, auctions);

  // combined totals (respect visibleGroups when showing "All Groups Combined")
  const totalInflow = visibleGroupStats.reduce((s, gs) => s + gs.inflow, 0);
  const totalPayouts = visibleGroupStats.reduce((s, gs) => s + gs.payouts, 0);
  const totalCommission = visibleGroupStats.reduce((s, gs) => s + gs.commission, 0);
  const totalNet = visibleGroupStats.reduce((s, gs) => s + gs.net, 0);

  // filtered to selected group
  const selectedStats =
    filterGroup === 'all'
      ? null
      : groupStats.find((gs) => gs.group.id === filterGroup) ?? null;

  const displayInflow = selectedStats ? selectedStats.inflow : totalInflow;
  const displayPayouts = selectedStats ? selectedStats.payouts : totalPayouts;
  const displayCommission = selectedStats ? selectedStats.commission : totalCommission;
  const displayNet = selectedStats ? selectedStats.net : totalNet;

  // recent payments for selected group (last 15)
  const recentPayments = (
    filterGroup === 'all'
      ? payments.filter((p) => visibleGroups.some((g) => g.id === p.chit_group_id))
      : payments.filter((p) => p.chit_group_id === filterGroup)
  )
    .slice()
    .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
    .slice(0, 15);

  if (isLoading) {
    return (
      <>
        <Header title="Payments" />
        <PageLoader />
      </>
    );
  }

  return (
    <>
      <Header
        title="Payments"
        subtitle={filterGroup === 'all' ? 'All groups combined' : selectedStats?.group.name}
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-8">

        {/* ── Group filter ───────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-40">
            <Select
              label="Status"
              value={groupStatusFilter}
              onChange={(e) => setAndPersistStatusFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All statuses' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'PENDING', label: 'Pending' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
            />
          </div>

          <div className="w-72">
            <Select
              label="Chit Group"
              value={filterGroup}
              onChange={(e) => setAndPersistFilterGroup(e.target.value)}
              options={[
                { value: 'all', label: '📊 All Groups Combined' },
                ...groups
                  .filter((g) => groupStatusFilter === 'ALL' ? true : g.status === groupStatusFilter)
                  .map((g) => ({
                    value: g.id,
                    label: `${g.name} · ${g.total_members}M`,
                  })),
              ]}
            />
          </div>

        </div>

        <div className="mt-2">
          <span className="text-sm text-foreground-muted">
            {filterGroup === 'all'
              ? `${visibleGroups.length} groups · ${payments.filter((p) => visibleGroups.some((g) => g.id === p.chit_group_id)).length} payments`
              : `${recentPayments.length} recent payments`}
          </span>
        </div>

        {/* ── Summary Cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <SummaryCard
            label="Total Inflow"
            value={fmt(displayInflow)}
            sub="Money collected from members"
            icon={<HiOutlineArrowTrendingUp className="w-5 h-5" />}
            color="bg-emerald-500/10 text-emerald-400"
          />
          <SummaryCard
            label="Total Payouts"
            value={fmt(displayPayouts)}
            sub="Winning amounts disbursed"
            icon={<HiOutlineArrowTrendingDown className="w-5 h-5" />}
            color="bg-purple-500/10 text-purple-400"
          />
          <SummaryCard
            label="Commission Earned"
            value={fmt(displayCommission)}
            sub={`${pct(displayCommission, displayInflow)} of inflow`}
            icon={<HiOutlineScissors className="w-5 h-5" />}
            color="bg-amber-500/10 text-amber-400"
          />
          <SummaryCard
            label="Net Balance"
            value={fmt(displayNet)}
            sub={displayNet >= 0 ? 'Surplus' : 'Deficit'}
            icon={<HiOutlineCurrencyRupee className="w-5 h-5" />}
            color={displayNet >= 0 ? 'bg-cyan-500/10 text-cyan-400' : 'bg-red-500/10 text-red-400'}
          />
        </div>

        {/* ── Group-wise Cards ───────────────────────────────────────────── */}
        {filterGroup === 'all' && (
          <section>
            <h2 className="text-sm font-semibold text-foreground-secondary uppercase tracking-wide mb-4">
                Group Breakdown
              </h2>
              {visibleGroupStats.length === 0 ? (
              <EmptyState
                icon={<HiOutlineUserGroup className="w-8 h-8" />}
                title="No chit groups yet"
                description="Create a chit group to start tracking payments."
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {visibleGroupStats.map((gs) => (
                    <GroupFinanceCard key={gs.group.id} stats={gs} />
                  ))}
              </div>
            )}
          </section>
        )}

        {/* ── Recent Payments ─────────────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-foreground-secondary uppercase tracking-wide mb-4">
            {filterGroup === 'all' ? 'Recent Payments (All Groups)' : 'Recent Payments'}
          </h2>
          {recentPayments.length === 0 ? (
            <EmptyState
              icon={<HiOutlineBanknotes className="w-8 h-8" />}
              title="No payments recorded yet"
              description="Use the Payment Tracker to record member payments."
            />
          ) : (
            <Card padding={false}>
              <div className="overflow-x-auto">
                <table className="glass-table w-full">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Ticket</th>
                      <th>Month</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPayments.map((p) => (
                      <tr key={p.id}>
                        <td className="font-medium text-foreground">
                          {p.chit_member?.member?.name?.value || 'N/A'}
                        </td>
                        <td>#{p.chit_member?.ticket_number}</td>
                        <td>Month {p.month_number}</td>
                        <td className="font-semibold text-cyan-400">
                          {fmt(Number(p.amount_paid))}
                        </td>
                        <td>
                          <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-surface border border-border text-foreground-secondary">
                            {p.payment_method}
                          </span>
                        </td>
                        <td className="text-foreground-muted">
                          {new Date(p.payment_date).toLocaleDateString('en-IN')}
                        </td>
                        <td>
                          <StatusBadge status={p.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </section>

      </div>
    </>
  );
}