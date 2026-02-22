// src/app/api/admin/auctions/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminToken } from "@/lib/adminAuth";
import { z } from "zod";
import { logAudit, getIp } from "@/lib/auditLog";

function guard(req: NextRequest) {
  return verifyAdminToken(req.cookies.get("bidnest-admin-session")?.value);
}

const UpdateSchema = z.object({
  month_number: z.number().int().positive().optional(),
  winning_amount: z.number().positive().optional(),
  original_bid: z.number().positive().optional(),
  commission: z.number().min(0).optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!guard(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data: Record<string, unknown> = { ...parsed.data };
  try {
    const updated = await prisma.auction.update({ where: { id }, data });
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
    // Payments have no direct auction FK; find the auction first to get group + month
    const auction = await prisma.auction.findUnique({
      where: { id },
      select: { chit_group_id: true, month_number: true },
    });
    if (auction) {
      await prisma.payment.deleteMany({
        where: {
          chit_group_id: auction.chit_group_id,
          month_number: auction.month_number,
        },
      });
    }
    await prisma.auction.delete({ where: { id } });
    await logAudit({
      user_id: null,
      action_type: "DELETE",
      action_detail: `Admin deleted auction: ${id}`,
      table_name: "auctions",
      record_id: id,
      ip_address: getIp(req),
      user_agent: req.headers.get("user-agent"),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
