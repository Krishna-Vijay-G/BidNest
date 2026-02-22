//src/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/", "/login", "/register", "/api/auth/login", "/api/auth/register"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow admin portal page (secret slug) and all admin API routes to bypass regular auth
  const adminSlug = process.env.ADMIN_PAGE_SLUG;
  if (adminSlug && pathname === `/${adminSlug}`) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/admin/")) {
    return NextResponse.next();
  }

  // allow public paths
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // allow public assets
  if (pathname.startsWith("/_next") || pathname.startsWith("/icons") || pathname === "/manifest.json") {
    return NextResponse.next();
  }

  const token = req.cookies.get("bidnest-token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const payload = verifyToken(token);

  if (!payload) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};