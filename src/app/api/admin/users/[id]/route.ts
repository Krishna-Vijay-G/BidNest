// src/app/api/admin/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminToken } from "@/lib/adminAuth";
import { z } from "zod";

function guard(req: NextRequest) {
  return verifyAdminToken(req.cookies.get("bidnest-admin-session")?.value);
}

const UpdateUserSchema = z.object({
  username: z.string().min(3).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).optional(),
  is_active: z.boolean().optional(),
});

// PUT – edit user fields
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!guard(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const parsed = UpdateUserSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    const updated = await prisma.user.update({ where: { id }, data: parsed.data });
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// DELETE – hard delete user + all their data
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!guard(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    // cascade order: payments → auctions → chit_members → members → chit_groups → audit_logs → user
    await prisma.payment.deleteMany({
      where: { chit_group: { user_id: id } },
    });
    await prisma.auction.deleteMany({
      where: { chit_group: { user_id: id } },
    });
    await prisma.chitMember.deleteMany({
      where: { OR: [{ member: { user_id: id } }, { chit_group: { user_id: id } }] },
    });
    await prisma.member.deleteMany({ where: { user_id: id } });
    await prisma.chitGroup.deleteMany({ where: { user_id: id } });
    await prisma.auditLog.deleteMany({ where: { user_id: id } });
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
