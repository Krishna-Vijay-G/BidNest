// src/components/ui/InfoRow.tsx
// Key-value info row used in profile and member detail pages

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

export function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <span className="flex items-center gap-2 text-sm text-foreground-muted">
        {icon}
        {label}
      </span>
      <span className="text-sm text-foreground-secondary">{value}</span>
    </div>
  );
}
