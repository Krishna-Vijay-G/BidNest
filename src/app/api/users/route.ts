//src/app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// ─── SCHEMAS ───────────────────────────────────────────────

const NameSchema = z.object({
  value: z.string().min(1),
  updated_at: z.string().datetime(),
});

const RawPasswordSchema = z.object({
  value: z.string().min(6),
  updated_at: z.string().datetime(),
});

const CreateUserSchema = z.object({
  name: NameSchema,
  username: z.string().min(3).max(30),
  email: z.string().email(),
  phone: z.string().min(10).max(15),
  password_hash: z.string().min(1),
  raw_password: RawPasswordSchema,
  is_active: z.boolean().optional().default(true),
});

// ─── POST /api/users ───────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { username: parsed.data.username },
          { email: parsed.data.email },
          { phone: parsed.data.phone },
        ],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Username, email or phone already exists" },
        { status: 409 }
      );
    }

    const user = await prisma.user.create({
      data: parsed.data,
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── GET /api/users ────────────────────────────────────────

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json(users, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}