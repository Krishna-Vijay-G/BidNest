//src/app/api/chit-members/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logAudit, getIp } from "@/lib/auditLog";

// ─── SCHEMAS ───────────────────────────────────────────────

const UpdateChitMemberSchema = z.object({
  is_active: z.boolean().optional(),
});

// ─── GET /api/chit-members/[id] ────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const chitMember = await prisma.chitMember.findUnique({
      where: { id },
      include: {
        member: true,
        chit_group: true,
      },
    });

    if (!chitMember) {
      return NextResponse.json({ error: "Chit member not found" }, { status: 404 });
    }

    return NextResponse.json(chitMember, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── PUT /api/chit-members/[id] ────────────────────────────

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const parsed = UpdateChitMemberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const chitMember = await prisma.chitMember.findUnique({
      where: { id },
    });

    if (!chitMember) {
      return NextResponse.json({ error: "Chit member not found" }, { status: 404 });
    }

    const updated = await prisma.chitMember.update({
      where: { id },
      data: parsed.data,
    });

    await logAudit({
      user_id: null,
      action_type: "UPDATE",
      action_detail: `Chit member updated: ${id}`,
      table_name: "chit_members",
      record_id: id,
      old_data: { id: chitMember.id, is_active: chitMember.is_active },
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

// ─── DELETE /api/chit-members/[id] ─────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const chitMember = await prisma.chitMember.findUnique({
      where: { id },
    });

    if (!chitMember) {
      return NextResponse.json({ error: "Chit member not found" }, { status: 404 });
    }

    const updated = await prisma.chitMember.update({
      where: { id },
      data: { is_active: false },
    });

    await logAudit({
      user_id: null,
      action_type: "DELETE",
      action_detail: `Chit member deactivated: ticket #${chitMember.ticket_number} in group ${chitMember.chit_group_id}`,
      table_name: "chit_members",
      record_id: id,
      old_data: { id: chitMember.id, is_active: true },
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