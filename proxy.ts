import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";

/**
 * Proxy for Next.js 16 (replaces middleware.ts)
 */

const publicPaths = [
  "/",
  "/products",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/webhooks",
];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some((path) => pathname === path || (path !== "/" && pathname.startsWith(path)))) {
    return NextResponse.next();
  }

  // Check session for protected routes
  const session = await getSession();

  if (!session && (pathname.startsWith("/erp") || pathname.startsWith("/api"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)", "/", "/(api|trpc)(.*)"],
};
