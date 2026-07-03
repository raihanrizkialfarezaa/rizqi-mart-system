import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // 1. Product Units
  console.log("📦 Seeding Product Units...");
  const units = await Promise.all([
    prisma.productUnit.upsert({
      where: { code: "PCS" },
      update: {},
      create: { code: "PCS", name: "Pieces" },
    }),
    prisma.productUnit.upsert({
      where: { code: "KARTON" },
      update: {},
      create: { code: "KARTON", name: "Karton" },
    }),
    prisma.productUnit.upsert({
      where: { code: "DUS" },
      update: {},
      create: { code: "DUS", name: "Dus" },
    }),
    prisma.productUnit.upsert({
      where: { code: "KG" },
      update: {},
      create: { code: "KG", name: "Kilogram" },
    }),
    prisma.productUnit.upsert({
      where: { code: "LITER" },
      update: {},
      create: { code: "LITER", name: "Liter" },
    }),
    prisma.productUnit.upsert({
      where: { code: "SAK" },
      update: {},
      create: { code: "SAK", name: "Sak" },
    }),
  ]);

  // 2. Product Categories
  console.log("🏷️  Seeding Product Categories...");
  const categories = await Promise.all([
    prisma.productCategory.upsert({
      where: { name: "Susu & Olahan" },
      update: {},
      create: { name: "Susu & Olahan" },
    }),
    prisma.productCategory.upsert({
      where: { name: "Sembako Pokok" },
      update: {},
      create: { name: "Sembako Pokok" },
    }),
    prisma.productCategory.upsert({
      where: { name: "Minyak & Bumbu" },
      update: {},
      create: { name: "Minyak & Bumbu" },
    }),
    prisma.productCategory.upsert({
      where: { name: "Minuman" },
      update: {},
      create: { name: "Minuman" },
    }),
  ]);

  // 3. Chart of Account (Akuntansi)
  console.log("💰 Seeding Chart of Accounts...");
  const coa = await Promise.all([
    prisma.chartOfAccount.upsert({
      where: { code: "1-1000" },
      update: {},
      create: { code: "1-1000", name: "Kas", type: "ASSET" },
    }),
    prisma.chartOfAccount.upsert({
      where: { code: "1-1100" },
      update: {},
      create: { code: "1-1100", name: "Bank", type: "ASSET" },
    }),
    prisma.chartOfAccount.upsert({
      where: { code: "1-1200" },
      update: {},
      create: { code: "1-1200", name: "Piutang Usaha", type: "ASSET" },
    }),
    prisma.chartOfAccount.upsert({
      where: { code: "1-2000" },
      update: {},
      create: { code: "1-2000", name: "Persediaan Barang Dagang", type: "ASSET" },
    }),
    prisma.chartOfAccount.upsert({
      where: { code: "2-1000" },
      update: {},
      create: { code: "2-1000", name: "Utang Supplier", type: "LIABILITY" },
    }),
    prisma.chartOfAccount.upsert({
      where: { code: "3-1000" },
      update: {},
      create: { code: "3-1000", name: "Modal Disetor", type: "EQUITY" },
    }),
    prisma.chartOfAccount.upsert({
      where: { code: "4-1000" },
      update: {},
      create: { code: "4-1000", name: "Pendapatan Penjualan B2C", type: "REVENUE" },
    }),
    prisma.chartOfAccount.upsert({
      where: { code: "4-2000" },
      update: {},
      create: { code: "4-2000", name: "Pendapatan Penjualan B2B", type: "REVENUE" },
    }),
    prisma.chartOfAccount.upsert({
      where: { code: "5-1000" },
      update: {},
      create: { code: "5-1000", name: "Harga Pokok Penjualan", type: "EXPENSE" },
    }),
    prisma.chartOfAccount.upsert({
      where: { code: "6-1000" },
      update: {},
      create: { code: "6-1000", name: "Beban Operasional - Transportasi", type: "EXPENSE" },
    }),
    prisma.chartOfAccount.upsert({
      where: { code: "6-2000" },
      update: {},
      create: { code: "6-2000", name: "Beban Operasional - Lainnya", type: "EXPENSE" },
    }),
  ]);

  // 4. Suppliers
  console.log("🏪 Seeding Suppliers...");
  const suppliers = await Promise.all([
    (async () => {
      return await prisma.supplier.findFirst({ where: { name: "Indogrosir Mojokerto" } }) ||
             await prisma.supplier.create({
               data: {
                 name: "Indogrosir Mojokerto",
                 type: "GROSIR",
                 address: "Jl. Raya Mojokerto",
                 phone: "081234567890",
               },
             });
    })(),
    (async () => {
      return await prisma.supplier.findFirst({ where: { name: "Lotte Grosir" } }) ||
             await prisma.supplier.create({
               data: {
                 name: "Lotte Grosir",
                 type: "GROSIR",
                 phone: "081234567891",
               },
             });
    })(),
    (async () => {
      return await prisma.supplier.findFirst({ where: { name: "Indomaret Promo" } }) ||
             await prisma.supplier.create({
               data: {
                 name: "Indomaret Promo",
                 type: "RETAIL_PROMO",
                 phone: "081234567892",
               },
             });
    })(),
  ]);

  // 5. Institution (SPPG Example)
  console.log("🏢 Seeding Institutions...");
  const kantorPusat = await (async () => {
    return await prisma.institution.findFirst({ where: { name: "Kantor Pusat Yayasan SPPG" } }) ||
           await prisma.institution.create({
             data: {
               name: "Kantor Pusat Yayasan SPPG",
               type: "KANTOR_PUSAT_SPPG",
               address: "Jakarta",
               contacts: {
                 create: [
                   {
                     name: "Admin Kantor Pusat",
                     role: "Admin",
                     phone: "021-12345678",
                     isSignatory: true,
                   },
                 ],
               },
             },
           });
  })();

  const dapurSooko = await (async () => {
    return await prisma.institution.findFirst({ where: { name: "SPPG Dapur Sooko" } }) ||
           await prisma.institution.create({
             data: {
               name: "SPPG Dapur Sooko",
               type: "DAPUR_SPPG",
               address: "Sooko, Mojokerto",
               parentInstitutionId: kantorPusat.id,
               contacts: {
                 create: [
                   {
                     name: "Admin Dapur Sooko",
                     role: "Admin Dapur",
                     phone: "081234560001",
                     isPrimaryOrderer: true,
                   },
                   {
                     name: "Kepala Dapur Sooko",
                     role: "Kepala Dapur",
                     phone: "081234560002",
                     isSignatory: true,
                   },
                 ],
               },
             },
           });
  })();

  // 6. Products dengan stock
  console.log("🥛 Seeding Products with Stock...");

  // Helper to create product with units, prices, batch and supplier link
  async function createProductWithStock(opts: {
    sku: string;
    name: string;
    categoryId: string;
    baseUnitIdx: number;
    sellUnitIdx?: number;
    sellPrice: number;
    retailPrice?: number;
    costPrice: number;
    batchQty: number;
    expiryDays: number;
    supplierIdx: number;
    supplierSku: string;
    minStockAlert?: number;
    isPerishable?: boolean;
  }) {
    const baseUnit = units[opts.baseUnitIdx];
    const sellUnit = opts.sellUnitIdx !== undefined ? units[opts.sellUnitIdx] : baseUnit;
    const convFactor = opts.sellUnitIdx !== undefined ? 40 : 1;

    // Delete existing product with same SKU to avoid unique constraint
    const existingProduct = await prisma.product.findUnique({ where: { sku: opts.sku } });
    if (existingProduct) {
      await prisma.sourcingRequest.deleteMany({ where: { productId: existingProduct.id } });
      await prisma.salesOrderItem.deleteMany({ where: { productId: existingProduct.id } });
      await prisma.stockMovement.deleteMany({ where: { productId: existingProduct.id } });
      await prisma.stockBatch.deleteMany({ where: { productId: existingProduct.id } });
      await prisma.supplierProduct.deleteMany({ where: { productId: existingProduct.id } });
      await prisma.productUnitConversion.deleteMany({ where: { productId: existingProduct.id } });
      await prisma.productSellingPrice.deleteMany({ where: { productId: existingProduct.id } });
      await prisma.customerProductAgreement.deleteMany({ where: { productId: existingProduct.id } });
      await prisma.product.delete({ where: { id: existingProduct.id } });
    }

    const product = await prisma.product.create({
      data: {
        sku: opts.sku,
        name: opts.name,
        categoryId: opts.categoryId,
        baseUnitId: baseUnit.id,
        isPerishable: opts.isPerishable ?? true,
        minStockAlert: opts.minStockAlert ?? 10,
        unitConversions: sellUnit.id !== baseUnit.id ? {
          create: [{
            unitId: sellUnit.id,
            conversionToBase: convFactor,
            isDefaultSellUnit: true,
            isDefaultBuyUnit: true,
          }],
        } : undefined,
        sellingPrices: {
          create: [
            { unitId: sellUnit.id, customerType: "INSTITUSI", price: opts.sellPrice, effectiveFrom: new Date() },
            ...(opts.retailPrice ? [{ unitId: baseUnit.id, customerType: "RETAIL", price: opts.retailPrice, effectiveFrom: new Date() }] : []),
          ],
        },
      },
    });

    // Stock batch
    await prisma.stockBatch.create({
      data: {
        productId: product.id,
        batchCode: `BATCH-${opts.sku}`,
        qtyReceivedBase: opts.batchQty,
        qtyRemainingBase: opts.batchQty,
        unitCostBase: opts.costPrice,
        expiryDate: new Date(Date.now() + opts.expiryDays * 24 * 60 * 60 * 1000),
      },
    });

    // Supplier link
    await prisma.supplierProduct.create({
      data: { supplierId: suppliers[opts.supplierIdx].id, productId: product.id, unitId: sellUnit.id, supplierSku: opts.supplierSku },
    });

    return product;
  }

  const cimory = await createProductWithStock({
    sku: "CIM-UHT-125",
    name: "Susu UHT Full Cream Cimory 125ml",
    categoryId: categories[0].id,
    baseUnitIdx: 0, // PCS
    sellUnitIdx: 1, // KARTON
    sellPrice: 124000,
    retailPrice: 3500,
    costPrice: 100000,
    batchQty: 200,
    expiryDays: 180,
    supplierIdx: 0,
    supplierSku: "CIM-125-40",
    minStockAlert: 100,
  });

  const greenfields = await createProductWithStock({
    sku: "GRN-UHT-1L",
    name: "Susu UHT Greenfields 1 Liter",
    categoryId: categories[0].id,
    baseUnitIdx: 4, // LITER
    sellPrice: 25000,
    retailPrice: 28000,
    costPrice: 21000,
    batchQty: 50,
    expiryDays: 120,
    supplierIdx: 1,
    supplierSku: "GRN-1L-12",
  });

  const beras = await createProductWithStock({
    sku: "BERAS-ROJOLELE-5KG",
    name: "Beras Rojo Lele 5kg",
    categoryId: categories[1].id,
    baseUnitIdx: 5, // SAK
    sellPrice: 68000,
    retailPrice: 70000,
    costPrice: 62000,
    batchQty: 30,
    expiryDays: 365,
    supplierIdx: 0,
    supplierSku: "BRG-RL-5KG",
    isPerishable: false,
  });

  const gula = await createProductWithStock({
    sku: "GULA-PASIR-1KG",
    name: "Gula Pasir Lokal 1kg",
    categoryId: categories[1].id,
    baseUnitIdx: 2, // DUS (dus isinya 20 bks 1kg)
    sellPrice: 16000,
    retailPrice: 17000,
    costPrice: 14000,
    batchQty: 100,
    expiryDays: 730,
    supplierIdx: 2,
    supplierSku: "GLP-LOKAL-1KG",
    isPerishable: false,
  });

  const minyak = await createProductWithStock({
    sku: "MINYAK-FORTUNE-2L",
    name: "Minyak Goreng Fortune 2L",
    categoryId: categories[2].id,
    baseUnitIdx: 4, // LITER
    sellPrice: 38000,
    retailPrice: 40000,
    costPrice: 34000,
    batchQty: 40,
    expiryDays: 365,
    supplierIdx: 0,
    supplierSku: "FRT-2L-6",
    isPerishable: false,
  });

  const aqua = await createProductWithStock({
    sku: "AQUA-600ML",
    name: "Air Mineral Aqua 600ml",
    categoryId: categories[3].id,
    baseUnitIdx: 2, // DUS (1 dus = 24 botol)
    sellPrice: 60000,
    retailPrice: 3000,
    costPrice: 50000,
    batchQty: 80,
    expiryDays: 365,
    supplierIdx: 1,
    supplierSku: "AQUA-600-24",
    isPerishable: false,
  });

  // 8. Price Agreements (PAGU)
  console.log("📝 Seeding Price Agreements...");
  await prisma.customerProductAgreement.create({
    data: {
      institutionId: dapurSooko.id,
      productId: cimory.id,
      unitId: units[1].id, // KARTON
      priceCeiling: 125000,
      averageWeeklyQty: 100,
      effectiveFrom: new Date("2026-01-01"),
    },
  });

  await prisma.customerProductAgreement.create({
    data: {
      institutionId: dapurSooko.id,
      productId: beras.id,
      unitId: units[5].id, // SAK
      priceCeiling: 70000,
      averageWeeklyQty: 50,
      effectiveFrom: new Date("2026-01-01"),
    },
  });

  await prisma.customerProductAgreement.create({
    data: {
      institutionId: dapurSooko.id,
      productId: minyak.id,
      unitId: units[4].id, // LITER
      priceCeiling: 39000,
      averageWeeklyQty: 30,
      effectiveFrom: new Date("2026-01-01"),
    },
  });

  // 9. Users
  console.log("👤 Seeding Users...");
  const adminUser = await (async () => {
    return await prisma.user.findFirst({ where: { email: "admin@rizqi-mart.test" } }) ||
           await prisma.user.create({
             data: {
               clerkId: "clerk_seed_admin",
               email: "admin@rizqi-mart.test",
               name: "Admin Toko",
               phone: "081234567899",
               role: "ADMIN_TOKO",
               isActive: true,
             },
           });
  })();

  // 10. Customers (B2C)
  console.log("👥 Seeding Customers...");
  const customer1 = await (async () => {
    return await prisma.customer.findFirst({ where: { phone: "081111111111" } }) ||
           await prisma.customer.create({
             data: { name: "Budi Santoso", phone: "081111111111", email: "budi@test.com" },
           });
  })();
  const customer2 = await (async () => {
    return await prisma.customer.findFirst({ where: { phone: "082222222222" } }) ||
           await prisma.customer.create({
             data: { name: "Siti Rahayu", phone: "082222222222", email: "siti@test.com" },
           });
  })();

  // 11. Sample Sales Orders
  console.log("📋 Seeding Sample Orders...");
  const order1 = await prisma.salesOrder.create({
    data: {
      orderNumber: "SO-SEED-001",
      channel: "ECOMMERCE",
      orderType: "B2C_ECER",
      customerId: customer1.id,
      deliveryMethod: "DELIVERY",
      deliveryAddressText: "Jl. Merdeka No. 10, Mojokerto",
      status: "MENUNGGU_KONFIRMASI",
      fulfillmentStatus: "BELUM_DIPROSES",
      paymentStatus: "BELUM_BAYAR",
      subtotal: 100000,
      discountAmount: 0,
      totalAmount: 100000,
      totalCostAmount: 80000,
      totalMarginAmount: 20000,
      createdById: adminUser.id,
      statusHistory: {
        create: {
          fromStatus: null,
          toStatus: "MENUNGGU_KONFIRMASI",
          changedById: adminUser.id,
          note: "Order created via seed",
        },
      },
    },
  });

  const order2 = await prisma.salesOrder.create({
    data: {
      orderNumber: "SO-SEED-002",
      channel: "ECOMMERCE",
      orderType: "B2C_ECER",
      customerId: customer1.id,
      deliveryMethod: "DELIVERY",
      status: "DIKONFIRMASI",
      fulfillmentStatus: "BELUM_DIPROSES",
      paymentStatus: "LUNAS",
      subtotal: 250000,
      discountAmount: 0,
      totalAmount: 250000,
      totalCostAmount: 200000,
      totalMarginAmount: 50000,
      createdById: adminUser.id,
      statusHistory: {
        create: [
          {
            fromStatus: null,
            toStatus: "MENUNGGU_KONFIRMASI",
            changedById: adminUser.id,
            note: "Order created via seed",
          },
          {
            fromStatus: "MENUNGGU_KONFIRMASI",
            toStatus: "DIKONFIRMASI",
            changedById: adminUser.id,
            note: "Confirmed by admin",
          },
        ],
      },
    },
  });

  // B2B Order
  await prisma.salesOrder.create({
    data: {
      orderNumber: "SO-SEED-003",
      channel: "ECOMMERCE",
      orderType: "B2B_GROSIR",
      institutionId: dapurSooko.id,
      deliveryMethod: "DELIVERY",
      status: "SELESAI",
      fulfillmentStatus: "LENGKAP",
      paymentStatus: "LUNAS",
      subtotal: 5000000,
      discountAmount: 100000,
      totalAmount: 4900000,
      totalCostAmount: 4000000,
      totalMarginAmount: 900000,
      createdById: adminUser.id,
      statusHistory: {
        create: [
          { fromStatus: null, toStatus: "DRAFT", changedById: adminUser.id, note: "Order created via seed" },
          { fromStatus: "DRAFT", toStatus: "MENUNGGU_KONFIRMASI", changedById: adminUser.id, note: "Ready" },
          { fromStatus: "MENUNGGU_KONFIRMASI", toStatus: "DIKONFIRMASI", changedById: adminUser.id, note: "Confirmed" },
          { fromStatus: "DIKONFIRMASI", toStatus: "SIAP_KIRIM", changedById: adminUser.id, note: "Stock ready" },
          { fromStatus: "SIAP_KIRIM", toStatus: "DALAM_PENGIRIMAN", changedById: adminUser.id, note: "On delivery" },
          { fromStatus: "DALAM_PENGIRIMAN", toStatus: "SELESAI", changedById: adminUser.id, note: "Completed" },
        ],
      },
    },
  });

  // Product items for the Cimory product (seed order items)
  if (cimory) {
    await prisma.salesOrderItem.create({
      data: {
        salesOrderId: order1.id,
        productId: cimory.id,
        unitId: units[1].id,
        qty: 2,
        unitSellPrice: 3500,
        subtotalSell: 7000,
        unitCostPrice: 2500,
        subtotalCost: 5000,
        marginAmount: 2000,
        isAvailableFromStock: true,
      },
    });

    await prisma.salesOrderItem.create({
      data: {
        salesOrderId: order2.id,
        productId: cimory.id,
        unitId: units[1].id,
        qty: 5,
        unitSellPrice: 3500,
        subtotalSell: 17500,
        unitCostPrice: 2500,
        subtotalCost: 12500,
        marginAmount: 5000,
        isAvailableFromStock: true,
      },
    });
  }

  console.log("✅ Seed completed successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
