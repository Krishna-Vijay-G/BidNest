import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

const Schema = z.object({
  password: z.string().min(6),
});

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const now = new Date().toISOString();
    const password_hash = await bcrypt.hash(parsed.data.password, 12);

    await prisma.user.update({
      where: { id: authUser.id },
      data: {
        password_hash,
        raw_password: { value: parsed.data.password, updated_at: now },
      },
    });

    return NextResponse.json({ message: "Password updated" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}