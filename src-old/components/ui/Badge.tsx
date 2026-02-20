interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  size?: 'sm' | 'md';
}

export function Badge({ children, variant = 'default', size = 'sm' }: BadgeProps) {
  const variants = {
    default: 'bg-surface-hover text-foreground-muted border-border',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    danger: 'bg-red-500/10 text-red-400 border-red-500/20',
    info: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-0.5',
    md: 'text-sm px-3 py-1',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${variants[variant]} ${sizes[size]}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const statusMap: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    active: { variant: 'success', label: 'Active' },
    pending: { variant: 'warning', label: 'Pending' },
    completed: { variant: 'info', label: 'Completed' },
    cancelled: { variant: 'danger', label: 'Cancelled' },
    paid: { variant: 'success', label: 'Paid' },
    overdue: { variant: 'danger', label: 'Overdue' },
    waived: { variant: 'default', label: 'Waived' },
    scheduled: { variant: 'purple', label: 'Scheduled' },
    open: { variant: 'warning', label: 'Open' },
  };

  const config = statusMap[status] || { variant: 'default' as const, label: status };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
