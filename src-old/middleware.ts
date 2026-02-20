import { NextResponse, type NextRequest } from 'next/server';

/**
 * Simplified middleware — auth is handled entirely client-side via
 * localStorage tokens. This middleware only handles basic route
 * protection using a cookie hint that the AuthProvider sets.
 * 
 * Since localStorage isn't accessible in middleware, we rely on the
 * client-side AuthProvider to redirect unauthenticated users.
 * The middleware here is a pass-through.
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
