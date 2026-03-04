// src/utils/format.ts
// Shared formatting utilities used across the app

/**
 * Format a number as INR currency (₹1,00,000)
 */
export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a part/total as a percentage string
 */
export function pct(part: number, total: number) {
  if (!total) return '0%';
  return `${Math.round((part / total) * 100)}%`;
}
