'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Header } from '@/components/layout/Header';
import { Card, Button, Modal, Input, PageLoader, EmptyState, Select } from '@/components/ui';
import { StatusBadge } from '@/components/ui/Badge';
import {
  HiOutlineClipboardDocumentList,
  HiOutlineBanknotes,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineClock,
  HiOutlineTrophy,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';

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
    mobile: { value: string };
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
  mobile: string;
  isWinner: boolean;
  monthlyDue: number;
  totalPaid: number;
  remaining: number;
  status: 'WINNER' | 'COMPLETED' | 'PARTIAL' | 'PENDING';
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
  const [groups, setGroups] = useState<ChitGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [chitMembers, setChitMembers] = useState<ChitMember[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [payingMember, setPayingMember] = useState<MemberRow | null>(null);

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
        if (list.length > 0) {
          const latest = list.reduce((a: Auction, b: Auction) =>
            a.month_number > b.month_number ? a : b
          );
          setSelectedMonth(latest.month_number);
        } else {
          setSelectedMonth(null);
        }
      });
  }, [selectedGroupId]);

  // Load chit members + payments when group/month changes
  const loadMonthData = useCallback(async () => {
    if (!selectedGroupId || !selectedMonth) return;
    setIsLoadingData(true);
    const [membersRes, paymentsRes] = await Promise.all([
      fetch(`/api/chit-members?chit_group_id=${selectedGroupId}`),
      fetch(`/api/payments?chit_group_id=${selectedGroupId}&month_number=${selectedMonth}`),
    ]);
    const membersData = await membersRes.json();
    const paymentsData = await paymentsRes.json();
    setChitMembers(Array.isArray(membersData) ? membersData : []);
    setPayments(Array.isArray(paymentsData) ? paymentsData : []);
    setIsLoadingData(false);
  }, [selectedGroupId, selectedMonth]);

  useEffect(() => {
    loadMonthData();
  }, [loadMonthData]);

  // Derive per-member rows
  const currentAuction = auctions.find((a) => a.month_number === selectedMonth);

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
      mobile: cm.member?.mobile?.value || '—',
      isWinner,
      monthlyDue,
      totalPaid,
      remaining,
      status,
    };
  });

  // Summary counts
  const counts = {
    total: memberRows.length,
    completed: memberRows.filter((r) => r.status === 'COMPLETED').length,
    partial: memberRows.filter((r) => r.status === 'PARTIAL').length,
    pending: memberRows.filter((r) => r.status === 'PENDING').length,
    winner: memberRows.filter((r) => r.status === 'WINNER').length,
  };

  const totalCollected = memberRows.reduce((s, r) => s + r.totalPaid, 0);
  const totalExpected = memberRows
    .filter((r) => !r.isWinner)
    .reduce((s, r) => s + r.monthlyDue, 0);

  if (isLoadingGroups) {
    return (
      <>
        <Header title="Payment Tracker" />
        <PageLoader />
      </>
    );
  }

  return (
    <>
      <Header
        title="Payment Tracker"
        subtitle="Track monthly payment status for each member"
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Filters */}
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Chit Group"
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              options={[
                { value: '', label: 'Select a group...' },
                ...groups.map((g) => ({
                  value: g.id,
                  label: `${g.name} — ${formatCurrency(Number(g.total_amount))} · ${g.total_members}M`,
                })),
              ]}
            />
            <Select
              label="Month"
              value={selectedMonth?.toString() ?? ''}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              options={[
                { value: '', label: 'Select month...' },
                ...auctions.map((a) => ({
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

        {selectedGroupId && selectedMonth && !isLoadingData && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="glass rounded-2xl border border-border p-4">
                <p className="text-xs text-foreground-muted mb-1">Total Collected</p>
                <p className="text-xl font-bold text-cyan-400">{formatCurrency(totalCollected)}</p>
                <p className="text-xs text-foreground-muted mt-1">of {formatCurrency(totalExpected)}</p>
              </div>
              <div className="glass rounded-2xl border border-border p-4">
                <p className="text-xs text-foreground-muted mb-1">Completed</p>
                <p className="text-xl font-bold text-emerald-400">{counts.completed}</p>
                <p className="text-xs text-foreground-muted mt-1">members</p>
              </div>
              <div className="glass rounded-2xl border border-border p-4">
                <p className="text-xs text-foreground-muted mb-1">Partial</p>
                <p className="text-xl font-bold text-amber-400">{counts.partial}</p>
                <p className="text-xs text-foreground-muted mt-1">members</p>
              </div>
              <div className="glass rounded-2xl border border-border p-4">
                <p className="text-xs text-foreground-muted mb-1">Pending</p>
                <p className="text-xl font-bold text-red-400">{counts.pending}</p>
                <p className="text-xs text-foreground-muted mt-1">members</p>
              </div>
            </div>

            {/* Progress bar */}
            {totalExpected > 0 && (
              <Card>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-foreground-muted">Collection Progress</span>
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

            {/* Member Payment Table */}
            {memberRows.length === 0 ? (
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
                    Month {selectedMonth} — Member Payment Status
                  </h3>
                </div>
                <div className="overflow-x-auto px-6 pb-6">
                  <table className="glass-table w-full">
                    <thead>
                      <tr>
                        <th>Ticket</th>
                        <th>Member</th>
                        <th>Mobile</th>
                        <th>Due</th>
                        <th>Paid</th>
                        <th>Remaining</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {memberRows
                        .sort((a, b) => a.ticketNumber - b.ticketNumber)
                        .map((row) => (
                          <tr key={row.chitMemberId}>
                            <td className="font-semibold text-cyan-400">#{row.ticketNumber}</td>
                            <td className="font-medium text-foreground">{row.memberName}</td>
                            <td className="text-foreground-muted">{row.mobile}</td>
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
      {payingMember && currentAuction && selectedGroupId && (
        <RecordPaymentModal
          isOpen={!!payingMember}
          row={payingMember}
          chit_group_id={selectedGroupId}
          month_number={selectedMonth!}
          onClose={() => setPayingMember(null)}
          onSaved={() => {
            setPayingMember(null);
            loadMonthData();
          }}
        />
      )}
    </>
  );
}

// ─── Status Badge ─────────────────────────────────────────

function MemberStatusBadge({ status }: { status: MemberRow['status'] }) {
  const map = {
    WINNER: { label: 'Winner', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    COMPLETED: { label: 'Completed', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    PARTIAL: { label: 'Partial', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    PENDING: { label: 'Pending', cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
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
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  row: MemberRow;
  chit_group_id: string;
  month_number: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [upiId, setUpiId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmountPaid(String(row.remaining));
      setPaymentMethod('CASH');
      setUpiId('');
    }
  }, [isOpen, row]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chit_group_id,
        chit_member_id: row.chitMemberId,
        month_number,
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
    <Modal isOpen={isOpen} onClose={onClose} title={`Record Payment — #${row.ticketNumber} ${row.memberName}`}>
      <div className="mb-4 p-3 bg-surface border border-border rounded-xl space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-foreground-muted">Monthly Due</span>
          <span className="font-semibold text-foreground">{formatCurrency(row.monthlyDue)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-foreground-muted">Already Paid</span>
          <span className="font-semibold text-emerald-400">{formatCurrency(row.totalPaid)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-foreground-muted">Remaining</span>
          <span className="font-semibold text-red-400">{formatCurrency(row.remaining)}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={`Amount to Pay (max ${formatCurrency(row.remaining)})`}
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
            label="UPI ID"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            placeholder="name@upi"
            required
          />
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" isLoading={isSubmitting}>Record Payment</Button>
        </div>
      </form>
    </Modal>
  );
}
