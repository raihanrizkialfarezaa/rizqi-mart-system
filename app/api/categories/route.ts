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
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Nama kategori wajib diisi." },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();

    // Check if category already exists
    const existing = await prisma.productCategory.findUnique({
      where: {
        name: trimmedName,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Kategori "${trimmedName}" sudah terdaftar.` },
        { status: 400 }
      );
    }

    const category = await prisma.productCategory.create({
      data: {
        name: trimmedName,
      },
    });

    return NextResponse.json({ success: true, category }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/categories] Error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal membuat kategori baru." },
      { status: 500 }
    );
  }
}
