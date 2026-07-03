import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams.get("q") || "";

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: search } },
          { sku: { contains: search } },
        ],
      },
      select: {
        id: true,
        sku: true,
        name: true,
        baseUnitId: true,
        minStockAlert: true,
        baseUnit: {
          select: { id: true, code: true, name: true },
        },
        unitConversions: {
          select: {
            id: true,
            unitId: true,
            conversionToBase: true,
            unit: { select: { id: true, code: true, name: true } },
          },
        },
        sellingPrices: {
          select: {
            id: true,
            unitId: true,
            price: true,
            unit: { select: { id: true, code: true, name: true } },
          },
          orderBy: { effectiveFrom: "desc" },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
      take: 20,
    });

    return NextResponse.json({ data: products });
  } catch (e: any) {
    console.error("[/api/products/search] Error:", e?.message, e?.stack);
    return NextResponse.json({ data: [] });
  }
}
