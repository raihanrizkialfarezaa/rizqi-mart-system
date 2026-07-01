import Link from "next/link";
import { Facebook, Instagram, MapPin, Phone, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white font-bold">
                R
              </div>
              <span className="text-lg font-bold">Rizqi Mart</span>
            </div>
            <p className="text-sm text-gray-600">
              Toko sembako terpercaya di Mojokerto. Melayani pembelian ecer dan grosir.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold mb-4">Produk</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/products?category=susu" className="text-gray-600 hover:text-primary">
                  Susu & Olahan
                </Link>
              </li>
              <li>
                <Link href="/products?category=sembako" className="text-gray-600 hover:text-primary">
                  Sembako Pokok
                </Link>
              </li>
              <li>
                <Link href="/products?category=minyak" className="text-gray-600 hover:text-primary">
                  Minyak & Bumbu
                </Link>
              </li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <h3 className="font-semibold mb-4">Informasi</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="text-gray-600 hover:text-primary">
                  Tentang Kami
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-600 hover:text-primary">
                  Syarat & Ketentuan
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-600 hover:text-primary">
                  Kebijakan Privasi
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4">Hubungi Kami</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Mojokerto, Jawa Timur</span>
              </li>
              <li className="flex items-start space-x-2">
                <Phone className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>0812-3456-7890</span>
              </li>
              <li className="flex items-start space-x-2">
                <Mail className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>info@rizqimart.com</span>
              </li>
            </ul>
            <div className="flex space-x-4 mt-4">
              <a href="#" className="text-gray-600 hover:text-primary">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-600 hover:text-primary">
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t pt-6 text-center text-sm text-gray-600">
          <p>&copy; {new Date().getFullYear()} Rizqi Mart. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
