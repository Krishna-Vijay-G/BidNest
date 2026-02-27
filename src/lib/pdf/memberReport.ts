// src/lib/pdf/memberReport.ts
// ─── Member Payment Detail PDF Report ───────────────────────────────────────
import { jsPDF } from 'jspdf';
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
  doc: jsPDF,
  group: MemberGroupData,
  memberName: string,
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
  y = drawSectionTitle(doc, `${group.groupName} - ${t('ticketShort')}${group.ticketNumber}`, y);

  // ── Group info ──
  y = drawInfoGrid(doc, [
    { label: t('totalAmount'), value: fmtCurrency(group.groupTotal) },
    { label: t('totalMembers'), value: String(group.groupMembers) },
    { label: t('duration'), value: `${group.groupDuration} ${t('months')}` },
    { label: t('status'), value: t(group.groupStatus.toLowerCase()) },
    { label: t('wonMonths'), value: group.wonMonth ? `${t('month')} ${group.wonMonth}` : '-' },
    { label: t('totalWon'), value: group.wonAmount ? fmtCurrency(group.wonAmount) : '-' },
  ], y, 3);

  // ── Stat boxes ──
  y = drawStatBoxes(doc, [
    { label: t('totalOwed'), value: fmtCurrency(group.totalOwed), color: COLORS.text },
    { label: t('totalPaid'), value: fmtCurrency(group.totalPaid), color: COLORS.success },
    {
      label: group.totalBalance > 0 ? t('balanceDue') : t('settled'),
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
      t('month'),
      t('amountDue'),
      t('amountPaid'),
      t('balance'),
      t('status'),
    ]];

    const body = group.months.map((m) => [
      `${t('month')} ${m.month}${m.wonThisMonth ? ` (${t('won') || 'Won'})` : ''}`,
      fmtCurrency(m.amountDue),
      fmtCurrency(m.amountPaid),
      fmtCurrency(m.balance),
      t(m.status.toLowerCase()),
    ]);

    const totalDue  = group.months.reduce((s, m) => s + m.amountDue,  0);
    const totalPaid = group.months.reduce((s, m) => s + m.amountPaid, 0);
    const totalBal  = group.months.reduce((s, m) => s + m.balance,    0);

    const foot = [[
      'Total',
      fmtCurrency(totalDue),
      fmtCurrency(totalPaid),
      fmtCurrency(totalBal),
      '',
    ]];

    y = drawTable(doc, head, body, y, {
      foot,
      showFoot: 'lastPage',
      footStyles: {
        fillColor: COLORS.tableHead,
        textColor: COLORS.tableHeadText,
        fontStyle: 'bold',
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 35 },
        2: { fontStyle: 'bold' },
        3: { fontStyle: 'bold' },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      didParseCell: (hookData: any) => {
        if (hookData.section === 'body') {
          const m = group.months[hookData.row.index];
          if (!m) return;
          // WON row → light amber background across all cells
          if (m.wonThisMonth) {
            hookData.cell.styles.fillColor = [254, 243, 199]; // amber-100
          }
          // Paid → green (amber text on WON rows since there's no payment)
          if (hookData.column.index === 2) {
            hookData.cell.styles.textColor = m.wonThisMonth ? COLORS.warning : COLORS.success;
          }
          // Balance → red if > 0, black if 0, green if < 0
          if (hookData.column.index === 3) {
            hookData.cell.styles.textColor =
              m.balance > 0 ? COLORS.danger :
              m.balance < 0 ? COLORS.success :
              COLORS.text;
          }
          // Status → amber (won) / green / red / amber (partial)
          if (hookData.column.index === 4) {
            const s = m.status.toLowerCase();
            hookData.cell.styles.textColor =
              s === 'won'       ? COLORS.warning :
              s === 'completed' ? COLORS.success :
              s === 'partial'   ? COLORS.warning :
              COLORS.danger; // pending / anything else
          }
        }
        // Foot: colour the balance and paid columns
        if (hookData.section === 'foot') {
          if (hookData.column.index === 2) {
            hookData.cell.styles.textColor = COLORS.success;
          }
          if (hookData.column.index === 3) {
            hookData.cell.styles.textColor =
              totalBal > 0 ? COLORS.danger :
              totalBal < 0 ? COLORS.success :
              COLORS.text;
          }
        }
      },
    });
  }

  return y + 2;
}

// ─── Download single group report ───────────────────────────────────────────

export async function downloadMemberGroupReport(
  data: MemberReportData,
  groupIndex: number,
) {
  const doc = await createPdf('portrait');
  const group = data.groups[groupIndex];
  if (!group) return;

  let y = drawHeader(
    doc,
    `${data.memberName} - ${group.groupName}`,
    `${t('ticketShort')}${group.ticketNumber} - ${t('member')} ${t('payment')}`,
  );

  // Member info
  y = drawSectionTitle(doc, t('memberInfo'), y + 2);
  y = drawInfoGrid(doc, [
    { label: t('memberName'), value: data.memberName },
    { label: t('nickname'), value: data.memberNickname || '-' },
    { label: t('mobile'), value: data.memberMobile || '-' },
  ], y, 3);

  y = renderGroupSection(doc, group, data.memberName, y);

  drawFooter(doc);
  await savePdf(doc, `BidNest_Member_${data.memberName}_${group.groupName}`);
}

// ─── Download all groups combined ───────────────────────────────────────────

export async function downloadMemberAllGroupsReport(
  data: MemberReportData,
) {
  const doc = await createPdf('portrait');

  let y = drawHeader(
    doc,
    data.memberName,
    `${t('allGroupsCombined')} - ${data.groups.length} ${t('groups')}`,
  );

  // Member info
  y = drawSectionTitle(doc, t('memberInfo'), y + 2);
  y = drawInfoGrid(doc, [
    { label: t('memberName'), value: data.memberName },
    { label: t('nickname'), value: data.memberNickname || '-' },
    { label: t('mobile'), value: data.memberMobile || '-' },
    { label: t('status'), value: data.memberIsActive ? t('active') : t('inactive') },
  ], y, 4);

  // Grand summary
  const grandOwed = data.groups.reduce((s, g) => s + g.totalOwed, 0);
  const grandPaid = data.groups.reduce((s, g) => s + g.totalPaid, 0);
  const grandBalance = grandOwed - grandPaid;
  const totalWon = data.groups.reduce((s, g) => s + g.wonAmount, 0);

  y = drawStatBoxes(doc, [
    { label: t('totalTickets'), value: String(data.groups.length), color: COLORS.primary },
    { label: t('totalOwed'), value: fmtCurrency(grandOwed), color: COLORS.text },
    { label: t('totalPaid'), value: fmtCurrency(grandPaid), color: COLORS.success },
    { label: grandBalance > 0 ? t('balanceDue') : t('settled'), value: fmtCurrency(Math.abs(grandBalance)), color: grandBalance > 0 ? COLORS.danger : COLORS.success },
  ], y);

  if (totalWon > 0) {
    y = drawStatBoxes(doc, [
      { label: t('totalWon'), value: fmtCurrency(totalWon), color: COLORS.warning },
      { label: t('groupsWon'), value: `${data.groups.filter(g => g.wonMonth).length} / ${data.groups.length}`, color: COLORS.warning },
    ], y);
  }

  // Each group
  for (const group of data.groups) {
    y = renderGroupSection(doc, group, data.memberName, y);
  }

  drawFooter(doc);
  await savePdf(doc, `BidNest_Member_${data.memberName}_AllGroups`);
}

// ─── Download selected groups into one PDF ─────────────────────────────────

export async function downloadMemberSelectedGroupsReport(
  data: MemberReportData,
  indices: number[],
) {
  const selected = indices.map(i => data.groups[i]).filter(Boolean) as typeof data.groups;
  if (selected.length === 0) return;

  const doc = await createPdf('portrait');

  for (const [pos, group] of selected.entries()) {
    if (pos > 0) doc.addPage();

    let y = drawHeader(
      doc,
      `${data.memberName} - ${group.groupName}`,
      `${t('ticketShort')}${group.ticketNumber} - ${pos + 1} ${t('of')} ${selected.length}`,
    );

    if (pos === 0) {
      y = drawSectionTitle(doc, t('memberInfo'), y + 2);
      y = drawInfoGrid(doc, [
        { label: t('memberName'), value: data.memberName },
        { label: t('nickname'), value: data.memberNickname || '-' },
        { label: t('mobile'), value: data.memberMobile || '-' },
      ], y, 3);
    } else {
      y += 2;
    }

    y = renderGroupSection(doc, group, data.memberName, y);
  }

  drawFooter(doc);
  const suffix = selected.map(g => g.groupName).join('_');
  await savePdf(doc, `BidNest_Member_${data.memberName}_${suffix}`);
}

// ─── Download each group as separate pages ──────────────────────────────────

export async function downloadMemberEachGroupReport(
  data: MemberReportData,
) {
  const doc = await createPdf('portrait');

  for (const [idx, group] of data.groups.entries()) {
    if (idx > 0) doc.addPage();

    let y = drawHeader(
      doc,
      `${data.memberName} - ${group.groupName}`,
      `${t('ticketShort')}${group.ticketNumber} - ${idx + 1} ${t('of')} ${data.groups.length}`,
    );

    // Member info on first page only
    if (idx === 0) {
      y = drawSectionTitle(doc, t('memberInfo'), y + 2);
      y = drawInfoGrid(doc, [
        { label: t('memberName'), value: data.memberName },
        { label: t('nickname'), value: data.memberNickname || '-' },
        { label: t('mobile'), value: data.memberMobile || '-' },
      ], y, 3);
    } else {
      y += 2;
    }

    y = renderGroupSection(doc, group, data.memberName, y);
  }

  drawFooter(doc);
  await savePdf(doc, `BidNest_Member_${data.memberName}_EachGroup`);
}
