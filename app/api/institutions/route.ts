import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const institutions = await prisma.institution.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        type: true,
        address: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ data: institutions });
  } catch {
    return NextResponse.json({ data: [] });
  }
}
