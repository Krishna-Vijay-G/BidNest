// src/lib/adminAuth.ts
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const ADMIN_COOKIE = "bidnest-admin-session";
const JWT_SECRET = process.env.JWT_SECRET!;

export async function getAdminSession(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_COOKIE)?.value;
    if (!token) return false;
    const payload = jwt.verify(token, JWT_SECRET) as { isAdmin?: boolean };
    return payload?.isAdmin === true;
  } catch {
    return false;
  }
}

export function createAdminCookie(token: string): string {
  return `${ADMIN_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${4 * 60 * 60}; SameSite=Lax`;
}

export function clearAdminCookie(): string {
  return `${ADMIN_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}

export function signAdminToken(): string {
  return jwt.sign({ isAdmin: true }, JWT_SECRET, { expiresIn: "4h" });
}

/** Use this in every admin API route to guard access. */
export function verifyAdminToken(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const p = jwt.verify(token, JWT_SECRET) as { isAdmin?: boolean };
    return p?.isAdmin === true;
  } catch {
    return false;
  }
}
