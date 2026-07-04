import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { uploadAttachment } from "@/lib/utils/cloudinary";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { paidAt, paymentMethod, paymentNotes, proofFile, proofFileName } = body;

    if (!paymentMethod) {
      return NextResponse.json({ error: "paymentMethod is required" }, { status: 400 });
    }

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: params.id },
    });

    if (!po) {
      return NextResponse.json({ error: "Purchase Order tidak ditemukan" }, { status: 404 });
    }

    let fileUrl: string | null = null;

    // Handle Cloudinary upload if proof file is provided
    if (proofFile) {
      // proofFile is a base64 string
      const uploadResult = await uploadAttachment(proofFile, {
        ownerType: "PURCHASE_ORDER",
        ownerId: params.id,
        fileName: proofFileName || `proof_${Date.now()}`,
      });

      if (uploadResult.success) {
        fileUrl = uploadResult.fileUrl;

        // Save as official Attachment entry
        await prisma.attachment.create({
          data: {
            ownerType: "PURCHASE_ORDER",
            ownerId: params.id,
            fileName: proofFileName || `bukti_transfer_${params.id}.png`,
            fileUrl: uploadResult.fileUrl,
            fileType: "IMAGE",
            mimeType: "image/png",
            fileSizeBytes: uploadResult.sizeBytes,
            description: `Bukti transfer pembayaran PO ${po.poNumber}`,
            uploadedById: session.id,
          },
        });
      }
    }

    // Update Purchase Order
    const updatedPo = await prisma.purchaseOrder.update({
      where: { id: params.id },
      data: {
        paymentStatus: "LUNAS",
        paymentMethod,
        paidAt: paidAt ? new Date(paidAt) : new Date(),
        paymentNotes: paymentNotes || null,
        paymentProofUrl: fileUrl || undefined,
      },
    });

    return NextResponse.json({ success: true, data: updatedPo });
  } catch (error: any) {
    console.error("[POST /api/procurement/purchase-orders/[id]/pay] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to record payment" }, { status: 500 });
  }
}
