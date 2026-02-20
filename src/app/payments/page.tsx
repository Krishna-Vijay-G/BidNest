'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Header } from '@/components/layout/Header';
import { Card, Button, Modal, Input, PageLoader, EmptyState, Select } from '@/components/ui';
import { StatusBadge } from '@/components/ui/Badge';
import { HiOutlineBanknotes, HiOutlinePlus } from 'react-icons/hi2';
import toast from 'react-hot-toast';

interface ChitGroup {
  id: string;
  name: string;
  total_amount: string;
  total_members: number;
  monthly_amount: string;
  status: string;
}

interface ChitMember {
  id: string;
  ticket_number: number;
  chit_group_id: string;
  member: {
    name: { value: string };
  };
}

interface Payment {
  id: string;
  chit_group_id: string;
  chit_member_id: string;
  month_number: number;
  amount_paid: string;
  payment_method: string;
  upi_id: string | null;
  payment_date: string;
  status: string;
  notes: string | null;
  created_at: string;
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

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [groups, setGroups] = useState<ChitGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterGroup, setFilterGroup] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const hasFetched = useRef(false);

  const loadData = useCallback(async (force = false) => {
    if (!user) return;
    if (!force && hasFetched.current) return;
    hasFetched.current = true;
    try {
      const [paymentsRes, groupsRes] = await Promise.all([
        fetch(`/api/payments?user_id=${user.id}`),
        fetch(`/api/chit-groups?user_id=${user.id}`),
      ]);
      const p = await paymentsRes.json();
      const g = await groupsRes.json();
      setPayments(Array.isArray(p) ? p : []);
      setGroups(Array.isArray(g) ? g : []);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshData = useCallback(async () => {
    if (!user) return;
    const [paymentsRes, groupsRes] = await Promise.all([
      fetch(`/api/payments?user_id=${user.id}`),
      fetch(`/api/chit-groups?user_id=${user.id}`),
    ]);
    const p = await paymentsRes.json();
    const g = await groupsRes.json();
    setPayments(Array.isArray(p) ? p : []);
    setGroups(Array.isArray(g) ? g : []);
  }, [user]);

  const filteredPayments = payments.filter((p) => {
    if (filterGroup !== 'all' && p.chit_group_id !== filterGroup) return false;
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    return true;
  });

  // summary stats
  const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount_paid), 0);
  const totalCompleted = payments.filter((p) => p.status === 'COMPLETED').length;
  const totalPartial = payments.filter((p) => p.status === 'PARTIAL').length;

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
      <Header title="Payments" subtitle={`${payments.length} total records`}>
        <Button
          icon={<HiOutlinePlus className="w-4 h-4" />}
          onClick={() => setShowCreateModal(true)}
        >
          Record Payment
        </Button>
      </Header>

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass rounded-2xl border border-border p-5">
            <p className="text-sm text-foreground-muted mb-1">Total Collected</p>
            <p className="text-2xl font-bold text-cyan-400">{formatCurrency(totalCollected)}</p>
          </div>
          <div className="glass rounded-2xl border border-border p-5">
            <p className="text-sm text-foreground-muted mb-1">Completed</p>
            <p className="text-2xl font-bold text-emerald-400">{totalCompleted}</p>
          </div>
          <div className="glass rounded-2xl border border-border p-5">
            <p className="text-sm text-foreground-muted mb-1">Partial</p>
            <p className="text-2xl font-bold text-amber-400">{totalPartial}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="w-48">
            <Select
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              options={[
                { value: 'all', label: 'All Groups' },
                ...groups.map((g) => ({
                  value: g.id,
                  label: `${formatCurrency(Number(g.total_amount))} · ${g.total_members}M`,
                })),
              ]}
            />
          </div>
          <div className="w-48">
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'PARTIAL', label: 'Partial' },
              ]}
            />
          </div>
        </div>

        {/* Table */}
        {filteredPayments.length === 0 ? (
          <EmptyState
            icon={<HiOutlineBanknotes className="w-8 h-8" />}
            title="No payments found"
            description="Record your first payment to get started."
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
                    <th>Amount Paid</th>
                    <th>Method</th>
                    <th>UPI ID</th>
                    <th>Payment Date</th>
                    <th>Status</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="font-medium text-foreground">
                        {payment.chit_member?.member?.name?.value || 'N/A'}
                      </td>
                      <td>#{payment.chit_member?.ticket_number}</td>
                      <td>{payment.month_number}</td>
                      <td className="font-semibold text-cyan-400">
                        {formatCurrency(Number(payment.amount_paid))}
                      </td>
                      <td>
                        <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-surface border border-border text-foreground-secondary">
                          {payment.payment_method}
                        </span>
                      </td>
                      <td className="text-foreground-muted">
                        {payment.upi_id || '—'}
                      </td>
                      <td className="text-foreground-muted">
                        {new Date(payment.payment_date).toLocaleDateString('en-IN')}
                      </td>
                      <td>
                        <StatusBadge status={payment.status} />
                      </td>
                      <td className="text-foreground-muted">
                        {payment.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Record Payment Modal */}
      <PaymentFormModal
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

// ─── Payment Form Modal ─────────────────────────────────────────────────────

function PaymentFormModal({
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
  const [chitMembers, setChitMembers] = useState<ChitMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [monthNumber, setMonthNumber] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [upiId, setUpiId] = useState('');
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // load chit members when group selected
  useEffect(() => {
    if (!selectedGroupId) return;
    fetch(`/api/chit-members?chit_group_id=${selectedGroupId}`)
      .then((r) => r.json())
      .then(setChitMembers);
  }, [selectedGroupId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chit_group_id: selectedGroupId,
        chit_member_id: selectedMemberId,
        month_number: Number(monthNumber),
        amount_paid: Number(amountPaid),
        payment_method: paymentMethod,
        upi_id: paymentMethod === 'UPI' ? upiId : undefined,
        payment_date: new Date(paymentDate).toISOString(),
        notes: notes || undefined,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      toast.error(data.error || 'Failed to record payment');
    } else {
      toast.success(
        `Payment recorded! Status: ${data.status} · Remaining: ${
          data.remaining > 0
            ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(data.remaining)
            : '₹0'
        }`
      );
      onSaved();
    }

    setIsSubmitting(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Payment" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Chit Group"
          value={selectedGroupId}
          onChange={(e) => {
            setSelectedGroupId(e.target.value);
            setSelectedMemberId('');
          }}
          options={[
            { value: '', label: 'Select a group...' },
            ...groups.map((g) => ({
              value: g.id,
              label: `${g.name} — ${formatCurrency(Number(g.total_amount))} · ${g.total_members}M`,
            })),
          ]}
        />

        <Select
          label="Member (Ticket)"
          value={selectedMemberId}
          onChange={(e) => setSelectedMemberId(e.target.value)}
          options={[
            { value: '', label: 'Select member...' },
            ...chitMembers.map((cm) => ({
              value: cm.id,
              label: `#${cm.ticket_number} — ${cm.member?.name?.value || 'Unknown'}`,
            })),
          ]}
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
            label="Amount Paid (₹)"
            type="number"
            value={amountPaid}
            onChange={(e) => setAmountPaid(e.target.value)}
            placeholder="e.g. 990"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
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
          <Input
            label="Payment Date"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            required
          />
        </div>

        {paymentMethod === 'UPI' && (
          <Input
            label="UPI ID"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            placeholder="e.g. john@upi"
            required
          />
        )}

        <Input
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Cash payment received"
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Record Payment
          </Button>
        </div>
      </form>
    </Modal>
  );
}