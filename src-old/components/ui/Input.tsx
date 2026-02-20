import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Input({ label, error, helperText, className = '', ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-foreground-secondary">
          {label}
          {props.required && <span className="text-cyan-400 ml-0.5">*</span>}
        </label>
      )}
      <input
        className={`glass-input w-full px-4 py-2.5 text-sm ${
          error ? 'border-red-500/40 focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]' : ''
        } ${className}`}
        {...props}
      />
      {helperText && !error && (
        <p className="text-xs text-foreground-muted">{helperText}</p>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function TextArea({ label, error, className = '', ...props }: TextAreaProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-foreground-secondary">
          {label}
          {props.required && <span className="text-cyan-400 ml-0.5">*</span>}
        </label>
      )}
      <textarea
        className={`glass-input w-full px-4 py-2.5 text-sm resize-none ${
          error ? 'border-red-500/40 focus:border-red-400' : ''
        } ${className}`}
        rows={3}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function Select({ label, error, options, placeholder, className = '', ...props }: SelectProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-foreground-secondary">
          {label}
          {props.required && <span className="text-cyan-400 ml-0.5">*</span>}
        </label>
      )}
      <select
        className={`glass-input w-full px-4 py-2.5 text-sm bg-[rgba(255,255,255,0.05)] ${
          error ? 'border-red-500/40 focus:border-red-400' : ''
        } ${className}`}
        {...props}
      >
        {placeholder && (
          <option value="" disabled className="bg-page-alt text-foreground-muted">
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-page-alt text-foreground-secondary">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
