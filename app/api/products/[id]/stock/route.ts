import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const batches = await prisma.stockBatch.findMany({
      where: {
        productId: id,
        qtyRemainingBase: { gt: 0 },
      },
      orderBy: [
        { expiryDate: "asc" },
        { receivedAt: "asc" },
      ],
      select: {
        id: true,
        batchCode: true,
        qtyRemainingBase: true,
        unitCostBase: true,
        expiryDate: true,
      },
    });

    const totalAvailable = batches.reduce(
      (sum, b) => sum + Number(b.qtyRemainingBase),
      0
    );

    return NextResponse.json({
      data: {
        totalAvailable,
        batches,
      },
    });
  } catch {
    return NextResponse.json({ data: { totalAvailable: 0, batches: [] } });
  }
}
