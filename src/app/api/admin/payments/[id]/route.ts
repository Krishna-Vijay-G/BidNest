// src/app/api/admin/payments/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminToken } from "@/lib/adminAuth";
import { z } from "zod";
import { logAudit, getIp } from "@/lib/auditLog";

function guard(req: NextRequest) {
  return verifyAdminToken(req.cookies.get("bidnest-admin-session")?.value);
}

const UpdateSchema = z.object({
  amount_paid: z.number().positive().optional(),
  status: z.enum(["PENDING", "PAID", "PARTIAL", "OVERDUE"]).optional(),
  payment_method: z.enum(["CASH", "UPI", "BANK_TRANSFER"]).optional(),
  payment_date: z.string().datetime().optional(),
  notes: z.string().nullable().optional(),
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
  const { payment_date, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (payment_date) data.payment_date = new Date(payment_date);
  try {
    const updated = await prisma.payment.update({ where: { id }, data });
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
    await prisma.payment.delete({ where: { id } });
    await logAudit({
      user_id: null,
      action_type: "DELETE",
      action_detail: `Admin deleted payment: ${id}`,
      table_name: "payments",
      record_id: id,
      ip_address: getIp(req),
      user_agent: req.headers.get("user-agent"),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
