import type { ReactNode } from 'react';

// Parent members/layout.tsx already provides the Sidebar shell.
// This layout just passes children through to avoid a duplicate sidebar.
export default function MemberDetailLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}