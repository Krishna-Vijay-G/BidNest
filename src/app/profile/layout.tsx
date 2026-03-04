// src/app/profile/layout.tsx
import { AppLayout } from '@/components/layout/AppLayout';
import type { ReactNode } from 'react';

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}