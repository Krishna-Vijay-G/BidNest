import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// ─── SCHEMAS ───────────────────────────────────────────────

const UpdateChitMemberSchema = z.object({
  is_active: z.boolean().optional(),
});

// ─── GET /api/chit-members/[id] ────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const chitMember = await prisma.chitMember.findUnique({
      where: { id: params.id },
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
  { params }: { params: { id: string } }
) {
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
      where: { id: params.id },
    });

    if (!chitMember) {
      return NextResponse.json({ error: "Chit member not found" }, { status: 404 });
    }

    const updated = await prisma.chitMember.update({
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

// ─── DELETE /api/chit-members/[id] ─────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const chitMember = await prisma.chitMember.findUnique({
      where: { id: params.id },
    });

    if (!chitMember) {
      return NextResponse.json({ error: "Chit member not found" }, { status: 404 });
    }

    const updated = await prisma.chitMember.update({
      where: { id: params.id },
      data: { is_active: false },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}