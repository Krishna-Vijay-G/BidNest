// src/app/payments/layout.tsx
import { AppLayout } from '@/components/layout/AppLayout';
import type { ReactNode } from 'react';

export default function PaymentsLayout({ children }: { children: ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}