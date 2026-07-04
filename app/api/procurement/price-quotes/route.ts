import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { recordPriceQuote } from "@/lib/services/procurement.service";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      supplierId,
      newSupplierName,
      newSupplierType,
      newSupplierPhone,
      newSupplierAddress,
      price,
      isPromo,
      validUntil,
      sourcingRequestId,
      notes
    } = body;

    let finalSupplierId = supplierId;

    // Inline new supplier creation option
    if (newSupplierName) {
      const existing = await prisma.supplier.findFirst({
        where: { name: { equals: newSupplierName.trim() } }
      });
      if (existing) {
        finalSupplierId = existing.id;
      } else {
        const supplier = await prisma.supplier.create({
          data: {
            name: newSupplierName.trim(),
            type: newSupplierType || "GROSIR",
            phone: newSupplierPhone || null,
            address: newSupplierAddress || null,
          }
        });
        finalSupplierId = supplier.id;
      }
    }

    if (!finalSupplierId || price === undefined) {
      return NextResponse.json({ error: "supplierId and price are required" }, { status: 400 });
    }

    // Resolve or create SupplierProduct record
    const targetUnitId = body.unitId;
    let supplierProduct = await prisma.supplierProduct.findFirst({
      where: {
        supplierId: finalSupplierId,
        productId: body.productId,
        ...(targetUnitId ? { unitId: targetUnitId } : {})
      }
    });

    if (!supplierProduct) {
      // Find or create default unit
      let unitId = targetUnitId;
      if (!unitId) {
        const product = await prisma.product.findUnique({
          where: { id: body.productId },
          select: { baseUnitId: true }
        });
        unitId = product?.baseUnitId;
      }

      supplierProduct = await prisma.supplierProduct.create({
        data: {
          supplierId: finalSupplierId,
          productId: body.productId,
          unitId: unitId || "default",
          isActive: true,
        }
      });
    }

    const quoteId = await recordPriceQuote({
      supplierProductId: supplierProduct.id,
      price: Number(price),
      isPromo: !!isPromo,
      checkedById: session.id,
      validUntil: validUntil ? new Date(validUntil) : undefined,
      sourcingRequestId: sourcingRequestId || undefined,
      notes: notes || undefined,
    });

    return NextResponse.json({ success: true, quoteId }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/procurement/price-quotes] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to record price quote" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, price, isPromo, validUntil, notes } = body;

    if (!id || price === undefined) {
      return NextResponse.json({ error: "id and price are required" }, { status: 400 });
    }

    const updated = await prisma.supplierPriceQuote.update({
      where: { id },
      data: {
        price: Number(price),
        isPromo: !!isPromo,
        validUntil: validUntil ? new Date(validUntil) : null,
        notes: notes || null,
        checkedById: session.id,
        checkedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, updated });
  } catch (error: any) {
    console.error("[PUT /api/procurement/price-quotes] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update price quote" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await prisma.supplierPriceQuote.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/procurement/price-quotes] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete price quote" }, { status: 500 });
  }
}
