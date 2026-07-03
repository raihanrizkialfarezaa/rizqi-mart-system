import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const institutions = await prisma.institution.findMany({
      where: {
        isActive: true,
        type: "DAPUR_SPPG",
      },
      include: {
        parentInstitution: {
          select: {
            id: true,
            name: true,
            type: true,
            address: true,
          },
        },
        contacts: {
          where: { isPrimaryOrderer: true },
          select: {
            id: true,
            name: true,
            phone: true,
            role: true,
          },
          take: 2,
        },
      },
      orderBy: [{ parentInstitutionId: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ data: institutions });
  } catch (error) {
    console.error("[/api/institutions] Error:", error);
    return NextResponse.json({ data: [] }, { status: 500 });
  }
}
