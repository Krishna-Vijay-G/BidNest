// src/lib/pdf/core.ts
// â”€â”€â”€ Core PDF utilities: theming, header, footer, helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Light-mode palette matching the BidNest site design system
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { translations } from '@/lib/i18n/translations';

// â”€â”€â”€ Colour palette (light mode â€” mirrors site CSS variables) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const COLORS = {
  // Accent / brand
  primary:      [0, 184, 212] as [number, number, number],   // #00b8d4  cyan
  primaryLight: [207, 245, 252] as [number, number, number], // very light cyan tint
  accent:       [168, 85, 247] as [number, number, number],  // #a855f7  purple

  // Text hierarchy (light mode)
  text:         [15, 23, 42] as [number, number, number],    // #0f172a  slate-900
  secondary:    [71, 85, 105] as [number, number, number],   // #475569  slate-600
  muted:        [148, 163, 184] as [number, number, number], // #94a3b8  slate-400
  white:        [255, 255, 255] as [number, number, number],

  // Page / surface colours
  page:         [255, 255, 255] as [number, number, number], // white
  surface:      [248, 250, 252] as [number, number, number], // #f8fafc  slate-50
  surfaceAlt:   [241, 245, 249] as [number, number, number], // #f1f5f9  slate-100
  border:       [226, 232, 240] as [number, number, number], // #e2e8f0  slate-200

  // Header band (dark navy like sidebar)
  headerBg:     [15, 23, 42] as [number, number, number],    // #0f172a  slate-900
  dark:         [15, 23, 42] as [number, number, number],    // alias

  // Table
  tableHead:    [241, 245, 249] as [number, number, number], // #f1f5f9  slate-100
  tableHeadText:[71, 85, 105] as [number, number, number],   // #475569  slate-600
  tableAlt:     [248, 250, 252] as [number, number, number], // #f8fafc  slate-50

  // Status
  success:      [34, 197, 94] as [number, number, number],   // #22c55e
  warning:      [245, 158, 11] as [number, number, number],  // #f59e0b
  danger:       [239, 68, 68] as [number, number, number],   // #ef4444
};

// â”€â”€â”€ Translation helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function t(key: string): string {
  return (translations['en'] as Record<string, string>)[key] ?? key;
}

// â”€â”€â”€ Currency formatter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Returns "Rs. X,XX,XXX" using en-IN grouping.
// Avoids using the "₹" symbol which fails in standard PDF fonts.

export function fmtCurrency(amount: number): string {
  if (isNaN(amount)) return '-';
  
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(amount);

  // Clean any non-standard spacers (narrow no-break space, RTL marks, etc.)
  // that Intl.NumberFormat injects and that confuse jsPDF's Roboto encoding.
  const clean = formatted.replace(/[\u2000-\u200F\u202F\u00A0]/g, '');

  // Use "Rs." — the ₹ Unicode glyph is not present in jsPDF's built-in
  // Roboto font and causes every subsequent character to render garbled.
  return `Rs.${clean}`;
}

// ─── Date formatter ─────────────────────────────────────────────────────────

export function fmtDate(dateStr: string): string {
  if (!dateStr) return '-';
  const formatted = new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  return formatted.replace(/[\u2000-\u200F\u202F\u00A0]/g, ' ');
}

// â”€â”€â”€ Font Loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const fontCache: Record<string, string> = {};

async function fetchFontB64(url: string): Promise<string> {
  if (fontCache[url]) return fontCache[url];
  const resp = await fetch(url);
  const blob = await resp.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const b64 = (reader.result as string).split(',')[1];
      fontCache[url] = b64;
      resolve(b64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// â”€â”€â”€ Create document â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function createPdf(orientation: 'portrait' | 'landscape' = 'portrait'): Promise<jsPDF> {
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

  // Load Roboto fonts
  const [reg, bold, italic] = await Promise.all([
    fetchFontB64('/Roboto/static/Roboto-Regular.ttf'),
    fetchFontB64('/Roboto/static/Roboto-Bold.ttf'),
    fetchFontB64('/Roboto/static/Roboto-Italic.ttf'),
  ]);

  doc.addFileToVFS('Roboto-Regular.ttf', reg);
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');

  doc.addFileToVFS('Roboto-Bold.ttf', bold);
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');

  doc.addFileToVFS('Roboto-Italic.ttf', italic);
  doc.addFont('Roboto-Italic.ttf', 'Roboto', 'italic');

  doc.setFont('Roboto');
  return doc;
}

// â”€â”€â”€ Page dimension helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function pageW(doc: jsPDF): number { return doc.internal.pageSize.getWidth(); }
export function pageH(doc: jsPDF): number { return doc.internal.pageSize.getHeight(); }
export function contentW(doc: jsPDF, margin = 14): number { return pageW(doc) - margin * 2; }

// ─── Header ─────────────────────────────────────────────────────────────────
// Dark navy band (matching site's sidebar) with cyan accent, white text.

export function drawHeader(
  doc: jsPDF,
  title: string,
  subtitle: string,
): number {
  const w = pageW(doc);
  const hH = 26; // header band height

  // Dark background band
  doc.setFillColor(...COLORS.headerBg);
  doc.rect(0, 0, w, hH, 'F');

  // Cyan left accent bar (4 mm wide)
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, 4, hH, 'F');

  // Thin cyan rule below the band
  doc.rect(0, hH, w, 0.8, 'F');

  // Brand name (top-left, past accent bar)
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(7);
  doc.setFont('Roboto', 'bold');
  doc.text('BidNest', 10, 7);

  // Title (left-aligned, white)
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(14);
  doc.setFont('Roboto', 'bold');
  doc.text(title, 10, 18);

  // Subtitle right-aligned
  doc.setFontSize(8);
  doc.setFont('Roboto', 'normal');
  doc.setTextColor(148, 163, 184); // muted-ish on dark
  doc.text(subtitle, w - 10, 12, { align: 'right' });

  // Generation date
  const now = fmtDate(new Date().toISOString());
  doc.text(`${t('date')}: ${now}`, w - 10, 20, { align: 'right' });

  return hH + 6; // start y after header
}

// ─── Slim info band ─────────────────────────────────────────────────────────
// Renders a one-line key|value strip on a light surface background.

export function drawInfoBand(
  doc: jsPDF,
  items: { label: string; value: string }[],
  y: number,
): number {
  const w = pageW(doc);
  const bandH = 14;

  doc.setFillColor(...COLORS.surfaceAlt);
  doc.rect(0, y, w, bandH, 'F');

  // Thin border lines
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.2);
  doc.line(0, y, w, y);
  doc.line(0, y + bandH, w, y + bandH);

  const margin = 10;
  const slotW = (w - margin * 2) / items.length;

  items.forEach((item, i) => {
    const x = margin + i * slotW;

    // Divider between items
    if (i > 0) {
      doc.setDrawColor(...COLORS.border);
      doc.line(x - 2, y + 3, x - 2, y + bandH - 3);
    }

    doc.setFontSize(6.5);
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(...COLORS.muted);
    doc.text(item.label, x, y + 5.5);

    doc.setFontSize(8.5);
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text(item.value, x, y + 11.5);
  });

  return y + bandH + 4;
}

// ─── Footer ─────────────────────────────────────────────────────────────────

export function drawFooter(doc: jsPDF): void {
  const pages = doc.getNumberOfPages();
  const w = pageW(doc);
  const h = pageH(doc);

  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);

    // Thin cyan rule above footer
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, h - 14, w, 0.5, 'F');

    doc.setFontSize(7);
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(...COLORS.muted);
    doc.text('BidNest - Chit Fund Management', 14, h - 9);
    doc.text(
      `Page ${i} / ${pages}`,
      w - 14,
      h - 9,
      { align: 'right' },
    );
  }
}

// â”€â”€â”€ Section title â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function drawSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFontSize(10);
  doc.setFont('Roboto', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text(title, 14, y);

  // Short cyan underline
  doc.setFillColor(...COLORS.primary);
  doc.rect(14, y + 1.5, doc.getTextWidth(title), 0.8, 'F');

  return y + 8;
}

// ─── Key-value info grid ────────────────────────────────────────────────────

export function drawInfoGrid(
  doc: jsPDF,
  items: { label: string; value: string }[],
  startY: number,
  cols = 3,
): number {
  const margin = 14;
  const colW = contentW(doc) / cols;
  let y = startY;

  items.forEach((item, i) => {
    const col = i % cols;
    const x = margin + col * colW;
    if (col === 0 && i > 0) y += 13;

    doc.setFontSize(7);
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(...COLORS.muted);
    doc.text(item.label, x, y);

    doc.setFontSize(9.5);
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text(item.value, x, y + 5.5);
  });

  return y + 14;
}

// â”€â”€â”€ Styled autoTable wrapper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function drawTable(
  doc: jsPDF,
  head: string[][],
  body: (string | number)[][],
  startY: number,
  options?: Partial<Parameters<typeof autoTable>[1]>,
): number {
  autoTable(doc, {
    startY,
    head,
    body,
    margin: { left: 14, right: 14 },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: COLORS.text,
      lineColor: COLORS.border,
      lineWidth: 0.2,
      font: 'Roboto',
    },
    headStyles: {
      fillColor: COLORS.tableHead,
      textColor: COLORS.tableHeadText,
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: 3.5,
    },
    alternateRowStyles: {
      fillColor: COLORS.tableAlt,
    },
    ...options,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (doc as any).lastAutoTable.finalY + 6;
}

// ─── Stat boxes ─────────────────────────────────────────────────────────────

export function drawStatBoxes(
  doc: jsPDF,
  stats: { label: string; value: string; color?: [number, number, number] }[],
  y: number,
): number {
  const margin = 14;
  const gap = 3;
  const boxW = (contentW(doc) - gap * (stats.length - 1)) / stats.length;
  const boxH = 19;

  stats.forEach((stat, i) => {
    const x = margin + i * (boxW + gap);

    // White card with light border
    doc.setFillColor(...COLORS.page);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, boxW, boxH, 2, 2, 'FD');

    // Cyan top accent bar
    doc.setFillColor(...COLORS.primary);
    doc.rect(x, y, boxW, 1.2, 'F');

    // Label
    doc.setFontSize(6.5);
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(...COLORS.muted);
    doc.text(stat.label, x + 4, y + 7);

    // Value
    doc.setFontSize(10.5);
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(...(stat.color ?? COLORS.text));
    doc.text(stat.value, x + 4, y + 14.5);
  });

  return y + boxH + 5;
}

// â”€â”€â”€ Calculation ledger â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Renders a step-by-step calculation block. Each row has a label and a value;
// result rows are underlined; separator rows draw a rule.
// 
// Row types:
//   normal   â€“ plain label + value
//   add      â€“ prefixes value with "+"
//   sub      â€“ prefixes value with "âˆ’"
//   div      â€“ prefixes value with "Ã·"
//   result   â€“ draw line above, bold value
//   note     â€“ small italic note spanning full width
//   spacer   â€“ empty gap row

export type LedgerRowType = 'normal' | 'add' | 'sub' | 'div' | 'result' | 'eq' | 'note' | 'spacer';

export interface LedgerRow {
  label: string;
  value?: string;
  type?: LedgerRowType;
  color?: [number, number, number];
}

export function drawCalcLedger(
  doc: jsPDF,
  sectionTitle: string,
  rows: LedgerRow[],
  y: number,
): number {
  const margin = 14;
  const cw = contentW(doc);
  const marginX    = margin;       // labels start here
  const valueX     = margin + cw;  // right edge for entries
  const ROW_H  = 7;
  const SPACER_H = 3;

  // â”€â”€ Section title â”€â”€
  y = drawSectionTitle(doc, sectionTitle, y);

  rows.forEach((row) => {
    if (row.type === 'spacer') { y += SPACER_H; return; }

    if (row.type === 'note') {
      doc.setFontSize(7);
      doc.setFont('Roboto', 'italic');
      doc.setTextColor(...COLORS.muted);
      doc.text(row.label, marginX, y);
      y += ROW_H;
      return;
    }

    const isResult = row.type === 'result' || row.type === 'eq';

    if (isResult) {
      // Draw separator line FIRST, then add gap, THEN draw text
      doc.setDrawColor(...COLORS.border);
      doc.setLineWidth(0.3);
      doc.line(margin, y, valueX, y); // line at current y (after previous row)
      y += 5; // gap between line and result text
    }

    // Prefix symbol — now moved to the right side value
    let symbol = '';
    if (row.type === 'add') symbol = '+';
    else if (row.type === 'sub') symbol = '-';
    else if (row.type === 'div') symbol = '÷';
    else if (isResult) symbol = '=';

    const symbolColor: [number, number, number] =
      row.type === 'add' ? COLORS.success :
      row.type === 'sub' ? COLORS.danger :
      row.type === 'div' ? COLORS.accent :
      isResult ? COLORS.secondary :
      COLORS.muted;

    // Value â€” right-aligned, formatted with symbol
    if (row.value !== undefined) {
      const displayValue = symbol ? `${symbol} ${row.value}` : row.value;
      const valColor = row.color ?? (symbolColor !== COLORS.muted ? symbolColor : (isResult ? COLORS.text : COLORS.secondary));

      doc.setFontSize(isResult ? 8.5 : 8);
      doc.setFont('Roboto', isResult ? 'bold' : 'normal');
      doc.setTextColor(...valColor);
      doc.text(displayValue, valueX - 4, y, { align: 'right' });
    }

    // Label text â€” starts from marginX
    doc.setFontSize(isResult ? 8.5 : 8);
    doc.setFont('Roboto', isResult ? 'bold' : 'normal');
    doc.setTextColor(...(row.color ?? (isResult ? COLORS.text : COLORS.secondary)));
    doc.text(row.label, marginX, y);

    y += ROW_H;
  });

  // Section-end rule â€” drawn below the last row with a clear gap
  y += 3;
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(margin, y, valueX, y);

  return y + 8;
}

// â”€â”€â”€ Winner highlight banner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Draws a prominent banner showing winner name and payout.

export function drawWinnerBanner(
  doc: jsPDF,
  winnerLabel: string,
  winnerName: string,
  ticketStr: string,
  payoutLabel: string,
  payoutValue: string,
  y: number,
): number {
  const margin = 14;
  const cw = contentW(doc);
  const bannerH = 20;
  const w = pageW(doc);

  // Light cyan fill
  doc.setFillColor(...COLORS.primaryLight);
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, cw, bannerH, 3, 3, 'FD');

  // Left accent bar
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(margin, y, 3, bannerH, 1.5, 1.5, 'F');

  // Winner label + name
  doc.setFontSize(7);
  doc.setFont('Roboto', 'normal');
  doc.setTextColor(...COLORS.secondary);
  doc.text(winnerLabel, margin + 8, y + 7);

  // Measure name width BEFORE changing font size
  doc.setFontSize(12);
  doc.setFont('Roboto', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text(winnerName, margin + 8, y + 15);
  const nameWidth = doc.getTextWidth(winnerName); // measured at 12pt bold

  // Ticket badge — drawn after name with correct offset
  doc.setFontSize(9);
  doc.setFont('Roboto', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text(ticketStr, margin + 8 + nameWidth + 3, y + 15);

  // Payout right-aligned
  doc.setFontSize(7);
  doc.setFont('Roboto', 'normal');
  doc.setTextColor(...COLORS.secondary);
  doc.text(payoutLabel, w - margin - 4, y + 7, { align: 'right' });

  doc.setFontSize(14);
  doc.setFont('Roboto', 'bold');
  doc.setTextColor(...COLORS.success);
  doc.text(payoutValue, w - margin - 4, y + 16, { align: 'right' });

  return y + bannerH + 6;
}

// ─── Ticket cards ───────────────────────────────────────────────────────────
// Renders members as compact cards instead of a table to save space.
// Green for active, Red for inactive.

export function drawTicketCards(
  doc: jsPDF,
  members: { name: string; ticketNumber: number; mobile: string; isActive: boolean }[],
  y: number,
): number {
  const margin = 14;
  const cw = contentW(doc);
  const cols = 5;
  const colGap = 2;
  const rowGap = 2;
  const cardW = (cw - colGap * (cols - 1)) / cols;
  const cardH = 12;

  members.forEach((m, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = margin + col * (cardW + colGap);
    const currY = y + row * (cardH + rowGap);

    // Card background (very light status color)
    const statusColor = m.isActive ? COLORS.success : COLORS.danger;
    doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.setDrawColor(statusColor[0], statusColor[1], statusColor[2]);
    
    // Fill with low opacity manually by using a lightened color
    // or just a border and a status bar. Let's do colored border + status bar.
    doc.setLineWidth(0.1);
    doc.roundedRect(x, currY, cardW, cardH, 1, 1, 'S');
    doc.rect(x, currY, 1.2, cardH, 'F');

    // Text details
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...COLORS.text);
    // Truncate name if too long for card
    const ticketPrefix = `#${m.ticketNumber} `;
    const displayName = ticketPrefix + m.name;
    doc.text(displayName, x + 3, currY + 4.5, { maxWidth: cardW - 4 });

    doc.setFont('Roboto', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(...COLORS.secondary);
    doc.text(m.mobile || '-', x + 3, currY + 9);
  });

  const numRows = Math.ceil(members.length / cols);
  return y + (numRows * (cardH + rowGap)) + 4;
}

// ─── Save / download ─────────────────────────────────────────────────────────

export function savePdf(doc: jsPDF, filename: string): void {
  doc.save(`${filename}.pdf`);
}
