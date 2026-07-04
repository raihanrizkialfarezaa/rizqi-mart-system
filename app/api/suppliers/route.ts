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
    const { name, type, phone, address } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Nama supplier wajib diisi." },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();

    // Check if supplier already exists
    const existing = await prisma.supplier.findFirst({
      where: {
        name: trimmedName,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Supplier "${trimmedName}" sudah terdaftar.` },
        { status: 400 }
      );
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: trimmedName,
        type: type || "GROSIR",
        phone: phone || null,
        address: address || null,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, supplier }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/suppliers] Error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal membuat supplier baru." },
      { status: 500 }
    );
  }
}
