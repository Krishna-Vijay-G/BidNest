interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
  label?: string;
}

export function Select({ options, label, className = '', ...props }: SelectProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-foreground-secondary">{label}</label>
      )}
      <select
        className={`w-full px-4 py-2.5 glass-input text-sm rounded-xl appearance-none cursor-pointer ${className}`}
        style={{ background: 'var(--input-option-bg)' }}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}