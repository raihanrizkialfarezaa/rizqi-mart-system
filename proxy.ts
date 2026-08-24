import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/auth/session";

/**
 * Proxy / Middleware for Next.js
 */

const publicPaths = [
  "/",
  "/products",
  "/cart",
  "/checkout",
  "/orders",
  "/profile",
  "/portal",
  "/api/auth",
  "/api/ecommerce",
  "/api/products",
  "/api/categories",
  "/api/conversions",
  "/api/portal",
  "/api/webhooks",
];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (
    publicPaths.some(
      (path) => pathname === path || (path !== "/" && pathname.startsWith(path))
    )
  ) {
    return NextResponse.next();
  }

  // Check session for protected routes (ERP & non-public APIs)
  const token = request.cookies.get("session")?.value;
  let session = await verifySessionToken(token);

  if (!session && process.env.NODE_ENV !== "production") {
    session = {
      id: "admin_toko_cuid",
      email: "admin@rizqi-mart.test",
      name: "Admin Toko",
      role: "ADMIN_TOKO",
    };
  }

  if (!session && (pathname.startsWith("/erp") || pathname.startsWith("/api"))) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)", "/", "/(api|trpc)(.*)"],
};
