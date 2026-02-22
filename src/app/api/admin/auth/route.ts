// src/app/api/admin/auth/route.ts
import { NextRequest, NextResponse } from "next/server";
import { signAdminToken, createAdminCookie, clearAdminCookie } from "@/lib/adminAuth";
import { logAudit, getIp } from "@/lib/auditLog";

// POST /api/admin/auth  — login with password
export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({}));
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected || password !== expected) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = signAdminToken();

  await logAudit({
    user_id: null,
    action_type: "LOGIN",
    action_detail: "Admin portal login",
    table_name: "admin",
    record_id: crypto.randomUUID(),
    ip_address: getIp(req),
    user_agent: req.headers.get("user-agent"),
  });

  return NextResponse.json(
    { ok: true },
    { status: 200, headers: { "Set-Cookie": createAdminCookie(token) } }
  );
}

// DELETE /api/admin/auth  — logout
export async function DELETE(req: NextRequest) {
  await logAudit({
    user_id: null,
    action_type: "LOGOUT",
    action_detail: "Admin portal logout",
    table_name: "admin",
    record_id: crypto.randomUUID(),
    ip_address: getIp(req),
    user_agent: req.headers.get("user-agent"),
  });

  return NextResponse.json(
    { ok: true },
    { status: 200, headers: { "Set-Cookie": clearAdminCookie() } }
  );
}
