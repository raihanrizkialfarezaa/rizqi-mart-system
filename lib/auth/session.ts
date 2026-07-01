import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

/**
 * Simple session-based auth for testing/development.
 * Production should use proper auth provider (Clerk, NextAuth, etc.)
 */

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-in-production-2024"
);

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export async function createSession(user: SessionUser): Promise<string> {
  const token = await new SignJWT({ user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);

  cookies().set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return token;
}

export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get("session")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    return (payload.user as SessionUser) || null;
  } catch {
    return null;
  }
}

export async function deleteSession() {
  cookies().delete("session");
}
