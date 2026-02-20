'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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

interface ChitGroup {
  id: string;
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
  const [group, setGroup] = useState<ChitGroup | null>(null);
  const [chitMembers, setChitMembers] = useState<ChitMember[]>([]);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddTicketModal, setShowAddTicketModal] = useState(false);

  const load = async () => {
    try {
      const [groupRes, chitMembersRes, auctionsRes, paymentsRes] = await Promise.all([
        fetch(`/api/chit-groups/${id}`),
        fetch(`/api/chit-members?chit_group_id=${id}`),
        fetch(`/api/auctions?chit_group_id=${id}`),
        fetch(`/api/payments?chit_group_id=${id}`),
      ]);

      setGroup(await groupRes.json());
      setChitMembers(await chitMembersRes.json());
      setAuctions(await auctionsRes.json());
      setPayments(await paymentsRes.json());
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
        <Header title="Group Details" />
        <PageLoader />
      </>
    );
  }

  if (!group) {
    return (
      <>
        <Header title="Group Not Found" />
        <div className="p-8 text-center text-foreground-muted">Group not found.</div>
      </>
    );
  }

  const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount_paid), 0);
  const completedMonths = auctions.length;
  const progressPercent = Math.round((completedMonths / group.duration_months) * 100);

  return (
    <>
      <Header title="Group Details" />

      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl space-y-6">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-foreground-muted hover:text-cyan-400 transition-colors"
        >
          <HiOutlineArrowLeft className="w-4 h-4" />
          Back to Groups
        </button>

        {/* Group Summary */}
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <HiOutlineUserGroup className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    {formatCurrency(Number(group.total_amount))}
                  </h2>
                  <p className="text-foreground-muted text-sm">
                    {group.total_members} members · {group.duration_months} months
                  </p>
                </div>
              </div>
            </div>
            <StatusBadge status={group.status} />
          </div>

          {/* Progress */}
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-foreground-muted">Progress</span>
              <span className="text-foreground font-medium">
                Month {completedMonths}/{group.duration_months}
              </span>
            </div>
            <div className="neon-progress">
              <div className="neon-progress-bar" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="bg-surface border border-border rounded-xl p-3">
              <p className="text-xs text-foreground-muted">Monthly</p>
              <p className="text-base font-bold text-foreground">
                {formatCurrency(Number(group.monthly_amount))}
              </p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-3">
              <p className="text-xs text-foreground-muted">Commission</p>
              <p className="text-base font-bold text-foreground">
                {group.commission_type === 'PERCENT'
                  ? `${group.commission_value}%`
                  : formatCurrency(Number(group.commission_value))}
              </p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-3">
              <p className="text-xs text-foreground-muted">Round Off</p>
              <p className="text-base font-bold text-foreground">₹{group.round_off_value}</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-3">
              <p className="text-xs text-foreground-muted">Total Collected</p>
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
              Tickets ({chitMembers.length}/{group.total_members})
            </h3>
            {chitMembers.length < group.total_members && (
              <Button
                size="sm"
                icon={<HiOutlinePlus className="w-4 h-4" />}
                onClick={() => setShowAddTicketModal(true)}
              >
                Add Ticket
              </Button>
            )}
          </div>
          {chitMembers.length === 0 ? (
            <p className="text-sm text-foreground-muted text-center py-4">
              No tickets assigned yet.
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
                      {cm.member?.name?.value || 'Unknown'}
                    </p>
                    <p className="text-xs text-foreground-muted">
                      {cm.member?.mobile?.value || '—'}
                    </p>
                  </div>
                  <StatusBadge status={cm.is_active ? 'ACTIVE' : 'CANCELLED'} />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Auctions */}
        <Card padding={false}>
          <div className="p-6 pb-4 flex items-center gap-2">
            <HiOutlineTrophy className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-semibold text-foreground">Auctions</h3>
          </div>
          {auctions.length === 0 ? (
            <p className="text-sm text-foreground-muted text-center py-8">No auctions conducted yet.</p>
          ) : (
            <div className="overflow-x-auto px-6 pb-6">
              <table className="glass-table w-full">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Winner</th>
                    <th>Ticket</th>
                    <th>Bid</th>
                    <th>Payout</th>
                    <th>Per Member</th>
                    <th>To Collect</th>
                    <th>Carry Next</th>
                  </tr>
                </thead>
                <tbody>
                  {auctions.map((a) => (
                    <tr key={a.id}>
                      <td className="font-semibold text-cyan-400">Month {a.month_number}</td>
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
            <h3 className="text-base font-semibold text-foreground">Payments</h3>
          </div>
          {payments.length === 0 ? (
            <p className="text-sm text-foreground-muted text-center py-8">No payments recorded yet.</p>
          ) : (
            <div className="overflow-x-auto px-6 pb-6">
              <table className="glass-table w-full">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Ticket</th>
                    <th>Month</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="font-medium text-foreground">
                        {p.chit_member?.member?.name?.value || 'N/A'}
                      </td>
                      <td>#{p.chit_member?.ticket_number}</td>
                      <td>Month {p.month_number}</td>
                      <td className="text-cyan-400 font-semibold">
                        {formatCurrency(Number(p.amount_paid))}
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

      {/* Add Ticket Modal */}
      <AddTicketModal
        isOpen={showAddTicketModal}
        groupId={group.id}
        existingTickets={chitMembers.map((cm) => cm.ticket_number)}
        totalMembers={group.total_members}
        onClose={() => setShowAddTicketModal(false)}
        onSaved={() => {
          setShowAddTicketModal(false);
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
  existingTickets,
  totalMembers,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  groupId: string;
  existingTickets: number[];
  totalMembers: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [members, setMembers] = useState<{ id: string; name: { value: string } }[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/members')
        .then((r) => r.json())
        .then(setMembers);

      // auto-suggest next ticket number
      const used = new Set(existingTickets);
      for (let i = 1; i <= totalMembers; i++) {
        if (!used.has(i)) {
          setTicketNumber(String(i));
          break;
        }
      }
    }
  }, [isOpen, existingTickets, totalMembers]);

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
    <Modal isOpen={isOpen} onClose={onClose} title="Add Ticket">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Member"
          value={selectedMemberId}
          onChange={(e) => setSelectedMemberId(e.target.value)}
          options={[
            { value: '', label: 'Select member...' },
            ...members.map((m) => ({
              value: m.id,
              label: m.name.value,
            })),
          ]}
        />
        <Input
          label="Ticket Number"
          type="number"
          value={ticketNumber}
          onChange={(e) => setTicketNumber(e.target.value)}
          required
        />
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" isLoading={isSubmitting}>Add Ticket</Button>
        </div>
      </form>
    </Modal>
  );
}