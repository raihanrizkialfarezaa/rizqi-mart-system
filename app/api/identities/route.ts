import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const identities = await prisma.dapurIdentity.findMany({
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
      orderBy: { displayName: "asc" },
    });

    return NextResponse.json({ data: identities });
  } catch (error) {
    console.error("[/api/identities] Error:", error);
    return NextResponse.json({ error: "Failed to fetch identities" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      institutionId,
      displayName,
      description,
      primaryContact,
      contactPhone,
      contactEmail,
      deliveryAddress,
    } = body;

    if (!institutionId || !displayName || !primaryContact || !contactPhone || !deliveryAddress) {
      return NextResponse.json(
        { error: "institutionId, displayName, primaryContact, contactPhone, and deliveryAddress are required" },
        { status: 400 }
      );
    }

    const existing = await prisma.dapurIdentity.findUnique({ where: { institutionId } });
    if (existing) {
      return NextResponse.json({ error: "Identity already exists for this institution" }, { status: 409 });
    }

    const identity = await prisma.dapurIdentity.create({
      data: {
        institutionId,
        displayName,
        description: description || null,
        primaryContact,
        contactPhone,
        contactEmail: contactEmail || null,
        deliveryAddress,
        createdById: "seed_default", // Will use actual userId from auth middleware in production
      },
    });

    return NextResponse.json({ data: identity }, { status: 201 });
  } catch (error) {
    console.error("[/api/identities] Error:", error);
    return NextResponse.json({ error: "Failed to create identity" }, { status: 500 });
  }
}
