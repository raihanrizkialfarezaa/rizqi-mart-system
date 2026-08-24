import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { receiveGoods, updateGoodsReceipt } from "@/lib/services/procurement.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { items, notes } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "items array is required" }, { status: 400 });
    }

    const receiptId = await receiveGoods({
      purchaseOrderId: id,
      receivedById: session.id,
      items: items.map((i: any) => ({
        purchaseOrderItemId: i.purchaseOrderItemId,
        batchCode: i.batchCode,
        qtyReceivedBase: Number(i.qtyReceivedBase),
        unitCostBase: Number(i.unitCostBase),
        expiryDate: i.expiryDate ? new Date(i.expiryDate) : undefined,
      })),
      notes: notes || undefined,
    });

    return NextResponse.json({ success: true, receiptId });
  } catch (error: any) {
    console.error("[POST /api/procurement/purchase-orders/[id]/receive] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to receive goods" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { goodsReceiptId, items, notes } = body;

    if (!goodsReceiptId) {
      return NextResponse.json({ error: "goodsReceiptId is required" }, { status: 400 });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "items array is required" }, { status: 400 });
    }

    await updateGoodsReceipt({
      goodsReceiptId,
      items: items.map((i: any) => ({
        productId: i.productId,
        qtyReceivedBase: Number(i.qtyReceivedBase),
      })),
      notes: notes || undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[PATCH /api/procurement/purchase-orders/[id]/receive] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update receipt" }, { status: 500 });
  }
}
