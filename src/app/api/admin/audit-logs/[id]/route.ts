// src/app/api/admin/audit-logs/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminToken } from "@/lib/adminAuth";
import { logAudit, getIp } from "@/lib/auditLog";

function guard(req: NextRequest) {
  return verifyAdminToken(req.cookies.get("bidnest-admin-session")?.value);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!guard(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    await prisma.auditLog.delete({ where: { id } });
    await logAudit({
      user_id: null,
      action_type: "DELETE",
      action_detail: `Admin deleted audit log: ${id}`,
      table_name: "audit_logs",
      record_id: id,
      ip_address: getIp(req),
      user_agent: req.headers.get("user-agent"),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
