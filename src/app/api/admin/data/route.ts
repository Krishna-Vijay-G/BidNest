// src/app/api/admin/data/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminToken } from "@/lib/adminAuth";

function guard(req: NextRequest): boolean {
  const token = req.cookies.get("bidnest-admin-session")?.value;
  return verifyAdminToken(token);
}

export async function GET(req: NextRequest) {
  if (!guard(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const section = searchParams.get("section") ?? "overview";

  try {
    if (section === "overview") {
      const [users, groups, members, chitMembers, auctions, payments, auditLogs] =
        await Promise.all([
          prisma.user.count(),
          prisma.chitGroup.count(),
          prisma.member.count(),
          prisma.chitMember.count(),
          prisma.auction.count(),
          prisma.payment.count(),
          prisma.auditLog.count(),
        ]);
      const recentLogs = await prisma.auditLog.findMany({
        take: 20,
        orderBy: { created_at: "desc" },
        include: { user: { select: { username: true } } },
      });
      return NextResponse.json({ users, groups, members, chitMembers, auctions, payments, auditLogs, recentLogs });
    }

    if (section === "users") {
      const data = await prisma.user.findMany({
        orderBy: { created_at: "desc" },
        include: {
          _count: { select: { members: true, chit_groups: true, audit_logs: true } },
        },
      });
      return NextResponse.json(data);
    }

    if (section === "groups") {
      const data = await prisma.chitGroup.findMany({
        orderBy: { created_at: "desc" },
        include: {
          user: { select: { username: true, email: true } },
          _count: { select: { chit_members: true, auctions: true, payments: true } },
        },
      });
      return NextResponse.json(data);
    }

    if (section === "members") {
      const data = await prisma.member.findMany({
        orderBy: { created_at: "desc" },
        include: {
          user: { select: { username: true } },
          _count: { select: { chit_members: true } },
        },
      });
      return NextResponse.json(data);
    }

    if (section === "chit-members") {
      const data = await prisma.chitMember.findMany({
        orderBy: { created_at: "desc" },
        include: {
          member: true,
          chit_group: { select: { name: true, user_id: true } },
          _count: { select: { payments: true } },
        },
      });
      return NextResponse.json(data);
    }

    if (section === "auctions") {
      const data = await prisma.auction.findMany({
        orderBy: { created_at: "desc" },
        include: {
          chit_group: { select: { name: true, user_id: true } },
          winner_chit_member: {
            include: { member: { select: { id: true, name: true } } },
          },
        },
      });
      return NextResponse.json(data);
    }

    if (section === "payments") {
      const data = await prisma.payment.findMany({
        orderBy: { created_at: "desc" },
        include: {
          chit_group: { select: { name: true } },
          chit_member: {
            include: { member: { select: { name: true } } },
          },
        },
      });
      return NextResponse.json(data);
    }

    if (section === "audit-logs") {
      const data = await prisma.auditLog.findMany({
        orderBy: { created_at: "desc" },
        take: 500,
        include: { user: { select: { username: true } } },
      });
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Unknown section" }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
