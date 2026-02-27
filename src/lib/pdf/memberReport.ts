// src/lib/pdf/memberReport.ts
// ─── Member Payment Detail PDF Report ───────────────────────────────────────
import type { Language } from '@/lib/i18n/translations';
import {
  createPdf,
  drawHeader,
  drawFooter,
  drawSectionTitle,
  drawInfoGrid,
  drawTable,
  drawStatBoxes,
  savePdf,
  fmtCurrency,
  t,
  COLORS,
  pageH,
} from './core';

// ─── Data interfaces ────────────────────────────────────────────────────────

export interface MemberGroupData {
  groupName: string;
  groupTotal: number;
  groupMembers: number;
  groupDuration: number;
  ticketNumber: number;
  groupStatus: string;
  wonMonth: number | null;
  wonAmount: number;
  totalOwed: number;
  totalPaid: number;
  totalBalance: number;
  months: {
    month: number;
    amountDue: number;
    amountPaid: number;
    balance: number;
    wonThisMonth: boolean;
    status: string;
  }[];
}

export interface MemberReportData {
  memberName: string;
  memberNickname: string;
  memberMobile: string;
  memberIsActive: boolean;
  createdAt: string;
  groups: MemberGroupData[];
}

// ─── Generate for a specific group ──────────────────────────────────────────

function renderGroupSection(
  doc: ReturnType<typeof createPdf>,
  group: MemberGroupData,
  memberName: string,
  lang: Language,
  startY: number,
): number {
  let y = startY;
  const bottomMargin = 30;

  // Check if we need a new page
  if (y > pageH(doc) - 80) {
    doc.addPage();
    y = 20;
  }

  // ── Group title ──
  y = drawSectionTitle(doc, `${group.groupName} - ${t('ticketShort', lang)}${group.ticketNumber}`, y);

  // ── Group info ──
  y = drawInfoGrid(doc, [
    { label: t('totalAmount', lang), value: fmtCurrency(group.groupTotal) },
    { label: t('totalMembers', lang), value: String(group.groupMembers) },
    { label: t('duration', lang), value: `${group.groupDuration} ${t('months', lang)}` },
    { label: t('status', lang), value: t(group.groupStatus.toLowerCase(), lang) },
    { label: t('wonMonths', lang), value: group.wonMonth ? `${t('month', lang)} ${group.wonMonth}` : '-' },
    { label: t('totalWon', lang), value: group.wonAmount ? fmtCurrency(group.wonAmount) : '-' },
  ], y, 3);

  // ── Stat boxes ──
  y = drawStatBoxes(doc, [
    { label: t('totalOwed', lang), value: fmtCurrency(group.totalOwed), color: COLORS.text },
    { label: t('totalPaid', lang), value: fmtCurrency(group.totalPaid), color: COLORS.success },
    {
      label: group.totalBalance > 0 ? t('balanceDue', lang) : t('settled', lang),
      value: fmtCurrency(Math.abs(group.totalBalance)),
      color: group.totalBalance > 0 ? COLORS.danger : COLORS.success,
    },
  ], y);

  // ── Month-by-month table ──
  if (group.months.length > 0) {
    // Check available space
    if (y > pageH(doc) - bottomMargin - 20) {
      doc.addPage();
      y = 20;
    }

    const head = [[
      t('month', lang),
      t('amountDue', lang),
      t('amountPaid', lang),
      t('balance', lang),
      t('status', lang),
    ]];

    const body = group.months.map((m) => [
      `${t('month', lang)} ${m.month}${m.wonThisMonth ? ` (${t('won', lang) || 'Won'})` : ''}`,
      fmtCurrency(m.amountDue),
      fmtCurrency(m.amountPaid),
      fmtCurrency(m.balance),
      t(m.status.toLowerCase(), lang),
    ]);

    y = drawTable(doc, head, body, y, {
      columnStyles: {
        0: { cellWidth: 35 },
        3: {
          fontStyle: 'bold',
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      didParseCell: (hookData: any) => {
        if (hookData.section === 'body' && hookData.column.index === 3) {
          const m = group.months[hookData.row.index];
          if (m) {
            hookData.cell.styles.textColor = m.balance > 0 ? COLORS.danger : COLORS.success;
          }
        }
      },
    });
  }

  return y + 2;
}

// ─── Download single group report ───────────────────────────────────────────

export function downloadMemberGroupReport(
  data: MemberReportData,
  groupIndex: number,
  lang: Language,
) {
  const doc = createPdf('portrait');
  const group = data.groups[groupIndex];
  if (!group) return;

  let y = drawHeader(
    doc,
    `${data.memberName} - ${group.groupName}`,
    `${t('ticketShort', lang)}${group.ticketNumber} - ${t('member', lang)} ${t('payment', lang)}`,
    lang,
  );

  // Member info
  y = drawSectionTitle(doc, t('memberInfo', lang), y + 2);
  y = drawInfoGrid(doc, [
    { label: t('memberName', lang), value: data.memberName },
    { label: t('nickname', lang), value: data.memberNickname || '-' },
    { label: t('mobile', lang), value: data.memberMobile || '-' },
  ], y, 3);

  y = renderGroupSection(doc, group, data.memberName, lang, y);

  drawFooter(doc, lang);
  savePdf(doc, `BidNest_Member_${data.memberName}_${group.groupName}`);
}

// ─── Download all groups combined ───────────────────────────────────────────

export function downloadMemberAllGroupsReport(
  data: MemberReportData,
  lang: Language,
) {
  const doc = createPdf('portrait');

  let y = drawHeader(
    doc,
    data.memberName,
    `${t('allGroupsCombined', lang)} - ${data.groups.length} ${t('groups', lang)}`,
    lang,
  );

  // Member info
  y = drawSectionTitle(doc, t('memberInfo', lang), y + 2);
  y = drawInfoGrid(doc, [
    { label: t('memberName', lang), value: data.memberName },
    { label: t('nickname', lang), value: data.memberNickname || '-' },
    { label: t('mobile', lang), value: data.memberMobile || '-' },
    { label: t('status', lang), value: data.memberIsActive ? t('active', lang) : t('inactive', lang) },
  ], y, 4);

  // Grand summary
  const grandOwed = data.groups.reduce((s, g) => s + g.totalOwed, 0);
  const grandPaid = data.groups.reduce((s, g) => s + g.totalPaid, 0);
  const grandBalance = grandOwed - grandPaid;
  const totalWon = data.groups.reduce((s, g) => s + g.wonAmount, 0);

  y = drawStatBoxes(doc, [
    { label: t('totalTickets', lang), value: String(data.groups.length), color: COLORS.primary },
    { label: t('totalOwed', lang), value: fmtCurrency(grandOwed), color: COLORS.text },
    { label: t('totalPaid', lang), value: fmtCurrency(grandPaid), color: COLORS.success },
    { label: grandBalance > 0 ? t('balanceDue', lang) : t('settled', lang), value: fmtCurrency(Math.abs(grandBalance)), color: grandBalance > 0 ? COLORS.danger : COLORS.success },
  ], y);

  if (totalWon > 0) {
    y = drawStatBoxes(doc, [
      { label: t('totalWon', lang), value: fmtCurrency(totalWon), color: COLORS.warning },
      { label: t('groupsWon', lang), value: `${data.groups.filter(g => g.wonMonth).length} / ${data.groups.length}`, color: COLORS.warning },
    ], y);
  }

  // Each group
  for (const group of data.groups) {
    y = renderGroupSection(doc, group, data.memberName, lang, y);
  }

  drawFooter(doc, lang);
  savePdf(doc, `BidNest_Member_${data.memberName}_AllGroups`);
}

// ─── Download each group as separate pages ──────────────────────────────────

export function downloadMemberEachGroupReport(
  data: MemberReportData,
  lang: Language,
) {
  const doc = createPdf('portrait');

  data.groups.forEach((group, idx) => {
    if (idx > 0) doc.addPage();

    let y = drawHeader(
      doc,
      `${data.memberName} - ${group.groupName}`,
      `${t('ticketShort', lang)}${group.ticketNumber} - ${idx + 1} ${t('of', lang)} ${data.groups.length}`,
      lang,
    );

    // Member info on first page only
    if (idx === 0) {
      y = drawSectionTitle(doc, t('memberInfo', lang), y + 2);
      y = drawInfoGrid(doc, [
        { label: t('memberName', lang), value: data.memberName },
        { label: t('nickname', lang), value: data.memberNickname || '-' },
        { label: t('mobile', lang), value: data.memberMobile || '-' },
      ], y, 3);
    } else {
      y += 2;
    }

    y = renderGroupSection(doc, group, data.memberName, lang, y);
  });

  drawFooter(doc, lang);
  savePdf(doc, `BidNest_Member_${data.memberName}_EachGroup`);
}
