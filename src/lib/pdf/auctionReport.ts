// src/lib/pdf/auctionReport.ts
// ─── Auction Detail PDF Report ──────────────────────────────────────────────
//
// Layout:
//   1. Header (dark band, cyan accent, title + group name + date)
//   2. Group info band (slim strip: total amount · members · duration · commission · date)
//   3. Winner banner (highlighted with payout amount)
//   4. Section A — Winner Payout  (Total Amount − Bid = Winner Payout)
//   5. Section B — Dividend Pool  (Bid − Commission + Carry = Pool ÷ Members = Per-member ± Carry to next)
//   6. Section C — Monthly Collection  (Monthly − Dividend = Amount to Pay)
//   7. Footer
//
import { jsPDF } from 'jspdf';
import {
  createPdf,
  drawHeader,
  drawFooter,
  drawInfoBand,
  drawWinnerBanner,
  drawCalcLedger,
  savePdf,
  fmtCurrency,
  fmtDate,
  t,
  COLORS,
} from './core';

// ─── Data interface (mirrors the page types) ─────────────────────────────────

export interface AuctionReportData {
  groupName: string;
  groupTotalAmount: string;
  groupMonthly: string;
  groupMembers: number;
  groupDuration: number;
  commissionType: 'PERCENT' | 'FIXED';
  commissionValue: string;

  monthNumber: number;
  originalBid: string;          // the "sacrifice" = total - winningAmount
  winningAmount: string;        // what the winner takes home
  commission: string;
  carryPrevious: string;
  rawDividend: string;          // originalBid - commission + carryPrevious
  roundoffDividend: string;     // per_member_dividend × members
  carryNext: string;
  amountToCollect: number;      // what each member pays = monthly - dividendPerMember
  dividendPerMember: number;    // rounded per-member dividend
  monthlyContribution: number;  // totalAmount / members

  winnerName: string;
  winnerTicket: number;
  createdAt: string;
}

// ─── Generate & download ─────────────────────────────────────────────────────

export async function downloadAuctionReport(data: AuctionReportData) {
  const doc = await createPdf('portrait');

  // ── 1. Header ──
  let y = drawHeader(
    doc,
    `${t('auctions')} . ${t('month')} ${data.monthNumber}`,
    data.groupName,
  );

  // ── 2. Group info band ──
  const commissionStr =
    data.commissionType === 'PERCENT'
      ? `${data.commissionValue}%`
      : fmtCurrency(Number(data.commissionValue));

  y = drawInfoBand(doc, [
    { label: t('totalAmount'),  value: fmtCurrency(Number(data.groupTotalAmount)) },
    { label: t('totalMembers'), value: `${data.groupMembers}` },
    { label: t('duration'),     value: `${data.groupDuration} ${t('months')}` },
    { label: t('commission'),   value: commissionStr },
    { label: t('date'),         value: fmtDate(data.createdAt) },
  ], y);

  const bottomMargin = 20;
  const pageHeight = 287; // A4 height approx

  // ── 3. Winner banner ──
  y = drawWinnerBanner(
    doc,
    t('winner'),
    data.winnerName,
    `#${data.winnerTicket}`,
    t('winnerPayout'),
    fmtCurrency(Number(data.winningAmount)),
    y + 2,
  );

  y += 4;

  // Helper to add page if section will overflow
  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - bottomMargin) {
      doc.addPage();
      y = 20;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // ── 4. Section A: Winner Payout ─────────────────────────────────────────
  ensureSpace(40);
  const bidSacrifice = Number(data.originalBid); 

  y = drawCalcLedger(doc, `${t('month')} ${data.monthNumber} - ${t('winnerPayout')}`, [
    { label: `${t('totalAmount')} (Chit Amount)`, value: fmtCurrency(Number(data.groupTotalAmount)), type: 'normal' },
    { label: `${t('originalBid')}`, value: fmtCurrency(bidSacrifice), type: 'sub', color: COLORS.danger },
    { label: t('winnerPayout'), value: fmtCurrency(Number(data.winningAmount)), type: 'result', color: COLORS.success },
  ], y);

  // ─────────────────────────────────────────────────────────────────────────
  // ── 5. Section B: Dividend Pool ─────────────────────────────────────────
  ensureSpace(80);
  const bidMinusComm = bidSacrifice - Number(data.commission);
  const rawPerMember = Number(data.rawDividend) / data.groupMembers;

  const commRateNote = data.commissionType === 'PERCENT'
    ? `${data.commissionValue}% of Total Amount`
    : `fixed`;

  y = drawCalcLedger(doc, t('dividend'), [
    { label: `${t('originalBid')} (Bid Amount)`, value: fmtCurrency(bidSacrifice), type: 'normal' },
    { label: `${t('commission')} (${commRateNote})`, value: fmtCurrency(Number(data.commission)), type: 'sub', color: COLORS.danger },
    { label: 'Result', value: fmtCurrency(bidMinusComm), type: 'result' },
    { label: '', type: 'spacer' },
    { label: `Carry from Previous Month`, value: fmtCurrency(Number(data.carryPrevious)), type: 'add', color: COLORS.primary },
    { label: `Dividend Pool Total`, value: fmtCurrency(Number(data.rawDividend)), type: 'result' },
    { label: '', type: 'spacer' },
    { label: `Total Members (${data.groupMembers})`, value: String(data.groupMembers), type: 'div', color: COLORS.accent },
    { label: `Raw per Member`, value: fmtCurrency(rawPerMember), type: 'result' },
    { label: `Rounded Dividend (Per Member)`, value: fmtCurrency(data.dividendPerMember), type: 'eq', color: COLORS.primary },
    { label: '', type: 'spacer' },
    { label: `Carry to Next Month (${data.groupMembers} members x Rs. ${Math.round(Number(data.carryNext) / data.groupMembers)})`, value: fmtCurrency(Number(data.carryNext)), type: 'normal', color: COLORS.warning },
  ], y);

  // ─────────────────────────────────────────────────────────────────────────
  // ── 6. Section C: Monthly Collection Summary ───────────────────────────
  ensureSpace(1);
  y = drawCalcLedger(doc, t('monthlyCollectionSummary'), [
    { label: `${t('monthlyAmount')} (Chit Total / ${data.groupMembers})`, value: fmtCurrency(data.monthlyContribution), type: 'normal' },
    { label: `Dividend Discount (Subtract Per-Member Dividend)`, value: fmtCurrency(data.dividendPerMember), type: 'sub', color: COLORS.success },
    { label: `EACH MEMBER HAS TO PAY`, value: fmtCurrency(data.amountToCollect), type: 'result', color: COLORS.primary },
  ], y);

  // ── 7. Footer ──
  drawFooter(doc);

  await savePdf(doc, `BidNest_Auction_${data.groupName.replace(/\s+/g, '_')}_Month${data.monthNumber}`);
}


