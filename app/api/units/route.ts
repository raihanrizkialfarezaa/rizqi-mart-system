import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { code, name } = body;

    if (!code || !code.trim() || !name || !name.trim()) {
      return NextResponse.json(
        { error: "Kode dan Nama satuan wajib diisi." },
        { status: 400 }
      );
    }

    const uppercaseCode = code.trim().toUpperCase();
    const trimmedName = name.trim();

    // Check if unit code already exists
    const existing = await prisma.productUnit.findUnique({
      where: {
        code: uppercaseCode,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Satuan dengan kode "${uppercaseCode}" sudah terdaftar.` },
        { status: 400 }
      );
    }

    const unit = await prisma.productUnit.create({
      data: {
        code: uppercaseCode,
        name: trimmedName,
      },
    });

    return NextResponse.json({ success: true, unit }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/units] Error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal membuat satuan baru." },
      { status: 500 }
    );
  }
}
