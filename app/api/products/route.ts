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
    const { name, sku, categoryId, baseUnitId, isPerishable, unitConversions } = body;

    if (!name || !categoryId || !baseUnitId) {
      return NextResponse.json(
        { error: "Nama, Kategori, dan Satuan Dasar wajib diisi." },
        { status: 400 }
      );
    }

    // Auto-generate SKU if not supplied
    let finalSku = sku ? sku.trim().toUpperCase() : "";
    if (!finalSku) {
      const category = await prisma.productCategory.findUnique({
        where: { id: categoryId },
        select: { name: true }
      });
      const catPrefix = category ? category.name.substring(0, 3).toUpperCase() : "PRD";
      const randomId = Math.random().toString(36).substring(2, 6).toUpperCase();
      finalSku = `${catPrefix}-${name.substring(0, 5).toUpperCase().replace(/\s+/g, "")}-${randomId}`;
    }

    // Check if SKU exists
    const existing = await prisma.product.findFirst({
      where: { sku: finalSku }
    });
    if (existing) {
      return NextResponse.json(
        { error: `Produk dengan SKU ${finalSku} sudah ada.` },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        sku: finalSku,
        name: name.trim(),
        categoryId,
        baseUnitId,
        isPerishable: isPerishable !== undefined ? Boolean(isPerishable) : true,
        minStockAlert: 0,
        isActive: true,
        unitConversions: {
          create: (unitConversions || []).map((uc: any) => ({
            unitId: uc.unitId,
            conversionToBase: uc.conversionToBase,
          })),
        },
      },
      include: {
        baseUnit: true,
        unitConversions: {
          include: {
            unit: true
          }
        }
      }
    });

    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/products] Error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal membuat produk baru." },
      { status: 500 }
    );
  }
}
