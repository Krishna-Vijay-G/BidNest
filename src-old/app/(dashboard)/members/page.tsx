'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, Button, Modal, Input, PageLoader, EmptyState, Badge } from '@/components/ui';
import { formatCurrency } from '@/lib/calculations';
import { createAppMember, updateAppMember, deleteAppMember } from '@/lib/api';
import Link from 'next/link';
import {
  HiOutlineUserPlus,
  HiOutlineUsers,
  HiOutlineMagnifyingGlass,
  HiOutlinePencil,
  HiOutlineTrash,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { fetchMembersPageData } from '@/lib/api';
import type { AppMember } from '@/types';

export default function MembersPage() {
  const [members, setMembers] = useState<AppMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMember, setEditingMember] = useState<AppMember | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [memberStats, setMemberStats] = useState<
    Record<string, { groups: number; totalPaid: number; totalDividends: number }>
  >({});
  const hasFetched = useRef(false);

  const loadData = useCallback(async (force = false) => {
    if (!force && (hasFetched.current || sessionStorage.getItem('members-fetched'))) return;
    hasFetched.current = true;
    sessionStorage.setItem('members-fetched', 'true');
    sessionStorage.setItem('members-last-fetch', Date.now().toString());

    const { data } = await fetchMembersPageData();
    setMembers(data.members);
    setMemberStats(data.stats);
    setIsLoading(false);
  }, []);

  const refreshData = useCallback(async () => {
    const { data } = await fetchMembersPageData();
    setMembers(data.members);
    setMemberStats(data.stats);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh data when tab becomes visible (if it's been more than 5 minutes)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isLoading) {
        const lastFetch = sessionStorage.getItem('members-last-fetch');
        if (!lastFetch || Date.now() - parseInt(lastFetch) > 5 * 60 * 1000) {
          loadData(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isLoading, loadData]);

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.mobile.includes(searchQuery) ||
      (m.upi_id && m.upi_id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleDelete = async (member: AppMember) => {
    if (!confirm(`Remove ${member.name} from the member directory?`)) return;
    const result = await deleteAppMember(member.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Member removed');
      refreshData();
    }
  };

  if (isLoading) {
    return (
      <>
        <Header title="Members" />
        <PageLoader />
      </>
    );
  }

  return (
    <>
      <Header title="Members" subtitle={`${members.length} registered members`}>
        <Button
          icon={<HiOutlineUserPlus className="w-4 h-4" />}
          onClick={() => setShowCreateModal(true)}
        >
          Add Member
        </Button>
      </Header>

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
            <input
              type="text"
              placeholder="Search by name, nickname, mobile, or UPI..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border bg-surface text-foreground rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 placeholder:text-foreground-muted"
            />
          </div>
        </div>

        {filteredMembers.length === 0 ? (
          <EmptyState
            icon={<HiOutlineUsers className="w-8 h-8" />}
            title="No members found"
            description={searchQuery ? 'Try adjusting your search.' : 'Add your first member to get started.'}
          />
        ) : (
          <Card padding={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface">
                  <tr className="text-left text-foreground-muted border-b border-border">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Nickname</th>
                    <th className="px-4 py-3 font-medium">Mobile</th>
                    <th className="px-4 py-3 font-medium">UPI ID</th>
                    <th className="px-4 py-3 font-medium">Groups</th>
                    <th className="px-4 py-3 font-medium">Total Paid</th>
                    <th className="px-4 py-3 font-medium">Dividends</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/4">
                  {filteredMembers.map((member) => {
                    const stats = memberStats[member.id];
                    return (
                      <tr key={member.id} className="hover:bg-surface-hover">
                        <td className="px-4 py-3">
                          <Link href={`/members/${member.id}`} className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-cyan-500/10 rounded-full flex items-center justify-center text-cyan-400 font-semibold text-sm">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-foreground hover:text-cyan-400 transition-colors">
                              {member.name}
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="default">{member.nickname}</Badge>
                        </td>
                        <td className="px-4 py-3 text-foreground-secondary">{member.mobile}</td>
                        <td className="px-4 py-3 text-foreground-muted">{member.upi_id || '—'}</td>
                        <td className="px-4 py-3 text-foreground-secondary">{stats?.groups || 0}</td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {formatCurrency(stats?.totalPaid || 0)}
                        </td>
                        <td className="px-4 py-3 text-cyan-400">
                          {formatCurrency(stats?.totalDividends || 0)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEditingMember(member)}
                              className="p-1 text-foreground-muted hover:text-cyan-400 transition-colors"
                              title="Edit"
                            >
                              <HiOutlinePencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(member)}
                              className="p-1 text-foreground-muted hover:text-red-400 transition-colors"
                              title="Remove"
                            >
                              <HiOutlineTrash className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Create Member Modal */}
      <MemberFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSaved={() => {
          setShowCreateModal(false);
          refreshData();
        }}
      />

      {/* Edit Member Modal */}
      {editingMember && (
        <MemberFormModal
          isOpen={!!editingMember}
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onSaved={() => {
            setEditingMember(null);
            refreshData();
          }}
        />
      )}
    </>
  );
}

// ─── Member Form Modal ────────────────────────────────────────────────────────

function MemberFormModal({
  isOpen,
  member,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  member?: AppMember;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = !!member;
  const [name, setName] = useState(member?.name ?? '');
  const [nickname, setNickname] = useState(member?.nickname ?? '');
  const [mobile, setMobile] = useState(member?.mobile ?? '');
  const [upiId, setUpiId] = useState(member?.upi_id ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens with a different member
  useEffect(() => {
    setName(member?.name ?? '');
    setNickname(member?.nickname ?? '');
    setMobile(member?.mobile ?? '');
    setUpiId(member?.upi_id ?? '');
  }, [member]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const input = {
      name: name.trim(),
      nickname: nickname.trim(),
      mobile: mobile.trim(),
      upi_id: upiId.trim() || undefined,
    };

    const result = isEditing
      ? await updateAppMember(member!.id, input)
      : await createAppMember(input);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(isEditing ? 'Member updated!' : 'Member added!');
      onSaved();
    }

    setIsSubmitting(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Member' : 'Add New Member'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Rajesh Kumar"
          required
          autoComplete="off"
        />
        <Input
          label="Nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="e.g. Raju"
          required
          autoComplete="off"
        />
        <Input
          label="Mobile Number"
          type="tel"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          placeholder="e.g. 9876543210"
          required
          autoComplete="off"
        />
        <Input
          label="UPI ID (optional)"
          value={upiId}
          onChange={(e) => setUpiId(e.target.value)}
          placeholder="e.g. rajesh@upi"
          autoComplete="off"
        />
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEditing ? 'Save Changes' : 'Add Member'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
