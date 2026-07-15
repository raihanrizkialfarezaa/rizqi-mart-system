import { ReactNode } from "react";
import Header from "@/components/ecommerce/Header";
import Footer from "@/components/ecommerce/Footer";
import { CartProvider } from "@/components/ecommerce/CartContext";

export default function EcommerceLayout({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </CartProvider>
  );
}
