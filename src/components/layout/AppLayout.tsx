// src/components/layout/AppLayout.tsx
// Shared layout wrapper with Sidebar for all authenticated pages
import { Sidebar } from './Sidebar';
import type { ReactNode } from 'react';

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="lg:pl-64 min-h-screen pb-20 lg:pb-0">
        {children}
      </main>
    </div>
  );
}
