//src/components/ui/StatCard.tsx
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

  // Adjust font size based on value length to keep it visible
  const getValueFontSize = (val: string | number) => {
    const s = String(val);
    if (s.length > 15) return 'text-lg';
    if (s.length > 12) return 'text-xl';
    return 'text-2xl';
  };

  return (
    <div className="glass rounded-2xl border border-border p-5 flex flex-col justify-between h-full group hover:border-cyan-500/30 transition-all duration-300">
      <div className="flex items-center justify-between gap-4 mb-1">
        <p className="text-sm text-foreground-muted font-medium leading-tight">
          {title}
        </p>
        {icon && (
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 shrink-0 group-hover:scale-110 transition-transform duration-300">
            {icon}
          </div>
        )}
      </div>
      
      <div title={String(value)}>
        <p className={`font-bold text-foreground break-all leading-none ${getValueFontSize(value)}`}>
          {value}
        </p>
        {change && (
          <p className={`text-xs mt-2 font-medium ${changeColors[changeType]}`}>
            {change}
          </p>
        )}
      </div>
    </div>
  );
}