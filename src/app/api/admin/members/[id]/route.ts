// src/app/api/admin/members/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminToken } from "@/lib/adminAuth";
import { z } from "zod";
import { logAudit, getIp } from "@/lib/auditLog";

function guard(req: NextRequest) {
  return verifyAdminToken(req.cookies.get("bidnest-admin-session")?.value);
}

const UpdateMemberSchema = z.object({
  name: z.string().min(2).optional(),
  nickname: z.string().optional(),
  mobile: z.string().min(10).optional(),
  upi_id: z.string().optional(),
  is_active: z.boolean().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!guard(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const parsed = UpdateMemberSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    const updated = await prisma.member.update({ where: { id }, data: parsed.data });
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
    // remove chit_member entries (payments + auctions handled by their own cascade)
    const chitMemberIds = (
      await prisma.chitMember.findMany({ where: { member_id: id }, select: { id: true } })
    ).map((c) => c.id);
    if (chitMemberIds.length) {
      await prisma.payment.deleteMany({ where: { chit_member_id: { in: chitMemberIds } } });
    }
    await prisma.chitMember.deleteMany({ where: { member_id: id } });
    await prisma.member.delete({ where: { id } });
    await logAudit({
      user_id: null,
      action_type: "DELETE",
      action_detail: `Admin deleted member: ${id}`,
      table_name: "members",
      record_id: id,
      ip_address: getIp(req),
      user_agent: req.headers.get("user-agent"),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
