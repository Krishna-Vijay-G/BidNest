// src/lib/auditLog.ts
// Fire-and-forget helper — never throws so it never breaks the calling route.
import { prisma } from "@/lib/prisma";

type ActionType = "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT";

export interface AuditParams {
  user_id?: string | null;
  action_type: ActionType;
  action_detail: string;
  table_name: string;
  record_id: string;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        user_id: params.user_id ?? undefined,
        action_type: params.action_type,
        action_detail: params.action_detail,
        table_name: params.table_name,
        record_id: params.record_id,
        old_data: params.old_data
          ? (JSON.parse(JSON.stringify(params.old_data)) as any)
          : undefined,
        new_data: params.new_data
          ? (JSON.parse(JSON.stringify(params.new_data)) as any)
          : undefined,
        ip_address: params.ip_address ?? undefined,
        user_agent: params.user_agent ?? undefined,
      },
    });
  } catch (err) {
    // Audit failures must never crash the app
    console.error("[auditLog] Failed to write audit log:", err);
  }
}

/** Extract client IP from a Next.js request */
export function getIp(req: { headers: { get(name: string): string | null } }): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null
  );
}
