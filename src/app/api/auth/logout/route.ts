//src/app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookie, getAuthUser } from "@/lib/auth";
import { logAudit, getIp } from "@/lib/auditLog";

export async function POST(req: NextRequest) {
  const authUser = await getAuthUser();

  if (authUser) {
    await logAudit({
      user_id: authUser.id,
      action_type: "LOGOUT",
      action_detail: `User logged out: ${authUser.username}`,
      table_name: "users",
      record_id: authUser.id,
      ip_address: getIp(req),
      user_agent: req.headers.get("user-agent"),
    });
  }

  return NextResponse.json(
    { message: "Logged out" },
    {
      status: 200,
      headers: { "Set-Cookie": clearAuthCookie() },
    }
  );
}