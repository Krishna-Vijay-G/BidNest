'use client';

import { useEffect, useState, use, useCallback, useRef } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Header } from '@/components/layout/Header';
import {
  Card,
  StatCard,
  Button,
  Modal,
  Input,
  Select,
  PageLoader,
  EmptyState,
  StatusBadge,
  Badge
} from '@/components/ui';
import { formatCurrency, calculateAuctionResults } from '@/lib/calculations';
import {
  addMemberToGroup,
  createAuction,
  conductAuction,
  removeMemberFromGroup,
} from '@/lib/api';
import {
  HiOutlineUserPlus,
  HiOutlineTrophy,
  HiOutlineCurrencyRupee,
  HiOutlineUsers,
  HiOutlineCalendar,
  HiOutlineCheckCircle,
  HiOutlineTrash,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { fetchGroupDetail } from '@/lib/api';
import type { ChitGroup, Member, MonthlyAuction, AppMember } from '@/types';

interface GroupDetailParams {
  params: Promise<{ id: string }>;
}

export default function GroupDetailPage({ params }: GroupDetailParams) {
  const { id } = use(params);
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [group, setGroup] = useState<ChitGroup | null>(null);
  const [members, setMembers] = useState<(Member & { app_member: AppMember })[]>([]);
  const [auctions, setAuctions] = useState<MonthlyAuction[]>([]);
  const [allAppMembers, setAllAppMembers] = useState<AppMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showCreateAuction, setShowCreateAuction] = useState(false);
  const [showConductAuction, setShowConductAuction] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState<MonthlyAuction | null>(null);
  const [activeTab, setActiveTab] = useState<'members' | 'auctions' | 'timeline'>('members');
  const hasFetched = useRef(false);

  const loadGroupData = useCallback(async (force = false) => {
    if (!force && (hasFetched.current || sessionStorage.getItem(`group-${id}-fetched`))) return;
    hasFetched.current = true;
    sessionStorage.setItem(`group-${id}-fetched`, 'true');
    sessionStorage.setItem(`group-${id}-last-fetch`, Date.now().toString());

    const { data } = await fetchGroupDetail(id);
    setGroup(data.group);
    setMembers(data.members);
    setAuctions(data.auctions);
    setAllAppMembers(data.allAppMembers);
    setIsLoading(false);
  }, [id]);

  const refreshGroupData = useCallback(async () => {
    const { data } = await fetchGroupDetail(id);
    setGroup(data.group);
    setMembers(data.members);
    setAuctions(data.auctions);
    setAllAppMembers(data.allAppMembers);
  }, [id]);

  useEffect(() => {
    if (!authLoading) loadGroupData();
  }, [authLoading, loadGroupData]);

  // Refresh data when tab becomes visible (if it's been more than 5 minutes)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isLoading) {
        const lastFetch = sessionStorage.getItem(`group-${id}-last-fetch`);
        if (!lastFetch || Date.now() - parseInt(lastFetch) > 5 * 60 * 1000) {
          loadGroupData(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isLoading, loadGroupData]);

  if (authLoading || isLoading || !group) {
    return (
      <>
        <Header title="Group Details" />
        <PageLoader />
      </>
    );
  }

  const completedAuctions = auctions.filter((a) => a.status === 'completed');
  const totalCollected = completedAuctions.reduce((sum, a) => sum + (a.winner_payout || 0), 0);
  const totalCommission = completedAuctions.reduce((sum, a) => sum + (a.foreman_commission || 0), 0);

  return (
    <>
      <Header title={group.name} subtitle={`${formatCurrency(group.total_amount)} chit group`}>
        <StatusBadge status={group.status} />
      </Header>

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Amount"
            value={formatCurrency(group.total_amount)}
            icon={<HiOutlineCurrencyRupee className="w-5 h-5" />}
          />
          <StatCard
            title="Members"
            value={`${members.length}/${group.num_members}`}
            icon={<HiOutlineUsers className="w-5 h-5" />}
          />
          <StatCard
            title="Auctions Done"
            value={`${completedAuctions.length}/${group.duration_months}`}
            icon={<HiOutlineTrophy className="w-5 h-5" />}
          />
          <StatCard
            title="Commission"
            value={formatCurrency(totalCommission)}
            icon={<HiOutlineCheckCircle className="w-5 h-5" />}
          />
        </div>

        {/* Group Info */}
        <Card>
          <h3 className="text-base font-semibold text-foreground mb-3">Group Configuration</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-foreground-muted block">Monthly Contribution</span>
              <span className="font-medium text-foreground-secondary">{formatCurrency(group.monthly_contribution)}</span>
            </div>
            <div>
              <span className="text-foreground-muted block">Duration</span>
              <span className="font-medium text-foreground-secondary">{group.duration_months} months</span>
            </div>
            <div>
              <span className="text-foreground-muted block">Commission</span>
              <span className="font-medium text-foreground-secondary">
                {group.commission_type === 'percentage'
                  ? `${group.commission_value}%`
                  : formatCurrency(group.commission_value)}
              </span>
            </div>
            <div>
              <span className="text-foreground-muted block">Current Month</span>
              <span className="font-medium text-foreground-secondary">{group.current_month}</span>
            </div>
            <div>
              <span className="text-foreground-muted block">Dividend Rounding</span>
              <span className="font-medium text-foreground-secondary">
                {group.dividend_rounding_enabled ? (
                  <Badge variant="info">Enabled (₹{group.dividend_rounding_value})</Badge>
                ) : (
                  <Badge variant="default">Disabled</Badge>
                )}
              </span>
            </div>
          </div>
          {group.dividend_rounding_enabled && (
            <div className="mt-4 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-sm text-foreground-secondary">
              <p className="text-cyan-400 font-medium mb-1">Rounding Active</p>
              <p>
                Dividends will be rounded down to the nearest ₹{group.dividend_rounding_value}. 
                The difference will be discounted from next month's collection.
              </p>
            </div>
          )}
        </Card>

        {/* Tabs */}
        <div className="flex gap-1 bg-surface border border-border rounded-lg p-1 w-fit">
          {(['members', 'auctions', 'timeline'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors capitalize ${
                activeTab === tab
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  : 'text-foreground-muted hover:text-foreground-secondary border border-transparent hover:bg-surface-hover'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Members Tab */}
        {activeTab === 'members' && (
          <Card padding={false}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-base font-semibold text-foreground">
                Members ({members.length}/{group.num_members})
              </h3>
              {isAdmin && members.length < group.num_members && (
                <Button
                  size="sm"
                  icon={<HiOutlineUserPlus className="w-4 h-4" />}
                  onClick={() => setShowAddMember(true)}
                >
                  Add Member
                </Button>
              )}
            </div>
            {members.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="No members yet"
                  description="Add members to this chit group to get started."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm glass-table">
                  <thead className="bg-surface">
                    <tr className="text-left text-foreground-muted border-b border-border">
                      <th className="px-4 py-3 font-medium">#</th>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">UPI / Mobile</th>
                      <th className="px-4 py-3 font-medium">Paid</th>
                      <th className="px-4 py-3 font-medium">Dividends</th>
                      <th className="px-4 py-3 font-medium">Payout</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      {isAdmin && <th className="px-4 py-3 font-medium">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {members.map((member) => (
                      <tr key={member.id} className="hover:bg-surface-hover">
                        <td className="px-4 py-3 font-medium text-foreground">
                          {member.ticket_number}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-foreground">{member.app_member?.name}</p>
                            <p className="text-xs text-foreground-muted">{member.app_member?.nickname} · {member.app_member?.mobile}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-foreground-muted">{member.app_member?.upi_id || '-'}</td>
                        <td className="px-4 py-3 font-medium text-foreground-secondary">{formatCurrency(member.total_paid)}</td>
                        <td className="px-4 py-3 text-cyan-400">
                          {formatCurrency(member.total_dividends_received)}
                        </td>
                        <td className="px-4 py-3">
                          {member.has_received_payout ? (
                            <div>
                              <Badge variant="success">Month {member.payout_month}</Badge>
                              <p className="text-xs text-foreground-muted mt-1">
                                {formatCurrency(member.payout_amount || 0)}
                              </p>
                            </div>
                          ) : (
                            <Badge variant="warning">Pending</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {member.has_received_payout ? (
                            <Badge variant="info">Won</Badge>
                          ) : (
                            <Badge variant="default">Active</Badge>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <button
                              onClick={async () => {
                                if (confirm('Remove this member?')) {
                                  const result = await removeMemberFromGroup(group.id, member.id);
                                  if (result.error) {
                                    toast.error(result.error);
                                  } else {
                                    toast.success('Member removed');
                                    refreshGroupData();
                                  }
                                }
                              }}
                              className="p-1 text-red-400 hover:text-red-600 transition-colors"
                            >
                              <HiOutlineTrash className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* Auctions Tab */}
        {activeTab === 'auctions' && (
          <Card padding={false}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-base font-semibold text-foreground">
                Auction History
              </h3>
              {isAdmin && group.status === 'active' && (
                <Button
                  size="sm"
                  icon={<HiOutlineTrophy className="w-4 h-4" />}
                  onClick={() => setShowCreateAuction(true)}
                >
                  Schedule Auction
                </Button>
              )}
            </div>
            {auctions.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="No auctions yet"
                  description="Schedule the first auction for this group."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm glass-table">
                  <thead className="bg-surface">
                    <tr className="text-left text-foreground-muted border-b border-border">
                      <th className="px-4 py-3 font-medium">Month</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Winner</th>
                      <th className="px-4 py-3 font-medium">Bid Discount</th>
                      <th className="px-4 py-3 font-medium">Payout</th>
                      <th className="px-4 py-3 font-medium">Commission</th>
                      <th className="px-4 py-3 font-medium">Dividend/Member</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      {isAdmin && <th className="px-4 py-3 font-medium">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {auctions.map((auction) => {
                          type WinningMember = { app_member?: { name?: string } };
                      const winner = auction.winning_member as WinningMember | undefined;
                      return (
                        <tr key={auction.id} className="hover:bg-surface-hover">
                          <td className="px-4 py-3 font-medium text-foreground-secondary">{auction.month_number}</td>
                          <td className="px-4 py-3 text-foreground-muted">{auction.auction_date}</td>
                          <td className="px-4 py-3 font-medium text-foreground-secondary">
                            {winner?.app_member?.name || '-'}
                          </td>
                          <td className="px-4 py-3 text-foreground-secondary">{formatCurrency(auction.bid_amount || 0)}</td>
                          <td className="px-4 py-3 font-medium text-cyan-400">
                            {formatCurrency(auction.winner_payout || 0)}
                          </td>
                          <td className="px-4 py-3 text-foreground-muted">
                            {formatCurrency(auction.foreman_commission || 0)}
                          </td>
                          <td className="px-4 py-3 text-cyan-400">
                            {formatCurrency(auction.per_member_dividend || 0)}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={auction.status} />
                          </td>
                          {isAdmin && (
                            <td className="px-4 py-3">
                              {(auction.status === 'scheduled' || auction.status === 'open') && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedAuction(auction);
                                    setShowConductAuction(true);
                                  }}
                                >
                                  Conduct
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
            )}
          </Card>
        )}

        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <Card>
            <h3 className="text-base font-semibold text-foreground mb-4">Monthly Timeline</h3>
            <div className="space-y-4">
              {Array.from({ length: group.duration_months }, (_, i) => i + 1).map((month) => {
                const auction = auctions.find((a) => a.month_number === month);
                const isCompleted = auction?.status === 'completed';
                const isCurrent = month === group.current_month + 1;

                return (
                  <div
                    key={month}
                    className={`flex items-start gap-4 p-4 rounded-lg border ${
                      isCompleted
                        ? 'bg-emerald-500/10 border-emerald-500/20'
                        : isCurrent
                        ? 'bg-cyan-500/10 border-cyan-500/20'
                        : 'bg-surface border-border'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        isCompleted
                          ? 'bg-emerald-500 text-white'
                          : isCurrent
                          ? 'bg-cyan-500 text-white'
                          : 'bg-surface-hover text-foreground-muted'
                      }`}
                    >
                      {month}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">Month {month}</p>
                        {isCompleted && <Badge variant="success">Completed</Badge>}
                        {isCurrent && <Badge variant="purple">Next</Badge>}
                      </div>
                      {isCompleted && auction && (
                          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-foreground-secondary">
                          <div>
                            <span className="text-foreground-muted">Payout:</span>{' '}
                            <span className="font-medium">{formatCurrency(auction.winner_payout || 0)}</span>
                          </div>
                          <div>
                            <span className="text-foreground-muted">Discount:</span>{' '}
                            <span className="font-medium">{formatCurrency(auction.bid_amount || 0)}</span>
                          </div>
                          <div>
                            <span className="text-foreground-muted">Dividend:</span>{' '}
                            <span className="font-medium">{formatCurrency(auction.per_member_dividend || 0)}</span>
                          </div>
                          <div>
                            <span className="text-foreground-muted">Effective:</span>{' '}
                            <span className="font-medium">{formatCurrency(auction.effective_contribution || 0)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      {/* Add Member Modal */}
      <AddMemberModal
        isOpen={showAddMember}
        onClose={() => setShowAddMember(false)}
        group={group}
        existingMembers={members}
        allAppMembers={allAppMembers}
        onAdded={() => {
          setShowAddMember(false);
          refreshGroupData();
        }}
      />

      {/* Create Auction Modal */}
      <CreateAuctionModal
        isOpen={showCreateAuction}
        onClose={() => setShowCreateAuction(false)}
        group={group}
        existingAuctions={auctions}
        onCreated={() => {
          setShowCreateAuction(false);
          refreshGroupData();
        }}
      />

      {/* Conduct Auction Modal */}
      {selectedAuction && (
        <ConductAuctionModal
          isOpen={showConductAuction}
          onClose={() => {
            setShowConductAuction(false);
            setSelectedAuction(null);
          }}
          group={group}
          auction={selectedAuction}
          members={members}          onConducted={() => {
            setShowConductAuction(false);
            setSelectedAuction(null);
            refreshGroupData();
          }}
        />
      )}
    </>
  );
}

// ========== SUB-COMPONENTS ==========

function AddMemberModal({
  isOpen,
  onClose,
  group,
  existingMembers,
  allAppMembers,
  onAdded,
}: {
  isOpen: boolean;
  onClose: () => void;
  group: ChitGroup;
  existingMembers: Member[];
  allAppMembers: AppMember[];
  onAdded: () => void;
}) {
  const [selectedAppMemberId, setSelectedAppMemberId] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableAppMembers = allAppMembers.filter(
    (am) => !existingMembers.some((m) => m.app_member_id === am.id)
  );

  const usedTickets = existingMembers.map((m) => m.ticket_number);
  const availableTickets = Array.from(
    { length: group.num_members },
    (_, i) => i + 1
  ).filter((t) => !usedTickets.includes(t));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const result = await addMemberToGroup(
      group.id,
      selectedAppMemberId,
      Number(ticketNumber)
    );

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Member added successfully!');
      onAdded();
      setSelectedAppMemberId('');
      setTicketNumber('');
    }

    setIsSubmitting(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Member">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Select Member"
          value={selectedAppMemberId}
          onChange={(e) => setSelectedAppMemberId(e.target.value)}
          placeholder="Choose a member..."
          options={availableAppMembers.map((am) => ({
            value: am.id,
            label: `${am.name} (${am.nickname}) — ${am.mobile}`,
          }))}
          required
        />

        <Select
          label="Ticket Number"
          value={ticketNumber}
          onChange={(e) => setTicketNumber(e.target.value)}
          placeholder="Select ticket..."
          options={availableTickets.map((t) => ({
            value: t.toString(),
            label: `Ticket #${t}`,
          }))}
          required
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" isLoading={isSubmitting}>Add Member</Button>
        </div>
      </form>
    </Modal>
  );
}

function CreateAuctionModal({
  isOpen,
  onClose,
  group,
  existingAuctions,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  group: ChitGroup;
  existingAuctions: MonthlyAuction[];
  onCreated: () => void;
}) {
  const nextMonth =
    existingAuctions.length > 0
      ? Math.max(...existingAuctions.map((a) => a.month_number)) + 1
      : 1;

  const [monthNumber, setMonthNumber] = useState(nextMonth.toString());
  const [auctionDate, setAuctionDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const result = await createAuction(group.id, Number(monthNumber), auctionDate);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Auction scheduled!');
      onCreated();
    }

    setIsSubmitting(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule Auction">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Month Number"
          type="number"
          value={monthNumber}
          onChange={(e) => setMonthNumber(e.target.value)}
          required
        />
        <Input
          label="Auction Date"
          type="date"
          value={auctionDate}
          onChange={(e) => setAuctionDate(e.target.value)}
          required
        />
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" isLoading={isSubmitting}>Schedule</Button>
        </div>
      </form>
    </Modal>
  );
}

function ConductAuctionModal({
  isOpen,
  onClose,
  group,
  auction,
  members,
  onConducted,
}: {
  isOpen: boolean;
  onClose: () => void;
  group: ChitGroup;
  auction: MonthlyAuction;
  members: (Member & { app_member: AppMember })[];
  onConducted: () => void;
}) {
  const [winnerMemberId, setWinnerMemberId] = useState('');
  const [bidAmount, setBidAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preview, setPreview] = useState<ReturnType<typeof calculateAuctionResults> | null>(null);

  const eligibleMembers = members.filter((m) => !m.has_received_payout);

  const handlePreview = () => {
    if (!bidAmount) return;
    try {
      const result = calculateAuctionResults(
        group.total_amount,
        Number(bidAmount),
        group.num_members,
        group.commission_type,
        group.commission_value,
        group.dividend_rounding_enabled,
        group.dividend_rounding_value
      );
      setPreview(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Calculation error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!winnerMemberId || !bidAmount) return;

    setIsSubmitting(true);

    const result = await conductAuction(auction.id, winnerMemberId, Number(bidAmount));

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Auction completed successfully!');
      onConducted();
    }

    setIsSubmitting(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Conduct Auction - Month ${auction.month_number}`} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-surface border border-border p-3 rounded-lg text-sm text-foreground-secondary">
          <p><strong className="text-foreground">Group:</strong> {group.name}</p>
          <p><strong className="text-foreground">Total Amount:</strong> {formatCurrency(group.total_amount)}</p>
          <p><strong className="text-foreground">Monthly Contribution:</strong> {formatCurrency(group.monthly_contribution)}</p>
        </div>

        <Select
          label="Auction Winner"
          value={winnerMemberId}
          onChange={(e) => setWinnerMemberId(e.target.value)}
          placeholder="Select the winning member..."
          options={eligibleMembers.map((m) => ({
            value: m.id,
            label: `#${m.ticket_number} - ${m.app_member?.name || 'Unknown'}`,
          }))}
          required
        />

        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <Input
              label="Bid Discount Amount (₹)"
              type="number"
              placeholder="e.g., 15000"
              value={bidAmount}
              onChange={(e) => {
                setBidAmount(e.target.value);
                setPreview(null);
              }}
              helperText="The discount the winner is willing to forgo"
              required
            />
          </div>
          <Button type="button" variant="outline" onClick={handlePreview} className="mb-1">
            Preview
          </Button>
        </div>

        {preview && (
          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-4 space-y-2 text-sm text-foreground-secondary">
            <h4 className="font-semibold text-cyan-400">Calculation Preview</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-cyan-400">Winner Payout:</span>{' '}
                <strong className="text-foreground">{formatCurrency(preview.winner_payout)}</strong>
              </div>
              <div>
                <span className="text-cyan-400">Bid Discount:</span>{' '}
                <strong className="text-foreground">{formatCurrency(preview.bid_discount)}</strong>
              </div>
              <div>
                <span className="text-cyan-400">Foreman Commission:</span>{' '}
                <strong className="text-foreground">{formatCurrency(preview.foreman_commission)}</strong>
              </div>
              <div>
                <span className="text-cyan-400">Dividend Pool:</span>{' '}
                <strong className="text-foreground">{formatCurrency(preview.dividend_pool)}</strong>
              </div>
              <div>
                <span className="text-cyan-400">Calculated Dividend:</span>{' '}
                <strong className="text-foreground">{formatCurrency(preview.per_member_dividend)}</strong>
              </div>
              {group.dividend_rounding_enabled && (
                <>
                  <div>
                    <span className="text-cyan-400">Rounded Dividend:</span>{' '}
                    <strong className="text-foreground">{formatCurrency(preview.rounded_dividend)}</strong>
                  </div>
                  <div className="col-span-2 bg-amber-500/10 border border-amber-500/20 rounded p-2">
                    <span className="text-amber-400">Rounding Discount (Total):</span>{' '}
                    <strong className="text-foreground">{formatCurrency(preview.rounding_total)}</strong>
                    <p className="text-xs text-foreground-muted mt-1">
                      This amount will be deducted from next month's collection
                    </p>
                  </div>
                </>
              )}
              <div className="col-span-2 border-t border-border pt-2 mt-2">
                <span className="text-cyan-400">Effective Contribution (Next Month):</span>{' '}
                <strong className="text-foreground text-lg">{formatCurrency(preview.effective_contribution)}</strong>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" isLoading={isSubmitting}>
            Complete Auction
          </Button>
        </div>
      </form>
    </Modal>
  );
}
