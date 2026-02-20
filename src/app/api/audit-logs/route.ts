//src/app/api/audit-logs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// ─── SCHEMAS ───────────────────────────────────────────────

const CreateAuditLogSchema = z.object({
  user_id: z.string().uuid().optional(),
  action_type: z.enum(["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT"]),
  action_detail: z.string().min(1),
  table_name: z.string().min(1),
  record_id: z.string().uuid(),
  old_data: z.record(z.string(), z.any()).optional(),
  new_data: z.record(z.string(), z.any()).optional(),
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
});

// ─── POST /api/audit-logs ──────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateAuditLogSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // if user_id provided, check user exists
    if (parsed.data.user_id) {
      const user = await prisma.user.findUnique({
        where: { id: parsed.data.user_id },
      });
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
    }

    const auditLog = await prisma.auditLog.create({
      data: {
        user_id: parsed.data.user_id,
        action_type: parsed.data.action_type,
        action_detail: parsed.data.action_detail,
        table_name: parsed.data.table_name,
        record_id: parsed.data.record_id,
        ip_address: parsed.data.ip_address,
        user_agent: parsed.data.user_agent,
        old_data: parsed.data.old_data ? JSON.parse(JSON.stringify(parsed.data.old_data)) : undefined,
        new_data: parsed.data.new_data ? JSON.parse(JSON.stringify(parsed.data.new_data)) : undefined,
      },
    });

    return NextResponse.json(auditLog, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// ─── GET /api/audit-logs ───────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");
    const action_type = searchParams.get("action_type");
    const table_name = searchParams.get("table_name");
    const record_id = searchParams.get("record_id");

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        ...(user_id ? { user_id } : {}),
        ...(action_type ? { action_type: action_type as any } : {}),
        ...(table_name ? { table_name } : {}),
        ...(record_id ? { record_id } : {}),
      },
      include: {
        user: true,
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json(auditLogs, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}