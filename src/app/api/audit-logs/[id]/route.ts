//src/app/api/audit-logs/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ─── GET /api/audit-logs/[id] ──────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const auditLog = await prisma.auditLog.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!auditLog) {
      return NextResponse.json({ error: "Audit log not found" }, { status: 404 });
    }

    return NextResponse.json(auditLog, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}