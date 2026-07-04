import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { decideSourcingSupplier } from "@/lib/services/procurement.service";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { sourcingRequestId, chosenSupplierProductId, decisionReason } = body;

    if (!sourcingRequestId || !chosenSupplierProductId) {
      return NextResponse.json({ error: "sourcingRequestId and chosenSupplierProductId are required" }, { status: 400 });
    }

    await decideSourcingSupplier({
      sourcingRequestId,
      chosenSupplierProductId,
      decisionReason: decisionReason || "Dipilih berdasarkan kriteria Admin",
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[POST /api/procurement/decide] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to make sourcing decision" }, { status: 500 });
  }
}
