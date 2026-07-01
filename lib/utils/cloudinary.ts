import { v2 as cloudinary } from "cloudinary";

/**
 * Cloudinary Integration
 * Handles file uploads for attachments (struk, bukti transfer, scan dokumen)
 * Per spec Section 2: Cloudinary untuk file storage
 */

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export type UploadResult = {
  success: boolean;
  fileUrl: string;
  publicId: string;
  format: string;
  sizeBytes: number;
  width?: number;
  height?: number;
};

/**
 * Upload file ke Cloudinary
 * Organized by ownerType untuk kemudahan tracking
 */
export async function uploadAttachment(
  fileBuffer: Buffer | string,
  options: {
    ownerType: string;
    ownerId: string;
    fileName: string;
    folder?: string;
  }
): Promise<UploadResult> {
  const { ownerType, ownerId, fileName, folder } = options;

  // Folder structure: attachments/{ownerType}/{ownerId}/
  const cloudinaryFolder = folder || `attachments/${ownerType}/${ownerId}`;

  try {
    const result = await cloudinary.uploader.upload(
      typeof fileBuffer === "string" ? fileBuffer : `data:image/jpeg;base64,${fileBuffer.toString("base64")}`,
      {
        folder: cloudinaryFolder,
        public_id: fileName,
        resource_type: "auto", // Detects file type automatically
        use_filename: true,
        unique_filename: true,
      }
    );

    return {
      success: true,
      fileUrl: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      sizeBytes: result.bytes,
      width: result.width,
      height: result.height,
    };
  } catch (error: any) {
    console.error("Cloudinary upload error:", error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
}

/**
 * Delete file dari Cloudinary
 */
export async function deleteAttachment(publicId: string): Promise<boolean> {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === "ok";
  } catch (error: any) {
    console.error("Cloudinary delete error:", error);
    return false;
  }
}

/**
 * Get signed upload URL untuk direct client-side upload
 */
export function getSignedUploadUrl(folder: string): {
  signature: string;
  timestamp: number;
  cloudName: string;
  apiKey: string;
  folder: string;
} {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp,
      folder,
    },
    process.env.CLOUDINARY_API_SECRET!
  );

  return {
    signature,
    timestamp,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    folder,
  };
}
