'use client';
// src/components/ui/PdfSaveDialog.tsx
// Rendered via ReactDOM.createRoot so React Icons work correctly.

import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { jsPDF } from 'jspdf';
import {
  HiOutlineArrowDownTray,
  HiOutlineArrowUpOnSquare,
  HiOutlineXMark,
  HiOutlineCheckCircle,
} from 'react-icons/hi2';

interface PdfSaveDialogProps {
  filename: string;
  hasShareApi: boolean;
  onDownload: () => void;
  onShare: () => void;
  onClose: () => void;
}

function PdfSaveDialog({
  filename,
  hasShareApi,
  onDownload,
  onShare,
  onClose,
}: PdfSaveDialogProps) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-99999 flex items-center justify-center p-5"
      style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-sm glass-strong rounded-2xl border border-border p-6 shadow-2xl"
        style={{ animation: 'pdf-dlg-in 0.22s cubic-bezier(0.16,1,0.3,1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes pdf-dlg-in {
            from { opacity: 0; transform: scale(0.94) translateY(12px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-hover transition-all"
          title="Close"
        >
          <HiOutlineXMark className="w-5 h-5" />
        </button>

        {/* Icon + title */}
        <div className="flex flex-col items-center text-center mb-5">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}
          >
            <HiOutlineCheckCircle className="w-7 h-7 text-green-400" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Report Ready</h2>
          <p
            className="text-xs text-foreground-muted mt-1 max-w-60 overflow-hidden text-ellipsis whitespace-nowrap"
            title={filename}
          >
            {filename}
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-border mb-4" />

        {/* Share button */}
        <button
          onClick={onShare}
          className="btn-neon w-full flex items-center justify-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold mb-3 transition-all hover:-translate-y-0.5"
          title={hasShareApi ? 'Share this PDF' : 'Share requires HTTPS'}
        >
          <HiOutlineArrowUpOnSquare className="w-5 h-5" />
          Share PDF
        </button>

        {/* Download button */}
        <button
          onClick={onDownload}
          className="w-full flex items-center justify-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold text-foreground bg-surface-hover border border-border hover:border-primary/40 hover:bg-surface transition-all hover:-translate-y-0.5"
        >
          <HiOutlineArrowDownTray className="w-5 h-5" />
          Download PDF
        </button>
      </div>
    </div>
  );
}

/**
 * Renders the PdfSaveDialog as a React portal and returns a Promise that
 * resolves when the user dismisses the dialog (close / download / share).
 */
export function showPdfSaveDialog(doc: jsPDF, filename: string): Promise<void> {
  const fullName = `${filename}.pdf`;
  const hasShareApi = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return new Promise<void>((resolve) => {
    const blob = doc.output('blob');
    const file = new File([blob], fullName, { type: 'application/pdf' });

    const container = document.createElement('div');
    document.body.appendChild(container);

    const root = createRoot(container);

    const cleanup = () => {
      root.unmount();
      if (document.body.contains(container)) document.body.removeChild(container);
      resolve();
    };

    const handleDownload = () => {
      doc.save(fullName);
      cleanup();
    };

    const handleShare = async () => {
      if (!hasShareApi) {
        alert('Sharing is not supported on this device / connection. Use Download instead.');
        return;
      }
      try {
        const canShareFile = navigator.canShare?.({ files: [file] }) ?? false;
        if (canShareFile) {
          await navigator.share({ files: [file], title: filename });
        } else {
          await navigator.share({ title: filename, text: `BidNest Report: ${fullName}` });
        }
        cleanup();
      } catch {
        // user cancelled — stay open so they can choose Download
      }
    };

    root.render(
      <PdfSaveDialog
        filename={fullName}
        hasShareApi={hasShareApi}
        onDownload={handleDownload}
        onShare={handleShare}
        onClose={cleanup}
      />
    );
  });
}
