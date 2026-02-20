//src/components/providers/index.tsx
'use client';

import { AuthProvider } from './AuthProvider';
import { Toaster } from 'react-hot-toast';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(10, 10, 26, 0.9)',
            color: '#f1f5f9',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(12px)',
          },
          success: {
            iconTheme: { primary: '#00f0ff', secondary: '#050510' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#050510' },
          },
        }}
      />
      {children}
    </AuthProvider>
  );
}