import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Package, MapPin, CreditCard, Clock, CheckCircle, Phone } from "lucide-react";

// Mock order data - in production, fetch from database
const mockOrder = {
  id: "order-1",
  orderNumber: "SO/VVS/2026/07/0001",
  createdAt: new Date("2026-06-28T10:30:00"),
  status: "SELESAI",
  paymentStatus: "LUNAS",
  paymentMethod: "TRANSFER_BANK",
  deliveryMethod: "DELIVERY",
  customerName: "Ahmad Rizki",
  phone: "081234567890",
  email: "ahmad@example.com",
  address: "Jl. Raya Mojokerto No. 123",
  kecamatan: "Prajurit Kulon",
  kota: "Mojokerto",
  subtotal: 248000,
  shippingCost: 0,
  totalAmount: 248000,
  items: [
    {
      id: "item-1",
      productName: "Susu UHT Full Cream Cimory 125ml",
      sku: "CIM-UHT-125",
      quantity: 2,
      unitName: "Karton",
      unitPrice: 124000,
      subtotal: 248000,
      imageUrl: null,
    },
  ],
  timeline: [
    { status: "DRAFT", timestamp: new Date("2026-06-28T10:30:00"), note: "Pesanan dibuat" },
    { status: "MENUNGGU_KONFIRMASI", timestamp: new Date("2026-06-28T10:31:00"), note: "Menunggu konfirmasi" },
    { status: "DIKONFIRMASI", timestamp: new Date("2026-06-28T11:00:00"), note: "Pesanan dikonfirmasi" },
    { status: "SIAP_KIRIM", timestamp: new Date("2026-06-28T14:00:00"), note: "Pesanan siap dikirim" },
    { status: "DALAM_PENGIRIMAN", timestamp: new Date("2026-06-28T15:00:00"), note: "Sedang dalam pengiriman" },
    { status: "SELESAI", timestamp: new Date("2026-06-28T16:30:00"), note: "Pesanan selesai diterima" },
  ],
};

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-800" },
  MENUNGGU_KONFIRMASI: { label: "Menunggu Konfirmasi", color: "bg-yellow-100 text-yellow-800" },
  DIKONFIRMASI: { label: "Dikonfirmasi", color: "bg-blue-100 text-blue-800" },
  SIAP_KIRIM: { label: "Siap Kirim", color: "bg-purple-100 text-purple-800" },
  DALAM_PENGIRIMAN: { label: "Dalam Pengiriman", color: "bg-indigo-100 text-indigo-800" },
  SELESAI: { label: "Selesai", color: "bg-green-100 text-green-800" },
  DIBATALKAN: { label: "Dibatalkan", color: "bg-red-100 text-red-800" },
};

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  // In production: fetch order from database by ID
  const order = mockOrder;

  if (!order) {
    notFound();
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const statusInfo = statusConfig[order.status] || statusConfig.DRAFT;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Back Button */}
        <Link
          href="/orders"
          className="mb-6 inline-flex items-center space-x-2 text-sm text-gray-600 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Pesanan</span>
        </Link>

        {/* Order Header */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between space-y-4 md:flex-row md:items-center md:space-y-0">
            <div>
              <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
              <p className="mt-1 text-sm text-gray-600">
                Dipesan pada {formatDateTime(order.createdAt)}
              </p>
            </div>
            <div className={`inline-flex items-center space-x-2 rounded-full px-4 py-2 text-sm font-medium ${statusInfo.color}`}>
              <Package className="h-4 w-4" />
              <span>{statusInfo.label}</span>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Order Items */}
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">Produk Dipesan</h2>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-4 border-b pb-4 last:border-0 last:pb-0">
                    <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.productName}
                          width={80}
                          height={80}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{item.productName}</h3>
                      <p className="text-sm text-gray-600">SKU: {item.sku}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          {item.quantity} {item.unitName} × {formatPrice(item.unitPrice)}
                        </span>
                        <span className="font-semibold text-primary">
                          {formatPrice(item.subtotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-4 space-y-2 border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Ongkos Kirim</span>
                  <span className="font-medium text-green-600">GRATIS</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-bold text-primary">
                    {formatPrice(order.totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Status Timeline */}
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">Riwayat Status</h2>
              <div className="space-y-4">
                {order.timeline.map((event, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                      {index < order.timeline.length - 1 && (
                        <div className="h-full w-0.5 bg-gray-200"></div>
                      )}
                    </div>
                    <div className="flex-1 pb-6">
                      <div className="font-medium">{statusConfig[event.status]?.label}</div>
                      <div className="text-sm text-gray-600">{event.note}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatDateTime(event.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6 lg:col-span-1">
            {/* Customer Info */}
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">Informasi Pembeli</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-gray-600">Nama</div>
                  <div className="font-medium">{order.customerName}</div>
                </div>
                <div>
                  <div className="text-gray-600">Telepon</div>
                  <div className="font-medium">{order.phone}</div>
                </div>
                {order.email && (
                  <div>
                    <div className="text-gray-600">Email</div>
                    <div className="font-medium">{order.email}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Delivery Info */}
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center space-x-2 text-lg font-semibold">
                <MapPin className="h-5 w-5 text-primary" />
                <span>Informasi Pengiriman</span>
              </h2>
              <div className="space-y-2 text-sm">
                <div className="font-medium">
                  {order.deliveryMethod === "DELIVERY" ? "Dikirim ke Alamat" : "Ambil di Toko"}
                </div>
                {order.deliveryMethod === "DELIVERY" && (
                  <div className="text-gray-600">
                    {order.address}, {order.kecamatan}, {order.kota}
                  </div>
                )}
              </div>
            </div>

            {/* Payment Info */}
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center space-x-2 text-lg font-semibold">
                <CreditCard className="h-5 w-5 text-primary" />
                <span>Informasi Pembayaran</span>
              </h2>
              <div className="space-y-2 text-sm">
                <div>
                  <div className="text-gray-600">Metode Pembayaran</div>
                  <div className="font-medium">
                    {order.paymentMethod === "TRANSFER_BANK" && "Transfer Bank"}
                    {order.paymentMethod === "QRIS" && "QRIS"}
                    {order.paymentMethod === "CASH" && "Cash on Delivery"}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Status Pembayaran</div>
                  <div className="inline-flex items-center space-x-1 font-medium text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>{order.paymentStatus}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact */}
            <a
              href={`https://wa.me/6281234567890?text=Halo, saya ingin bertanya tentang pesanan ${order.orderNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center space-x-2 rounded-lg border-2 border-primary px-4 py-3 font-medium text-primary transition-colors hover:bg-primary/5"
            >
              <Phone className="h-5 w-5" />
              <span>Hubungi Penjual</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
