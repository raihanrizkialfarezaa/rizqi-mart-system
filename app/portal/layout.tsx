import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portal Pemesanan B2B - Rizqi Mart",
  description: "Portal pemesanan untuk dapur SPPG",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-lg pb-20">{children}</main>
    </div>
  );
}
