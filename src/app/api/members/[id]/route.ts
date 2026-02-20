//src/app/api/members/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

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

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}