"use client";

import { useState, useEffect, useCallback } from "react";
import {
  HiOutlineSquares2X2,
  HiOutlineUsers,
  HiOutlineUserGroup,
  HiOutlineTicket,
  HiOutlineTrophy,
  HiOutlineBanknotes,
  HiOutlineClipboardDocumentList,
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineArrowRightOnRectangle,
  HiOutlineArrowPath,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineShieldExclamation,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineCurrencyRupee,
  HiOutlineChartBarSquare,
  HiOutlineExclamationTriangle,
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineEyeSlash,
} from "react-icons/hi2";

// ─── Types ────────────────────────────────────────────────────────────────────

type Section =
  | "overview"
  | "users"
  | "groups"
  | "members"
  | "chit-members"
  | "auctions"
  | "payments"
  | "audit-logs";

interface OverviewData {
  users: number;
  groups: number;
  members: number;
  chitMembers: number;
  auctions: number;
  payments: number;
  auditLogs: number;
  totalChitAmount: number;
  totalPaid: number;
}

interface EditField {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "boolean";
  options?: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const API = (path: string) => `/api/admin${path}`;

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(API(path), {
    credentials: "include",
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtMoney(n: number | null | undefined) {
  if (n == null) return "—";
  return "₹" + Number(n).toLocaleString("en-IN");
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE:     "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    COMPLETED:  "text-blue-400 bg-blue-500/10 border-blue-500/20",
    CANCELLED:  "text-red-400 bg-red-500/10 border-red-500/20",
    PENDING:    "text-amber-400 bg-amber-500/10 border-amber-500/20",
    PAID:       "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    PARTIAL:    "text-amber-400 bg-amber-500/10 border-amber-500/20",
    OVERDUE:    "text-red-400 bg-red-500/10 border-red-500/20",
    CREATE:     "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    UPDATE:     "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    DELETE:     "text-red-400 bg-red-500/10 border-red-500/20",
    LOGIN:      "text-blue-400 bg-blue-500/10 border-blue-500/20",
    LOGOUT:     "text-foreground-muted bg-surface border-border",
  };
  const cls = map[status] ?? "text-foreground-muted bg-surface border-border";
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-semibold border ${cls}`}>
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

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-10 h-10 rounded-full border-2 border-border border-t-cyan-400 animate-spin" />
    </div>
  );
}

// ─── Glass Table ──────────────────────────────────────────────────────────────

function AdminTable({
  headers,
  rows,
  empty = "No records found.",
}: {
  headers: string[];
  rows: React.ReactNode[][];
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
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Action Buttons ───────────────────────────────────────────────────────────

function EditBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-1.5 rounded-lg text-foreground-muted hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
      title="Edit"
    >
      <HiOutlinePencilSquare className="w-4 h-4" />
    </button>
  );
}

function DeleteBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-1.5 rounded-lg text-foreground-muted hover:text-red-400 hover:bg-red-500/10 transition-all"
      title="Delete"
    >
      <HiOutlineTrash className="w-4 h-4" />
    </button>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({
  title,
  fields,
  initial,
  onSave,
  onClose,
}: {
  title: string;
  fields: EditField[];
  initial: Record<string, unknown>;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Record<string, unknown>>(
    Object.fromEntries(
      fields.map((f) => [
        f.key,
        f.type === "date" && initial[f.key]
          ? new Date(initial[f.key] as string).toISOString().slice(0, 10)
          : (initial[f.key] ?? ""),
      ])
    )
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function handleSave() {
    setSaving(true);
    setErr("");
    try {
      const payload: Record<string, unknown> = {};
      for (const f of fields) {
        const v = form[f.key];
        if (v === "" || v === undefined) continue;
        if (f.type === "number") payload[f.key] = Number(v);
        else if (f.type === "boolean") payload[f.key] = v === "true" || v === true;
        else if (f.type === "date") payload[f.key] = new Date(v as string).toISOString();
        else payload[f.key] = v;
      }
      await onSave(payload);
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-strong rounded-2xl border border-border w-full max-w-md p-6 flex flex-col gap-5 animate-slide-in">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-hover transition-all"
          >
            <HiOutlineXCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {fields.map((f) => (
            <div key={f.key} className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground-muted uppercase tracking-wide">
                {f.label}
              </label>
              {f.type === "select" || f.type === "boolean" ? (
                <select
                  value={String(form[f.key])}
                  onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                  className="glass-input px-3 py-2 text-sm rounded-xl w-full"
                >
                  {f.type === "boolean" ? (
                    <>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </>
                  ) : (
                    f.options!.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))
                  )}
                </select>
              ) : (
                <input
                  type={f.type}
                  value={form[f.key] as string}
                  onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                  className="glass-input px-3 py-2 text-sm rounded-xl w-full"
                />
              )}
            </div>
          ))}
        </div>

        {err && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <HiOutlineExclamationTriangle className="w-4 h-4 shrink-0" />
            {err}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-foreground-secondary border border-border hover:bg-surface-hover transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-semibold btn-neon disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-strong rounded-2xl border border-border w-full max-w-sm p-6 flex flex-col gap-5 animate-slide-in">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <HiOutlineExclamationTriangle className="w-7 h-7 text-red-400" />
          </div>
          <h3 className="text-base font-bold text-foreground">Delete Record</h3>
          <p className="text-sm text-foreground-muted leading-relaxed">
            Are you sure you want to permanently delete this record? This action
            cannot be undone.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-foreground-secondary border border-border hover:bg-surface-hover transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ data }: { data: OverviewData }) {
  const cards = [
    { label: "Total Users",       value: data.users,                    icon: <HiOutlineUsers className="w-6 h-6" />,                  color: "text-cyan-400",    bg: "bg-cyan-500/10"    },
    { label: "Chit Groups",       value: data.groups,                   icon: <HiOutlineUserGroup className="w-6 h-6" />,               color: "text-purple-400",  bg: "bg-purple-500/10"  },
    { label: "Members",           value: data.members,                  icon: <HiOutlineUsers className="w-6 h-6" />,                   color: "text-blue-400",    bg: "bg-blue-500/10"    },
    { label: "Chit Members",      value: data.chitMembers,              icon: <HiOutlineTicket className="w-6 h-6" />,                  color: "text-indigo-400",  bg: "bg-indigo-500/10"  },
    { label: "Auctions",          value: data.auctions,                 icon: <HiOutlineTrophy className="w-6 h-6" />,                  color: "text-amber-400",   bg: "bg-amber-500/10"   },
    { label: "Payments",          value: data.payments,                 icon: <HiOutlineBanknotes className="w-6 h-6" />,               color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Audit Logs",        value: data.auditLogs,                icon: <HiOutlineClipboardDocumentList className="w-6 h-6" />,   color: "text-foreground",  bg: "bg-surface"        },
    { label: "Total Chit Value",  value: fmtMoney(data.totalChitAmount),icon: <HiOutlineCurrencyRupee className="w-6 h-6" />,           color: "text-cyan-400",    bg: "bg-cyan-500/10"    },
    { label: "Total Collected",   value: fmtMoney(data.totalPaid),      icon: <HiOutlineChartBarSquare className="w-6 h-6" />,          color: "text-emerald-400", bg: "bg-emerald-500/10" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="glass rounded-2xl border border-border p-5 flex flex-col gap-3">
          <div className={`w-11 h-11 rounded-xl ${c.bg} ${c.color} flex items-center justify-center`}>
            {c.icon}
          </div>
          <div>
            <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
            <p className="text-xs text-foreground-muted mt-0.5">{c.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab({
  data,
  onDelete,
  onEdit,
}: {
  data: Record<string, unknown>[];
  onDelete: (id: string) => void;
  onEdit: (row: Record<string, unknown>) => void;
}) {
  return (
    <AdminTable
      headers={["User", "Email", "Phone", "Active", "Created", "Groups", "Members", "Actions"]}
      rows={data.map((u) => [
        <div key="u" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
            {(u.username as string)?.charAt(0).toUpperCase()}
          </div>
          <span className="font-semibold text-foreground">{u.username as string}</span>
        </div>,
        <span key="e" className="text-foreground-secondary text-sm">{u.email as string}</span>,
        <span key="p" className="text-foreground-secondary text-sm">{(u.phone as string) || "—"}</span>,
        <YesBadge key="a" yes={u.is_active as boolean} />,
        <span key="c" className="text-foreground-muted text-sm">{fmtDate(u.created_at as string)}</span>,
        <span key="g" className="font-medium text-foreground">{(u._count as Record<string, number>)?.chit_groups ?? 0}</span>,
        <span key="m" className="font-medium text-foreground">{(u._count as Record<string, number>)?.members ?? 0}</span>,
        <div key="act" className="flex items-center gap-1">
          <EditBtn onClick={() => onEdit(u)} />
          <DeleteBtn onClick={() => onDelete(u.id as string)} />
        </div>,
      ])}
    />
  );
}

// ─── Groups Tab ───────────────────────────────────────────────────────────────

function GroupsTab({
  data,
  onDelete,
  onEdit,
}: {
  data: Record<string, unknown>[];
  onDelete: (id: string) => void;
  onEdit: (row: Record<string, unknown>) => void;
}) {
  return (
    <AdminTable
      headers={["Name", "Total Amount", "Members", "Duration", "Commission", "Status", "Tickets", "Auctions", "Actions"]}
      rows={data.map((g) => [
        <span key="n" className="font-semibold text-foreground">{g.name as string}</span>,
        <span key="ca" className="font-medium text-cyan-400">{fmtMoney(g.total_amount as number)}</span>,
        <span key="sz" className="text-foreground-secondary">{g.total_members as number}</span>,
        <span key="du" className="text-foreground-secondary">{g.duration_months as number}m</span>,
        <span key="co" className="text-foreground-secondary text-sm">
          {g.commission_value as string}{g.commission_type === "PERCENT" ? "%" : " flat"}
        </span>,
        <StatusBadge key="s" status={g.status as string} />,
        <span key="cm" className="text-foreground">{(g._count as Record<string, number>)?.chit_members ?? 0}</span>,
        <span key="au" className="text-foreground">{(g._count as Record<string, number>)?.auctions ?? 0}</span>,
        <div key="act" className="flex items-center gap-1">
          <EditBtn onClick={() => onEdit(g)} />
          <DeleteBtn onClick={() => onDelete(g.id as string)} />
        </div>,
      ])}
    />
  );
}

// ─── Members Tab ──────────────────────────────────────────────────────────────

function MembersTab({
  data,
  onDelete,
  onEdit,
}: {
  data: Record<string, unknown>[];
  onDelete: (id: string) => void;
  onEdit: (row: Record<string, unknown>) => void;
}) {
  return (
    <AdminTable
      headers={["Name", "Nickname", "Mobile", "Active", "Owner", "Tickets", "Actions"]}
      rows={data.map((m) => {
        const nameVal = (m.name as { value: string } | string);
        const displayName = typeof nameVal === "object" ? nameVal?.value : nameVal;
        const nickVal = (m.nickname as { value: string } | string);
        const displayNick = typeof nickVal === "object" ? nickVal?.value : nickVal;
        const mobVal = (m.mobile as { value: string } | string);
        const displayMob = typeof mobVal === "object" ? mobVal?.value : mobVal;
        return [
          <div key="n" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-semibold text-xs shrink-0">
              {displayName?.charAt(0).toUpperCase()}
            </div>
            <span className="font-medium text-foreground">{displayName}</span>
          </div>,
          <span key="ni" className="text-foreground-muted text-sm">"{displayNick || "—"}"</span>,
          <span key="mo" className="text-foreground-secondary text-sm">{displayMob || "—"}</span>,
          <YesBadge key="a" yes={m.is_active as boolean} />,
          <span key="ow" className="text-foreground-secondary text-sm">{(m.user as Record<string, unknown>)?.username as string}</span>,
          <span key="ti" className="font-medium text-foreground">{(m._count as Record<string, number>)?.chit_members ?? 0}</span>,
          <div key="act" className="flex items-center gap-1">
            <EditBtn onClick={() => onEdit(m)} />
            <DeleteBtn onClick={() => onDelete(m.id as string)} />
          </div>,
        ];
      })}
    />
  );
}

// ─── Chit Members Tab ─────────────────────────────────────────────────────────

function ChitMembersTab({
  data,
  onDelete,
}: {
  data: Record<string, unknown>[];
  onDelete: (id: string) => void;
}) {
  return (
    <AdminTable
      headers={["Member", "Group", "Ticket #", "Active", "Payments", "Actions"]}
      rows={data.map((cm) => {
        const memberName = (cm.member as Record<string, unknown>)?.name;
        const displayName = typeof memberName === "object" ? (memberName as { value: string })?.value : memberName as string;
        return [
          <span key="m" className="font-medium text-foreground">{displayName || "—"}</span>,
          <span key="g" className="text-foreground-secondary text-sm">{(cm.chit_group as Record<string, unknown>)?.name as string}</span>,
          <span key="t" className="px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-400 text-xs font-bold border border-cyan-500/20">
            #{cm.ticket_number as number}
          </span>,
          <YesBadge key="a" yes={cm.is_active as boolean} />,
          <span key="p" className="font-medium text-foreground">{(cm._count as Record<string, number>)?.payments ?? 0}</span>,
          <DeleteBtn key="d" onClick={() => onDelete(cm.id as string)} />,
        ];
      })}
    />
  );
}

// ─── Auctions Tab ─────────────────────────────────────────────────────────────

function AuctionsTab({
  data,
  onDelete,
}: {
  data: Record<string, unknown>[];
  onDelete: (id: string) => void;
}) {
  return (
    <AdminTable
      headers={["Group", "Month", "Date", "Bid", "Winning Amount", "Winner", "Actions"]}
      rows={data.map((a) => {
        const winnerMember = ((a.winner_chit_member as Record<string, unknown>)?.member as Record<string, unknown>);
        const winnerName = typeof winnerMember?.name === "object"
          ? (winnerMember.name as { value: string })?.value
          : winnerMember?.name as string;
        return [
          <span key="g" className="font-medium text-foreground">{(a.chit_group as Record<string, unknown>)?.name as string}</span>,
          <span key="mn" className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/20">
            Month {a.month_number as number}
          </span>,
          <span key="d" className="text-foreground-muted text-sm">{fmtDate(a.created_at as string)}</span>,
          <span key="b" className="text-foreground-secondary text-sm">{fmtMoney(a.original_bid as number)}</span>,
          <span key="w" className="font-semibold text-emerald-400">{fmtMoney(a.winning_amount as number)}</span>,
          <span key="wn" className="font-medium text-foreground">{winnerName || "—"}</span>,
          <DeleteBtn key="d2" onClick={() => onDelete(a.id as string)} />,
        ];
      })}
    />
  );
}

// ─── Payments Tab ─────────────────────────────────────────────────────────────

function PaymentsTab({
  data,
  onDelete,
}: {
  data: Record<string, unknown>[];
  onDelete: (id: string) => void;
}) {
  return (
    <AdminTable
      headers={["Member", "Group", "Month", "Amount Paid", "Status", "Method", "Date", "Actions"]}
      rows={data.map((p) => {
        const cm = p.chit_member as Record<string, unknown> | null;
        const memberName = (cm?.member as Record<string, unknown>)?.name;
        const displayName = typeof memberName === "object"
          ? (memberName as { value: string })?.value
          : memberName as string;
        return [
          <span key="m" className="font-medium text-foreground">{displayName || "—"}</span>,
          <span key="g" className="text-foreground-secondary text-sm">{(p.chit_group as Record<string, unknown>)?.name as string}</span>,
          <span key="mn" className="text-foreground-secondary">Month {p.month_number as number}</span>,
          <span key="a" className="font-semibold text-cyan-400">{fmtMoney(p.amount_paid as number)}</span>,
          <StatusBadge key="s" status={p.status as string} />,
          <span key="me" className="px-2 py-0.5 rounded-lg bg-surface border border-border text-foreground-secondary text-xs font-medium">
            {p.payment_method as string}
          </span>,
          <span key="d" className="text-foreground-muted text-sm">{fmtDate(p.payment_date as string)}</span>,
          <DeleteBtn key="d2" onClick={() => onDelete(p.id as string)} />,
        ];
      })}
    />
  );
}

// ─── Audit Logs Tab ───────────────────────────────────────────────────────────

function AuditLogsTab({
  data,
  onDelete,
}: {
  data: Record<string, unknown>[];
  onDelete: (id: string) => void;
}) {
  return (
    <AdminTable
      headers={["User", "Action", "Table", "Record ID", "IP", "Timestamp", "Actions"]}
      rows={data.map((l) => [
        <span key="u" className="font-medium text-foreground">
          {(l.user as Record<string, unknown>)?.username as string ?? "—"}
        </span>,
        <StatusBadge key="a" status={l.action_type as string} />,
        <span key="t" className="px-2 py-0.5 rounded-lg bg-surface border border-border text-foreground-secondary text-xs font-mono">
          {(l.table_name as string) || "—"}
        </span>,
        <span key="rid" className="font-mono text-xs text-foreground-muted">
          {(l.record_id as string)?.slice(0, 8) ?? "—"}…
        </span>,
        <span key="ip" className="text-foreground-muted text-sm">{(l.ip_address as string) || "—"}</span>,
        <span key="ts" className="text-foreground-muted text-sm">{fmtDate(l.created_at as string)}</span>,
        <DeleteBtn key="d" onClick={() => onDelete(l.id as string)} />,
      ])}
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
  const [editModal, setEditModal] = useState<{ entity: string; id: string; row: Record<string, unknown> } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Theme
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

  // Auth check
  useEffect(() => {
    apiFetch("/data?section=overview")
      .then(() => setAuthed(true))
      .catch(() => setAuthed(false));
  }, []);

  // Load tab
  const loadTab = useCallback(async (section: Section) => {
    setLoading(true);
    setError("");
    setTabData(null);
    try {
      const res = await apiFetch(`/data?section=${section}`);
      setTabData(res);
    } catch (e) {
      if ((e as Error).message.includes("401")) {
        setAuthed(false);
      } else {
        setError((e as Error).message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed) loadTab(activeTab);
  }, [authed, activeTab, loadTab]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoggingIn(true);
    setLoginErr("");
    try {
      await apiFetch("/auth", { method: "POST", body: JSON.stringify({ password }) });
      setAuthed(true);
    } catch {
      setLoginErr("Incorrect password. Try again.");
    } finally {
      setLoggingIn(false);
    }
  }

  async function handleLogout() {
    await apiFetch("/auth", { method: "DELETE" }).catch(() => {});
    setAuthed(false);
    setTabData(null);
  }

  function handleDelete(entity: string, id: string) {
    setConfirmDelete({ entity, id });
  }

  async function confirmDeleteAction() {
    if (!confirmDelete) return;
    const { entity, id } = confirmDelete;
    setConfirmDelete(null);
    try {
      await apiFetch(`/${entity}/${id}`, { method: "DELETE" });
      loadTab(activeTab);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleEditSave(data: Record<string, unknown>) {
    if (!editModal) return;
    const { entity, id } = editModal;
    await apiFetch(`/${entity}/${id}`, { method: "PUT", body: JSON.stringify(data) });
    loadTab(activeTab);
  }

  function getEditFields(entity: string): EditField[] {
    if (entity === "users") return [
      { key: "username", label: "Username", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "phone", label: "Phone", type: "text" },
      { key: "is_active", label: "Active", type: "boolean" },
    ];
    if (entity === "groups") return [
      { key: "name", label: "Group Name", type: "text" },
      { key: "commission_type", label: "Commission Type", type: "select", options: ["PERCENT", "FIXED"] },
      { key: "commission_value", label: "Commission Value", type: "number" },
      { key: "round_off_value", label: "Round Off", type: "number" },
      { key: "status", label: "Status", type: "select", options: ["PENDING", "ACTIVE", "COMPLETED", "CANCELLED"] },
    ];
    if (entity === "members") return [
      { key: "is_active", label: "Active", type: "boolean" },
    ];
    return [];
  }

  // ── Tabs config ──
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
        <HiOutlineExclamationTriangle className="w-5 h-5 shrink-0" />
        {error}
      </div>
    );
    if (!tabData) return null;
    if (activeTab === "overview") return <OverviewTab data={tabData as OverviewData} />;
    if (!tabArr || !tabArr.length) return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <HiOutlineClipboardDocumentList className="w-10 h-10 text-foreground-muted" />
        <p className="text-sm text-foreground-muted">No records found.</p>
      </div>
    );
    if (activeTab === "users")        return <UsersTab data={tabArr} onDelete={(id) => handleDelete("users", id)} onEdit={(row) => setEditModal({ entity: "users", id: row.id as string, row })} />;
    if (activeTab === "groups")       return <GroupsTab data={tabArr} onDelete={(id) => handleDelete("groups", id)} onEdit={(row) => setEditModal({ entity: "groups", id: row.id as string, row })} />;
    if (activeTab === "members")      return <MembersTab data={tabArr} onDelete={(id) => handleDelete("members", id)} onEdit={(row) => setEditModal({ entity: "members", id: row.id as string, row })} />;
    if (activeTab === "chit-members") return <ChitMembersTab data={tabArr} onDelete={(id) => handleDelete("chit-members", id)} />;
    if (activeTab === "auctions")     return <AuctionsTab data={tabArr} onDelete={(id) => handleDelete("auctions", id)} />;
    if (activeTab === "payments")     return <PaymentsTab data={tabArr} onDelete={(id) => handleDelete("payments", id)} />;
    if (activeTab === "audit-logs")   return <AuditLogsTab data={tabArr} onDelete={(id) => handleDelete("audit-logs", id)} />;
    return null;
  }

  // ── Auth Checking ──
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

  // ── Login Screen ──
  if (!authed) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center p-4">
        {/* Ambient orbs */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-96 h-96 rounded-full bg-cyan-500/[0.07] blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-80 h-80 rounded-full bg-purple-500/[0.07] blur-[120px]" />
        </div>

        <div className="glass-strong rounded-2xl border border-border w-full max-w-sm p-8 flex flex-col gap-6 animate-slide-in relative z-10">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <HiOutlineShieldExclamation className="w-8 h-8 text-white" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground">
                Bid<span className="neon-text">Nest</span> Admin
              </h2>
              <p className="text-xs text-foreground-muted mt-1">Restricted area — authorised access only</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="relative">
              <label className="text-xs font-semibold text-foreground-muted uppercase tracking-wide mb-1.5 block">
                Admin Password
              </label>
              <div className="relative">
                <HiOutlineLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={`glass-input w-full pl-9 pr-10 py-2.5 text-sm rounded-xl ${loginErr ? "border-red-500/50" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground transition-colors"
                >
                  {showPw ? <HiOutlineEyeSlash className="w-4 h-4" /> : <HiOutlineEye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {loginErr && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <HiOutlineExclamationTriangle className="w-4 h-4 shrink-0" />
                {loginErr}
              </div>
            )}

            <button
              type="submit"
              disabled={loggingIn}
              className="btn-neon w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loggingIn ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
                  Verifying…
                </>
              ) : (
                <>
                  <HiOutlineShieldExclamation className="w-4 h-4" />
                  Enter Admin Portal
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Main Dashboard ──
  const activeTabConfig = tabs.find((t) => t.key === activeTab);

  return (
    <div className="min-h-screen bg-mesh">
      {/* Dialogs */}
      {confirmDelete && (
        <ConfirmDialog
          onConfirm={confirmDeleteAction}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      {editModal && (
        <EditModal
          title={`Edit ${editModal.entity.replace("-", " ")}`}
          fields={getEditFields(editModal.entity)}
          initial={editModal.row}
          onSave={handleEditSave}
          onClose={() => setEditModal(null)}
        />
      )}

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 border-r border-border z-40 flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ background: "var(--sidebar-bg)", backdropFilter: "blur(20px)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
            <HiOutlineShieldExclamation className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-foreground font-bold text-base tracking-tight">
              Bid<span className="neon-text">Nest</span>
            </span>
            <p className="text-[10px] text-foreground-muted font-medium tracking-wider uppercase">Admin Portal</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                  isActive
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                    : "text-foreground-secondary hover:bg-surface-hover hover:text-foreground"
                }`}
              >
                <span className={isActive ? "text-cyan-400" : ""}>{tab.icon}</span>
                {tab.label}
                {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400" />}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground-secondary hover:bg-red-500/10 hover:text-red-400 transition-all"
          >
            <HiOutlineArrowRightOnRectangle className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Header */}
        <header
          className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-border"
          style={{ background: "var(--header-bg)", backdropFilter: "blur(12px)" }}
        >
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setSidebarOpen(v => !v)}
              className="lg:hidden p-2 rounded-xl text-foreground-muted hover:text-foreground hover:bg-surface-hover transition-all"
            >
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
            {/* Refresh */}
            <button
              onClick={() => loadTab(activeTab)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-foreground-secondary border border-border hover:text-cyan-400 hover:border-cyan-500/40 transition-all"
              title="Refresh"
            >
              <HiOutlineArrowPath className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-foreground-muted hover:text-foreground hover:bg-surface-hover border border-border transition-all"
              title={isDark ? "Light mode" : "Dark mode"}
            >
              {isDark ? <HiOutlineSun className="w-4 h-4" /> : <HiOutlineMoon className="w-4 h-4" />}
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all"
            >
              <HiOutlineArrowRightOnRectangle className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-8">
          <div className="glass rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-400">
                {activeTabConfig?.icon}
                <span className="text-sm font-semibold text-foreground">{activeTabConfig?.label}</span>
                {tabArr && !loading && (
                  <span className="ml-1 px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-semibold border border-cyan-500/20">
                    {activeTab === "overview" ? "" : `${tabArr.length} records`}
                  </span>
                )}
              </div>
            </div>
            <div className="p-4 sm:p-6">
              {renderTab()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}