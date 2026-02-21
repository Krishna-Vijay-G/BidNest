//src/app/profile/page.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Header } from '@/components/layout/Header';
import { Card, Button, Input, PageLoader } from '@/components/ui';
import {
  HiOutlineUserCircle,
  HiOutlineLockClosed,
  HiOutlineShieldCheck,
  HiOutlineCalendarDays,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { useLang } from '@/lib/i18n/LanguageContext';

export default function ProfilePage() {
  const { user, isLoading, refreshUser } = useAuth();
  const { t } = useLang();

  if (isLoading) {
    return (
      <>
        <Header title={t('profile')} />
        <PageLoader />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Header title={t('profile')} />
        <div className="p-8 text-center text-foreground-muted">
          Unable to load profile. Please refresh the page.
        </div>
      </>
    );
  }

  return (
    <>
      <Header title={t('profile')} subtitle="Manage your personal information" />

      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl space-y-6">
        {/* Profile Header */}
        <Card>
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white font-bold text-3xl shadow-lg shadow-cyan-500/20 shrink-0">
              {user.name?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase()}
            </div>
            <div className="text-center sm:text-left flex-1">
              <h2 className="text-2xl font-bold text-foreground">{user.name}</h2>
              <p className="text-foreground-muted mt-1">@{user.username}</p>
              <p className="text-foreground-muted text-sm">{user.email}</p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <HiOutlineShieldCheck className="w-3.5 h-3.5" />
                  {t('activeAccount')}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Edit Profile */}
        <ProfileForm user={user} onUpdated={refreshUser} />

        {/* Change Password */}
        <PasswordForm />

        {/* Account Details */}
        <Card>
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <HiOutlineShieldCheck className="w-5 h-5 text-cyan-400" />
            {t('accountDetails')}
          </h3>
          <div className="space-y-0">
            <InfoRow
              icon={<HiOutlineUserCircle className="w-4 h-4" />}
              label="Username"
              value={user.username}
            />
            <InfoRow
              icon={<HiOutlineShieldCheck className="w-4 h-4" />}
              label="Account ID"
              value={<span className="font-mono text-xs">{user.id.slice(0, 16)}...</span>}
            />
            <InfoRow
              icon={<HiOutlineCalendarDays className="w-4 h-4" />}
              label={t('memberSince')}
              value={new Date(user.created_at).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            />
          </div>
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

function ProfileForm({
  user,
  onUpdated,
}: {
  user: { id: string; name: string; email: string; phone: string };
  onUpdated: () => void;
}) {
  const { t } = useLang();
  const [name, setName] = useState(user.name || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    setIsSaving(true);

    const now = new Date().toISOString();

    const res = await fetch(`/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: { value: name.trim(), updated_at: now },
      }),
    });

    if (res.ok) {
      toast.success('Profile updated!');
      onUpdated();
    } else {
      toast.error('Failed to update profile');
    }

    setIsSaving(false);
  };

  return (
    <Card>
      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <HiOutlineUserCircle className="w-5 h-5 text-cyan-400" />
        {t('personalInformation')}
      </h3>
      <form onSubmit={handleSave} className="space-y-4">
        <Input
          label={t('memberName')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          label="Email"
          value={user.email}
          disabled
          helperText="Email cannot be changed"
        />
        <Input
          label="Phone"
          value={user.phone}
          disabled
          helperText="Phone cannot be changed"
        />
        <div className="flex justify-end pt-2">
          <Button type="submit" isLoading={isSaving}>
            {t('saveChanges')}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PasswordForm() {
  const { user } = useAuth();
  const { t } = useLang();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChanging, setIsChanging] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsChanging(true);

    const now = new Date().toISOString();
    const bcryptRes = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword }),
    });

    if (bcryptRes.ok) {
      toast.success('Password updated!');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      const data = await bcryptRes.json();
      toast.error(data.error || 'Failed to update password');
    }

    setIsChanging(false);
  };

  return (
    <Card>
      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <HiOutlineLockClosed className="w-5 h-5 text-cyan-400" />
        {t('changePassword')}
      </h3>
      <form onSubmit={handleChangePassword} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t('newPassword')}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            helperText="Minimum 6 characters"
          />
          <Input
            label={t('confirmPassword')}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        <div className="flex justify-end pt-2">
          <Button type="submit" isLoading={isChanging}>
            {t('updatePassword')}
          </Button>
        </div>
      </form>
    </Card>
  );
}