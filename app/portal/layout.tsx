import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Portal Pemesanan B2B - Rizqi Mart",
  description: "Portal pemesanan untuk dapur SPPG",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-lg pb-20">{children}</main>
    </div>
  );
}
