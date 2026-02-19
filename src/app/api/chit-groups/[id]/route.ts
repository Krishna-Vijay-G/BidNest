import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// ─── SCHEMAS ───────────────────────────────────────────────

const UpdateChitGroupSchema = z.object({
  status: z.enum(["ACTIVE", "PENDING", "CANCELLED", "COMPLETED"]).optional(),
  commission_type: z.enum(["PERCENT", "FIXED"]).optional(),
  commission_value: z.number().positive().optional(),
  round_off_value: z.union([z.literal(10), z.literal(50), z.literal(100)]).optional(),
});

// ─── GET /api/chit-groups/[id] ─────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const chitGroup = await prisma.chitGroup.findUnique({
      where: { id: params.id },
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
  { params }: { params: { id: string } }
) {
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
      where: { id: params.id },
    });

    if (!chitGroup) {
      return NextResponse.json({ error: "Chit group not found" }, { status: 404 });
    }

    const updated = await prisma.chitGroup.update({
      where: { id: params.id },
      data: parsed.data,
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
  { params }: { params: { id: string } }
) {
  try {
    const chitGroup = await prisma.chitGroup.findUnique({
      where: { id: params.id },
    });

    if (!chitGroup) {
      return NextResponse.json({ error: "Chit group not found" }, { status: 404 });
    }

    const updated = await prisma.chitGroup.update({
      where: { id: params.id },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}