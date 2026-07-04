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
    const { productId, unitId, conversionToBase } = body;

    if (!productId || !unitId || !conversionToBase) {
      return NextResponse.json(
        { error: "productId, unitId, dan conversionToBase wajib diisi." },
        { status: 400 }
      );
    }

    const factor = Number(conversionToBase);
    if (isNaN(factor) || factor <= 1) {
      return NextResponse.json(
        { error: "Faktor konversi harus berupa angka lebih besar dari 1." },
        { status: 400 }
      );
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
    }

    // Check if conversion already exists
    const existing = await prisma.productUnitConversion.findFirst({
      where: {
        productId,
        unitId,
      },
    });

    if (existing) {
      // Update it
      const updated = await prisma.productUnitConversion.update({
        where: { id: existing.id },
        data: {
          conversionToBase: factor,
        },
        include: {
          unit: true,
        },
      });
      return NextResponse.json({ success: true, conversion: updated }, { status: 200 });
    }

    // Create new conversion
    const conversion = await prisma.productUnitConversion.create({
      data: {
        productId,
        unitId,
        conversionToBase: factor,
      },
      include: {
        unit: true,
      },
    });

    return NextResponse.json({ success: true, conversion }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/conversions] Error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal menyimpan konversi satuan." },
      { status: 500 }
    );
  }
}
