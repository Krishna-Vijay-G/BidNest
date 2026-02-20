'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, Button, Modal, Input, PageLoader, EmptyState, Select } from '@/components/ui';
import { StatusBadge } from '@/components/ui/Badge';
import {
  HiOutlineUserGroup,
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineEye,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import Link from 'next/link';

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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<ChitGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ChitGroup | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const hasFetched = useRef(false);

  const loadData = useCallback(async (force = false) => {
    if (!force && hasFetched.current) return;
    hasFetched.current = true;
    try {
      const res = await fetch('/api/chit-groups');
      const data = await res.json();
      setGroups(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshData = useCallback(async () => {
    const res = await fetch('/api/chit-groups');
    const data = await res.json();
    setGroups(data);
  }, []);

  const handleDelete = async (group: ChitGroup) => {
    if (!confirm(`Cancel chit group of ${formatCurrency(Number(group.total_amount))}?`)) return;
    const res = await fetch(`/api/chit-groups/${group.id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Chit group cancelled');
      refreshData();
    } else {
      toast.error('Failed to cancel chit group');
    }
  };

  const filteredGroups = groups.filter((g) =>
    filterStatus === 'all' ? true : g.status === filterStatus
  );

  if (isLoading) {
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
        <Button
          icon={<HiOutlinePlus className="w-4 h-4" />}
          onClick={() => setShowCreateModal(true)}
        >
          New Group
        </Button>
      </Header>

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Filter */}
        <div className="mb-6 w-48">
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'COMPLETED', label: 'Completed' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]}
          />
        </div>

        {filteredGroups.length === 0 ? (
          <EmptyState
            icon={<HiOutlineUserGroup className="w-8 h-8" />}
            title="No chit groups found"
            description="Create your first chit group to get started."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredGroups.map((group) => (
              <div key={group.id} className="glass rounded-2xl border border-border p-5 flex flex-col gap-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {formatCurrency(Number(group.total_amount))}
                    </p>
                    <p className="text-sm text-foreground-muted mt-0.5">
                      {group.total_members} members · {group.duration_months} months
                    </p>
                  </div>
                  <StatusBadge status={group.status} />
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface rounded-xl p-3">
                    <p className="text-xs text-foreground-muted">Monthly</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">
                      {formatCurrency(Number(group.monthly_amount))}
                    </p>
                  </div>
                  <div className="bg-surface rounded-xl p-3">
                    <p className="text-xs text-foreground-muted">Commission</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">
                      {group.commission_type === 'PERCENT'
                        ? `${group.commission_value}%`
                        : formatCurrency(Number(group.commission_value))}
                    </p>
                  </div>
                  <div className="bg-surface rounded-xl p-3">
                    <p className="text-xs text-foreground-muted">Round Off</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">
                      ₹{group.round_off_value}
                    </p>
                  </div>
                  <div className="bg-surface rounded-xl p-3">
                    <p className="text-xs text-foreground-muted">Created</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">
                      {new Date(group.created_at).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <Link
                    href={`/groups/${group.id}`}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium text-cyan-400 hover:bg-cyan-500/10 border border-cyan-500/20 transition-all"
                  >
                    <HiOutlineEye className="w-4 h-4" />
                    View
                  </Link>
                  <button
                    onClick={() => setEditingGroup(group)}
                    className="p-2 rounded-xl text-foreground-muted hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
                  >
                    <HiOutlinePencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(group)}
                    className="p-2 rounded-xl text-foreground-muted hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <HiOutlineTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <GroupFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSaved={() => {
          setShowCreateModal(false);
          refreshData();
        }}
      />

      {/* Edit Modal */}
      {editingGroup && (
        <GroupFormModal
          isOpen={!!editingGroup}
          group={editingGroup}
          onClose={() => setEditingGroup(null)}
          onSaved={() => {
            setEditingGroup(null);
            refreshData();
          }}
        />
      )}
    </>
  );
}

// ─── Group Form Modal ───────────────────────────────────────────────────────

function GroupFormModal({
  isOpen,
  group,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  group?: ChitGroup;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = !!group;
  const [totalAmount, setTotalAmount] = useState(group ? String(group.total_amount) : '');
  const [totalMembers, setTotalMembers] = useState(group ? String(group.total_members) : '');
  const [durationMonths, setDurationMonths] = useState(group ? String(group.duration_months) : '');
  const [commissionType, setCommissionType] = useState<'PERCENT' | 'FIXED'>(group?.commission_type ?? 'FIXED');
  const [commissionValue, setCommissionValue] = useState(group ? String(group.commission_value) : '');
  const [roundOffValue, setRoundOffValue] = useState(group ? String(group.round_off_value) : '50');
  const [status, setStatus] = useState(group?.status ?? 'PENDING');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (group) {
      setTotalAmount(String(group.total_amount));
      setTotalMembers(String(group.total_members));
      setDurationMonths(String(group.duration_months));
      setCommissionType(group.commission_type);
      setCommissionValue(String(group.commission_value));
      setRoundOffValue(String(group.round_off_value));
      setStatus(group.status);
    }
  }, [group]);

  const monthlyAmount =
    totalAmount && totalMembers
      ? Number(totalAmount) / Number(totalMembers)
      : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (isEditing) {
      const res = await fetch(`/api/chit-groups/${group!.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          commission_type: commissionType,
          commission_value: Number(commissionValue),
          round_off_value: Number(roundOffValue),
        }),
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.error || 'Failed to update');
      else { toast.success('Group updated!'); onSaved(); }
    } else {
      const meRes = await fetch('/api/auth/me');
      const me = await meRes.json();

      const res = await fetch('/api/chit-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: me.id,
          total_amount: Number(totalAmount),
          total_members: Number(totalMembers),
          monthly_amount: monthlyAmount,
          duration_months: Number(durationMonths),
          commission_type: commissionType,
          commission_value: Number(commissionValue),
          round_off_value: Number(roundOffValue),
        }),
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.error || 'Failed to create');
      else { toast.success('Chit group created!'); onSaved(); }
    }

    setIsSubmitting(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Chit Group' : 'Create Chit Group'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isEditing && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Total Amount (₹)"
                type="number"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="e.g. 100000"
                required
              />
              <Input
                label="Total Members"
                type="number"
                value={totalMembers}
                onChange={(e) => setTotalMembers(e.target.value)}
                placeholder="e.g. 10"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Duration (months)"
                type="number"
                value={durationMonths}
                onChange={(e) => setDurationMonths(e.target.value)}
                placeholder="e.g. 10"
                required
              />
              <Input
                label="Monthly Amount (₹)"
                type="number"
                value={monthlyAmount || ''}
                disabled
                helperText="Auto calculated"
              />
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Commission Type"
            value={commissionType}
            onChange={(e) => setCommissionType(e.target.value as 'PERCENT' | 'FIXED')}
            options={[
              { value: 'FIXED', label: 'Fixed Amount' },
              { value: 'PERCENT', label: 'Percentage' },
            ]}
          />
          <Input
            label={commissionType === 'PERCENT' ? 'Commission (%)' : 'Commission (₹)'}
            type="number"
            value={commissionValue}
            onChange={(e) => setCommissionValue(e.target.value)}
            placeholder={commissionType === 'PERCENT' ? 'e.g. 5' : 'e.g. 500'}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Round Off Value"
            value={roundOffValue}
            onChange={(e) => setRoundOffValue(e.target.value)}
            options={[
              { value: '10', label: '₹10' },
              { value: '50', label: '₹50' },
              { value: '100', label: '₹100' },
            ]}
          />
          {isEditing && (
            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: 'PENDING', label: 'Pending' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
            />
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEditing ? 'Save Changes' : 'Create Group'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}