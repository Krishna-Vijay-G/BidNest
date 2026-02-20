'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginValue || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    setIsLoading(true);
    const result = await login(loginValue, password);
    if (result.error) {
      toast.error(result.error);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
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
          <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
          <p className="text-foreground-muted text-sm mt-1">Sign in to your account</p>
        </div>

        {/* Form */}
        <div className="glass-strong rounded-2xl border border-border p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Username or Email"
              type="text"
              placeholder="johndoe or john@example.com"
              value={loginValue}
              onChange={(e) => setLoginValue(e.target.value)}
              required
              autoComplete="username"
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isLoading}
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-foreground-muted">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}