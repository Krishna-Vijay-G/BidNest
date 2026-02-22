//src/app/api/chit-groups/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logAudit, getIp } from "@/lib/auditLog";

// ─── SCHEMAS ───────────────────────────────────────────────

const CreateChitGroupSchema = z.object({
  user_id: z.string().uuid(),
  name: z.string().min(1),
  total_amount: z.number().positive(),
  total_members: z.number().int().positive(),
  monthly_amount: z.number().positive(),
  duration_months: z.number().int().positive(),
  commission_type: z.enum(["PERCENT", "FIXED"]),
  commission_value: z.number().positive(),
  round_off_value: z.union([z.literal(10), z.literal(50), z.literal(100)]),
  status: z.enum(["ACTIVE", "PENDING", "CANCELLED", "COMPLETED"]).optional().default("PENDING"),
  auction_start_date: z.string().datetime().optional(),
});

// ─── POST /api/chit-groups ─────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateChitGroupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: parsed.data.user_id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // validate monthly_amount = total_amount / total_members
    const expectedMonthly = parsed.data.total_amount / parsed.data.total_members;
    if (Math.abs(expectedMonthly - parsed.data.monthly_amount) > 0.01) {
      return NextResponse.json(
        { error: `monthly_amount should be ${expectedMonthly}` },
        { status: 400 }
      );
    }

    const chitGroup = await prisma.chitGroup.create({
      data: {
        ...parsed.data,
        total_amount: parsed.data.total_amount,
        monthly_amount: parsed.data.monthly_amount,
        commission_value: parsed.data.commission_value,
        auction_start_date: parsed.data.auction_start_date
          ? new Date(parsed.data.auction_start_date)
          : undefined,
      },
    });

    await logAudit({
      user_id: parsed.data.user_id,
      action_type: "CREATE",
      action_detail: `Chit group created: ${chitGroup.name}`,
      table_name: "chit_groups",
      record_id: chitGroup.id,
      new_data: { id: chitGroup.id, name: chitGroup.name, status: chitGroup.status },
      ip_address: getIp(req),
      user_agent: req.headers.get("user-agent"),
    });

    return NextResponse.json(chitGroup, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// ─── GET /api/chit-groups ──────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");
    const status = searchParams.get("status");

    const chitGroups = await prisma.chitGroup.findMany({
      where: {
        ...(user_id ? { user_id } : {}),
        ...(status ? { status: status as any } : {}),
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json(chitGroups, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}