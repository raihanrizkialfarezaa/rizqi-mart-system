import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const identity = await prisma.dapurIdentity.findUnique({
      where: { id: params.id },
      include: {
        institution: {
          select: {
            id: true,
            name: true,
            type: true,
            parentInstitution: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!identity) {
      return NextResponse.json({ error: "Identity not found" }, { status: 404 });
    }

    return NextResponse.json({ data: identity });
  } catch (error) {
    console.error("[/api/identities/[id]] Error:", error);
    return NextResponse.json({ error: "Failed to fetch identity" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { displayName, description, primaryContact, contactPhone, contactEmail, deliveryAddress, isActive } = body;

    const existing = await prisma.dapurIdentity.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Identity not found" }, { status: 404 });
    }

    const identity = await prisma.dapurIdentity.update({
      where: { id: params.id },
      data: {
        ...(displayName !== undefined && { displayName }),
        ...(description !== undefined && { description }),
        ...(primaryContact !== undefined && { primaryContact }),
        ...(contactPhone !== undefined && { contactPhone }),
        ...(contactEmail !== undefined && { contactEmail }),
        ...(deliveryAddress !== undefined && { deliveryAddress }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ data: identity });
  } catch (error) {
    console.error("[/api/identities/[id]] Error:", error);
    return NextResponse.json({ error: "Failed to update identity" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await prisma.dapurIdentity.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Identity not found" }, { status: 404 });
    }

    // Soft delete
    await prisma.dapurIdentity.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[/api/identities/[id]] Error:", error);
    return NextResponse.json({ error: "Failed to delete identity" }, { status: 500 });
  }
}
