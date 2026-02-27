// src/lib/pdf/groupReport.ts
// ─── Group Detail PDF Report ────────────────────────────────────────────────
// Generates a multi-page report with:
//   • Group overview (page 1)
//   • Auction details per month
//   • Member payment tracking per month
import type { Language } from '@/lib/i18n/translations';
import {
  createPdf,
  drawHeader,
  drawFooter,
  drawSectionTitle,
  drawInfoGrid,
  drawTable,
  drawStatBoxes,
  drawTicketCards,
  savePdf,
  fmtCurrency,
  t,
  COLORS,
  pageH,
} from './core';

// ─── Data interfaces ────────────────────────────────────────────────────────

export interface GroupReportAuction {
  monthNumber: number;
  originalBid: string;
  winningAmount: string;
  commission: string;
  carryPrevious: string;
  rawDividend: string;
  carryNext: string;
  dividendPerMember: number;
  amountToCollect: number;
  winnerName: string;
  winnerTicket: number;
}

export interface GroupReportPayment {
  memberName: string;
  ticketNumber: number;
  monthNumber: number;
  amountPaid: string;
  status: string;
}

export interface GroupReportMember {
  name: string;
  ticketNumber: number;
  mobile: string;
  isActive: boolean;
}

export interface GroupReportData {
  groupName: string;
  totalAmount: string;
  totalMembers: number;
  durationMonths: number;
  monthlyAmount: string;
  commissionType: 'PERCENT' | 'FIXED';
  commissionValue: string;
  roundOffValue: number;
  status: string;

  members: GroupReportMember[];
  auctions: GroupReportAuction[];
  payments: GroupReportPayment[];
}

// ─── Generate & download ────────────────────────────────────────────────────

export function downloadGroupReport(data: GroupReportData, lang: Language) {
  const doc = createPdf('portrait');
  const bottomMargin = 30;

  // ═══════════════ PAGE 1: Overview ═══════════════════════════════════════════

  let y = drawHeader(
    doc,
    data.groupName,
    `${t('groupDetails', lang)} - ${fmtCurrency(Number(data.totalAmount))}`,
    lang,
  );

  // ── Group Info ──
  y = drawSectionTitle(doc, t('groupDetails', lang), y + 2);
  y = drawInfoGrid(doc, [
    { label: t('groupName', lang), value: data.groupName },
    { label: t('totalAmount', lang), value: fmtCurrency(Number(data.totalAmount)) },
    { label: t('totalMembers', lang), value: String(data.totalMembers) },
    { label: t('duration', lang), value: `${data.durationMonths} ${t('months', lang)}` },
    { label: t('monthlyAmount', lang), value: fmtCurrency(Number(data.monthlyAmount)) },
    {
      label: t('commission', lang),
      value: data.commissionType === 'PERCENT'
        ? `${data.commissionValue}%`
        : fmtCurrency(Number(data.commissionValue)),
    },
    { label: t('roundOff', lang), value: String(data.roundOffValue) },
    { label: t('status', lang), value: t(data.status.toLowerCase(), lang) },
  ], y, 4);

  // ── Summary Stats ──
  const totalCollected = data.payments.reduce((s, p) => s + Number(p.amountPaid), 0);
  const totalWinnings = data.auctions.reduce((s, a) => s + Number(a.winningAmount), 0);
  const totalCommission = data.auctions.reduce((s, a) => s + Number(a.commission), 0);

  y = drawStatBoxes(doc, [
    { label: `${t('auctions', lang)} ${t('completed', lang)}`, value: `${data.auctions.length} / ${data.durationMonths}`, color: COLORS.primary },
    { label: t('totalCollected', lang), value: fmtCurrency(totalCollected), color: COLORS.success },
    { label: t('totalPayouts', lang), value: fmtCurrency(totalWinnings), color: COLORS.accent },
    { label: t('commission', lang), value: fmtCurrency(totalCommission), color: COLORS.warning },
  ], y);

  // ── Members list ──
  if (data.members.length > 0) {
    y = drawSectionTitle(doc, `${t('tickets', lang)} (${data.members.length}/${data.totalMembers})`, y);
    y = drawTicketCards(doc, data.members, y);
  }

  // ═══════════════ Auction Details ════════════════════════════════════════════

  if (data.auctions.length > 0) {
    // Check space, may need new page
    if (y > pageH(doc) - bottomMargin - 30) {
      doc.addPage();
      y = 20;
    }

    y = drawSectionTitle(doc, `${t('auctions', lang)} - ${t('overview', lang)}`, y);

    y = drawTable(
      doc,
      [[
        t('month', lang),
        t('winner', lang),
        t('bidAmount', lang),
        t('winnerPayout', lang),
        t('commission', lang),
        `${t('rawDividend', lang)} (+${t('carryFromPrev', lang)})`,
        `${t('roundedDividend', lang)} (+Bal.)`,
        t('eachMemberPays', lang),
        t('carryToNext', lang),
      ]],
      data.auctions.map((a) => {
        const rawDivPlusCarry = `${fmtCurrency(Number(a.rawDividend))} (+${fmtCurrency(Number(a.carryPrevious))})`;
        // Round-off balance per member (integer), then multiply back for the
        // carry-forward so the displayed (+X) and Carry Fwd. are consistent.
        const balancePerMember = Math.round(Number(a.carryNext) / data.totalMembers);
        const carryFwd = balancePerMember * data.totalMembers;
        const roundedDivWithBal = `${fmtCurrency(a.dividendPerMember)} (+${balancePerMember})`;

        return [
          `${t('month', lang)} ${a.monthNumber}`,
          `${a.winnerName} #${a.winnerTicket}`,
          fmtCurrency(Number(a.originalBid)),
          fmtCurrency(Number(a.winningAmount)),
          fmtCurrency(Number(a.commission)),
          rawDivPlusCarry,
          roundedDivWithBal,
          fmtCurrency(a.amountToCollect),
          fmtCurrency(carryFwd),
        ];
      }),
      y,
      {
        styles: { fontSize: 5.5, cellPadding: 1 },
        headStyles: { 
          fontSize: 5.5,
          fillColor: COLORS.primary,
          textColor: COLORS.text,
        },
      },
    );
  }

  // ═══════════════ Payment Tracking per Month ═══════════════════════════════

  if (data.payments.length > 0) {
    // Get all months that have payments
    const monthNumbers = [...new Set(data.payments.map(p => p.monthNumber))].sort((a, b) => a - b);

    for (const monthNum of monthNumbers) {
      doc.addPage();
      y = 20;

      const monthPayments = data.payments.filter(p => p.monthNumber === monthNum);
      const monthAuction = data.auctions.find(a => a.monthNumber === monthNum);

      y = drawSectionTitle(doc, `${t('month', lang)} ${monthNum}`, y);

      // Mini auction summary for this month
      if (monthAuction) {
        y = drawInfoGrid(doc, [
          { label: t('winner', lang), value: `${monthAuction.winnerName} #${monthAuction.winnerTicket}` },
          { label: t('toCollect', lang), value: fmtCurrency(monthAuction.amountToCollect) },
        ], y, 2);
      }

      // Group payments by member (ensure 1 row per person)
      const aggregatedPayments = data.members.map(m => {
        const memberMonthPayments = monthPayments.filter(p => p.ticketNumber === m.ticketNumber);
        const totalPaid = memberMonthPayments.reduce((s, p) => s + Number(p.amountPaid), 0);
        const amountDue = monthAuction ? monthAuction.amountToCollect : Number(data.monthlyAmount);
        const balance = Math.max(0, amountDue - totalPaid);
        
        let status = t('pending', lang);
        if (totalPaid >= amountDue) status = t('completed', lang);
        else if (totalPaid > 0) status = t('partial', lang);

        return {
          ticketNumber: m.ticketNumber,
          memberName: m.name,
          amountDue,
          amountPaid: totalPaid,
          balance,
          status
        };
      }).sort((a, b) => a.ticketNumber - b.ticketNumber);

      // Calculate monthly totals
      const totalDue = aggregatedPayments.reduce((s, p) => s + p.amountDue, 0);
      const totalPaid = aggregatedPayments.reduce((s, p) => s + p.amountPaid, 0);
      const totalBalance = aggregatedPayments.reduce((s, p) => s + p.balance, 0);

      // Payment table for this month
      y = drawTable(
        doc,
        [[
          t('ticket', lang) || 'Ticket',
          t('member', lang),
          t('amountDue', lang) || 'Due',
          t('paid', lang) || 'Paid',
          t('balance', lang) || 'Balance',
          t('status', lang),
        ]],
        aggregatedPayments.map((p) => [
          `#${p.ticketNumber}`,
          p.memberName,
          fmtCurrency(p.amountDue),
          fmtCurrency(p.amountPaid),
          fmtCurrency(p.balance),
          p.status,
        ]),
        y,
        {
          foot: [[
            'TOTAL',
            '',
            fmtCurrency(totalDue),
            fmtCurrency(totalPaid),
            fmtCurrency(totalBalance),
            '',
          ]],
          headStyles: {
            fillColor: COLORS.primary,
            textColor: COLORS.text,
          },
          footStyles: {
            fillColor: COLORS.white,
            textColor: COLORS.text,
            fontStyle: 'bold', 
            lineWidth: 0,
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          didParseCell: (cellData: any) => {
            const isBody = cellData.section === 'body';
            const isFoot = cellData.section === 'foot';

            if (isBody || isFoot) {
              // Amount Due -> Gray
              if (cellData.column.index === 2) {
                cellData.cell.styles.textColor = COLORS.secondary;
              }
              // Paid column -> Green
              if (cellData.column.index === 3) {
                cellData.cell.styles.textColor = COLORS.success;
              }
              // Balance column -> Red if > 0
              if (cellData.column.index === 4) {
                const val = isBody 
                  ? aggregatedPayments[cellData.row.index].balance 
                  : totalBalance;
                if (val > 0) cellData.cell.styles.textColor = COLORS.danger;
              }
            }

            if (isBody) {
              // Status column
              if (cellData.column.index === 5) {
                const statusStr = String(cellData.row.raw[5]).toLowerCase();
                if (statusStr === t('completed', lang).toLowerCase()) {
                  cellData.cell.styles.textColor = COLORS.success;
                } else if (statusStr === t('pending', lang).toLowerCase()) {
                  cellData.cell.styles.textColor = COLORS.danger;
                } else if (statusStr === t('partial', lang).toLowerCase()) {
                  cellData.cell.styles.textColor = COLORS.warning;
                }
              }
            }
          },
        },
      );
    }
  }

  // ── Footer ──
  drawFooter(doc, lang);

  savePdf(doc, `BidNest_Group_${data.groupName}_Report`);
}
