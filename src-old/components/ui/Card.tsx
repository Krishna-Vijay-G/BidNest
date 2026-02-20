import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}

export function Card({ children, className = '', padding = true }: CardProps) {
  return (
    <div
      className={`glass rounded-2xl transition-all duration-300 ${
        padding ? 'p-6' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  className?: string;
}

export function StatCard({
  title,
  value,
  icon,
  change,
  changeType = 'neutral',
  className = '',
}: StatCardProps) {
  const changeColors = {
    positive: 'text-emerald-400 bg-emerald-500/10',
    negative: 'text-red-400 bg-red-500/10',
    neutral: 'text-foreground-muted bg-surface',
  };

  return (
    <Card className={`glass-hover group ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground-muted">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          {change && (
            <span
              className={`inline-flex items-center text-xs font-medium mt-2 px-2 py-0.5 rounded-full ${changeColors[changeType]}`}
            >
              {change}
            </span>
          )}
        </div>
        <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400 group-hover:scale-110 transition-transform">{icon}</div>
      </div>
    </Card>
  );
}
