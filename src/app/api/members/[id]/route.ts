//src/app/api/members/[id]/route.ts
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

const UpdateMemberSchema = z.object({
  name: JsonTrackSchema.optional(),
  nickname: JsonTrackSchema.optional(),
  mobile: JsonTrackSchema.optional(),
  upi_ids: z.array(UpiIdSchema).optional(),
  is_active: z.boolean().optional(),
});

// ─── GET /api/members/[id] ─────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const member = await prisma.member.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json(member, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── PUT /api/members/[id] ─────────────────────────────────

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const parsed = UpdateMemberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const member = await prisma.member.findUnique({
      where: { id },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const updated = await prisma.member.update({
      where: { id },
      data: parsed.data,
    });

    await logAudit({
      user_id: member.user_id,
      action_type: "UPDATE",
      action_detail: `Member updated: ${id}`,
      table_name: "members",
      record_id: id,
      old_data: { id: member.id, is_active: member.is_active },
      new_data: { id: updated.id, is_active: updated.is_active },
      ip_address: getIp(req),
      user_agent: req.headers.get("user-agent"),
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/members/[id] ──────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const member = await prisma.member.findUnique({
      where: { id },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const updated = await prisma.member.update({
      where: { id },
      data: { is_active: false },
    });

    await logAudit({
      user_id: member.user_id,
      action_type: "DELETE",
      action_detail: `Member deactivated: ${id}`,
      table_name: "members",
      record_id: id,
      old_data: { id: member.id, is_active: true },
      new_data: { id: updated.id, is_active: false },
      ip_address: getIp(req),
      user_agent: req.headers.get("user-agent"),
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}