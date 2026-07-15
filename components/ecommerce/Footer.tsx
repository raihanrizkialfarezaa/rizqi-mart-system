import Link from "next/link";
import { MapPin, Phone, Mail, Instagram } from "lucide-react";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="page-container py-14">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
                R
              </div>
              <span className="text-[15px] font-semibold text-slate-900 tracking-tight">
                Rizqi Mart
              </span>
            </Link>
            <p className="mt-4 text-[13px] leading-relaxed text-slate-500">
              Distributor sembako terpercaya di Mojokerto. Melayani retail harian
              dan pengadaan grosir untuk mitra usaha.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <a
                href="#"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-900"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Produk */}
          <div>
            <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Produk
            </h3>
            <ul className="space-y-3">
              {[
                { label: "Sembako Pokok", q: "sembako" },
                { label: "Minyak & Bumbu", q: "minyak" },
                { label: "Susu & Olahan", q: "susu" },
                { label: "Minuman", q: "minuman" },
              ].map((item) => (
                <li key={item.q}>
                  <Link
                    href={`/products?category=${item.q}`}
                    className="text-[13px] text-slate-600 transition-colors hover:text-slate-900"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Informasi */}
          <div>
            <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Informasi
            </h3>
            <ul className="space-y-3">
              {[
                { label: "Tentang Kami", href: "/about" },
                { label: "Syarat & Ketentuan", href: "/terms" },
                { label: "Kebijakan Privasi", href: "/privacy" },
                { label: "Hubungi Kami", href: "tel:081234567890" },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-[13px] text-slate-600 transition-colors hover:text-slate-900"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Kontak */}
          <div>
            <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Kontak
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5 text-[13px] text-slate-600">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" strokeWidth={1.75} />
                <span>Mojokerto, Jawa Timur</span>
              </li>
              <li className="flex items-center gap-2.5 text-[13px] text-slate-600">
                <Phone className="h-4 w-4 flex-shrink-0 text-slate-400" strokeWidth={1.75} />
                <a href="tel:081234567890" className="hover:text-slate-900 transition-colors">
                  0812-3456-7890
                </a>
              </li>
              <li className="flex items-center gap-2.5 text-[13px] text-slate-600">
                <Mail className="h-4 w-4 flex-shrink-0 text-slate-400" strokeWidth={1.75} />
                <a href="mailto:info@rizqimart.com" className="hover:text-slate-900 transition-colors">
                  info@rizqimart.com
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-slate-100 py-5">
        <div className="page-container flex flex-col items-center justify-between gap-3 text-[12px] text-slate-400 sm:flex-row">
          <span>© {year} Rizqi Mart. Hak cipta dilindungi.</span>
          <span>Dibuat untuk pelayanan kebutuhan pokok masyarakat Mojokerto</span>
        </div>
      </div>
    </footer>
  );
}
