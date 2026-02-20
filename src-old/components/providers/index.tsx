'use client';

import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './AuthProvider';
import { ThemeProvider, useTheme } from './ThemeProvider';
import type { ReactNode } from 'react';

function ThemedToaster() {
  const { theme } = useTheme();
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: theme === 'dark' ? '#1f2937' : '#ffffff',
          color: theme === 'dark' ? '#f9fafb' : '#111827',
          borderRadius: '0.75rem',
          border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
          boxShadow: theme === 'dark' ? 'none' : '0 4px 6px -1px rgba(0,0,0,0.1)',
        },
        success: {
          iconTheme: {
            primary: '#10b981',
            secondary: theme === 'dark' ? '#f9fafb' : '#ffffff',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: theme === 'dark' ? '#f9fafb' : '#ffffff',
          },
        },
      }}
    />
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        {children}
        <ThemedToaster />
      </AuthProvider>
    </ThemeProvider>
  );
}
