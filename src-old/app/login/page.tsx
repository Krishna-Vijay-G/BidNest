'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiLogin } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await apiLogin(email, password);

      if (!result.success) {
        toast.error(result.error || 'Login failed');
        return;
      }

      toast.success('Welcome back!');
      router.push('/dashboard');
      router.refresh();
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-30%] left-[-15%] w-125 h-125 rounded-full bg-cyan-500/6 blur-[100px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-100 h-100 rounded-full bg-purple-500/6 blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-linear-to-br from-cyan-400 to-purple-500 shadow-lg shadow-cyan-500/20">
              <span className="text-white font-black text-2xl">B</span>
            </div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Bid<span className="neon-text">Nest</span>
            </h1>
          </Link>
          <p className="text-foreground-muted">Sign in to manage your chit funds</p>
        </div>

        {/* Form Card */}
        <div className="glass-strong rounded-2xl p-8">
          <h2 className="text-xl font-semibold text-foreground mb-6">Sign In</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              isLoading={isLoading}
              className="w-full"
              size="lg"
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-foreground-muted">
              Don&apos;t have an account?{' '}
              <Link
                href="/register"
                className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-foreground-muted text-xs mt-6">
          Secure chit fund management platform
        </p>
      </div>
    </div>
  );
}
