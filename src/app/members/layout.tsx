//src/app/members/layout.tsx
import { Sidebar } from '@/components/layout/Sidebar';
import type { ReactNode } from 'react';

export default function MembersLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="lg:pl-64 min-h-screen pb-20 lg:pb-0">
        {children}
      </main>
    </div>
  );
}