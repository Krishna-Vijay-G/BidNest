// src/app/groups/layout.tsx
import { AppLayout } from '@/components/layout/AppLayout';
import type { ReactNode } from 'react';

export default function GroupsLayout({ children }: { children: ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}