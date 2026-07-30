import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

/**
 * Helper to resolve current customer
 */
async function getOrCreateCustomer(session: { name: string; email: string }) {
  let customer = await prisma.customer.findFirst({
    where: {
      OR: [{ email: session.email }, { name: session.name }],
    },
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        name: session.name || "Pelanggan Rizqi Mart",
        email: session.email || null,
        phone: `NO_PHONE_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      },
    });
  }
  return customer;
}

/**
 * GET /api/ecommerce/customer/addresses
 * List all saved addresses for current customer
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customer = await getOrCreateCustomer(session);

    const addresses = await prisma.customerAddress.findMany({
      where: { customerId: customer.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ success: true, data: addresses });
  } catch (error: any) {
    console.error("[GET /api/ecommerce/customer/addresses] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch addresses" }, { status: 500 });
  }
}

/**
 * POST /api/ecommerce/customer/addresses
 * Create a new address for current customer
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { label, fullAddress, kecamatan, kota, latitude, longitude, isDefault } = body;

    if (!label || !fullAddress || !kecamatan) {
      return NextResponse.json({ error: "Label, Alamat Lengkap, dan Kecamatan wajib diisi" }, { status: 400 });
    }

    const customer = await getOrCreateCustomer(session);

    // Check existing addresses count to set first address as default automatically
    const existingCount = await prisma.customerAddress.count({
      where: { customerId: customer.id },
    });

    const setAsDefault = isDefault || existingCount === 0;

    if (setAsDefault) {
      // Unset previous defaults
      await prisma.customerAddress.updateMany({
        where: { customerId: customer.id },
        data: { isDefault: false },
      });
    }

    const newAddress = await prisma.customerAddress.create({
      data: {
        customerId: customer.id,
        label: label.trim(),
        fullAddress: fullAddress.trim(),
        kecamatan: kecamatan.trim(),
        kota: (kota || "Mojokerto").trim(),
        latitude: typeof latitude === "number" ? latitude : null,
        longitude: typeof longitude === "number" ? longitude : null,
        isDefault: setAsDefault,
        isWithinFreeDeliveryZone: true,
      },
    });

    return NextResponse.json({ success: true, data: newAddress }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/ecommerce/customer/addresses] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create address" }, { status: 500 });
  }
}
