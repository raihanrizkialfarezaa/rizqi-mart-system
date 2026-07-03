import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { action, reviewNotes } = body;

    const productRequest = await prisma.productRequest.findUnique({
      where: { id: params.id },
      include: { dapurIdentity: { select: { institutionId: true } } },
    });

    if (!productRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (action === "APPROVE" || action === "CONVERT") {
      // Create a new product from the request
      const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN_TOKO" } });
      const sku = productRequest.productSku || `CUSTOM-${Date.now().toString(36).toUpperCase()}`;

      let product;
      const existing = await prisma.product.findFirst({ where: { name: productRequest.productName } });

      if (existing) {
        product = existing;
      } else {
        // Find or create the base unit
        let baseUnit = await prisma.productUnit.findFirst({
          where: { code: productRequest.requestedUnit },
        });

        if (!baseUnit) {
          baseUnit = await prisma.productUnit.findFirst({ where: { code: "PCS" } });
        }

        product = await prisma.product.create({
          data: {
            sku: sku.length > 50 ? sku.substring(0, 50) : sku,
            name: productRequest.productName,
            categoryId: (await prisma.productCategory.findFirst())?.id || "default",
            baseUnitId: baseUnit?.id || "default",
            minStockAlert: 0,
            sellingPrices: {
              create: productRequest.estimatedPrice
                ? [
                    {
                      unitId: baseUnit?.id || "default",
                      customerType: "INSTITUSI",
                      price: Number(productRequest.estimatedPrice),
                    },
                  ]
                : undefined,
            },
          },
        });
      }

      await prisma.productRequest.update({
        where: { id: params.id },
        data: {
          status: "CONVERTED_TO_PRODUCT",
          reviewedBy: adminUser?.id,
          reviewedAt: new Date(),
          reviewNotes: reviewNotes || null,
          createdProductId: product.id,
        },
      });

      return NextResponse.json({
        data: {
          status: "CONVERTED_TO_PRODUCT",
          product: { id: product.id, name: product.name, sku: product.sku },
        },
      });
    }

    if (action === "REJECT") {
      const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN_TOKO" } });
      await prisma.productRequest.update({
        where: { id: params.id },
        data: {
          status: "REJECTED",
          reviewedBy: adminUser?.id,
          reviewedAt: new Date(),
          reviewNotes: reviewNotes || null,
        },
      });

      return NextResponse.json({ data: { status: "REJECTED" } });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[/api/product-requests/[id]] Error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
