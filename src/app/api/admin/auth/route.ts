// src/app/api/admin/auth/route.ts
import { NextRequest, NextResponse } from "next/server";
import { signAdminToken, createAdminCookie, clearAdminCookie } from "@/lib/adminAuth";

// POST /api/admin/auth  — login with password
export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({}));
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected || password !== expected) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = signAdminToken();
  return NextResponse.json(
    { ok: true },
    { status: 200, headers: { "Set-Cookie": createAdminCookie(token) } }
  );
}

// DELETE /api/admin/auth  — logout
export async function DELETE() {
  return NextResponse.json(
    { ok: true },
    { status: 200, headers: { "Set-Cookie": clearAdminCookie() } }
  );
}
