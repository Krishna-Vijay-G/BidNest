interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
}

export function StatCard({ title, value, icon, change, changeType = 'neutral' }: StatCardProps) {
  const changeColors = {
    positive: 'text-emerald-400',
    negative: 'text-red-400',
    neutral: 'text-foreground-muted',
  };

  return (
    <div className="glass rounded-2xl border border-border p-5 flex items-start justify-between">
      <div>
        <p className="text-sm text-foreground-muted mb-1">{title}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {change && (
          <p className={`text-xs mt-1 ${changeColors[changeType]}`}>{change}</p>
        )}
      </div>
      {icon && (
        <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400">
          {icon}
        </div>
      )}
    </div>
  );
}