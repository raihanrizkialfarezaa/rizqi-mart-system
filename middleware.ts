import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";

/**
 * Simple session-based middleware for testing/development.
 * Production: Replace with proper auth provider (Clerk, NextAuth, etc.)
 */

const publicPaths = [
  "/",
  "/products",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/webhooks",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some((path) => pathname === path || (path !== "/" && pathname.startsWith(path)))) {
    return NextResponse.next();
  }

  // Check session for protected routes
  const session = await getSession();

  if (!session && (pathname.startsWith("/erp") || pathname.startsWith("/api"))) {
    // Redirect to login page (to be created) or return 401
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)", "/", "/(api|trpc)(.*)"],
};
