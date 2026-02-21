//src/app/api/chit-groups/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logAudit, getIp } from "@/lib/auditLog";

// ─── SCHEMAS ───────────────────────────────────────────────

const UpdateChitGroupSchema = z.object({
  status: z.enum(["ACTIVE", "PENDING", "CANCELLED", "COMPLETED"]).optional(),
  commission_type: z.enum(["PERCENT", "FIXED"]).optional(),
  commission_value: z.number().positive().optional(),
  round_off_value: z.union([z.literal(10), z.literal(50), z.literal(100)]).optional(),
  auction_start_date: z.string().datetime().optional(),
});

// ─── GET /api/chit-groups/[id] ─────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const chitGroup = await prisma.chitGroup.findUnique({
      where: { id },
      include: {
        user: true,
        chit_members: {
          include: { member: true },
        },
      },
    });

    if (!chitGroup) {
      return NextResponse.json({ error: "Chit group not found" }, { status: 404 });
    }

    return NextResponse.json(chitGroup, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── PUT /api/chit-groups/[id] ─────────────────────────────

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const parsed = UpdateChitGroupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const chitGroup = await prisma.chitGroup.findUnique({
      where: { id },
    });

    if (!chitGroup) {
      return NextResponse.json({ error: "Chit group not found" }, { status: 404 });
    }

    const updated = await prisma.chitGroup.update({
      where: { id },
      data: {
        ...parsed.data,
        ...(parsed.data.auction_start_date
          ? { auction_start_date: new Date(parsed.data.auction_start_date) }
          : {}),
      },
    });

    await logAudit({
      user_id: chitGroup.user_id,
      action_type: "UPDATE",
      action_detail: `Chit group updated: ${chitGroup.name}`,
      table_name: "chit_groups",
      record_id: id,
      old_data: { id: chitGroup.id, status: chitGroup.status },
      new_data: { id: updated.id, status: updated.status },
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

// ─── DELETE /api/chit-groups/[id] ──────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const chitGroup = await prisma.chitGroup.findUnique({
      where: { id },
    });

    if (!chitGroup) {
      return NextResponse.json({ error: "Chit group not found" }, { status: 404 });
    }

    const updated = await prisma.chitGroup.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    await logAudit({
      user_id: chitGroup.user_id,
      action_type: "DELETE",
      action_detail: `Chit group cancelled: ${chitGroup.name}`,
      table_name: "chit_groups",
      record_id: id,
      old_data: { id: chitGroup.id, status: chitGroup.status },
      new_data: { id: updated.id, status: "CANCELLED" },
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