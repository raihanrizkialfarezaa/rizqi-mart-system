import { AuthProvider } from "@/lib/auth/AuthProvider";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });

export const metadata: Metadata = {
  title: "Rizqi Mart - Toko Sembako Online",
  description: "Toko sembako online dengan layanan ecer dan grosir untuk SPPG",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <html lang="id">
        <body className={inter.className}>{children}</body>
      </html>
    </AuthProvider>
  );
}
