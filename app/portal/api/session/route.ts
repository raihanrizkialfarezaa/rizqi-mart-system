import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { identityId } = await req.json();

    if (!identityId) {
      return NextResponse.json({ error: "identityId required" }, { status: 400 });
    }

    const response = NextResponse.json({ success: true });

    response.cookies.set("dapur_identity", identityId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 365 * 24 * 60 * 60,
      path: "/portal",
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("dapur_identity", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/portal",
  });
  return response;
}
