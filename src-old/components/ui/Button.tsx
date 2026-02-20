import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-300 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer';

  const variants = {
    primary:
      'bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:shadow-[0_0_25px_rgba(0,240,255,0.35)] hover:-translate-y-0.5',
    secondary:
      'bg-surface-hover text-foreground-secondary border border-border hover:bg-surface-hover hover:border-cyan-500/20 backdrop-blur-sm',
    danger:
      'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.25)]',
    ghost:
      'text-foreground-muted hover:text-cyan-400 hover:bg-surface-hover',
    outline:
      'border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:shadow-[0_0_15px_rgba(0,240,255,0.15)]',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-6 py-3 gap-2',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
