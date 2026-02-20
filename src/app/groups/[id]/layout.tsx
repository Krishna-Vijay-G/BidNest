import type { ReactNode } from 'react';

// Parent groups/layout.tsx already provides the Sidebar shell.
// This layout just passes children through to avoid a duplicate sidebar.
export default function GroupDetailLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}