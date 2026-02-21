//src/components/ui/Badge.tsx
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  const variants = {
    default: 'bg-surface text-foreground-secondary border-border',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    danger: 'bg-red-500/10 text-red-400 border-red-500/20',
    info: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[variant]}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const map: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    ACTIVE: { label: 'Active', variant: 'success' },
    PENDING: { label: 'Pending', variant: 'warning' },
    COMPLETED: { label: 'Completed', variant: 'info' },
    CANCELLED: { label: 'Cancelled', variant: 'danger' },
    PARTIAL: { label: 'Partial', variant: 'warning' },
    paid: { label: 'Paid', variant: 'success' },
    pending: { label: 'Pending', variant: 'warning' },
    overdue: { label: 'Overdue', variant: 'danger' },
  };

  const config = map[status] ?? { label: status, variant: 'default' as const };

  // Use provided label override (translated) if available, otherwise use mapped label
  const displayLabel = label ?? config.label;

  return <Badge variant={config.variant}>{displayLabel}</Badge>;
}