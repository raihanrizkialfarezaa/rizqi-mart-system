"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQ_ITEMS = [
  {
    q: "Bagaimana cara melakukan pemesanan di Rizqi Mart?",
    a: "Cari produk di halaman katalog, masukkan ke keranjang, lalu isi detail pengiriman dan nomor kontak Anda di halaman pembayaran. Pesanan akan segera diproses dan dikirim.",
  },
  {
    q: "Apakah gratis ongkos kirim berlaku di semua wilayah?",
    a: "Gratis ongkos kirim berlaku untuk seluruh wilayah Mojokerto dengan minimal belanja Rp 50.000. Untuk wilayah lain atau pembelian di bawah minimum, silakan hubungi tim kami.",
  },
  {
    q: "Apa saja metode pembayaran yang tersedia?",
    a: "Kami menerima Cash on Delivery (COD), Transfer Bank, dan QRIS. Pembayaran COD dikonfirmasi di tempat. Transfer/QRIS di bawah Rp 500.000 memerlukan unggah bukti bayar, sedangkan di atas Rp 500.000 dikonfirmasi otomatis.",
  },
  {
    q: "Bisakah membeli dalam partai besar (grosir)?",
    a: "Ya. Rizqi Mart melayani pembelian grosir untuk toko kelontong, katering, dan institusi SPPG dengan harga mitra khusus. Hubungi WhatsApp kami untuk diskusi kebutuhan dan penawaran harga.",
  },
];

export default function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="section-pad border-b border-slate-100">
      <div className="page-container">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
          {/* Left label */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Bantuan
            </p>
            <h2 className="mt-1.5 text-2xl font-semibold text-slate-900">
              Pertanyaan Umum
            </h2>
            <p className="mt-4 text-[13px] leading-relaxed text-slate-500">
              Jawaban atas pertanyaan seputar pemesanan, pengiriman, pembayaran,
              dan layanan grosir Rizqi Mart.
            </p>
          </div>

          {/* Right FAQ list */}
          <div className="md:col-span-2">
            <div className="divide-y divide-slate-100">
              {FAQ_ITEMS.map((item, idx) => {
                const isOpen = open === idx;
                return (
                  <div key={idx}>
                    <button
                      onClick={() => setOpen(isOpen ? null : idx)}
                      className="flex w-full items-center justify-between gap-6 py-5 text-left"
                    >
                      <span className="text-[14px] font-medium text-slate-800">
                        {item.q}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform duration-200 ${
                          isOpen ? "rotate-180 text-slate-700" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="pb-5 text-[13px] leading-relaxed text-slate-500">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
