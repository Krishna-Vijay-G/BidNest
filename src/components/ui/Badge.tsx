// src/components/ui/Badge.tsx
import { useLang } from '@/lib/i18n/LanguageContext';
import type { TranslationKey } from '@/lib/i18n/translations';

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

// Status → translation key + variant mapping (shared by all status badges)
const STATUS_MAP: Record<string, { key: TranslationKey; variant: BadgeProps['variant'] }> = {
  ACTIVE: { key: 'active', variant: 'success' },
  PENDING: { key: 'pending', variant: 'warning' },
  COMPLETED: { key: 'completed', variant: 'info' },
  CANCELLED: { key: 'cancelled', variant: 'danger' },
  PARTIAL: { key: 'partial', variant: 'warning' },
};

/**
 * General-purpose status badge. Translates automatically.
 */
export function StatusBadge({ status }: { status: string }) {
  const { t } = useLang();
  const config = STATUS_MAP[status.toUpperCase()] ?? { key: status.toLowerCase() as TranslationKey, variant: 'default' as const };
  return <Badge variant={config.variant}>{t(config.key)}</Badge>;
}

type MemberStatus = 'WINNER' | 'COMPLETED' | 'PARTIAL' | 'PENDING';

const MEMBER_STATUS_MAP: Record<MemberStatus, { key: TranslationKey; variant: BadgeProps['variant'] }> = {
  WINNER: { key: 'winner', variant: 'warning' },
  COMPLETED: { key: 'completed', variant: 'success' },
  PARTIAL: { key: 'partial', variant: 'warning' },
  PENDING: { key: 'pending', variant: 'danger' },
};

export function MemberStatusBadge({ status }: { status: MemberStatus }) {
  const { t } = useLang();
  const { key, variant } = MEMBER_STATUS_MAP[status];
  return <Badge variant={variant}>{t(key)}</Badge>;
}

type AggregatedStatus = 'CLEAR' | 'COMPLETED' | 'PARTIAL' | 'PENDING';

const AGGREGATED_STATUS_MAP: Record<AggregatedStatus, { key: TranslationKey; variant: BadgeProps['variant'] }> = {
  CLEAR: { key: 'settled', variant: 'warning' },
  COMPLETED: { key: 'settled', variant: 'success' },
  PARTIAL: { key: 'partial', variant: 'warning' },
  PENDING: { key: 'pending', variant: 'danger' },
};

export function AggregatedStatusBadge({ status }: { status: AggregatedStatus }) {
  const { t } = useLang();
  const { key, variant } = AGGREGATED_STATUS_MAP[status];
  return <Badge variant={variant}>{t(key)}</Badge>;
}