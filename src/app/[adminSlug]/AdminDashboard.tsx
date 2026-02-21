"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import React from "react";
import {
  HiOutlineSquares2X2, HiOutlineUsers, HiOutlineUserGroup, HiOutlineTicket,
  HiOutlineTrophy, HiOutlineBanknotes, HiOutlineClipboardDocumentList,
  HiOutlineSun, HiOutlineMoon, HiOutlineArrowRightOnRectangle, HiOutlineArrowPath,
  HiOutlineTrash, HiOutlineShieldExclamation,
  HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineCurrencyRupee,
  HiOutlineChartBarSquare, HiOutlineExclamationTriangle, HiOutlineLockClosed,
  HiOutlineEye, HiOutlineEyeSlash, HiOutlineChevronDown, HiOutlineChevronUp,
  HiOutlineMagnifyingGlass, HiOutlineXMark, HiOutlineCalendarDays,
  HiOutlineIdentification, HiOutlinePhone, HiOutlineEnvelope, HiOutlineKey,
  HiOutlineHashtag, HiOutlineInformationCircle, HiOutlineMapPin,
} from "react-icons/hi2";

// ─── Types ────────────────────────────────────────────────────────────────────

type Section =
  | "overview" | "users" | "groups" | "members"
  | "chit-members" | "auctions" | "payments" | "audit-logs";

interface OverviewData {
  users: number; groups: number; members: number; chitMembers: number;
  auctions: number; payments: number; auditLogs: number;
  totalChitAmount: number; totalPaid: number;
}

interface EditField {
  key: string; label: string;
  type: "text" | "number" | "date" | "select" | "boolean";
  options?: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const API = (path: string) => `/api/admin${path}`;

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(API(path), {
    credentials: "include", ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDateTime(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function fmtMoney(n: number | string | null | undefined) {
  if (n == null || n === "") return "—";
  return "₹" + Number(n).toLocaleString("en-IN");
}

/**
 * BUG FIX: Robust JSON field extractor.
 * BidNest stores name/nickname/mobile as { value: "...", updated_at: "..." }.
 * Prisma can return these as parsed objects OR as raw JSON strings depending
 * on the Prisma version / adapter. Handle both cases.
 */
function getJsonVal(j: unknown): string {
  if (!j) return "—";
  if (typeof j === "string") {
    try {
      const parsed = JSON.parse(j);
      if (parsed && typeof parsed === "object" && "value" in parsed)
        return String((parsed as Record<string, unknown>).value ?? "—");
    } catch { /* not JSON, return as-is */ }
    return j;
  }
  if (typeof j === "object" && j !== null && "value" in j)
    return String((j as Record<string, unknown>).value ?? "—");
  return String(j);
}

/** Get first active UPI id from upi_ids JSON array field */
function getUpi(j: unknown): string {
  if (!j) return "—";
  try {
    const arr = (Array.isArray(j) ? j : JSON.parse(j as string)) as Array<{ value: string; is_active: boolean }>;
    const active = arr.find((x) => x.is_active);
    return active?.value || arr[0]?.value || "—";
  } catch { return "—"; }
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE:        "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    COMPLETED:     "text-blue-400 bg-blue-500/10 border-blue-500/20",
    CANCELLED:     "text-red-400 bg-red-500/10 border-red-500/20",
    PENDING:       "text-amber-400 bg-amber-500/10 border-amber-500/20",
    PARTIAL:       "text-amber-400 bg-amber-500/10 border-amber-500/20",
    INACTIVE:      "text-foreground-muted bg-surface border-border",
    CREATE:        "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    UPDATE:        "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    DELETE:        "text-red-400 bg-red-500/10 border-red-500/20",
    LOGIN:         "text-blue-400 bg-blue-500/10 border-blue-500/20",
    LOGOUT:        "text-foreground-muted bg-surface border-border",
    CASH:          "text-green-400 bg-green-500/10 border-green-500/20",
    UPI:           "text-purple-400 bg-purple-500/10 border-purple-500/20",
    BANK_TRANSFER: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    PERCENT:       "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    FIXED:         "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    // New server enum names (backwards-compatible with older keys)
    PERCENTAGE:    "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    FLAT:          "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-semibold border ${map[status] ?? "text-foreground-muted bg-surface border-border"}`}>
      {status}
    </span>
  );
}

function YesBadge({ yes }: { yes: boolean }) {
  return yes ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
      <HiOutlineCheckCircle className="w-3 h-3" /> Yes
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20">
      <HiOutlineXCircle className="w-3 h-3" /> No
    </span>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-10 h-10 rounded-full border-2 border-border border-t-cyan-400 animate-spin" />
    </div>
  );
}

// ─── Detail Panel Helpers ─────────────────────────────────────────────────────

function DGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4 pt-3">{children}</div>;
}

function DItem({ icon, label, value, mono = false, wide = false }: {
  icon?: React.ReactNode; label: string; value: React.ReactNode; mono?: boolean; wide?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-1 ${wide ? "col-span-2" : ""}`}>
      <div className="flex items-center gap-1 text-[10px] font-semibold text-foreground-muted uppercase tracking-wider">
        {icon && <span className="opacity-70">{icon}</span>}{label}
      </div>
      <div className={`text-sm font-medium text-foreground break-all ${mono ? "font-mono text-xs" : ""}`}>
        {value ?? "—"}
      </div>
    </div>
  );
}

// ─── Detail Panels ────────────────────────────────────────────────────────────

function UserDetail({ row }: { row: Record<string, unknown> }) {
  const cnt = row._count as Record<string, number> | undefined;
  return (
    <DGrid>
      <DItem icon={<HiOutlineIdentification className="w-3 h-3" />} label="Full ID" value={row.id as string} mono wide />
      <DItem icon={<HiOutlineEnvelope className="w-3 h-3" />} label="Email" value={row.email as string} />
      <DItem icon={<HiOutlinePhone className="w-3 h-3" />} label="Phone" value={(row.phone as string) || "—"} />
      <DItem icon={<HiOutlineCalendarDays className="w-3 h-3" />} label="Registered" value={fmtDateTime(row.created_at as string)} />
      <DItem icon={<HiOutlineUserGroup className="w-3 h-3" />} label="Chit Groups" value={cnt?.chit_groups ?? 0} />
      <DItem icon={<HiOutlineUsers className="w-3 h-3" />} label="Members" value={cnt?.members ?? 0} />
      <DItem icon={<HiOutlineClipboardDocumentList className="w-3 h-3" />} label="Audit Logs" value={cnt?.audit_logs ?? 0} />
      <DItem icon={<HiOutlineCheckCircle className="w-3 h-3" />} label="Active" value={<YesBadge yes={row.is_active as boolean} />} />
    </DGrid>
  );
}

function GroupDetail({ row }: { row: Record<string, unknown> }) {
  const owner = row.user as Record<string, unknown> | undefined;
  const cnt = row._count as Record<string, number> | undefined;
  return (
    <DGrid>
      <DItem icon={<HiOutlineIdentification className="w-3 h-3" />} label="Full ID" value={row.id as string} mono wide />
      <DItem
        icon={<HiOutlineUsers className="w-3 h-3" />} label="Owner"
        value={
          <div>
            <div className="font-semibold text-cyan-400">{(owner?.username as string) || "—"}</div>
            <div className="text-xs text-foreground-muted">{(owner?.email as string) || ""}</div>
          </div>
        }
      />
      {/* BUG FIX: Correct Prisma field names — total_amount, total_members, duration_months */}
      <DItem icon={<HiOutlineCurrencyRupee className="w-3 h-3" />} label="Total Amount" value={<span className="text-cyan-400 font-bold">{fmtMoney(row.total_amount as number)}</span>} />
      <DItem icon={<HiOutlineCurrencyRupee className="w-3 h-3" />} label="Monthly Amount" value={fmtMoney(row.monthly_amount as number)} />
      <DItem icon={<HiOutlineUsers className="w-3 h-3" />} label="Group Size" value={row.total_members as number} />
      <DItem icon={<HiOutlineCalendarDays className="w-3 h-3" />} label="Duration" value={`${row.duration_months as number} months`} />
      <DItem icon={<HiOutlineHashtag className="w-3 h-3" />} label="Commission Type" value={<StatusBadge status={row.commission_type as string} />} />
      <DItem icon={<HiOutlineCurrencyRupee className="w-3 h-3" />} label="Commission Value" value={String(row.commission_value ?? "—")} />
      <DItem icon={<HiOutlineHashtag className="w-3 h-3" />} label="Round-off" value={row.round_off_value != null ? `₹${row.round_off_value}` : "—"} />
      <DItem icon={<HiOutlineCalendarDays className="w-3 h-3" />} label="Created" value={fmtDateTime(row.created_at as string)} />
      <DItem icon={<HiOutlineTicket className="w-3 h-3" />} label="Members Enrolled" value={cnt?.chit_members ?? 0} />
      <DItem icon={<HiOutlineTrophy className="w-3 h-3" />} label="Auctions Held" value={cnt?.auctions ?? 0} />
      <DItem icon={<HiOutlineBanknotes className="w-3 h-3" />} label="Payments" value={cnt?.payments ?? 0} />
    </DGrid>
  );
}

function MemberDetail({ row }: { row: Record<string, unknown> }) {
  const owner = row.user as Record<string, unknown> | undefined;
  const cnt = row._count as Record<string, number> | undefined;
  return (
    <DGrid>
      <DItem icon={<HiOutlineIdentification className="w-3 h-3" />} label="Full ID" value={row.id as string} mono wide />
      <DItem icon={<HiOutlineUsers className="w-3 h-3" />} label="Owner Account" value={(owner?.username as string) || "—"} />
      <DItem icon={<HiOutlinePhone className="w-3 h-3" />} label="Mobile" value={getJsonVal(row.mobile)} />
      <DItem icon={<HiOutlineKey className="w-3 h-3" />} label="UPI ID" value={getUpi(row.upi_ids)} />
      <DItem icon={<HiOutlineCalendarDays className="w-3 h-3" />} label="Added On" value={fmtDateTime(row.created_at as string)} />
      <DItem icon={<HiOutlineCalendarDays className="w-3 h-3" />} label="Last Updated" value={fmtDateTime(row.updated_at as string)} />
      <DItem icon={<HiOutlineTicket className="w-3 h-3" />} label="Groups Joined" value={cnt?.chit_members ?? 0} />
    </DGrid>
  );
}

function ChitMemberDetail({ row }: { row: Record<string, unknown> }) {
  const member = row.member as Record<string, unknown> | undefined;
  const group = row.chit_group as Record<string, unknown> | undefined;
  const cnt = row._count as Record<string, number> | undefined;
  return (
    <DGrid>
      <DItem icon={<HiOutlineIdentification className="w-3 h-3" />} label="Full ID" value={row.id as string} mono wide />
      <DItem icon={<HiOutlinePhone className="w-3 h-3" />} label="Mobile" value={getJsonVal(member?.mobile)} />
      <DItem icon={<HiOutlineKey className="w-3 h-3" />} label="UPI ID" value={getUpi(member?.upi_ids)} />
      <DItem icon={<HiOutlineUserGroup className="w-3 h-3" />} label="Group" value={(group?.name as string) || "—"} />
      <DItem icon={<HiOutlineCalendarDays className="w-3 h-3" />} label="Joined On" value={fmtDateTime(row.created_at as string)} />
      <DItem icon={<HiOutlineBanknotes className="w-3 h-3" />} label="Total Payments" value={cnt?.payments ?? 0} />
      <DItem icon={<HiOutlineCheckCircle className="w-3 h-3" />} label="Active" value={<YesBadge yes={row.is_active as boolean} />} />
    </DGrid>
  );
}

function AuctionDetail({ row }: { row: Record<string, unknown> }) {
  const calc = row.calculation_data as Record<string, unknown> | null;
  return (
    <DGrid>
      <DItem icon={<HiOutlineIdentification className="w-3 h-3" />} label="Full ID" value={row.id as string} mono wide />
      <DItem icon={<HiOutlineCurrencyRupee className="w-3 h-3" />} label="Original Bid" value={fmtMoney(row.original_bid as number)} />
      <DItem icon={<HiOutlineCurrencyRupee className="w-3 h-3" />} label="Winning Amount" value={<span className="text-emerald-400 font-bold">{fmtMoney(row.winning_amount as number)}</span>} />
      <DItem icon={<HiOutlineCurrencyRupee className="w-3 h-3" />} label="Commission" value={fmtMoney(row.commission as number)} />
      <DItem icon={<HiOutlineCurrencyRupee className="w-3 h-3" />} label="Raw Dividend" value={fmtMoney(row.raw_dividend as number)} />
      <DItem icon={<HiOutlineCurrencyRupee className="w-3 h-3" />} label="Rounded Dividend" value={fmtMoney(row.roundoff_dividend as number)} />
      <DItem icon={<HiOutlineCurrencyRupee className="w-3 h-3" />} label="Carry to Next" value={fmtMoney(row.carry_next as number)} />
      <DItem icon={<HiOutlineCurrencyRupee className="w-3 h-3" />} label="Carry from Prev" value={fmtMoney(row.carry_previous as number)} />
      <DItem icon={<HiOutlineCalendarDays className="w-3 h-3" />} label="Conducted On" value={fmtDateTime(row.created_at as string)} />
      {calc && (
        <div className="col-span-full mt-1">
          <p className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wider mb-2">Calculation Snapshot</p>
          <pre className="text-xs text-foreground-muted bg-surface rounded-lg p-3 overflow-x-auto border border-border">{JSON.stringify(calc, null, 2)}</pre>
        </div>
      )}
    </DGrid>
  );
}

function PaymentDetail({ row }: { row: Record<string, unknown> }) {
  const cm = row.chit_member as Record<string, unknown> | null;
  const member = cm?.member as Record<string, unknown> | undefined;
  return (
    <DGrid>
      <DItem icon={<HiOutlineIdentification className="w-3 h-3" />} label="Full ID" value={row.id as string} mono wide />
      <DItem icon={<HiOutlinePhone className="w-3 h-3" />} label="Mobile" value={getJsonVal(member?.mobile)} />
      <DItem icon={<HiOutlineKey className="w-3 h-3" />} label="UPI Used" value={(row.upi_id as string) || "—"} />
      <DItem icon={<HiOutlineCalendarDays className="w-3 h-3" />} label="Payment Date" value={fmtDateTime(row.payment_date as string)} />
      <DItem icon={<HiOutlineCalendarDays className="w-3 h-3" />} label="Recorded On" value={fmtDateTime(row.created_at as string)} />
      <DItem icon={<HiOutlineInformationCircle className="w-3 h-3" />} label="Notes" value={(row.notes as string) || "No notes"} wide />
    </DGrid>
  );
}

function AuditLogDetail({ row }: { row: Record<string, unknown> }) {
  const logUser = row.user as Record<string, unknown> | null;
  return (
    <DGrid>
      <DItem icon={<HiOutlineIdentification className="w-3 h-3" />} label="Full ID" value={row.id as string} mono wide />
      <DItem icon={<HiOutlineCheckCircle className="w-3 h-3" />} label="Action" value={<StatusBadge status={row.action_type as string} />} />
      <DItem icon={<HiOutlineUsers className="w-3 h-3" />} label="Performed By" value={(logUser?.username as string) || "Admin / System"} />
      <DItem icon={<HiOutlineIdentification className="w-3 h-3" />} label="Record ID" value={(row.record_id as string) || "—"} mono wide />
      <DItem icon={<HiOutlineInformationCircle className="w-3 h-3" />} label="Action Detail" value={(row.action_detail as string) || "—"} wide />
      <DItem icon={<HiOutlineMapPin className="w-3 h-3" />} label="User Agent" value={(row.user_agent as string) || "—"} wide />
      <DItem icon={<HiOutlineCalendarDays className="w-3 h-3" />} label="Exact Time" value={fmtDateTime(row.created_at as string)} />
      {!!row.old_data && (
        <div className="col-span-full mt-1">
          <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-1.5">Old Data</p>
          <pre className="text-xs text-foreground-muted bg-surface rounded-lg p-3 overflow-x-auto border border-border">{JSON.stringify(row.old_data, null, 2)}</pre>
        </div>
      )}
      {!!row.new_data && (
        <div className="col-span-full mt-1">
          <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mb-1.5">New Data</p>
          <pre className="text-xs text-foreground-muted bg-surface rounded-lg p-3 overflow-x-auto border border-border">{JSON.stringify(row.new_data, null, 2)}</pre>
        </div>
      )}
    </DGrid>
  );
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

function FilterBar({ search, onSearch, statusOptions, status, onStatus, total, filtered }: {
  search: string; onSearch: (v: string) => void;
  statusOptions?: string[]; status: string; onStatus: (v: string) => void;
  total: number; filtered: number;
}) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-5 py-3.5 border-b border-border bg-surface/30">
      <div className="relative flex-1 min-w-0 max-w-sm">
        <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted pointer-events-none" />
        <input
          type="text" placeholder="Search…" value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="glass-input w-full pl-9 pr-8 py-2 text-sm rounded-xl"
        />
        {search && (
          <button onClick={() => onSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground">
            <HiOutlineXMark className="w-4 h-4" />
          </button>
        )}
      </div>
      {statusOptions && statusOptions.length > 0 && (
        <select value={status} onChange={(e) => onStatus(e.target.value)} className="glass-input px-3 py-2 text-sm rounded-xl shrink-0">
          <option value="">All statuses</option>
          {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      )}
      <div className="flex items-center gap-2 text-xs text-foreground-muted shrink-0 ml-auto">
        {(search || status) ? (
          <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold">{filtered} / {total}</span>
        ) : (
          <span className="px-2.5 py-1 rounded-full bg-surface border border-border font-medium">{total} records</span>
        )}
        {(search || status) && (
          <button onClick={() => { onSearch(""); onStatus(""); }} className="px-2.5 py-1 rounded-lg text-foreground-muted hover:text-red-400 hover:bg-red-500/10 border border-border text-xs font-medium transition-all">
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Admin Table ─────────────────────────────────────────────────────────────
// BUG FIX: Use React.Fragment with key prop to correctly render two sibling <tr>s
// per row. Using <> shorthand inside .map() without a key causes React to lose
// track of elements during re-renders, causing reconciliation errors / flickering.

function AdminTable({ headers, rows, expandedId, onExpand, renderDetail, empty = "No records found." }: {
  headers: string[];
  rows: { id: string; cells: React.ReactNode[] }[];
  expandedId: string | null;
  onExpand: (id: string | null) => void;
  renderDetail: (id: string) => React.ReactNode;
  empty?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <HiOutlineClipboardDocumentList className="w-10 h-10 text-foreground-muted" />
        <p className="text-sm text-foreground-muted">{empty}</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="glass-table w-full">
        <thead>
          <tr>
            <th className="w-8" />
            {headers.map((h) => <th key={h}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ id, cells }) => {
            const isOpen = expandedId === id;
            return (
              <React.Fragment key={id}>
                <tr className={isOpen ? "bg-cyan-500/5" : ""}>
                  <td className="w-8 text-center pl-2 pr-0">
                    <button
                      onClick={() => onExpand(isOpen ? null : id)}
                      className={`p-1 rounded-lg transition-all ${isOpen ? "text-cyan-400 bg-cyan-500/10" : "text-foreground-muted hover:text-cyan-400 hover:bg-cyan-500/10"}`}
                      title="Toggle details"
                    >
                      {isOpen ? <HiOutlineChevronUp className="w-3.5 h-3.5" /> : <HiOutlineChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </td>
                  {cells.map((cell, j) => <td key={j}>{cell}</td>)}
                </tr>
                {isOpen && (
                  <tr className="bg-cyan-500/3">
                    <td colSpan={headers.length + 1} className="p-0">
                      <div className="border-t border-cyan-500/10 mx-3 mb-2">{renderDetail(id)}</div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Generic Tab Section ──────────────────────────────────────────────────────
// BUG FIX: searchKeys/statusKey are inline arrow functions — new refs every render.
// Storing them in refs prevents stale closures while keeping useMemo deps clean.

interface TabSectionProps {
  data: Record<string, unknown>[];
  searchKeys: (row: Record<string, unknown>) => string[];
  statusKey?: (row: Record<string, unknown>) => string;
  statusOptions?: string[];
  headers: string[];
  renderRow: (row: Record<string, unknown>) => React.ReactNode[];
  renderDetail: (row: Record<string, unknown>) => React.ReactNode;
  onDelete: (id: string) => void;
}

function TabSection({ data, searchKeys, statusKey, statusOptions, headers, renderRow, renderDetail, onDelete }: TabSectionProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Keep refs for callback getters to avoid stale closures
  const searchKeysRef = React.useRef(searchKeys);
  searchKeysRef.current = searchKeys;
  const statusKeyRef = React.useRef(statusKey);
  statusKeyRef.current = statusKey;

  // Normalize incoming `data` to an array. The server sometimes returns
  // non-array shapes (e.g. objects) for overview or error states; ensure
  // TabSection always operates on an array to avoid runtime exceptions.
  const safeArr = Array.isArray(data) ? data : ([] as Record<string, unknown>[]);

  const filtered = useMemo(() => safeArr.filter((row) => {
    const keys = searchKeysRef.current ? searchKeysRef.current(row) : [];
    const matchSearch = !search || keys.some((k) => (k ?? "").toString().toLowerCase().includes(search.toLowerCase()));
    const matchStatus = !status || (statusKeyRef.current && statusKeyRef.current(row) === status);
    return matchSearch && matchStatus;
  }), [safeArr, search, status]);

  const rowMap = useMemo(() => {
    const m = new Map<string, Record<string, unknown>>();
    safeArr.forEach((row) => { if (row && (row as any).id) m.set((row as any).id as string, row); });
    return m;
  }, [safeArr]);

  return (
    <div className="flex flex-col">
      <FilterBar search={search} onSearch={setSearch} statusOptions={statusOptions} status={status} onStatus={setStatus} total={safeArr.length} filtered={filtered.length} />
      <AdminTable
        headers={[...headers, "Actions"]}
        rows={filtered.map((row) => ({
          id: row.id as string,
          cells: [
            ...renderRow(row),
            <div key="act" className="flex items-center gap-1">
              <DeleteBtn onClick={() => onDelete(row.id as string)} />
            </div>,
          ],
        }))}
        expandedId={expandedId}
        onExpand={setExpandedId}
        renderDetail={(id) => { const row = rowMap.get(id); return row ? renderDetail(row) : null; }}
        empty="No records match your filter."
      />
    </div>
  );
}

// ─── Action Buttons ───────────────────────────────────────────────────────────



function DeleteBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="p-1.5 rounded-lg text-foreground-muted hover:text-red-400 hover:bg-red-500/10 transition-all" title="Delete">
      <HiOutlineTrash className="w-4 h-4" />
    </button>
  );
}

// Edit modal removed — admin UI is view/delete only now.

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-strong rounded-2xl border border-border w-full max-w-sm p-6 flex flex-col gap-5 animate-slide-in">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <HiOutlineExclamationTriangle className="w-7 h-7 text-red-400" />
          </div>
          <h3 className="text-base font-bold text-foreground">Delete Record</h3>
          <p className="text-sm text-foreground-muted leading-relaxed">Are you sure you want to permanently delete this record? This action cannot be undone.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-foreground-secondary border border-border hover:bg-surface-hover transition-all">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all">Delete</button>
        </div>
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ data }: { data: OverviewData }) {
  const cards = [
    { label: "Total Users",      value: data.users,                    icon: <HiOutlineUsers className="w-6 h-6" />,               color: "text-cyan-400",    bg: "bg-cyan-500/10"    },
    { label: "Chit Groups",      value: data.groups,                   icon: <HiOutlineUserGroup className="w-6 h-6" />,            color: "text-purple-400",  bg: "bg-purple-500/10"  },
    { label: "Members",          value: data.members,                  icon: <HiOutlineUsers className="w-6 h-6" />,               color: "text-blue-400",    bg: "bg-blue-500/10"    },
    { label: "Chit Members",     value: data.chitMembers,              icon: <HiOutlineTicket className="w-6 h-6" />,              color: "text-indigo-400",  bg: "bg-indigo-500/10"  },
    { label: "Auctions",         value: data.auctions,                 icon: <HiOutlineTrophy className="w-6 h-6" />,              color: "text-amber-400",   bg: "bg-amber-500/10"   },
    { label: "Payments",         value: data.payments,                 icon: <HiOutlineBanknotes className="w-6 h-6" />,           color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Audit Logs",       value: data.auditLogs,                icon: <HiOutlineClipboardDocumentList className="w-6 h-6" />,color: "text-foreground",  bg: "bg-surface"        },
    { label: "Total Chit Value", value: fmtMoney(data.totalChitAmount),icon: <HiOutlineCurrencyRupee className="w-6 h-6" />,       color: "text-cyan-400",    bg: "bg-cyan-500/10"    },
    { label: "Total Collected",  value: fmtMoney(data.totalPaid),      icon: <HiOutlineChartBarSquare className="w-6 h-6" />,      color: "text-emerald-400", bg: "bg-emerald-500/10" },
  ];
  const recentLogs = (data as unknown as Record<string, unknown>).recentLogs as Record<string, unknown>[] | undefined;
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="glass rounded-2xl border border-border p-5 flex flex-col gap-3">
            <div className={`w-11 h-11 rounded-xl ${c.bg} ${c.color} flex items-center justify-center`}>{c.icon}</div>
            <div>
              <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
              <p className="text-xs text-foreground-muted mt-0.5">{c.label}</p>
            </div>
          </div>
        ))}
      </div>
      {recentLogs && recentLogs.length > 0 && (
        <div className="glass rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <HiOutlineClipboardDocumentList className="w-5 h-5 text-cyan-400" />
            <h3 className="font-semibold text-foreground">Recent Activity</h3>
            <span className="ml-auto text-xs text-foreground-muted">{recentLogs.length} recent</span>
          </div>
          <div className="divide-y divide-border">
            {recentLogs.map((l) => (
              <div key={l.id as string} className="flex items-center gap-3 px-5 py-3 hover:bg-surface/50 transition-colors">
                <StatusBadge status={l.action_type as string} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {(l.user as Record<string, unknown>)?.username as string ?? "System"}
                    <span className="text-foreground-muted font-normal"> on </span>
                    <span className="font-mono text-xs text-cyan-400">{l.table_name as string}</span>
                  </p>
                  {(l.action_detail as string) && (
                    <p className="text-xs text-foreground-muted truncate">{(l.action_detail as string).slice(0, 100)}</p>
                  )}
                </div>
                <span className="text-xs text-foreground-muted shrink-0">{fmtDateTime(l.created_at as string)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Data Tabs ────────────────────────────────────────────────────────────────

function UsersTab({ data, onDelete }: { data: Record<string, unknown>[]; onDelete: (id: string) => void }) {
  return (
    <TabSection
      data={data}
      searchKeys={(u) => [u.username as string, u.email as string, u.phone as string]}
      statusKey={(u) => (u.is_active ? "ACTIVE" : "INACTIVE")}
      statusOptions={["ACTIVE", "INACTIVE"]}
      headers={["User", "Email", "Phone", "Active", "Created", "Groups", "Members"]}
      renderRow={(u) => [
        <div key="u" className="flex items-center gap-2.5">
          {/* BUG FIX: bg-gradient-to-br (Tailwind v3), not bg-linear-to-br */}
          <div className="w-8 h-8 rounded-xl bg-linear-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
            {(u.username as string)?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
          <span className="font-semibold text-foreground">{u.username as string}</span>
        </div>,
        <span key="e" className="text-foreground-secondary text-sm">{u.email as string}</span>,
        <span key="p" className="text-foreground-secondary text-sm">{(u.phone as string) || "—"}</span>,
        <YesBadge key="a" yes={u.is_active as boolean} />,
        <span key="c" className="text-foreground-muted text-sm">{fmtDate(u.created_at as string)}</span>,
        <span key="g" className="font-medium text-foreground">{(u._count as Record<string, number>)?.chit_groups ?? 0}</span>,
        <span key="m" className="font-medium text-foreground">{(u._count as Record<string, number>)?.members ?? 0}</span>,
      ]}
      renderDetail={(u) => <UserDetail row={u} />}
      onDelete={onDelete}
    />
  );
}

function GroupsTab({ data, onDelete }: { data: Record<string, unknown>[]; onDelete: (id: string) => void }) {
  return (
    <TabSection
      data={data}
      searchKeys={(g) => { const o = g.user as Record<string, unknown> | undefined; return [getJsonVal(g.name), (g.id as string) || "", o?.username as string, o?.email as string]; }}
      statusKey={(g) => g.status as string}
      statusOptions={["ACTIVE", "PENDING", "COMPLETED", "CANCELLED"]}
      headers={["Name", "Owner", "Total Amount", "Monthly", "Members", "Duration", "Commission", "Status"]}
      renderRow={(g) => {
        const o = g.user as Record<string, unknown> | undefined;
        return [
          <span key="n" className="font-semibold text-foreground">{getJsonVal(g.name)}</span>,
          <div key="ow" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-[10px] shrink-0">
              {(o?.username as string)?.charAt(0)?.toUpperCase() ?? "?"}
            </div>
            <div>
              <div className="text-xs font-semibold text-purple-400">{(o?.username as string) ?? "—"}</div>
              <div className="text-[10px] text-foreground-muted">{(o?.email as string) ?? ""}</div>
            </div>
          </div>,
          <span key="ta" className="font-medium text-cyan-400">{fmtMoney(g.total_amount as number)}</span>,
          <span key="ma" className="text-foreground-secondary text-sm">{fmtMoney(g.monthly_amount as number)}</span>,
          <span key="sz" className="text-foreground-secondary">{g.total_members as number}</span>,
          <span key="du" className="text-foreground-secondary">{g.duration_months as number}m</span>,
          <span key="co" className="text-foreground-secondary text-sm">{String(g.commission_value)}{["PERCENT", "PERCENTAGE"].includes((g.commission_type as string) ?? "") ? "%" : " flat"}</span>,
          <StatusBadge key="s" status={g.status as string} />,
        ];
      }}
      renderDetail={(g) => <GroupDetail row={g} />}
      onDelete={onDelete}
    />
  );
}

function MembersTab({ data, onDelete }: { data: Record<string, unknown>[]; onDelete: (id: string) => void }) {
  return (
    <TabSection
      data={data}
      searchKeys={(m) => [getJsonVal(m.name), getJsonVal(m.nickname), getJsonVal(m.mobile), (m.user as Record<string, unknown>)?.username as string]}
      statusKey={(m) => (m.is_active ? "ACTIVE" : "INACTIVE")}
      statusOptions={["ACTIVE", "INACTIVE"]}
      headers={["Name", "Nickname", "Mobile", "Active", "Owner", "Groups"]}
      renderRow={(m) => [
        <div key="n" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-semibold text-xs shrink-0">
            {getJsonVal(m.name)?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
          <span className="font-medium text-foreground">{getJsonVal(m.name) || "—"}</span>
        </div>,
        <span key="ni" className="text-foreground-muted text-sm italic">"{getJsonVal(m.nickname) || "—"}"</span>,
        <span key="mo" className="text-foreground-secondary text-sm">{getJsonVal(m.mobile) || "—"}</span>,
        <YesBadge key="a" yes={m.is_active as boolean} />,
        <span key="ow" className="text-foreground-secondary text-sm">{(m.user as Record<string, unknown>)?.username as string || "—"}</span>,
        <span key="ti" className="font-medium text-foreground">{(m._count as Record<string, number>)?.chit_members ?? 0}</span>,
      ]}
      renderDetail={(m) => <MemberDetail row={m} />}
      onDelete={onDelete}
    />
  );
}

function ChitMembersTab({ data, onDelete }: { data: Record<string, unknown>[]; onDelete: (id: string) => void }) {
  return (
    <TabSection
      data={data}
      searchKeys={(cm) => { const m = cm.member as Record<string, unknown> | undefined; const g = cm.chit_group as Record<string, unknown> | undefined; return [getJsonVal(m?.name), getJsonVal(g?.name)]; }}
      statusKey={(cm) => (cm.is_active ? "ACTIVE" : "INACTIVE")}
      statusOptions={["ACTIVE", "INACTIVE"]}
      headers={["Member", "Group", "Ticket #", "Active", "Payments"]}
      renderRow={(cm) => {
        const m = cm.member as Record<string, unknown> | undefined;
        const g = cm.chit_group as Record<string, unknown> | undefined;
        return [
          <span key="m" className="font-medium text-foreground">{getJsonVal(m?.name) || "—"}</span>,
          <span key="g" className="text-foreground-secondary text-sm">{getJsonVal(g?.name) || "—"}</span>,
          <span key="t" className="px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-400 text-xs font-bold border border-cyan-500/20">#{cm.ticket_number as number}</span>,
          <YesBadge key="a" yes={cm.is_active as boolean} />,
          <span key="p" className="font-medium text-foreground">{(cm._count as Record<string, number>)?.payments ?? 0}</span>,
        ];
      }}
      renderDetail={(cm) => <ChitMemberDetail row={cm} />}
      onDelete={onDelete}
    />
  );
}

function AuctionsTab({ data, onDelete }: { data: Record<string, unknown>[]; onDelete: (id: string) => void }) {
  return (
    <TabSection
      data={data}
      searchKeys={(a) => { const g = a.chit_group as Record<string, unknown> | undefined; const wm = (a.winner_chit_member as Record<string, unknown> | undefined)?.member as Record<string, unknown> | undefined; return [getJsonVal(g?.name), getJsonVal(wm?.name)]; }}
      headers={["Group", "Month", "Date", "Original Bid", "Winning Amount", "Dividend", "Winner"]}
      renderRow={(a) => {
        const wm = (a.winner_chit_member as Record<string, unknown> | undefined)?.member as Record<string, unknown> | undefined;
        return [
          <span key="g" className="font-medium text-foreground">{getJsonVal((a.chit_group as Record<string, unknown>)?.name) || "—"}</span>,
          <span key="mn" className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/20">Month {a.month_number as number}</span>,
          <span key="d" className="text-foreground-muted text-sm">{fmtDate(a.created_at as string)}</span>,
          <span key="b" className="text-foreground-secondary text-sm">{fmtMoney(a.original_bid as number)}</span>,
          <span key="w" className="font-semibold text-emerald-400">{fmtMoney(a.winning_amount as number)}</span>,
          <span key="rd" className="text-foreground-secondary text-sm">{fmtMoney(a.roundoff_dividend as number)}</span>,
          <span key="wn" className="font-medium text-foreground">{getJsonVal(wm?.name) || "—"}</span>,
        ];
      }}
      renderDetail={(a) => <AuctionDetail row={a} />}
      onDelete={onDelete}
    />
  );
}

function PaymentsTab({ data, onDelete }: { data: Record<string, unknown>[]; onDelete: (id: string) => void }) {
  return (
    <TabSection
      data={data}
      searchKeys={(p) => { const cm = p.chit_member as Record<string, unknown> | null; const m = cm?.member as Record<string, unknown> | undefined; const g = p.chit_group as Record<string, unknown> | undefined; return [getJsonVal(m?.name), getJsonVal(g?.name), p.payment_method as string]; }}
      statusKey={(p) => p.status as string}
      statusOptions={["PARTIAL", "COMPLETED"]}
      headers={["Member", "Group", "Month", "Amount Paid", "Status", "Method", "Date"]}
      renderRow={(p) => {
        const cm = p.chit_member as Record<string, unknown> | null;
        const m = cm?.member as Record<string, unknown> | undefined;
        const g = p.chit_group as Record<string, unknown> | undefined;
        return [
          <span key="m" className="font-medium text-foreground">{getJsonVal(m?.name) || "—"}</span>,
          <span key="g" className="text-foreground-secondary text-sm">{getJsonVal(g?.name) || "—"}</span>,
          <span key="mn" className="text-foreground-secondary">Month {p.month_number as number}</span>,
          <span key="a" className="font-semibold text-cyan-400">{fmtMoney(p.amount_paid as number)}</span>,
          <StatusBadge key="s" status={p.status as string} />,
          // BUG FIX: was wrapping StatusBadge in a redundant styled <span>; now renders directly
          <StatusBadge key="me" status={p.payment_method as string} />,
          <span key="d" className="text-foreground-muted text-sm">{fmtDateTime(p.payment_date as string)}</span>,
        ];
      }}
      renderDetail={(p) => <PaymentDetail row={p} />}
      onDelete={onDelete}
    />
  );
}

function AuditLogsTab({ data, onDelete }: { data: Record<string, unknown>[]; onDelete: (id: string) => void }) {
  return (
    <TabSection
      data={data}
      searchKeys={(l) => [(l.user as Record<string, unknown>)?.username as string, l.action_type as string, l.table_name as string, l.action_detail as string, l.ip_address as string]}
      statusKey={(l) => l.action_type as string}
      statusOptions={["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT"]}
      headers={["User", "Action", "Table", "Record ID", "IP", "Timestamp"]}
      renderRow={(l) => [
        <span key="u" className="font-medium text-foreground">{(l.user as Record<string, unknown>)?.username as string ?? "—"}</span>,
        <StatusBadge key="a" status={l.action_type as string} />,
        <span key="t" className="px-2 py-0.5 rounded-lg bg-surface border border-border text-foreground-secondary text-xs font-mono">{(l.table_name as string) || "—"}</span>,
        <span key="rid" className="font-mono text-xs text-foreground-muted">{(l.record_id as string) ? `${(l.record_id as string).slice(0, 8)}…` : "—"}</span>,
        <span key="ip" className="text-foreground-muted text-sm">{(l.ip_address as string) || "—"}</span>,
        <span key="ts" className="text-foreground-muted text-sm">{fmtDateTime(l.created_at as string)}</span>,
      ]}
      renderDetail={(l) => <AuditLogDetail row={l} />}
      onDelete={onDelete}
    />
  );
}

// ─── Main AdminDashboard ──────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [isDark, setIsDark] = useState(true);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loginErr, setLoginErr] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [activeTab, setActiveTab] = useState<Section>("overview");
  const [tabData, setTabData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{ entity: string; id: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("bidnest-theme");
    const dark = stored !== "light";
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("bidnest-theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  }

  useEffect(() => {
    apiFetch("/data?section=overview").then(() => setAuthed(true)).catch(() => setAuthed(false));
  }, []);

  const loadTab = useCallback(async (section: Section) => {
    setLoading(true); setError(""); setTabData(null);
    try {
      const res = await apiFetch(`/data?section=${section}`);
      setTabData(res);
    } catch (e) {
      if ((e as Error).message.includes("401")) setAuthed(false);
      else setError((e as Error).message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (authed) loadTab(activeTab); }, [authed, activeTab, loadTab]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setLoggingIn(true); setLoginErr("");
    try {
      await apiFetch("/auth", { method: "POST", body: JSON.stringify({ password }) });
      setAuthed(true);
    } catch { setLoginErr("Incorrect password. Try again."); }
    finally { setLoggingIn(false); }
  }

  async function handleLogout() {
    await apiFetch("/auth", { method: "DELETE" }).catch(() => {});
    setAuthed(false); setTabData(null);
  }

  function handleDelete(entity: string, id: string) { setConfirmDelete({ entity, id }); }

  async function confirmDeleteAction() {
    if (!confirmDelete) return;
    const { entity, id } = confirmDelete;
    setConfirmDelete(null);
    try { await apiFetch(`/${entity}/${id}`, { method: "DELETE" }); loadTab(activeTab); }
    catch (e) { setError((e as Error).message); }
  }

  // Editing removed: no edit handlers or field schemas required.

  const tabs: { key: Section; label: string; icon: React.ReactNode }[] = [
    { key: "overview",     label: "Overview",     icon: <HiOutlineSquares2X2 className="w-5 h-5" /> },
    { key: "users",        label: "Users",        icon: <HiOutlineUsers className="w-5 h-5" /> },
    { key: "groups",       label: "Groups",       icon: <HiOutlineUserGroup className="w-5 h-5" /> },
    { key: "members",      label: "Members",      icon: <HiOutlineUsers className="w-5 h-5" /> },
    { key: "chit-members", label: "Chit Members", icon: <HiOutlineTicket className="w-5 h-5" /> },
    { key: "auctions",     label: "Auctions",     icon: <HiOutlineTrophy className="w-5 h-5" /> },
    { key: "payments",     label: "Payments",     icon: <HiOutlineBanknotes className="w-5 h-5" /> },
    { key: "audit-logs",   label: "Audit Logs",   icon: <HiOutlineClipboardDocumentList className="w-5 h-5" /> },
  ];

  const tabArr = tabData as Record<string, unknown>[] | null;

  function renderTab() {
    if (loading) return <Spinner />;
    if (error) return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
        <HiOutlineExclamationTriangle className="w-5 h-5 shrink-0" />{error}
      </div>
    );
    if (!tabData) return null;
    if (activeTab === "overview") return <OverviewTab data={tabData as OverviewData} />;
    const arr = (tabArr ?? []) as Record<string, unknown>[];
    return (
      <div className="flex flex-col">
        <div className="flex items-center gap-2 px-5 py-2 bg-cyan-500/5 border-b border-cyan-500/10 text-xs text-cyan-400/70">
          <HiOutlineChevronDown className="w-3.5 h-3.5 shrink-0" />
          Click the <span className="font-semibold text-cyan-400 mx-0.5">▼</span> chevron on any row to expand full details
        </div>
        {activeTab === "users"        && <UsersTab       data={arr} onDelete={(id) => handleDelete("users", id)} />}
        {activeTab === "groups"       && <GroupsTab      data={arr} onDelete={(id) => handleDelete("groups", id)} />}
        {activeTab === "members"      && <MembersTab     data={arr} onDelete={(id) => handleDelete("members", id)} />}
        {activeTab === "chit-members" && <ChitMembersTab data={arr} onDelete={(id) => handleDelete("chit-members", id)} />}
        {activeTab === "auctions"     && <AuctionsTab    data={arr} onDelete={(id) => handleDelete("auctions", id)}     />}
        {activeTab === "payments"     && <PaymentsTab    data={arr} onDelete={(id) => handleDelete("payments", id)}     />}
        {activeTab === "audit-logs"   && <AuditLogsTab   data={arr} onDelete={(id) => handleDelete("audit-logs", id)}   />}
      </div>
    );
  }

  // ── Auth checking ──
  if (authed === null) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-border border-t-cyan-400 animate-spin" />
          <p className="text-sm text-foreground-muted">Checking session…</p>
        </div>
      </div>
    );
  }

  // ── Login screen ──
  if (!authed) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center p-4">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-96 h-96 rounded-full bg-cyan-500/[0.07] blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-80 h-80 rounded-full bg-purple-500/[0.07] blur-[120px]" />
        </div>
        <div className="glass-strong rounded-2xl border border-border w-full max-w-sm p-8 flex flex-col gap-6 animate-slide-in relative z-10">
          <div className="flex flex-col items-center gap-3">
            {/* BUG FIX: bg-gradient-to-br (Tailwind v3), not bg-linear-to-br */}
            <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-cyan-400 to-purple-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <HiOutlineShieldExclamation className="w-8 h-8 text-white" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground">Bid<span className="neon-text">Nest</span> Admin</h2>
              <p className="text-xs text-foreground-muted mt-1">Restricted area — authorised access only</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-foreground-muted uppercase tracking-wide mb-1.5 block">Admin Password</label>
              <div className="relative">
                <HiOutlineLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted pointer-events-none" />
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={`glass-input w-full pl-9 pr-10 py-2.5 text-sm rounded-xl ${loginErr ? "border-red-500/50" : ""}`}
                />
                <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground transition-colors">
                  {showPw ? <HiOutlineEyeSlash className="w-4 h-4" /> : <HiOutlineEye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {loginErr && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <HiOutlineExclamationTriangle className="w-4 h-4 shrink-0" />{loginErr}
              </div>
            )}
            <button type="submit" disabled={loggingIn} className="btn-neon w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {loggingIn ? (
                <><div className="w-4 h-4 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />Verifying…</>
              ) : (
                <><HiOutlineShieldExclamation className="w-4 h-4" />Enter Admin Portal</>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Main dashboard ──
  const activeTabConfig = tabs.find((t) => t.key === activeTab);
  return (
    <div className="min-h-screen bg-mesh">
      {confirmDelete && <ConfirmDialog onConfirm={confirmDeleteAction} onCancel={() => setConfirmDelete(null)} />}
      {/* Editing UI removed — view and delete only */}

      {sidebarOpen && <div className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 border-r border-border z-40 flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ background: "var(--sidebar-bg)", backdropFilter: "blur(20px)" }}
      >
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
          {/* BUG FIX: bg-gradient-to-br */}
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-cyan-400 to-purple-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
            <HiOutlineShieldExclamation className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-foreground font-bold text-base tracking-tight">Bid<span className="neon-text">Nest</span></span>
            <p className="text-[10px] text-foreground-muted font-medium tracking-wider uppercase">Admin Portal</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${isActive ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "text-foreground-secondary hover:bg-surface-hover hover:text-foreground"}`}
              >
                <span className={isActive ? "text-cyan-400" : ""}>{tab.icon}</span>
                {tab.label}
                {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400" />}
              </button>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-border">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground-secondary hover:bg-red-500/10 hover:text-red-400 transition-all">
            <HiOutlineArrowRightOnRectangle className="w-5 h-5" />Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <header
          className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-border"
          style={{ background: "var(--header-bg)", backdropFilter: "blur(12px)" }}
        >
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen((v) => !v)} className="lg:hidden p-2 rounded-xl text-foreground-muted hover:text-foreground hover:bg-surface-hover transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2.5">
              <span className="text-cyan-400">{activeTabConfig?.icon}</span>
              <div>
                <h1 className="text-base font-bold text-foreground">{activeTabConfig?.label}</h1>
                <p className="text-xs text-foreground-muted hidden sm:block">BidNest Admin Portal</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => loadTab(activeTab)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-foreground-secondary border border-border hover:text-cyan-400 hover:border-cyan-500/40 transition-all">
              <HiOutlineArrowPath className="w-4 h-4" /><span className="hidden sm:inline">Refresh</span>
            </button>
            <button onClick={toggleTheme} className="p-2 rounded-xl text-foreground-muted hover:text-foreground hover:bg-surface-hover border border-border transition-all">
              {isDark ? <HiOutlineSun className="w-4 h-4" /> : <HiOutlineMoon className="w-4 h-4" />}
            </button>
            <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all">
              <HiOutlineArrowRightOnRectangle className="w-4 h-4" /><span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-8">
          <div className="glass rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center">
              <div className="flex items-center gap-2 text-cyan-400">
                {activeTabConfig?.icon}
                <span className="text-sm font-semibold text-foreground">{activeTabConfig?.label}</span>
                {tabArr && !loading && activeTab !== "overview" && (
                  <span className="ml-1 px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-semibold border border-cyan-500/20">
                    {tabArr.length} records
                  </span>
                )}
              </div>
            </div>
            <div className="p-4 sm:p-6">{renderTab()}</div>
          </div>
        </main>
      </div>
    </div>
  );
}