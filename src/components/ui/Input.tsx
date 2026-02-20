//src/components/ui/Input.tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export function Input({ label, helperText, error, className = '', ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-foreground-secondary">
          {label}
        </label>
      )}
      <input
        className={`w-full px-4 py-2.5 glass-input text-sm rounded-xl ${
          error ? 'border-red-500/50 focus:border-red-500' : ''
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      {helperText && !error && <p className="text-xs text-foreground-muted">{helperText}</p>}
    </div>
  );
}