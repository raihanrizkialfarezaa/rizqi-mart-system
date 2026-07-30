import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/ecommerce/customer/profile
 * Get current customer profile details
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find customer by email or phone or fallback to session
    let customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { email: session.email },
          { name: session.name },
        ],
      },
      include: {
        addresses: {
          orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        },
      },
    });

    if (!customer) {
      // Create customer record if missing
      customer = await prisma.customer.create({
        data: {
          name: session.name || "Pelanggan Rizqi Mart",
          email: session.email || null,
          phone: `NO_PHONE_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        },
        include: {
          addresses: true,
        },
      });
    }

    const formattedCustomer = {
      ...customer,
      phone: customer.phone.startsWith("NO_PHONE_") ? "" : customer.phone,
    };

    return NextResponse.json({ success: true, data: formattedCustomer });
  } catch (error: any) {
    console.error("[GET /api/ecommerce/customer/profile] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch profile" }, { status: 500 });
  }
}

/**
 * PATCH /api/ecommerce/customer/profile
 * Update customer profile details
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone, email } = body;

    if (!name) {
      return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });
    }

    const cleanPhone = phone?.trim() || "";

    let customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { email: session.email },
          { name: session.name },
        ],
      },
    });

    const targetPhone = cleanPhone || (customer?.phone && !customer.phone.startsWith("NO_PHONE_") ? customer.phone : `NO_PHONE_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: name.trim(),
          phone: targetPhone,
          email: email?.trim() || null,
        },
      });
    } else {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          name: name.trim(),
          phone: targetPhone,
          email: email?.trim() || null,
        },
      });
    }

    const formattedCustomer = {
      ...customer,
      phone: customer.phone.startsWith("NO_PHONE_") ? "" : customer.phone,
    };

    return NextResponse.json({ success: true, data: formattedCustomer });
  } catch (error: any) {
    console.error("[PATCH /api/ecommerce/customer/profile] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update profile" }, { status: 500 });
  }
}
