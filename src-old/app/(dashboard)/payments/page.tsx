'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Header } from '@/components/layout/Header';
import { Card, Button, Modal, Input, PageLoader, EmptyState, StatusBadge, Select } from '@/components/ui';
import { formatCurrency } from '@/lib/calculations';
import { recordPayment, sendPaymentReminders } from '@/lib/api';
import { HiOutlineCurrencyRupee, HiOutlineBell, HiOutlineArrowDownTray } from 'react-icons/hi2';
import { exportPaymentsReport, exportToCSV } from '@/lib/export';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { fetchPaymentsPageData } from '@/lib/api';
import type { Payment, ChitGroup } from '@/types';

export default function PaymentsPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [groups, setGroups] = useState<ChitGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterGroup, setFilterGroup] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const hasFetched = useRef(false);

  const loadData = useCallback(async (force = false) => {
    if (!force && (hasFetched.current || sessionStorage.getItem('payments-fetched'))) return;
    hasFetched.current = true;
    sessionStorage.setItem('payments-fetched', 'true');
    sessionStorage.setItem('payments-last-fetch', Date.now().toString());

    const { data } = await fetchPaymentsPageData();
    setPayments(data.payments);
    setGroups(data.groups);
    setIsLoading(false);
  }, []);

  const refreshData = useCallback(async () => {
    const { data } = await fetchPaymentsPageData();
    setPayments(data.payments);
    setGroups(data.groups);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh data when tab becomes visible (if it's been more than 5 minutes)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isLoading) {
        const lastFetch = sessionStorage.getItem('payments-last-fetch');
        if (!lastFetch || Date.now() - parseInt(lastFetch) > 5 * 60 * 1000) {
          loadData(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isLoading, loadData]);

  const filteredPayments = payments.filter((p) => {
    if (filterGroup !== 'all' && p.chit_group_id !== filterGroup) return false;
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    return true;
  });

  const handleSendReminders = async () => {
    if (filterGroup === 'all') {
      toast.error('Please select a specific group first');
      return;
    }

    // Find the latest month with pending payments
    const pendingPayments = payments.filter(
      (p) => p.chit_group_id === filterGroup && p.status === 'pending'
    );

    if (pendingPayments.length === 0) {
      toast('No pending payments to remind about');
      return;
    }

    const maxMonth = Math.max(...pendingPayments.map((p) => p.month_number));
    const result = await sendPaymentReminders(filterGroup, maxMonth);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Sent ${result.count} reminders`);
    }
  };

  if (authLoading || isLoading) {
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
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<HiOutlineArrowDownTray className="w-4 h-4" />}
            onClick={() => exportPaymentsReport(filteredPayments as any)}
          >
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const headers = ['Member', 'Nickname', 'Group', 'Month', 'Due', 'Dividend', 'Net Payable', 'Paid', 'Status', 'Due Date'];
              const rows = filteredPayments.map((p: any) => [
                p.member?.app_member?.name || 'N/A',
                p.member?.app_member?.nickname || '-',
                p.chit_group?.name || 'N/A',
                p.month_number,
                p.amount_due,
                p.dividend_applied,
                p.net_payable,
                p.amount_paid,
                p.status,
                p.due_date,
              ]);
              exportToCSV({ headers, rows, fileName: `bidnest-payments-${Date.now()}` });
            }}
          >
            CSV
          </Button>
          {isAdmin && (
            <Button
              variant="outline"
              icon={<HiOutlineBell className="w-4 h-4" />}
              onClick={handleSendReminders}
            >
              Send Reminders
            </Button>
          )}
        </div>
      </Header>

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <p className="text-xs text-foreground-muted">Total Due</p>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(payments.reduce((sum, p) => sum + p.net_payable, 0))}
            </p>
          </Card>
          <Card>
            <p className="text-xs text-foreground-muted">Total Collected</p>
            <p className="text-lg font-bold text-cyan-400">
              {formatCurrency(payments.reduce((sum, p) => sum + p.amount_paid, 0))}
            </p>
          </Card>
          <Card>
            <p className="text-xs text-foreground-muted">Pending</p>
            <p className="text-lg font-bold text-amber-600">
              {payments.filter((p) => p.status === 'pending').length}
            </p>
          </Card>
          <Card>
            <p className="text-xs text-foreground-muted">Overdue</p>
            <p className="text-lg font-bold text-red-600">
              {payments.filter((p) => p.status === 'overdue').length}
            </p>
          </Card>
        </div>

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
                { value: 'pending', label: 'Pending' },
                { value: 'paid', label: 'Paid' },
                { value: 'overdue', label: 'Overdue' },
                { value: 'waived', label: 'Waived' },
              ]}
            />
          </div>
        </div>

        {filteredPayments.length === 0 ? (
          <EmptyState
            icon={<HiOutlineCurrencyRupee className="w-8 h-8" />}
            title="No payments found"
            description="Payment records will appear after auctions are conducted."
          />
        ) : (
          <Card padding={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface">
                  <tr className="text-left text-foreground-muted border-b border-border">
                    <th className="px-4 py-3 font-medium">Member</th>
                    <th className="px-4 py-3 font-medium">Group</th>
                    <th className="px-4 py-3 font-medium">Month</th>
                    <th className="px-4 py-3 font-medium">Due Amount</th>
                    <th className="px-4 py-3 font-medium">Dividend</th>
                    <th className="px-4 py-3 font-medium">Net Payable</th>
                    <th className="px-4 py-3 font-medium">Paid</th>
                    <th className="px-4 py-3 font-medium">Due Date</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    {isAdmin && <th className="px-4 py-3 font-medium">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredPayments.map((payment) => {
                    type MemberData = { user?: { full_name?: string; email?: string } };
                    type GroupData = { name?: string };
                    const memberData = payment.member as MemberData | undefined;
                    const groupData = payment.chit_group as GroupData | undefined;
                    return (
                      <tr key={payment.id} className="hover:bg-surface-hover">
                        <td className="px-4 py-3 font-medium text-foreground">
                          <div>
                            <p>{(payment.member as any)?.app_member?.name || 'N/A'}</p>
                            <p className="text-xs text-foreground-muted">{(payment.member as any)?.app_member?.nickname || ''}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/groups/${payment.chit_group_id}`}
                            className="text-cyan-400 hover:text-cyan-300"
                          >
                            {groupData?.name || 'Group'}
                          </Link>
                        </td>
                        <td className="px-4 py-3">{payment.month_number}</td>
                        <td className="px-4 py-3 text-foreground-secondary">{formatCurrency(payment.amount_due)}</td>
                        <td className="px-4 py-3 text-cyan-400">
                          -{formatCurrency(payment.dividend_applied)}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {formatCurrency(payment.net_payable)}
                        </td>
                        <td className="px-4 py-3 font-medium text-cyan-400">
                          {formatCurrency(payment.amount_paid)}
                        </td>
                        <td className="px-4 py-3 text-foreground-muted">{payment.due_date}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={payment.status} />
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3">
                            {payment.status !== 'paid' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedPayment(payment);
                                  setShowPaymentModal(true);
                                }}
                              >
                                Record
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Record Payment Modal */}
      {selectedPayment && (
        <RecordPaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedPayment(null);
          }}
          payment={selectedPayment}
          onRecorded={() => {
            setShowPaymentModal(false);
            setSelectedPayment(null);
            refreshData();
          }}
        />
      )}
    </>
  );
}

function RecordPaymentModal({
  isOpen,
  onClose,
  payment,
  onRecorded,
}: {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment;
  onRecorded: () => void;
}) {
  const remaining = payment.net_payable - payment.amount_paid;
  const [amount, setAmount] = useState(remaining.toString());
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(amount);

    if (amountNum <= 0) {
      toast.error('Amount must be positive');
      return;
    }

    if (amountNum > remaining) {
      toast.error(`Amount cannot exceed remaining balance of ${formatCurrency(remaining)}`);
      return;
    }

    setIsSubmitting(true);

    const result = await recordPayment(payment.id, amountNum, notes || undefined);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Payment recorded!');
      onRecorded();
    }

    setIsSubmitting(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Payment">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-surface border border-border p-3 rounded-lg text-sm space-y-1 text-foreground-secondary">
          <p><strong>Net Payable:</strong> {formatCurrency(payment.net_payable)}</p>
          <p><strong>Already Paid:</strong> {formatCurrency(payment.amount_paid)}</p>
          <p><strong>Remaining:</strong> {formatCurrency(remaining)}</p>
        </div>

        <Input
          label="Amount (₹)"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />

        <Input
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g., Cash payment, UPI ref..."
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" isLoading={isSubmitting}>Record Payment</Button>
        </div>
      </form>
    </Modal>
  );
}
