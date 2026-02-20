'use client';

import { useEffect, useState, use, useCallback, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, StatCard, PageLoader, EmptyState, Badge, StatusBadge } from '@/components/ui';
import { formatCurrency } from '@/lib/calculations';
import {
  HiOutlineCurrencyRupee,
  HiOutlineUsers,
  HiOutlineCheckCircle,
  HiOutlineCalendar,
} from 'react-icons/hi2';
import Link from 'next/link';
import { fetchMemberDetail } from '@/lib/api';
import type { AppMember, Member, ChitGroup, Payment, Dividend } from '@/types';

interface MemberDetailParams {
  params: Promise<{ id: string }>;
}

interface MembershipWithGroup extends Member {
  chit_group: ChitGroup;
}

interface DividendWithGroup extends Dividend {
  chit_group?: { name?: string };
}

interface PaymentWithGroup extends Omit<Payment, 'chit_group'> {
  chit_group?: { name?: string };
}

export default function MemberDetailPage({ params }: MemberDetailParams) {
  const { id } = use(params);
  const [member, setMember] = useState<AppMember | null>(null);
  const [memberships, setMemberships] = useState<MembershipWithGroup[]>([]);
  const [payments, setPayments] = useState<PaymentWithGroup[]>([]);
  const [dividends, setDividends] = useState<DividendWithGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasFetched = useRef(false);

  const loadData = useCallback(async (force = false) => {
    if (!force && (hasFetched.current || sessionStorage.getItem(`member-${id}-fetched`))) return;
    hasFetched.current = true;
    sessionStorage.setItem(`member-${id}-fetched`, 'true');
    sessionStorage.setItem(`member-${id}-last-fetch`, Date.now().toString());

    const { data } = await fetchMemberDetail(id);
    setMember(data.member);
    setMemberships(data.memberships as MembershipWithGroup[]);
    setPayments(data.payments as PaymentWithGroup[]);
    setDividends(data.dividends as DividendWithGroup[]);
    setIsLoading(false);
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh data when tab becomes visible (if it's been more than 5 minutes)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isLoading) {
        const lastFetch = sessionStorage.getItem(`member-${id}-last-fetch`);
        if (!lastFetch || Date.now() - parseInt(lastFetch) > 5 * 60 * 1000) {
          loadData(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isLoading, loadData]);

  if (isLoading || !member) {
    return (
      <>
        <Header title="Member Details" />
        <PageLoader />
      </>
    );
  }

  const totalGroups = memberships.length;
  const totalPaid = memberships.reduce((sum, m) => sum + m.total_paid, 0);
  const totalDividends = memberships.reduce((sum, m) => sum + m.total_dividends_received, 0);
  const netPaid = totalPaid - totalDividends;
  const payoutReceived = memberships.filter(m => m.has_received_payout).length;
  
  const paidPayments = payments.filter(p => p.status === 'paid').length;
  const pendingPayments = payments.filter(p => p.status === 'pending').length;

  return (
    <>
      <Header 
        title={member.name} 
        subtitle={`${member.nickname} • ${member.mobile}`}
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Member Info Card */}
        <Card>
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 bg-cyan-500/10 rounded-full flex items-center justify-center text-cyan-400 font-bold text-3xl">
              {member.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground mb-1">{member.name}</h2>
              <p className="text-foreground-secondary mb-2">
                <Badge variant="default">{member.nickname}</Badge>
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-foreground-muted">Mobile:</span>
                  <p className="font-medium text-foreground-secondary">{member.mobile}</p>
                </div>
                <div>
                  <span className="text-foreground-muted">UPI ID:</span>
                  <p className="font-medium text-foreground-secondary">{member.upi_id || '—'}</p>
                </div>
                <div>
                  <span className="text-foreground-muted">Member Since:</span>
                  <p className="font-medium text-foreground-secondary">
                    {new Date(member.created_at).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <div>
                  <span className="text-foreground-muted">Status:</span>
                  <p className="font-medium">
                    {member.is_active ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="danger">Inactive</Badge>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Groups"
            value={totalGroups.toString()}
            icon={<HiOutlineUsers className="w-5 h-5" />}
          />
          <StatCard
            title="Total Paid"
            value={formatCurrency(totalPaid)}
            icon={<HiOutlineCurrencyRupee className="w-5 h-5" />}
          />
          <StatCard
            title="Total Dividends"
            value={formatCurrency(totalDividends)}
            icon={<HiOutlineCheckCircle className="w-5 h-5" />}
          />
          <StatCard
            title="Net Paid"
            value={formatCurrency(netPaid)}
            icon={<HiOutlineCurrencyRupee className="w-5 h-5" />}
          />
          <StatCard
            title="Payouts Won"
            value={`${payoutReceived}/${totalGroups}`}
            icon={<HiOutlineCheckCircle className="w-5 h-5" />}
          />
        </div>

        {/* Group Memberships */}
        <Card padding={false}>
          <div className="p-4 border-b border-border">
            <h3 className="text-base font-semibold text-foreground">Chit Group Memberships</h3>
          </div>
          {memberships.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No groups" description="This member is not part of any chit groups." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface">
                  <tr className="text-left text-foreground-muted border-b border-border">
                    <th className="px-4 py-3 font-medium">Group Name</th>
                    <th className="px-4 py-3 font-medium">Ticket #</th>
                    <th className="px-4 py-3 font-medium">Total Paid</th>
                    <th className="px-4 py-3 font-medium">Dividends</th>
                    <th className="px-4 py-3 font-medium">Net Paid</th>
                    <th className="px-4 py-3 font-medium">Payout Status</th>
                    <th className="px-4 py-3 font-medium">Group Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {memberships.map((membership) => (
                    <tr key={membership.id} className="hover:bg-surface-hover">
                      <td className="px-4 py-3">
                        <Link
                          href={`/groups/${membership.chit_group_id}`}
                          className="font-medium text-cyan-400 hover:text-cyan-300"
                        >
                          {membership.chit_group.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        #{membership.ticket_number}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground-secondary">
                        {formatCurrency(membership.total_paid)}
                      </td>
                      <td className="px-4 py-3 text-cyan-400">
                        {formatCurrency(membership.total_dividends_received)}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {formatCurrency(membership.total_paid - membership.total_dividends_received)}
                      </td>
                      <td className="px-4 py-3">
                        {membership.has_received_payout ? (
                          <div>
                            <Badge variant="success">Won - Month {membership.payout_month}</Badge>
                            <p className="text-xs text-foreground-muted mt-1">
                              {formatCurrency(membership.payout_amount || 0)}
                            </p>
                          </div>
                        ) : (
                          <Badge variant="warning">Pending</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={membership.chit_group.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Payment History */}
        <Card padding={false}>
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">Payment History</h3>
            <div className="flex gap-4 text-sm">
              <span className="text-foreground-muted">
                Paid: <strong className="text-emerald-400">{paidPayments}</strong>
              </span>
              <span className="text-foreground-muted">
                Pending: <strong className="text-amber-400">{pendingPayments}</strong>
              </span>
            </div>
          </div>
          {payments.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No payments" description="No payment records found." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface">
                  <tr className="text-left text-foreground-muted border-b border-border">
                    <th className="px-4 py-3 font-medium">Group</th>
                    <th className="px-4 py-3 font-medium">Month</th>
                    <th className="px-4 py-3 font-medium">Due Date</th>
                    <th className="px-4 py-3 font-medium">Amount Due</th>
                    <th className="px-4 py-3 font-medium">Dividend</th>
                    <th className="px-4 py-3 font-medium">Net Payable</th>
                    <th className="px-4 py-3 font-medium">Amount Paid</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.map((payment) => {
                    type GroupData = { name?: string };
                    const groupData = payment.chit_group as GroupData | undefined;
                    return (
                      <tr key={payment.id} className="hover:bg-surface-hover">
                        <td className="px-4 py-3 text-foreground-secondary">
                          {groupData?.name || 'Unknown'}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {payment.month_number}
                        </td>
                        <td className="px-4 py-3 text-foreground-muted">
                          {new Date(payment.due_date).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-foreground-secondary">
                          {formatCurrency(payment.amount_due)}
                        </td>
                        <td className="px-4 py-3 text-cyan-400">
                          {formatCurrency(payment.dividend_applied)}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {formatCurrency(payment.net_payable)}
                        </td>
                        <td className="px-4 py-3 font-medium text-emerald-400">
                          {formatCurrency(payment.amount_paid)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={payment.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Dividend History */}
        <Card padding={false}>
          <div className="p-4 border-b border-border">
            <h3 className="text-base font-semibold text-foreground">Dividend History</h3>
          </div>
          {dividends.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No dividends" description="No dividend records found." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface">
                  <tr className="text-left text-foreground-muted border-b border-border">
                    <th className="px-4 py-3 font-medium">Group</th>
                    <th className="px-4 py-3 font-medium">Month</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Applied</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {dividends.map((dividend) => {
                    type GroupData = { name?: string };
                    const groupData = dividend.chit_group as GroupData | undefined;
                    return (
                      <tr key={dividend.id} className="hover:bg-surface-hover">
                        <td className="px-4 py-3 text-foreground-secondary">
                          {groupData?.name || 'Unknown'}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {dividend.month_number}
                        </td>
                        <td className="px-4 py-3 font-medium text-cyan-400">
                          {formatCurrency(dividend.amount)}
                        </td>
                        <td className="px-4 py-3">
                          {dividend.is_applied ? (
                            <Badge variant="success">Yes</Badge>
                          ) : (
                            <Badge variant="warning">No</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-foreground-muted">
                          {new Date(dividend.created_at).toLocaleDateString('en-IN')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
