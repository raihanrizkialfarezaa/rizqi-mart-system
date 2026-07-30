import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/ecommerce/customer/addresses/[id]
 * Update address or set as default
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { label, fullAddress, kecamatan, kota, latitude, longitude, isDefault } = body;

    const existing = await prisma.customerAddress.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Alamat tidak ditemukan" }, { status: 404 });
    }

    if (isDefault) {
      // Unset previous defaults for customer
      await prisma.customerAddress.updateMany({
        where: { customerId: existing.customerId },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.customerAddress.update({
      where: { id },
      data: {
        ...(label && { label: label.trim() }),
        ...(fullAddress && { fullAddress: fullAddress.trim() }),
        ...(kecamatan && { kecamatan: kecamatan.trim() }),
        ...(kota && { kota: kota.trim() }),
        ...(typeof latitude === "number" ? { latitude } : {}),
        ...(typeof longitude === "number" ? { longitude } : {}),
        ...(typeof isDefault === "boolean" ? { isDefault } : {}),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[PATCH /api/ecommerce/customer/addresses/[id]] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update address" }, { status: 500 });
  }
}

/**
 * DELETE /api/ecommerce/customer/addresses/[id]
 * Delete a customer address
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    const existing = await prisma.customerAddress.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Alamat tidak ditemukan" }, { status: 404 });
    }

    await prisma.customerAddress.delete({
      where: { id },
    });

    // If deleted address was default, set another address as default
    if (existing.isDefault) {
      const remaining = await prisma.customerAddress.findFirst({
        where: { customerId: existing.customerId },
        orderBy: { createdAt: "desc" },
      });
      if (remaining) {
        await prisma.customerAddress.update({
          where: { id: remaining.id },
          data: { isDefault: true },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/ecommerce/customer/addresses/[id]] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete address" }, { status: 500 });
  }
}
