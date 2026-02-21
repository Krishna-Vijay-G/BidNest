//src/app/members/page.tsx
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Header } from '@/components/layout/Header';
import { Card, Button, Modal, Input, PageLoader, EmptyState } from '@/components/ui';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';
import {
  HiOutlineUserPlus,
  HiOutlineUsers,
  HiOutlineMagnifyingGlass,
  HiOutlinePencil,
  HiOutlineTrash,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { useLang } from '@/lib/i18n/LanguageContext';

interface Member {
  id: string;
  name: { value: string; updated_at: string };
  nickname: { value: string; updated_at: string };
  mobile: { value: string; updated_at: string };
  upi_ids: { value: string; added_at: string; is_active: boolean }[];
  is_active: boolean;
  created_at: string;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function MembersPage() {
  const { user } = useAuth();
  const { t } = useLang();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const hasFetched = useRef(false);

  const loadData = useCallback(async (force = false) => {
    if (!user) return;
    if (!force && hasFetched.current) return;
    hasFetched.current = true;
    try {
      const res = await fetch(`/api/members?user_id=${user.id}`);
      const data = await res.json();
      setMembers(Array.isArray(data) ? data : []);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshData = useCallback(async () => {
    if (!user) return;
    const res = await fetch(`/api/members?user_id=${user.id}`);
    const data = await res.json();
    setMembers(Array.isArray(data) ? data : []);
  }, [user]);

  const filteredMembers = members.filter(
    (m) =>
      m.name.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.nickname.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.mobile.value.includes(searchQuery)
  );

  const handleDelete = async (member: Member) => {
    if (!confirm(`Deactivate ${member.name.value}?`)) return;
    const res = await fetch(`/api/members/${member.id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      toast.success('Member deactivated');
      refreshData();
    } else {
      toast.error('Failed to deactivate member');
    }
  };

  if (isLoading) {
    return (
      <>
        <Header title={t('members')} />
        <PageLoader />
      </>
    );
  }

  return (
    <>
      <Header title={t('members')} subtitle={`${members.length} registered members`}>
        <Button
          icon={<HiOutlineUserPlus className="w-4 h-4" />}
          onClick={() => setShowCreateModal(true)}
        >
          {t('addMember')}
        </Button>
      </Header>

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
            <input
              type="text"
              placeholder={t('search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl text-sm"
            />
          </div>
        </div>

        {filteredMembers.length === 0 ? (
          <EmptyState
            icon={<HiOutlineUsers className="w-8 h-8" />}
            title={t('noMembers')}
            description={
              searchQuery
                ? 'Try adjusting your search.'
                : t('addFirstMember')
            }
          />
        ) : (
          <Card padding={false}>
            <div className="overflow-x-auto">
              <table className="glass-table w-full">
                <thead>
                  <tr>
                    <th>{t('memberName')}</th>
                    <th>{t('nickname')}</th>
                    <th>{t('mobile')}</th>
                    <th>{t('upiId')}</th>
                    <th>{t('status')}</th>
                    <th>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member) => (
                    <tr key={member.id}>
                      <td>
                        <Link href={`/members/${member.id}`} className="flex items-center gap-3 group">
                          <div className="w-8 h-8 bg-cyan-500/10 rounded-full flex items-center justify-center text-cyan-400 font-semibold text-sm">
                            {member.name.value.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-foreground group-hover:text-cyan-400 transition-colors">
                            {member.name.value}
                          </span>
                        </Link>
                      </td>
                      <td>
                        <Badge variant="default">{member.nickname.value}</Badge>
                      </td>
                      <td className="text-foreground-secondary">{member.mobile.value}</td>
                      <td className="text-foreground-muted">
                        {member.upi_ids?.filter((u) => u.is_active).map((u) => u.value).join(', ') || '—'}
                      </td>
                      <td>
                        <Badge variant={member.is_active ? 'success' : 'danger'}>
                          {member.is_active ? t('active') : t('inactive')}
                        </Badge>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingMember(member)}
                            className="p-1.5 text-foreground-muted hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all"
                          >
                            <HiOutlinePencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(member)}
                            className="p-1.5 text-foreground-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                          >
                            <HiOutlineTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Create Modal */}
      <MemberFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSaved={() => {
          setShowCreateModal(false);
          refreshData();
        }}
      />

      {/* Edit Modal */}
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

// ─── Member Form Modal ──────────────────────────────────────────────────────

function MemberFormModal({
  isOpen,
  member,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  member?: Member;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = !!member;
  const { t } = useLang();
  const [name, setName] = useState(member?.name.value ?? '');
  const [nickname, setNickname] = useState(member?.nickname.value ?? '');
  const [mobile, setMobile] = useState(member?.mobile.value ?? '');
  const [upiId, setUpiId] = useState(
    member?.upi_ids?.find((u) => u.is_active)?.value ?? ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setName(member?.name.value ?? '');
    setNickname(member?.nickname.value ?? '');
    setMobile(member?.mobile.value ?? '');
    setUpiId(member?.upi_ids?.find((u) => u.is_active)?.value ?? '');
  }, [member]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const now = new Date().toISOString();

    // get user_id from /api/auth/me
    const meRes = await fetch('/api/auth/me');
    const me = await meRes.json();

    const payload = {
      user_id: me.id,
      name: { value: name.trim(), updated_at: now },
      nickname: { value: nickname.trim(), updated_at: now },
      mobile: { value: mobile.trim(), updated_at: now },
      upi_ids: upiId.trim()
        ? [{ value: upiId.trim(), added_at: now, is_active: true }]
        : [],
    };

    const res = isEditing
      ? await fetch(`/api/members/${member!.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: { value: name.trim(), updated_at: now },
            nickname: { value: nickname.trim(), updated_at: now },
            mobile: { value: mobile.trim(), updated_at: now },
            upi_ids: upiId.trim()
              ? [{ value: upiId.trim(), added_at: now, is_active: true }]
              : [],
          }),
        })
      : await fetch('/api/members', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

    const data = await res.json();

    if (!res.ok) {
      toast.error(data.error || 'Something went wrong');
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
      title={isEditing ? t('editMember') : t('addMember')}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t('memberName')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Rajesh Kumar"
          required
        />
        <Input
          label={t('nickname')}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="e.g. Raju"
          required
        />
        <Input
          label={t('mobile')}
          type="tel"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          placeholder="e.g. 9876543210"
          required
        />
        <Input
          label={`${t('upiId')} (${t('optional')})`}
          value={upiId}
          onChange={(e) => setUpiId(e.target.value)}
          placeholder="e.g. rajesh@upi"
        />
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} type="button">
            {t('cancel')}
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEditing ? t('saveChanges') : t('addMember')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}