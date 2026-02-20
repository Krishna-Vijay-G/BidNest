//src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { signToken, createAuthCookie } from "@/lib/auth";

const LoginSchema = z.object({
  login: z.string().min(1), // username or email
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { login, password } = parsed.data;

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: login }, { email: login }],
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (!user.is_active) {
      return NextResponse.json(
        { error: "Account is inactive" },
        { status: 403 }
      );
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = signToken({
      id: user.id,
      username: user.username,
      is_active: user.is_active,
    });

    const nameData = user.name as { value: string; updated_at: string };

    return NextResponse.json(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        name: nameData.value,
      },
      {
        status: 200,
        headers: { "Set-Cookie": createAuthCookie(token) },
      }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}