//src/app/api/auctions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { calculateAuction } from "@/utils/dividend";

// ─── SCHEMAS ───────────────────────────────────────────────

const CreateAuctionSchema = z.object({
  chit_group_id: z.string().uuid(),
  month_number: z.number().int().positive(),
  winner_chit_member_id: z.string().uuid(),
  original_bid: z.number().positive(),
});

// ─── POST /api/auctions ────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateAuctionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // get chit group
    const chitGroup = await prisma.chitGroup.findUnique({
      where: { id: parsed.data.chit_group_id },
    });
    if (!chitGroup) {
      return NextResponse.json({ error: "Chit group not found" }, { status: 404 });
    }

    // check winner is a valid chit member of this group
    const winnerChitMember = await prisma.chitMember.findUnique({
      where: { id: parsed.data.winner_chit_member_id },
    });
    if (!winnerChitMember || winnerChitMember.chit_group_id !== parsed.data.chit_group_id) {
      return NextResponse.json(
        { error: "Winner is not a member of this chit group" },
        { status: 400 }
      );
    }

    // check this ticket hasn't already won
    const alreadyWon = await prisma.auction.findFirst({
      where: { winner_chit_member_id: parsed.data.winner_chit_member_id },
    });
    if (alreadyWon) {
      return NextResponse.json(
        { error: "This ticket has already won an auction" },
        { status: 409 }
      );
    }

    // check month_number not already auctioned
    const monthTaken = await prisma.auction.findUnique({
      where: {
        chit_group_id_month_number: {
          chit_group_id: parsed.data.chit_group_id,
          month_number: parsed.data.month_number,
        },
      },
    });
    if (monthTaken) {
      return NextResponse.json(
        { error: `Month ${parsed.data.month_number} already has an auction` },
        { status: 409 }
      );
    }

    // get carry_previous from last month's auction
    const previousAuction = await prisma.auction.findUnique({
      where: {
        chit_group_id_month_number: {
          chit_group_id: parsed.data.chit_group_id,
          month_number: parsed.data.month_number - 1,
        },
      },
    });
    const carry_previous = previousAuction
      ? Number(previousAuction.carry_next)
      : 0;

    // run calculation
    const calc = calculateAuction({
      total_amount: Number(chitGroup.total_amount),
      original_bid: parsed.data.original_bid,
      commission_type: chitGroup.commission_type as "PERCENT" | "FIXED",
      commission_value: Number(chitGroup.commission_value),
      round_off_value: chitGroup.round_off_value,
      carry_previous,
    });

    const dividend_per_member = calc.roundoff_dividend / chitGroup.total_members;
    // build calculation_data snapshot
    const calculation_data = {
      total_amount: Number(chitGroup.total_amount),
      total_members: chitGroup.total_members,
      monthly_contribution: Number(chitGroup.monthly_amount),
      dividend_per_member: dividend_per_member,
      amount_to_collect: Number(chitGroup.monthly_amount) - dividend_per_member,
      commission_type: chitGroup.commission_type,
      commission_value: Number(chitGroup.commission_value),
      round_off_value: chitGroup.round_off_value,
      original_bid: parsed.data.original_bid,
      ...calc,
    };

    const auction = await prisma.auction.create({
      data: {
        chit_group_id: parsed.data.chit_group_id,
        month_number: parsed.data.month_number,
        winner_chit_member_id: parsed.data.winner_chit_member_id,
        original_bid: parsed.data.original_bid,
        winning_amount: calc.winning_amount,
        commission: calc.commission,
        carry_previous: calc.carry_previous,
        raw_dividend: calc.raw_dividend,
        roundoff_dividend: calc.roundoff_dividend,
        carry_next: calc.carry_next,
        calculation_data,
      },
    });

    return NextResponse.json(auction, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// ─── GET /api/auctions ─────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const chit_group_id = searchParams.get("chit_group_id");
    const user_id = searchParams.get("user_id");

    const auctions = await prisma.auction.findMany({
      where: {
        ...(chit_group_id ? { chit_group_id } : {}),
        ...(user_id ? { chit_group: { user_id } } : {}),
      },
      include: {
        winner_chit_member: {
          include: { member: true },
        },
      },
      orderBy: { month_number: "asc" },
    });

    return NextResponse.json(auctions, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}