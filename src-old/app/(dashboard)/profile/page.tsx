'use client';

import { useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Header } from '@/components/layout/Header';
import { Card, Button, Input, PageLoader } from '@/components/ui';
import { updateProfile, changePassword } from '@/lib/api';
import {
  HiOutlineUserCircle,
  HiOutlineLockClosed,
  HiOutlineShieldCheck,
  HiOutlineCalendarDays,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, isLoading: authLoading, refreshUser } = useAuth();

  if (authLoading) {
    return (
      <>
        <Header title="Profile" />
        <PageLoader />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Header title="Profile" />
        <div className="p-8 text-center text-foreground-muted">
          Unable to load profile. Please refresh the page or sign in again.
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="My Profile" subtitle="Manage your personal information" />

      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl space-y-6">
        {/* Profile Header Card */}
        <Card>
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white font-bold text-3xl shadow-lg shadow-cyan-500/20 shrink-0">
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="text-center sm:text-left flex-1">
              <h2 className="text-2xl font-bold text-foreground">{user.full_name}</h2>
              <p className="text-foreground-muted mt-1">{user.email}</p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-3">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                  user.role === 'admin'
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                    : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                }`}>
                  <HiOutlineShieldCheck className="w-3.5 h-3.5" />
                  {user.role === 'admin' ? 'Administrator' : 'Member'}
                </span>
                {user.is_active && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Active
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Edit Profile Form */}
        <ProfileForm user={user} onUpdated={refreshUser} />

        {/* Change Password */}
        <PasswordForm />

        {/* Account Details */}
        <Card>
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <HiOutlineShieldCheck className="w-5 h-5 text-cyan-400" />
            Account Details
          </h3>
          <div className="space-y-0">
            <InfoRow
              icon={<HiOutlineShieldCheck className="w-4 h-4" />}
              label="Account ID"
              value={<span className="font-mono text-xs">{user.id.slice(0, 16)}...</span>}
            />
            <InfoRow
              icon={<HiOutlineShieldCheck className="w-4 h-4" />}
              label="Role"
              value={<span className="capitalize">{user.role}</span>}
            />
            <InfoRow
              icon={<HiOutlineCalendarDays className="w-4 h-4" />}
              label="Member Since"
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

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
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
  user: { id: string; full_name: string; email: string; phone: string | null; address: string | null };
  onUpdated: () => void;
}) {
  const [fullName, setFullName] = useState(user.full_name);
  const [phone, setPhone] = useState(user.phone || '');
  const [address, setAddress] = useState(user.address || '');
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
      address: address.trim() || undefined,
    });

    if (result.error) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile updated!');
      onUpdated();
    }

    setIsSaving(false);
  };

  return (
    <Card>
      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <HiOutlineUserCircle className="w-5 h-5 text-cyan-400" />
        Personal Information
      </h3>
      <form onSubmit={handleSave} className="space-y-4">
        <Input
          label="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <Input
          label="Email"
          value={user.email}
          disabled
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 99999 99999"
          />
          <Input
            label="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Your address"
          />
        </div>
        <div className="flex justify-end pt-2">
          <Button type="submit" isLoading={isSaving}>
            Save Changes
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PasswordForm() {
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
      toast.success('Password updated!');
      setNewPassword('');
      setConfirmPassword('');
    }

    setIsChanging(false);
  };

  return (
    <Card>
      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <HiOutlineLockClosed className="w-5 h-5 text-cyan-400" />
        Change Password
      </h3>
      <form onSubmit={handleChangePassword} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            helperText="Minimum 6 characters"
          />
          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        <div className="flex justify-end pt-2">
          <Button type="submit" isLoading={isChanging}>
            Update Password
          </Button>
        </div>
      </form>
    </Card>
  );
}
