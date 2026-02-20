//src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { signToken, createAuthCookie } from "@/lib/auth";

const RegisterSchema = z.object({
  name: z.string().min(1),
  username: z.string().min(3).max(30),
  email: z.string().email(),
  phone: z.string().min(10).max(15),
  password: z.string().min(6),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, username, email, phone, password } = parsed.data;

    // check existing
    // check existing
    const existingUsername = await prisma.user.findFirst({ where: { username } });
    if (existingUsername) {
    return NextResponse.json({ error: "Username already exists" }, { status: 409 });
    }

    const existingEmail = await prisma.user.findFirst({ where: { email } });
    if (existingEmail) {
    return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    const existingPhone = await prisma.user.findFirst({ where: { phone } });
    if (existingPhone) {
    return NextResponse.json({ error: "Phone number already exists" }, { status: 409 });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const now = new Date().toISOString();

    const user = await prisma.user.create({
      data: {
        name: { value: name, updated_at: now },
        username,
        email,
        phone,
        password_hash,
        raw_password: { value: password, updated_at: now },
      },
    });

    const token = signToken({
      id: user.id,
      username: user.username,
      is_active: user.is_active,
    });

    return NextResponse.json(
      { id: user.id, username: user.username, email: user.email },
      {
        status: 201,
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