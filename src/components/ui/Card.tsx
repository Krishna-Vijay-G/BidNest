interface CardProps {
  children: React.ReactNode;
  padding?: boolean;
  className?: string;
}

export function Card({ children, padding = true, className = '' }: CardProps) {
  return (
    <div className={`glass rounded-2xl border border-border ${padding ? 'p-6' : ''} ${className}`}>
      {children}
    </div>
  );
}