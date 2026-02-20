//src/app/api/chit-members/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// ─── SCHEMAS ───────────────────────────────────────────────

const CreateChitMemberSchema = z.object({
  member_id: z.string().uuid(),
  chit_group_id: z.string().uuid(),
  ticket_number: z.number().int().positive(),
});

// ─── POST /api/chit-members ────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateChitMemberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // check member exists
    const member = await prisma.member.findUnique({
      where: { id: parsed.data.member_id },
    });
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // check chit group exists
    const chitGroup = await prisma.chitGroup.findUnique({
      where: { id: parsed.data.chit_group_id },
    });
    if (!chitGroup) {
      return NextResponse.json({ error: "Chit group not found" }, { status: 404 });
    }

    // check ticket_number not already taken in this chit group
    const ticketTaken = await prisma.chitMember.findUnique({
      where: {
        chit_group_id_ticket_number: {
          chit_group_id: parsed.data.chit_group_id,
          ticket_number: parsed.data.ticket_number,
        },
      },
    });
    if (ticketTaken) {
      return NextResponse.json(
        { error: `Ticket #${parsed.data.ticket_number} is already taken` },
        { status: 409 }
      );
    }

    // check total tickets not exceeding total_members
    const ticketCount = await prisma.chitMember.count({
      where: { chit_group_id: parsed.data.chit_group_id },
    });
    if (ticketCount >= chitGroup.total_members) {
      return NextResponse.json(
        { error: `Chit group is full. Max ${chitGroup.total_members} members allowed` },
        { status: 409 }
      );
    }

    const chitMember = await prisma.chitMember.create({
      data: parsed.data,
    });

    return NextResponse.json(chitMember, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── GET /api/chit-members ─────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const chit_group_id = searchParams.get("chit_group_id");
    const member_id = searchParams.get("member_id");

    const chitMembers = await prisma.chitMember.findMany({
      where: {
        ...(chit_group_id ? { chit_group_id } : {}),
        ...(member_id ? { member_id } : {}),
      },
      include: {
        member: true,
        chit_group: true,
      },
      orderBy: { ticket_number: "asc" },
    });

    return NextResponse.json(chitMembers, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}