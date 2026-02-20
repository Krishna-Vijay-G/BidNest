import { HiOutlineInboxArrowDown } from 'react-icons/hi2';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="p-4 bg-surface rounded-2xl mb-4 text-foreground-muted border border-border">
        {icon || <HiOutlineInboxArrowDown className="w-8 h-8" />}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-foreground-muted max-w-sm mb-4">{description}</p>
      )}
      {action}
    </div>
  );
}
