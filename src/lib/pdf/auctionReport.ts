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
import type { Language } from '@/lib/i18n/translations';
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

export function downloadAuctionReport(data: AuctionReportData, lang: Language) {
  const doc = createPdf('portrait');

  // ── 1. Header ──
  let y = drawHeader(
    doc,
    `${t('auctions', lang)} . ${t('month', lang)} ${data.monthNumber}`,
    data.groupName,
    lang,
  );

  // ── 2. Group info band ──
  const commissionStr =
    data.commissionType === 'PERCENT'
      ? `${data.commissionValue}%`
      : fmtCurrency(Number(data.commissionValue));

  y = drawInfoBand(doc, [
    { label: t('totalAmount', lang),  value: fmtCurrency(Number(data.groupTotalAmount)) },
    { label: t('totalMembers', lang), value: `${data.groupMembers}` },
    { label: t('duration', lang),     value: `${data.groupDuration} ${t('months', lang)}` },
    { label: t('commission', lang),   value: commissionStr },
    { label: t('date', lang),         value: fmtDate(data.createdAt) },
  ], y);

  // ── 3. Winner banner ──
  y = drawWinnerBanner(
    doc,
    t('winner', lang),
    data.winnerName,
    `#${data.winnerTicket}`,
    t('winnerPayout', lang),
    fmtCurrency(Number(data.winningAmount)),
    y + 2,
  );

  y += 4;

  // ─────────────────────────────────────────────────────────────────────────
  // ── 4. Section A: Winner Payout ─────────────────────────────────────────
  //
  //   Total Amount (Chit Pool)    =  ₹X,XX,XXX
  //   Bid (Winner's sacrifice)    −    ₹X,XXX
  //   ─────────────────────────────────────────
  //   Winner Payout               =  ₹X,XX,XXX
  //
  const bidSacrifice = Number(data.originalBid);   // total - winningAmount

  y = drawCalcLedger(doc, `${t('month', lang)} ${data.monthNumber} - ${t('winnerPayout', lang)}`, [
    { label: `${t('totalAmount', lang)}  (${t('chitPool', lang) || 'Chit Pool'})`, value: fmtCurrency(Number(data.groupTotalAmount)), type: 'normal' },
    { label: `${t('originalBid', lang)}  (${t('bidDiscount', lang) || "Winner's Sacrifice"})`, value: fmtCurrency(bidSacrifice), type: 'sub', color: COLORS.danger },
    { label: t('winnerPayout', lang), value: fmtCurrency(Number(data.winningAmount)), type: 'result', color: COLORS.success },
  ], y);

  // ─────────────────────────────────────────────────────────────────────────
  // ── 5. Section B: Dividend Pool ─────────────────────────────────────────
  //
  //   Bid Amount                  =    ₹X,XXX
  //   Commission (rate)           −       ₹XXX
  //   ─────────────────────────────────────────
  //   Result                      =    ₹X,XXX
  //   Carry from Previous Month   +       ₹XXX
  //   ─────────────────────────────────────────
  //   Dividend Pool               =    ₹X,XXX
  //   ÷ Total Members (N)         ÷           N
  //   ─────────────────────────────────────────
  //   Raw per-member (before rounding)   ₹XXX.XX
  //   → Rounded to nearest ₹RR           ₹XXX
  //   Carry to Next Month (N × diff)  =  ₹XXX
  //
  const bidMinusComm = bidSacrifice - Number(data.commission);
  const rawPerMember = Number(data.rawDividend) / data.groupMembers;

  const commRateNote = data.commissionType === 'PERCENT'
    ? `${data.commissionValue}% ${t('of', lang) || 'of'} ${t('winnerPayout', lang)}`
    : `${t('fixed', lang) || 'fixed'}`;

  y = drawCalcLedger(doc, t('dividend', lang), [
    { label: `${t('originalBid', lang)}  (${t('bidAmount', lang) || 'Bid Amount'})`, value: fmtCurrency(bidSacrifice), type: 'normal' },
    { label: `${t('commission', lang)}  (${commRateNote})`, value: fmtCurrency(Number(data.commission)), type: 'sub', color: COLORS.danger },
    { label: t('result', lang) || 'Result', value: fmtCurrency(bidMinusComm), type: 'result' },
    { label: '', type: 'spacer' },
    { label: `${t('carryFromPrev', lang)}`, value: fmtCurrency(Number(data.carryPrevious)), type: 'add', color: COLORS.primary },
    { label: `${t('dividend', lang)}  (${t('totalPool', lang) || 'Dividend Pool'})`, value: fmtCurrency(Number(data.rawDividend)), type: 'result' },
    { label: '', type: 'spacer' },
    { label: `÷ ${t('totalMembers', lang)}`, value: `÷ ${data.groupMembers}`, type: 'div', color: COLORS.accent },
    { label: `${t('rawPerMember', lang) || 'Raw per Member'}`, value: fmtCurrency(rawPerMember), type: 'result' },
    { label: `→ ${t('roundoffDividend', lang)}  (${t('perMember', lang)})`, value: fmtCurrency(data.dividendPerMember), type: 'eq', color: COLORS.primary },
    { label: '', type: 'spacer' },
    { label: `${t('carryNext', lang)}  (${data.groupMembers} × ${t('roundoffBalance', lang) || 'rounding'})`, value: fmtCurrency(Number(data.carryNext)), type: 'normal', color: COLORS.warning },
  ], y);

  // ─────────────────────────────────────────────────────────────────────────
  // ── 6. Section C: Monthly Collection ────────────────────────────────────
  //
  //   Monthly Contribution (Total ÷ Members)   ₹X,XXX
  //   Dividend per Member                    −    ₹XXX
  //   ─────────────────────────────────────────────────
  //   Amount to Pay                          =  ₹X,XXX
  //
  y = drawCalcLedger(doc, t('eachMemberPays', lang), [
    { label: `${t('monthlyAmount', lang)}  (${t('totalAmount', lang)} ÷ ${data.groupMembers})`, value: fmtCurrency(data.monthlyContribution), type: 'normal' },
    { label: `${t('perMember', lang)}  (${t('dividend', lang)})`, value: fmtCurrency(data.dividendPerMember), type: 'sub', color: COLORS.success },
    { label: t('eachMemberPays', lang), value: fmtCurrency(data.amountToCollect), type: 'result', color: COLORS.primary },
  ], y);

  // ── 7. Footer ──
  drawFooter(doc, lang);

  savePdf(doc, `BidNest_Auction_${data.groupName.replace(/\s+/g, '_')}_Month${data.monthNumber}`);
}


