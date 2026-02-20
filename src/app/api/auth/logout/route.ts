//src/app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/auth";

export async function POST() {
  return NextResponse.json(
    { message: "Logged out" },
    {
      status: 200,
      headers: { "Set-Cookie": clearAuthCookie() },
    }
  );
}