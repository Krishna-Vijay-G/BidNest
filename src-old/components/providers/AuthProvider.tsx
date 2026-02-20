'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { apiGetMe, apiLogout, getAccessToken, clearTokens } from '@/lib/api';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAdmin: false,
  isAuthenticated: false,
  signOut: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isFetchingRef = useRef(false);

  const fetchUser = useCallback(async () => {
    // Prevent concurrent fetchUser calls
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    const token = getAccessToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      isFetchingRef.current = false;
      return;
    }

    try {
      const result = await apiGetMe();
      if (result.success && result.data) {
        setUser(result.data as User);
      } else {
        // Token invalid/expired
        clearTokens();
        setUser(null);
      }
    } catch (err) {
      console.error('Auth fetch error:', err);
      setUser(null);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Handle tab visibility - refresh user when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const token = getAccessToken();
        if (token) {
          fetchUser();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchUser]);

  // Listen for storage changes (login/logout in other tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'bidnest_access_token') {
        if (e.newValue) {
          fetchUser();
        } else {
          setUser(null);
          router.push('/login');
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [fetchUser, router]);

  const signOut = useCallback(async () => {
    try {
      await apiLogout();
      setUser(null);
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Sign out error:', err);
      clearTokens();
      router.push('/login');
    }
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAdmin: user?.role === 'admin',
        isAuthenticated: !!user,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
