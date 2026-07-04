import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createPurchaseOrder } from "@/lib/services/procurement.service";
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
      purpose,
      items
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

    if (!finalSupplierId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "supplierId and items are required" }, { status: 400 });
    }

    // Direct create PO service call
    const poId = await createPurchaseOrder({
      supplierId: finalSupplierId,
      purpose: purpose || "Pengadaan Stok Sourcing B2B",
      items: items.map((i: any) => ({
        productId: i.productId,
        unitId: i.unitId,
        qty: Number(i.qty),
        unitCost: Number(i.unitCost),
        sourcingRequestId: i.sourcingRequestId || undefined,
      })),
      createdById: session.id,
    });

    // Auto confirm PO status to "ORDERED" or keep as draft?
    // User requested "langsung aktif", meaning it should be ORDERED.
    // In our model, we can update status to "ORDERED" or let it be. Let's set the status to "ORDERED" directly:
    await prisma.purchaseOrder.update({
      where: { id: poId },
      data: { status: "ORDERED" }
    });

    return NextResponse.json({ success: true, poId }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/procurement/purchase-orders] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create Purchase Order" }, { status: 500 });
  }
}
