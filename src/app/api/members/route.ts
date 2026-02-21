//src/app/api/members/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logAudit, getIp } from "@/lib/auditLog";

// ─── SCHEMAS ───────────────────────────────────────────────

const JsonTrackSchema = z.object({
  value: z.string().min(1),
  updated_at: z.string().datetime(),
});

const UpiIdSchema = z.object({
  value: z.string().min(1),
  added_at: z.string().datetime(),
  is_active: z.boolean(),
});

const CreateMemberSchema = z.object({
  user_id: z.string().uuid(),
  name: JsonTrackSchema,
  nickname: JsonTrackSchema,
  mobile: JsonTrackSchema,
  upi_ids: z.array(UpiIdSchema).default([]),
  is_active: z.boolean().optional().default(true),
});

// ─── POST /api/members ─────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateMemberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: parsed.data.user_id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const member = await prisma.member.create({
      data: parsed.data,
    });

    await logAudit({
      user_id: parsed.data.user_id,
      action_type: "CREATE",
      action_detail: `Member created: ${(parsed.data.name as any).value}`,
      table_name: "members",
      record_id: member.id,
      new_data: { id: member.id, name: (parsed.data.name as any).value },
      ip_address: getIp(req),
      user_agent: req.headers.get("user-agent"),
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── GET /api/members ──────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");

    const members = await prisma.member.findMany({
      where: user_id ? { user_id } : {},
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json(members, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}