import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/upload/payment-proof
// Accepts multipart/form-data with field "file" (image/*, max 10MB)
// Saves to public/uploads/payment-proofs and returns { url: "/uploads/payment-proofs/..." }
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File harus berupa gambar" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran file maksimal 10MB" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = path.extname(file.name) || (file.type === "image/png" ? ".png" : file.type === "image/webp" ? ".webp" : ".jpg");
    const filename = `proof-${Date.now()}-${nanoid(6)}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "payment-proofs");
    await mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    const url = `/uploads/payment-proofs/${filename}`;
    return NextResponse.json({ success: true, url, filename });
  } catch (error: any) {
    console.error("[POST /api/upload/payment-proof] Error:", error);
    return NextResponse.json({ error: error.message || "Gagal mengunggah file" }, { status: 500 });
  }
}
