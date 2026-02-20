'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Header } from '@/components/layout/Header';
import { Card, Button, Modal, Input, Select, PageLoader, EmptyState, StatusBadge } from '@/components/ui';
import { formatCurrency, validateChitGroupParams } from '@/lib/calculations';
import { createChitGroup, updateChitGroupStatus } from '@/lib/api';
import { HiOutlinePlus, HiOutlineUserGroup } from 'react-icons/hi2';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { fetchGroups as apiFetchGroups } from '@/lib/api';
import type { ChitGroup, CommissionType } from '@/types';

export default function GroupsPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [groups, setGroups] = useState<ChitGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const hasFetched = useRef(false);

  const loadGroups = useCallback(async (force = false) => {
    if (!force && (hasFetched.current || sessionStorage.getItem('groups-fetched'))) return;
    hasFetched.current = true;
    sessionStorage.setItem('groups-fetched', 'true');
    sessionStorage.setItem('groups-last-fetch', Date.now().toString());

    const { data, error } = await apiFetchGroups();
    if (error) {
      toast.error('Failed to load groups');
    } else {
      setGroups(data);
    }
    setIsLoading(false);
  }, []);

  const refreshGroups = useCallback(async () => {
    const { data, error } = await apiFetchGroups();
    if (!error) setGroups(data);
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // Refresh data when tab becomes visible (if it's been more than 5 minutes)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isLoading) {
        const lastFetch = sessionStorage.getItem('groups-last-fetch');
        if (!lastFetch || Date.now() - parseInt(lastFetch) > 5 * 60 * 1000) {
          loadGroups(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isLoading, loadGroups]);

  const filteredGroups = filter === 'all' 
    ? groups 
    : groups.filter((g) => g.status === filter);

  if (authLoading || isLoading) {
    return (
      <>
        <Header title="Chit Groups" />
        <PageLoader />
      </>
    );
  }

  return (
    <>
      <Header title="Chit Groups" subtitle={`${groups.length} total groups`}>
        {isAdmin && (
          <Button
            icon={<HiOutlinePlus className="w-4 h-4" />}
            onClick={() => setShowCreateModal(true)}
          >
            New Group
          </Button>
        )}
      </Header>

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {['all', 'active', 'pending', 'completed', 'cancelled'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                filter === f
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  : 'text-foreground-muted hover:text-foreground-secondary border border-border hover:bg-surface-hover'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== 'all' && (
                <span className="ml-1.5 text-xs">
                  ({groups.filter((g) => g.status === f).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Groups Grid */}
        {filteredGroups.length === 0 ? (
          <EmptyState
            icon={<HiOutlineUserGroup className="w-8 h-8" />}
            title="No chit groups found"
            description={filter === 'all' ? 'Create your first chit group to get started.' : `No ${filter} groups.`}
            action={
              isAdmin ? (
                <Button onClick={() => setShowCreateModal(true)} icon={<HiOutlinePlus className="w-4 h-4" />}>
                  Create Group
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 stagger-children">
            {filteredGroups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                isAdmin={isAdmin}
                onStatusChange={async (status) => {
                  const result = await updateChitGroupStatus(group.id, status);
                  if (result.error) {
                    toast.error(result.error);
                  } else {
                    toast.success(`Group ${status}`);
                    refreshGroups();
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <CreateGroupModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => {
          setShowCreateModal(false);
          refreshGroups();
        }}
      />
    </>
  );
}

function GroupCard({
  group,
  isAdmin,
  onStatusChange,
}: {
  group: ChitGroup;
  isAdmin: boolean;
  onStatusChange: (status: 'active' | 'cancelled') => void;
}) {
  const progress = group.duration_months > 0
    ? Math.round((group.current_month / group.duration_months) * 100)
    : 0;

  return (
    <Card className="glass hover:border-cyan-500/20 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div>
          <Link
            href={`/groups/${group.id}`}
            className="text-base font-semibold text-foreground hover:text-cyan-400 transition-colors"
          >
            {group.name}
          </Link>
          <p className="text-xs text-foreground-muted mt-0.5">
            Started {group.start_date || 'Not started'}
          </p>
        </div>
        <StatusBadge status={group.status} />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <p className="text-xs text-foreground-muted">Total Amount</p>
          <p className="text-sm font-semibold text-foreground">{formatCurrency(group.total_amount)}</p>
        </div>
        <div>
          <p className="text-xs text-foreground-muted">Monthly</p>
          <p className="text-sm font-semibold text-foreground">{formatCurrency(group.monthly_contribution)}</p>
        </div>
        <div>
          <p className="text-xs text-foreground-muted">Members</p>
          <p className="text-sm font-semibold text-foreground">{group.num_members}</p>
        </div>
        <div>
          <p className="text-xs text-foreground-muted">Commission</p>
          <p className="text-sm font-semibold text-foreground">
            {group.commission_type === 'percentage'
              ? `${group.commission_value}%`
              : formatCurrency(group.commission_value)}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-foreground-muted mb-1">
          <span>Progress</span>
          <span>Month {group.current_month}/{group.duration_months}</span>
        </div>
        <div className="neon-progress">
          <div
            className="neon-progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Link
          href={`/groups/${group.id}`}
          className="flex-1 text-center py-2 text-sm font-medium text-cyan-400 bg-cyan-500/10 rounded-lg hover:bg-cyan-500/20 border border-cyan-500/20 transition-colors"
        >
          View Details
        </Link>
        {isAdmin && group.status === 'pending' && (
          <button
            onClick={() => onStatusChange('active')}
            className="px-3 py-2 text-sm font-medium text-cyan-400 bg-cyan-500/10 rounded-lg hover:bg-cyan-500/20 border border-cyan-500/20 transition-colors"
          >
            Activate
          </button>
        )}
      </div>
    </Card>
  );
}

function CreateGroupModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [numMembers, setNumMembers] = useState('');
  const [commissionType, setCommissionType] = useState<CommissionType>('percentage');
  const [commissionValue, setCommissionValue] = useState('5');
  const [dividendRoundingEnabled, setDividendRoundingEnabled] = useState(false);
  const [dividendRoundingValue, setDividendRoundingValue] = useState('100');
  const [startDate, setStartDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const monthlyContribution =
    totalAmount && numMembers
      ? Number(totalAmount) / Number(numMembers)
      : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    const validation = validateChitGroupParams(
      Number(totalAmount),
      Number(numMembers),
      commissionType,
      Number(commissionValue)
    );

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);

    const result = await createChitGroup({
      name,
      total_amount: Number(totalAmount),
      num_members: Number(numMembers),
      commission_type: commissionType,
      commission_value: Number(commissionValue),
      dividend_rounding_enabled: dividendRoundingEnabled,
      dividend_rounding_value: dividendRoundingEnabled ? Number(dividendRoundingValue) : undefined,
      start_date: startDate,
    });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Chit group created successfully!');
      onCreated();
      // Reset form
      setName('');
      setTotalAmount('');
      setNumMembers('');
      setCommissionValue('5');
      setDividendRoundingEnabled(false);
      setDividendRoundingValue('100');
      setStartDate('');
    }

    setIsSubmitting(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Chit Group" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            {errors.map((err, i) => (
              <p key={i} className="text-sm text-red-400">{err}</p>
            ))}
          </div>
        )}

        <Input
          label="Group Name"
          placeholder="e.g., Chennai Gold Chit - 1 Lakh"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Total Chit Amount (₹)"
            type="number"
            placeholder="100000"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            required
          />
          <Input
            label="Number of Members"
            type="number"
            placeholder="10"
            value={numMembers}
            onChange={(e) => setNumMembers(e.target.value)}
            helperText={`Duration: ${numMembers || '0'} months`}
            required
          />
        </div>

        {monthlyContribution > 0 && (
          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3">
            <p className="text-sm text-cyan-400">
              Monthly Contribution: <strong>{formatCurrency(monthlyContribution)}</strong> per member
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Commission Type"
            value={commissionType}
            onChange={(e) => setCommissionType(e.target.value as CommissionType)}
            options={[
              { value: 'percentage', label: 'Percentage (%)' },
              { value: 'fixed', label: 'Fixed Amount (₹)' },
            ]}
          />
          <Input
            label={commissionType === 'percentage' ? 'Commission (%)' : 'Commission (₹)'}
            type="number"
            placeholder={commissionType === 'percentage' ? '5' : '500'}
            value={commissionValue}
            onChange={(e) => setCommissionValue(e.target.value)}
            required
          />
        </div>

        {/* Dividend Rounding Configuration */}
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <input
              type="checkbox"
              id="roundingEnabled"
              checked={dividendRoundingEnabled}
              onChange={(e) => setDividendRoundingEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-border bg-background text-cyan-500 focus:ring-2 focus:ring-cyan-500/50"
            />
            <label htmlFor="roundingEnabled" className="text-sm font-medium text-foreground cursor-pointer">
              Enable Dividend Rounding
            </label>
          </div>
          
          {dividendRoundingEnabled && (
            <>
              <Select
                label="Round Down To Nearest"
                value={dividendRoundingValue}
                onChange={(e) => setDividendRoundingValue(e.target.value)}
                options={[
                  { value: '10', label: '₹10' },
                  { value: '50', label: '₹50' },
                  { value: '100', label: '₹100' },
                  { value: '500', label: '₹500' },
                ]}
              />
              <div className="mt-3 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded text-sm text-foreground-secondary">
                <p className="font-medium text-cyan-400 mb-1">How it works:</p>
                <p>If the dividend is ₹667 and rounding is set to ₹50:</p>
                <ul className="list-disc list-inside mt-1 space-y-1 text-foreground-muted">
                  <li>Dividend will be rounded down to ₹650</li>
                  <li>Difference of ₹17 × members = total discount</li>
                  <li>This discount will reduce next month's collection</li>
                </ul>
              </div>
            </>
          )}
        </div>

        <Input
          label="Start Date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          required
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Create Group
          </Button>
        </div>
      </form>
    </Modal>
  );
}
