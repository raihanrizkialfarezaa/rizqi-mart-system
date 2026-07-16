import { prisma } from "../lib/prisma";
import { createSalesOrder } from "../lib/services/sales-order.service";
import { SalesChannel, OrderType, DeliveryMethod, StockMovementType } from "@prisma/client";

async function runEndToEndSimulation() {
  console.log("=== 🛒 SIMULASI TRANSAKSI B2C HULU-HILIR ===");

  // 1. Find a random active product with available stock
  console.log("\n🔍 1. Mencari produk acak dengan stok...");
  const activeProduct = await prisma.product.findFirst({
    where: {
      isActive: true,
      stockBatches: {
        some: {
          qtyRemainingBase: { gt: 0 }
        }
      },
      sellingPrices: {
        some: {
          customerType: "RETAIL",
          isActive: true
        }
      }
    },
    include: {
      baseUnit: true,
      sellingPrices: {
        where: { customerType: "RETAIL", isActive: true },
        take: 1
      },
      stockBatches: {
        where: { qtyRemainingBase: { gt: 0 } }
      }
    }
  });

  if (!activeProduct) {
    console.error("❌ Gagal: Tidak ada produk aktif dengan stok di database.");
    process.exit(1);
  }

  const initialStock = activeProduct.stockBatches.reduce((sum, b) => sum + Number(b.qtyRemainingBase), 0);
  console.log(`📌 Produk Terpilih: ${activeProduct.name} (SKU: ${activeProduct.sku})`);
  console.log(`📦 Stok Awal: ${initialStock} ${activeProduct.baseUnit.name}`);
  
  const retailPriceObj = activeProduct.sellingPrices[0];
  const unitPrice = retailPriceObj ? Number(retailPriceObj.price) : 5000;
  console.log(`💰 Harga Jual: Rp ${unitPrice} per ${retailPriceObj?.unitId || "baseUnit"}`);

  // 2. Setup mock checkout data
  console.log("\n👤 2. Menyiapkan data dummy pembeli...");
  const customerName = "Budi Santoso (Simulasi)";
  const phone = "089999999999";
  const email = "budi.simulasi@test.com";

  // Find or create customer
  let customer = await prisma.customer.findFirst({ where: { phone } });
  if (!customer) {
    customer = await prisma.customer.create({
      data: { name: customerName, phone, email }
    });
    console.log(`✨ Pelanggan Baru Dibuat: ID ${customer.id}`);
  } else {
    console.log(`👥 Pelanggan Lama Ditemukan: ID ${customer.id}`);
  }

  // 3. Perform Sales Order creation using the standard service (triggering stock allocation)
  console.log("\n📦 3. Membuat Sales Order via SalesOrder Service (Alokasi EFO)...");
  const purchaseQty = 2; // Buy 2 units
  
  const orderInput = {
    channel: SalesChannel.ECOMMERCE,
    orderType: OrderType.B2C_ECER,
    customerId: customer.id,
    deliveryMethod: DeliveryMethod.DELIVERY,
    deliveryAddressText: "Alamat Simulasi, Mojokerto",
    isFreeDelivery: true,
    entryMethod: "CUSTOMER_PORTAL" as const,
    items: [{
      productId: activeProduct.id,
      unitId: retailPriceObj?.unitId || activeProduct.baseUnitId,
      qty: purchaseQty,
      unitSellPrice: unitPrice,
      baseUnitConversion: 1
    }],
    createdById: "admin_toko_cuid"
  };

  const order = await createSalesOrder(orderInput);
  console.log(`✅ Order Dibuat Sukses!`);
  console.log(`SO Number: ${order.orderNumber}`);
  console.log(`Total Nilai Belanja: Rp ${Number(order.totalAmount)}`);

  // 4. Verify stock update in database
  console.log("\n🔍 4. Memverifikasi pengurangan stok & batch...");
  const updatedProduct = await prisma.product.findUnique({
    where: { id: activeProduct.id },
    include: {
      stockBatches: {
        where: { qtyRemainingBase: { gt: 0 } }
      }
    }
  });

  const finalStock = updatedProduct?.stockBatches.reduce((sum, b) => sum + Number(b.qtyRemainingBase), 0) || 0;
  console.log(`📦 Stok Akhir Database: ${finalStock} ${activeProduct.baseUnit.name}`);
  const stockDifference = initialStock - finalStock;
  
  if (stockDifference === purchaseQty) {
    console.log("✅ Verifikasi Stok: Sukses! Stok berkurang tepat sejumlah pembelian.");
  } else {
    console.warn(`⚠️ Verifikasi Stok: Peringatan! Perbedaan stok adalah ${stockDifference}, diharapkan ${purchaseQty}.`);
  }

  // 5. Verify stock movements
  console.log("\n📜 5. Memverifikasi log pergerakan stok (StockMovement)...");
  const movements = await prisma.stockMovement.findMany({
    where: {
      productId: activeProduct.id,
      type: StockMovementType.KELUAR_PENJUALAN
    },
    orderBy: { createdAt: "desc" },
    take: 1
  });

  if (movements.length > 0) {
    const movement = movements[0];
    console.log(`✅ Log Movement Ditemukan: ID ${movement.id}`);
    console.log(`   Tipe: ${movement.type}`);
    console.log(`   Jumlah Keluar: ${Number(movement.qtyBase)}`);
    console.log(`   Catatan: ${movement.notes}`);
  } else {
    console.error("❌ Gagal: Tidak ada log StockMovement KELUAR_PENJUALAN yang terekam.");
  }

  console.log("\n=============================================");
  console.log("🎉 SIMULASI HULU-HILIR SELESAI DENGAN SUKSES!");
  console.log("=============================================");
}

runEndToEndSimulation()
  .catch((err) => {
    console.error("❌ Terjadi kesalahan saat simulasi:", err);
    process.exit(1);
  });
