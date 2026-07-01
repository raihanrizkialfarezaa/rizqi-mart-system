import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth/session";

/**
 * POST /api/auth/logout
 * Clear session cookie
 */
export async function POST() {
  try {
    await deleteSession();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Logout failed" },
      { status: 500 }
    );
  }
}
