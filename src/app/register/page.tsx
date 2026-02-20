//src/app/register/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    const result = await register({
      name: form.name,
      username: form.username,
      email: form.email,
      phone: form.phone,
      password: form.password,
    });

    if (result.error) {
      toast.error(result.error);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-125 h-125 rounded-full bg-cyan-500/[0.07] blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-100 h-100 rounded-full bg-purple-500/[0.07] blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-linear-to-br from-cyan-400 to-purple-500 shadow-lg shadow-cyan-500/20">
              <span className="text-white font-black text-lg">B</span>
            </div>
            <span className="text-foreground font-bold text-xl tracking-tight">
              Bid<span className="neon-text">Nest</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Create account</h1>
          <p className="text-foreground-muted text-sm mt-1">Start managing your chit funds today</p>
        </div>

        {/* Form */}
        <div className="glass-strong rounded-2xl border border-border p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Full Name"
                name="name"
                placeholder="John Doe"
                value={form.name}
                onChange={handleChange}
                required
              />
              <Input
                label="Username"
                name="username"
                placeholder="johndoe"
                value={form.username}
                onChange={handleChange}
                required
              />
            </div>
            <Input
              label="Email"
              type="email"
              name="email"
              placeholder="john@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
            <Input
              label="Phone"
              type="tel"
              name="phone"
              placeholder="9876543210"
              value={form.phone}
              onChange={handleChange}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Password"
                type="password"
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
              />
              <Input
                label="Confirm Password"
                type="password"
                name="confirmPassword"
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isLoading}
            >
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-foreground-muted">
              Already have an account?{' '}
              <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}