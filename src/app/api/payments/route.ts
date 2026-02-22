//src/app/api/payments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logAudit, getIp } from "@/lib/auditLog";

// ─── SCHEMAS ───────────────────────────────────────────────

const CreatePaymentSchema = z.object({
  chit_group_id: z.string().uuid(),
  chit_member_id: z.string().uuid(),
  month_number: z.number().int().positive(),
  amount_paid: z.number().positive(),
  payment_method: z.enum(["CASH", "UPI", "BANK_TRANSFER"]),
  upi_id: z.string().optional(),
  payment_date: z.string().datetime(),
  notes: z.string().optional(),
});

// ─── POST /api/payments ────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreatePaymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // validate upi_id required if payment_method is UPI
    if (parsed.data.payment_method === "UPI" && !parsed.data.upi_id) {
      return NextResponse.json(
        { error: "upi_id is required when payment_method is UPI" },
        { status: 400 }
      );
    }

    // check chit group exists
    const chitGroup = await prisma.chitGroup.findUnique({
      where: { id: parsed.data.chit_group_id },
    });
    if (!chitGroup) {
      return NextResponse.json({ error: "Chit group not found" }, { status: 404 });
    }

    // check chit member exists and belongs to this chit group
    const chitMember = await prisma.chitMember.findUnique({
      where: { id: parsed.data.chit_member_id },
    });
    if (!chitMember || chitMember.chit_group_id !== parsed.data.chit_group_id) {
      return NextResponse.json(
        { error: "Chit member does not belong to this chit group" },
        { status: 400 }
      );
    }

    if (!chitMember.is_active) {
      return NextResponse.json(
        { error: "This ticket is inactive" },
        { status: 400 }
      );
    }

    // check auction exists for this month
    const auction = await prisma.auction.findUnique({
      where: {
        chit_group_id_month_number: {
          chit_group_id: parsed.data.chit_group_id,
          month_number: parsed.data.month_number,
        },
      },
    });

    if (!auction) {
      return NextResponse.json(
        { error: "Auction for this month has not happened yet. Complete the auction first." },
        { status: 400 }
      );
    }

    // winner of this month does not pay
    if (auction.winner_chit_member_id === parsed.data.chit_member_id) {
      return NextResponse.json(
        { error: "This ticket is the auction winner for this month and does not need to pay" },
        { status: 400 }
      );
    }

    // get amount_to_collect from auction calculation_data
    const calcData = auction.calculation_data as any;
    const monthlyDue = Number(calcData.amount_to_collect);

    if (!monthlyDue || monthlyDue === 0) {
      return NextResponse.json(
        { error: `Could not determine amount to collect. calcData: ${JSON.stringify(calcData)}` },
        { status: 500 }
      );
    }

    // calculate total paid so far for this specific ticket this month
    const totalPaidSoFar = await prisma.payment.aggregate({
      where: {
        chit_member_id: parsed.data.chit_member_id,
        month_number: parsed.data.month_number,
      },
      _sum: { amount_paid: true },
    });

    const alreadyPaid = Number(totalPaidSoFar._sum.amount_paid ?? 0);
    const newTotal = alreadyPaid + parsed.data.amount_paid;

    // check not overpaying
    if (newTotal > monthlyDue) {
      return NextResponse.json(
        {
          error: `Overpayment. Already paid ${alreadyPaid}, monthly due is ${monthlyDue}, max you can pay now is ${monthlyDue - alreadyPaid}`,
        },
        { status: 400 }
      );
    }

    const status = newTotal >= monthlyDue ? "COMPLETED" : "PARTIAL";

    const payment = await prisma.payment.create({
      data: {
        ...parsed.data,
        payment_date: new Date(parsed.data.payment_date),
        status,
      },
    });

    await logAudit({
      user_id: chitGroup.user_id,
      action_type: "CREATE",
      action_detail: `Payment received: ₹${parsed.data.amount_paid} for group ${parsed.data.chit_group_id} month ${parsed.data.month_number} ticket #${chitMember.ticket_number}`,
      table_name: "payments",
      record_id: payment.id,
      new_data: { id: payment.id, amount_paid: Number(payment.amount_paid), status, month_number: payment.month_number },
      ip_address: getIp(req),
      user_agent: req.headers.get("user-agent"),
    });

    return NextResponse.json(
      {
        ...payment,
        ticket_number: chitMember.ticket_number,
        total_paid: newTotal,
        monthly_due: monthlyDue,
        remaining: monthlyDue - newTotal,
        status,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// ─── GET /api/payments ─────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const chit_group_id = searchParams.get("chit_group_id");
    const chit_member_id = searchParams.get("chit_member_id");
    const month_number = searchParams.get("month_number");
    const user_id = searchParams.get("user_id");

    const payments = await prisma.payment.findMany({
      where: {
        ...(chit_group_id ? { chit_group_id } : {}),
        ...(chit_member_id ? { chit_member_id } : {}),
        ...(month_number ? { month_number: parseInt(month_number) } : {}),
        ...(user_id ? { chit_group: { user_id } } : {}),
      },
      include: {
        chit_member: {
          include: { member: true },
        },
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json(payments, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}