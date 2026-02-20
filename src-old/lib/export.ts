import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { formatCurrency } from './calculations';

// ─── PDF Export ────────────────────────────────────────────────

interface PDFExportOptions {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: (string | number)[][];
  fileName: string;
  orientation?: 'portrait' | 'landscape';
  summary?: { label: string; value: string }[];
}

export function exportToPDF({
  title,
  subtitle,
  headers,
  rows,
  fileName,
  orientation = 'portrait',
  summary,
}: PDFExportOptions) {
  const doc = new jsPDF({ orientation });

  // Header
  doc.setFontSize(18);
  doc.setTextColor(30, 27, 75); // indigo-950
  doc.text(title, 14, 22);

  if (subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(subtitle, 14, 30);
  }

  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, subtitle ? 36 : 30);

  const startY = subtitle ? 42 : 36;

  // Table
  autoTable(doc, {
    head: [headers],
    body: rows.map((row) => row.map(String)),
    startY,
    theme: 'striped',
    headStyles: {
      fillColor: [67, 56, 202], // indigo-600
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [55, 65, 81],
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    styles: {
      cellPadding: 3,
      lineWidth: 0.1,
    },
    margin: { top: 14, right: 14, bottom: 14, left: 14 },
  });

  // Summary section
  if (summary && summary.length > 0) {
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || startY + 20;
    doc.setFontSize(10);
    doc.setTextColor(30, 27, 75);
    doc.text('Summary', 14, finalY + 12);

    summary.forEach((item, index) => {
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text(`${item.label}:`, 14, finalY + 20 + index * 7);
      doc.setTextColor(30, 27, 75);
      doc.text(item.value, 80, finalY + 20 + index * 7);
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175);
    doc.text(
      `BidNest — Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  doc.save(`${fileName}.pdf`);
}

// ─── CSV Export ────────────────────────────────────────────────

interface CSVExportOptions {
  headers: string[];
  rows: (string | number)[][];
  fileName: string;
}

export function exportToCSV({ headers, rows, fileName }: CSVExportOptions) {
  const data = rows.map((row) => {
    const obj: Record<string, string | number> = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });

  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ─── Pre-built export helpers ──────────────────────────────────

export function exportGroupReport(group: {
  name: string;
  chit_value: number;
  total_members: number;
  duration_months: number;
  monthly_subscription: number;
  commission_percentage: number;
  members?: { app_member?: { name?: string }; total_paid?: number; total_dividend?: number }[];
}) {
  const headers = ['Member', 'Total Paid', 'Dividends Received', 'Status'];
  const rows = (group.members || []).map((m) => [
    m.app_member?.name || 'Unknown',
    formatCurrency(m.total_paid || 0),
    formatCurrency(m.total_dividend || 0),
    (m.total_paid || 0) > 0 ? 'Active' : 'Pending',
  ]);

  exportToPDF({
    title: `Group Report: ${group.name}`,
    subtitle: `Chit Value: ${formatCurrency(group.chit_value)} | Members: ${group.total_members} | Duration: ${group.duration_months} months`,
    headers,
    rows,
    fileName: `bidnest-group-${group.name.toLowerCase().replace(/\s+/g, '-')}`,
    summary: [
      { label: 'Chit Value', value: formatCurrency(group.chit_value) },
      { label: 'Monthly Subscription', value: formatCurrency(group.monthly_subscription) },
      { label: 'Commission Rate', value: `${group.commission_percentage}%` },
    ],
  });
}

export function exportPaymentsReport(
  payments: {
    member?: { app_member?: { name?: string } };
    chit_group?: { name?: string };
    month_number: number;
    amount_due: number;
    dividend_applied: number;
    net_payable: number;
    amount_paid: number;
    status: string;
    due_date: string;
  }[],
  groupName?: string
) {
  const headers = [
    'Member',
    'Group',
    'Month',
    'Due',
    'Dividend',
    'Net Payable',
    'Paid',
    'Status',
    'Due Date',
  ];

  const rows = payments.map((p) => [
    (p.member as { app_member?: { name?: string } } | undefined)?.app_member?.name || 'N/A',
    (p.chit_group as { name?: string } | undefined)?.name || 'N/A',
    p.month_number,
    formatCurrency(p.amount_due),
    formatCurrency(p.dividend_applied),
    formatCurrency(p.net_payable),
    formatCurrency(p.amount_paid),
    p.status,
    p.due_date,
  ]);

  const totalDue = payments.reduce((s, p) => s + p.net_payable, 0);
  const totalPaid = payments.reduce((s, p) => s + p.amount_paid, 0);

  exportToPDF({
    title: groupName ? `Payments: ${groupName}` : 'Payments Report',
    subtitle: `${payments.length} records | Generated on ${new Date().toLocaleDateString('en-IN')}`,
    headers,
    rows,
    fileName: `bidnest-payments-${Date.now()}`,
    orientation: 'landscape',
    summary: [
      { label: 'Total Due', value: formatCurrency(totalDue) },
      { label: 'Total Collected', value: formatCurrency(totalPaid) },
      { label: 'Collection Rate', value: totalDue ? `${((totalPaid / totalDue) * 100).toFixed(1)}%` : '0%' },
    ],
  });
}

export function exportTransactionsReport(
  transactions: {
    created_at: string;
    transaction_type: string;
    chit_group?: { name?: string };
    member?: { app_member?: { name?: string } };
    description?: string | null;
    amount: number;
  }[]
) {
  const headers = ['Date', 'Type', 'Group', 'Member', 'Description', 'Amount'];

  const rows = transactions.map((t) => [
    new Date(t.created_at).toLocaleDateString('en-IN'),
    t.transaction_type.replace(/_/g, ' '),
    (t.chit_group as { name?: string } | undefined)?.name || '—',
    (t.member as { app_member?: { name?: string } } | undefined)?.app_member?.name || '—',
    t.description || '—',
    formatCurrency(t.amount),
  ]);

  exportToPDF({
    title: 'Transactions Ledger',
    subtitle: `${transactions.length} entries`,
    headers,
    rows,
    fileName: `bidnest-transactions-${Date.now()}`,
    orientation: 'landscape',
  });
}
