// src/components/ui/SummaryCard.tsx
// Finance summary card used in payments overview

interface SummaryCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}

export function SummaryCard({ label, value, sub, icon, color }: SummaryCardProps) {
  return (
    <div className="glass rounded-2xl border border-border p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-xl shrink-0 ${color}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-foreground-muted uppercase tracking-wide mb-1">{label}</p>
        <p className="text-2xl font-bold text-foreground truncate">{value}</p>
        {sub && <p className="text-xs text-foreground-muted mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
