// src/app/api/admin/groups/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminToken } from "@/lib/adminAuth";
import { z } from "zod";

function guard(req: NextRequest) {
  return verifyAdminToken(req.cookies.get("bidnest-admin-session")?.value);
}

const UpdateGroupSchema = z.object({
  name: z.string().min(2).optional(),
  group_size: z.number().int().positive().optional(),
  chit_amount: z.number().positive().optional(),
  commission_type: z.enum(["PERCENTAGE", "FLAT"]).optional(),
  commission_value: z.number().min(0).optional(),
  round_off_value: z.number().min(0).optional(),
  status: z.enum(["PENDING", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
  auction_start_date: z.string().datetime().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!guard(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const parsed = UpdateGroupSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { auction_start_date, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (auction_start_date) data.auction_start_date = new Date(auction_start_date);
  try {
    const updated = await prisma.chitGroup.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!guard(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    await prisma.payment.deleteMany({ where: { chit_group_id: id } });
    await prisma.auction.deleteMany({ where: { chit_group_id: id } });
    await prisma.chitMember.deleteMany({ where: { chit_group_id: id } });
    await prisma.chitGroup.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
