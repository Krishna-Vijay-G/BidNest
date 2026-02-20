'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Card, PageLoader, StatusBadge } from '@/components/ui';
import {
  HiOutlineUser,
  HiOutlinePhone,
  HiOutlineCreditCard,
  HiOutlineArrowLeft,
  HiOutlineTicket,
  HiOutlineBanknotes,
} from 'react-icons/hi2';

interface Member {
  id: string;
  name: { value: string };
  nickname: { value: string };
  mobile: { value: string };
  upi_ids: { value: string; added_at: string; is_active: boolean }[];
  is_active: boolean;
  created_at: string;
}

interface ChitMember {
  id: string;
  ticket_number: number;
  is_active: boolean;
  chit_group: {
    id: string;
    total_amount: string;
    total_members: number;
    monthly_amount: string;
    status: string;
  };
}

interface Payment {
  id: string;
  month_number: number;
  amount_paid: string;
  status: string;
  payment_method: string;
  payment_date: string;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function MemberDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [chitMembers, setChitMembers] = useState<ChitMember[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [memberRes, chitMembersRes] = await Promise.all([
          fetch(`/api/members/${id}`),
          fetch(`/api/chit-members?member_id=${id}`),
        ]);

        const memberData = await memberRes.json();
        const chitMembersData = await chitMembersRes.json();

        setMember(memberData);
        setChitMembers(chitMembersData);

        // load payments for all chit member tickets
        const allPayments: Payment[] = [];
        for (const cm of chitMembersData) {
          const pRes = await fetch(`/api/payments?chit_member_id=${cm.id}`);
          const pData = await pRes.json();
          allPayments.push(...pData);
        }
        setPayments(allPayments);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id]);

  if (isLoading) {
    return (
      <>
        <Header title="Member Details" />
        <PageLoader />
      </>
    );
  }

  if (!member) {
    return (
      <>
        <Header title="Member Not Found" />
        <div className="p-8 text-center text-foreground-muted">Member not found.</div>
      </>
    );
  }

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount_paid), 0);

  return (
    <>
      <Header title="Member Details" />

      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl space-y-6">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-foreground-muted hover:text-cyan-400 transition-colors"
        >
          <HiOutlineArrowLeft className="w-4 h-4" />
          Back to Members
        </button>

        {/* Profile Card */}
        <Card>
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white font-bold text-3xl shadow-lg shadow-cyan-500/20 shrink-0">
              {member.name.value.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-2xl font-bold text-foreground">{member.name.value}</h2>
              <p className="text-foreground-muted mt-1">"{member.nickname.value}"</p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-3">
                <StatusBadge status={member.is_active ? 'ACTIVE' : 'CANCELLED'} />
                <span className="text-xs text-foreground-muted">
                  Joined {new Date(member.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-1 lg:grid-cols-2">
              <div className="bg-surface border border-border rounded-xl p-3 text-center">
                <p className="text-xs text-foreground-muted">Groups</p>
                <p className="text-xl font-bold text-cyan-400">{chitMembers.length}</p>
              </div>
              <div className="bg-surface border border-border rounded-xl p-3 text-center">
                <p className="text-xs text-foreground-muted">Total Paid</p>
                <p className="text-xl font-bold text-emerald-400">{formatCurrency(totalPaid)}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Contact Info */}
        <Card>
          <h3 className="text-base font-semibold text-foreground mb-4">Contact Information</h3>
          <div className="space-y-0">
            <InfoRow
              icon={<HiOutlinePhone className="w-4 h-4" />}
              label="Mobile"
              value={member.mobile.value}
            />
            <InfoRow
              icon={<HiOutlineCreditCard className="w-4 h-4" />}
              label="UPI IDs"
              value={
                member.upi_ids?.filter((u) => u.is_active).length > 0
                  ? member.upi_ids.filter((u) => u.is_active).map((u) => u.value).join(', ')
                  : '—'
              }
            />
            <InfoRow
              icon={<HiOutlineUser className="w-4 h-4" />}
              label="Member ID"
              value={<span className="font-mono text-xs">{member.id.slice(0, 20)}...</span>}
            />
          </div>
        </Card>

        {/* Chit Group Tickets */}
        <Card>
          <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <HiOutlineTicket className="w-5 h-5 text-cyan-400" />
            Chit Group Tickets
          </h3>
          {chitMembers.length === 0 ? (
            <p className="text-sm text-foreground-muted text-center py-4">
              Not assigned to any chit group yet.
            </p>
          ) : (
            <div className="space-y-3">
              {chitMembers.map((cm) => (
                <div
                  key={cm.id}
                  className="flex items-center justify-between p-4 bg-surface border border-border rounded-xl"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 font-bold">
                      #{cm.ticket_number}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {formatCurrency(Number(cm.chit_group.total_amount))} Group
                      </p>
                      <p className="text-xs text-foreground-muted">
                        {cm.chit_group.total_members} members · {formatCurrency(Number(cm.chit_group.monthly_amount))}/month
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={cm.chit_group.status} />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Payment History */}
        <Card padding={false}>
          <div className="p-6 pb-4 flex items-center gap-2">
            <HiOutlineBanknotes className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-semibold text-foreground">Payment History</h3>
          </div>
          {payments.length === 0 ? (
            <p className="text-sm text-foreground-muted text-center py-8">No payments recorded yet.</p>
          ) : (
            <div className="overflow-x-auto px-6 pb-6">
              <table className="glass-table w-full">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td>Month {p.month_number}</td>
                      <td className="font-semibold text-cyan-400">
                        {formatCurrency(Number(p.amount_paid))}
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
          )}
        </Card>
      </div>
    </>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <span className="flex items-center gap-2 text-sm text-foreground-muted">
        {icon}
        {label}
      </span>
      <span className="text-sm text-foreground-secondary">{value}</span>
    </div>
  );
}