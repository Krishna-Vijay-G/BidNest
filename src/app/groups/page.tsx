//src/app/groups/page.tsx
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
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
import { useLang } from '@/lib/i18n/LanguageContext';

interface ChitGroup {
  id: string;
  name: string;
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
  const { user } = useAuth();
  const { t } = useLang();
  const [groups, setGroups] = useState<ChitGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ChitGroup | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const hasFetched = useRef(false);

  const loadData = useCallback(async (force = false) => {
    if (!user) return;
    if (!force && hasFetched.current) return;
    hasFetched.current = true;
    try {
      const res = await fetch(`/api/chit-groups?user_id=${user.id}`);
      const data = await res.json();
      setGroups(Array.isArray(data) ? data : []);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshData = useCallback(async () => {
    if (!user) return;
    const res = await fetch(`/api/chit-groups?user_id=${user.id}`);
    const data = await res.json();
    setGroups(Array.isArray(data) ? data : []);
  }, [user]);

  const handleDelete = async (group: ChitGroup) => {
    if (!confirm(`Cancel chit group "${group.name}"?`)) return;
    const res = await fetch(`/api/chit-groups/${group.id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Chit group cancelled');
      refreshData();
    } else {
      toast.error('Failed to cancel chit group');
    }
  };

  const statusPriority: Record<string, number> = {
    ACTIVE: 1,
    PENDING: 2,
    COMPLETED: 3,
    CANCELLED: 4,
  };

  const displayedGroups = (filterStatus === 'all'
    ? [...groups].sort((a, b) => {
        const pa = statusPriority[a.status] ?? 99;
        const pb = statusPriority[b.status] ?? 99;
        if (pa !== pb) return pa - pb;
        // fallback: newest first
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })
    : groups.filter((g) => g.status === filterStatus)
  );

  if (isLoading) {
    return (
      <>
        <Header title={t('groups')} />
        <PageLoader />
      </>
    );
  }

  return (
    <>
      <Header title={t('groups')} subtitle={`${groups.length} ${t('totalGroups')}`}>
        <Button
          icon={<HiOutlinePlus className="w-4 h-4" />}
          onClick={() => setShowCreateModal(true)}
        >
          {t('newGroup')}
        </Button>
      </Header>

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Filter */}
        <div className="mb-6 w-48">
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            options={[
              { value: 'all', label: t('allStatus') },
              { value: 'ACTIVE', label: t('statusActive') },
              { value: 'PENDING', label: t('statusPending') },
              { value: 'COMPLETED', label: t('statusCompleted') },
              { value: 'CANCELLED', label: t('statusCancelled') },
            ]}
          />
        </div>

        {displayedGroups.length === 0 ? (
          <EmptyState
            icon={<HiOutlineUserGroup className="w-8 h-8" />}
            title={t('noGroups')}
            description="Create your first chit group to get started."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {displayedGroups.map((group: ChitGroup) => (
              <div key={group.id} className="glass rounded-2xl border border-border p-5 flex flex-col gap-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                      <p className="text-base font-bold text-foreground">
                        {group.name}
                      </p>
                      <p className="text-sm text-foreground mt-0.5">
                        {formatCurrency(Number(group.total_amount))}
                      </p>
                      <p className="text-sm text-foreground-muted mt-0.5">
                        {group.total_members} {t('members')} · {group.duration_months} {t('month')}
                      </p>
                    </div>
                    <StatusBadge status={group.status} label={t((`status${group.status[0] + group.status.slice(1).toLowerCase()}`) as any)} />
                </div>

                {/* Progress */}
                <GroupProgress groupId={group.id} duration={group.duration_months} />

                {/* Details */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface rounded-xl p-3">
                    <p className="text-xs text-foreground-muted">{t('monthly')}</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">
                      {formatCurrency(Number(group.monthly_amount))}
                    </p>
                  </div>
                  <div className="bg-surface rounded-xl p-3">
                    <p className="text-xs text-foreground-muted">{t('commission')}</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">
                      {group.commission_type === 'PERCENT'
                        ? `${group.commission_value}%`
                        : formatCurrency(Number(group.commission_value))}
                    </p>
                  </div>
                  <div className="bg-surface rounded-xl p-3">
                    <p className="text-xs text-foreground-muted">{t('roundOff')}</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">
                      ₹{group.round_off_value}
                    </p>
                  </div>
                  <div className="bg-surface rounded-xl p-3">
                    <p className="text-xs text-foreground-muted">{t('created')}</p>
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
                    {t('viewManage')}
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
  const { t } = useLang();
  const [name, setName] = useState(group ? group.name : '');
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
      setName(String(group.name));
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
          name: name.trim() || `₹${Number(totalAmount).toLocaleString('en-IN')} Chit`,
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
      title={isEditing ? t('editGroup') : t('createGroup')}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isEditing && (
          <>
            <Input
              label={t('groupName')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Office Chit 2026"
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t('totalAmount')}
                type="number"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="e.g. 100000"
                required
              />
              <Input
                label={t('totalMembersLabel')}
                type="number"
                value={totalMembers}
                onChange={(e) => setTotalMembers(e.target.value)}
                placeholder="e.g. 10"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t('duration')}
                type="number"
                value={durationMonths}
                onChange={(e) => setDurationMonths(e.target.value)}
                placeholder="e.g. 10"
                required
              />
              <Input
                label={t('monthlyAmount')}
                type="number"
                value={monthlyAmount || ''}
                disabled
                helperText={t('autoCalculated')}
              />
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Select
            label={t('commissionType')}
            value={commissionType}
            onChange={(e) => setCommissionType(e.target.value as 'PERCENT' | 'FIXED')}
            options={[
              { value: 'FIXED', label: t('fixedAmount') },
              { value: 'PERCENT', label: t('percentage') },
            ]}
          />
          <Input
            label={t('commissionValue')}
            type="number"
            value={commissionValue}
            onChange={(e) => setCommissionValue(e.target.value)}
            placeholder={commissionType === 'PERCENT' ? 'e.g. 5' : 'e.g. 500'}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label={t('roundOff')}
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
              label={t('status')}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: 'PENDING', label: t('statusPending') },
                { value: 'ACTIVE', label: t('statusActive') },
                { value: 'COMPLETED', label: t('statusCompleted') },
                { value: 'CANCELLED', label: t('statusCancelled') },
              ]}
            />
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} type="button">
            {t('cancel')}
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEditing ? t('saveChanges') : t('createGroup')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function GroupProgress({ groupId, duration }: { groupId: string; duration: number }) {
  const { t } = useLang();
  const [completed, setCompleted] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch(`/api/auctions?chit_group_id=${groupId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        const list = Array.isArray(data) ? data : [];
        setCompleted(list.length);
      })
      .catch(() => {
        if (!mounted) return;
        setCompleted(0);
      });
    return () => { mounted = false; };
  }, [groupId]);

  if (completed === null) {
    return (
      <div className="mt-2">
        <div className="neon-progress">
          <div className="neon-progress-bar animate-pulse" style={{ width: '30%' }} />
        </div>
      </div>
    );
  }

  const pct = duration > 0 ? Math.min(100, Math.round((completed / duration) * 100)) : 0;

  return (
    <div className="w-full mt-3">
      <div className="flex items-center justify-between text-xs text-foreground-muted mb-1">
        <span>{completed} / {duration} {t('month')}</span>
        <span className="font-medium">{pct}%</span>
      </div>
      <div className="neon-progress">
        <div className="neon-progress-bar" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}