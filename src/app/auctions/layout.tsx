// src/app/auctions/layout.tsx
import { AppLayout } from '@/components/layout/AppLayout';
import type { ReactNode } from 'react';

export default function AuctionsLayout({ children }: { children: ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}