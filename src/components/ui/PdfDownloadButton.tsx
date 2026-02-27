// src/components/ui/PdfDownloadButton.tsx
// ─── Reusable PDF download button ───────────────────────────────────────────
'use client';

import { HiOutlineArrowDownTray } from 'react-icons/hi2';
import { useLang } from '@/lib/i18n/LanguageContext';

interface PdfDownloadButtonProps {
  /** Called when the user clicks the button */
  onClick: () => void;
  /** Button label — defaults to the translated "Download PDF" */
  label?: string;
  /** Compact icon-only mode for table rows */
  iconOnly?: boolean;
  /** Extra class names */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

export function PdfDownloadButton({
  onClick,
  label,
  iconOnly = false,
  className = '',
  disabled = false,
}: PdfDownloadButtonProps) {
  const { t } = useLang();

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={
        iconOnly
          ? `p-1.5 rounded-lg text-foreground-muted hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors disabled:opacity-40 ${className}`
          : `inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-xl bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20 transition-colors disabled:opacity-40 ${className}`
      }
      title={label ?? t('downloadPdf')}
    >
      <HiOutlineArrowDownTray className="w-4 h-4" />
      {!iconOnly && <span>{label ?? t('downloadPdf')}</span>}
    </button>
  );
}
