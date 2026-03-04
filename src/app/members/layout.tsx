// src/app/members/layout.tsx
import { AppLayout } from '@/components/layout/AppLayout';
import type { ReactNode } from 'react';

export default function MembersLayout({ children }: { children: ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}