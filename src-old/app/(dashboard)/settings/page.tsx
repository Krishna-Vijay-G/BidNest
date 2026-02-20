'use client';

import { useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Header } from '@/components/layout/Header';
import { Card, Button, Input, PageLoader } from '@/components/ui';
import { updateProfile, changePassword } from '@/lib/api';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, isLoading: authLoading, refreshUser } = useAuth();

  if (authLoading) {
    return (
      <>
        <Header title="Settings" />
        <PageLoader />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Header title="Settings" subtitle="Loading profile..." />
        <div className="p-8 text-center text-foreground-muted">Unable to load profile data. Please try refreshing the page.</div>
      </>
    );
  }

  return (
    <>
      <Header title="Settings" subtitle="Manage your profile and preferences" />

      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl space-y-6">
        <ProfileSection user={user} onUpdated={refreshUser} />
        <PasswordSection />
        <AccountInfoSection user={user} />
      </div>
    </>
  );
}

function ProfileSection({
  user,
  onUpdated,
}: {
  user: { id: string; full_name: string; email: string; phone: string | null };
  onUpdated: () => void;
}) {
  const [fullName, setFullName] = useState(user.full_name);
  const [phone, setPhone] = useState(user.phone || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error('Name is required');
      return;
    }

    setIsSaving(true);

    const result = await updateProfile({
      full_name: fullName.trim(),
      phone: phone.trim() || undefined,
    });

    if (result.error) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile updated');
      onUpdated();
    }

    setIsSaving(false);
  };

  return (
    <Card>
      <h3 className="text-lg font-semibold text-foreground mb-4">Profile Information</h3>
      <form onSubmit={handleSave} className="space-y-4">
        <Input
          label="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <Input label="Email" value={user.email} disabled />
        <Input
          label="Phone Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+91 99999 99999"
        />
        <div className="pt-2">
          <Button type="submit" isLoading={isSaving}>
            Save Changes
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState('');
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

    const result = await changePassword(newPassword);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Password updated');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }

    setIsChanging(false);
  };

  return (
    <Card>
      <h3 className="text-lg font-semibold text-foreground mb-4">Change Password</h3>
      <form onSubmit={handleChangePassword} className="space-y-4">
        <Input
          label="Current Password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
        <Input
          label="New Password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          helperText="Minimum 6 characters"
        />
        <Input
          label="Confirm New Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <div className="pt-2">
          <Button type="submit" isLoading={isChanging}>
            Update Password
          </Button>
        </div>
      </form>
    </Card>
  );
}

function AccountInfoSection({
  user,
}: {
  user: { id: string; role: string; created_at: string };
}) {
  return (
    <Card>
      <h3 className="text-lg font-semibold text-foreground mb-4">Account Information</h3>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between py-2 border-b border-border">
          <span className="text-foreground-muted">Account ID</span>
          <span className="text-foreground font-mono text-xs">{user.id}</span>
        </div>
        <div className="flex justify-between py-2 border-b border-border">
          <span className="text-foreground-muted">Role</span>
          <span className="capitalize font-medium text-foreground">{user.role}</span>
        </div>
        <div className="flex justify-between py-2">
          <span className="text-foreground-muted">Member Since</span>
          <span className="text-foreground">
            {new Date(user.created_at).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>
    </Card>
  );
}
