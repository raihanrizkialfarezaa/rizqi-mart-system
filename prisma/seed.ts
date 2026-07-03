import { PrismaClient, CustomerType } from "@prisma/client";

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

  // =========================================================
  // 5. Institution with Hierarchy (Yayasan → Dapur SPPG)
  // =========================================================
  console.log("🏢 Seeding Institutions with Hierarchy...");

  async function findOrCreateInstitution(data: {
    name: string;
    type: "DAPUR_SPPG" | "KANTOR_PUSAT_SPPG" | "EVENT_ORGANIZER" | "LAINNYA";
    address: string;
    parentInstitutionId?: string | null;
  }) {
    const existing = await prisma.institution.findFirst({ where: { name: data.name } });
    if (existing) {
      return await prisma.institution.update({
        where: { id: existing.id },
        data: { address: data.address, parentInstitutionId: data.parentInstitutionId ?? null },
      });
    }
    return await prisma.institution.create({
      data: {
        name: data.name,
        type: data.type,
        address: data.address,
        parentInstitutionId: data.parentInstitutionId ?? null,
      },
    });
  }

  // --- Clean old contacts for seeded dapurs ---
  const seedDapurNames = ["SPPG Dapur Sooko", "SPPG Dapur Kuwung", "SPPG Dapur Gedeg", "SPPG Dapur Blooto", "SPPG Dapur Waru"];
  for (const name of seedDapurNames) {
    const inst = await prisma.institution.findFirst({ where: { name } });
    if (inst) {
      await prisma.institutionContact.deleteMany({ where: { institutionId: inst.id } });
    }
  }

  // --- Yayasan SPPG ---
  const kantorPusatSPPG = await findOrCreateInstitution({
    name: "Kantor Pusat Yayasan SPPG",
    type: "KANTOR_PUSAT_SPPG",
    address: "Jl. Raya Mojokerto No. 123, Mojokerto, Jawa Timur",
    parentInstitutionId: null,
  });

  const dapurSooko = await findOrCreateInstitution({
    name: "SPPG Dapur Sooko",
    type: "DAPUR_SPPG",
    address: "Desa Sooko, Kec. Sooko, Mojokerto",
    parentInstitutionId: kantorPusatSPPG.id,
  });

  const dapurKuwung = await findOrCreateInstitution({
    name: "SPPG Dapur Kuwung",
    type: "DAPUR_SPPG",
    address: "Desa Kuwung, Kec. Kuwung, Mojokerto",
    parentInstitutionId: kantorPusatSPPG.id,
  });

  const dapurGedeg = await findOrCreateInstitution({
    name: "SPPG Dapur Gedeg",
    type: "DAPUR_SPPG",
    address: "Desa Gedeg, Kec. Gedeg, Mojokerto",
    parentInstitutionId: kantorPusatSPPG.id,
  });

  // --- Yayasan Makmur ---
  const kantorPusatMakmur = await findOrCreateInstitution({
    name: "Kantor Pusat Yayasan Makmur",
    type: "KANTOR_PUSAT_SPPG",
    address: "Jl. Blooto Raya No. 45, Surabaya, Jawa Timur",
    parentInstitutionId: null,
  });

  const dapurBlooto = await findOrCreateInstitution({
    name: "SPPG Dapur Blooto",
    type: "DAPUR_SPPG",
    address: "Desa Blooto, Kec. Tambaksari, Surabaya",
    parentInstitutionId: kantorPusatMakmur.id,
  });

  const dapurWaru = await findOrCreateInstitution({
    name: "SPPG Dapur Waru",
    type: "DAPUR_SPPG",
    address: "Desa Waru, Kec. Waru, Sidoarjo",
    parentInstitutionId: kantorPusatMakmur.id,
  });

  // --- Contacts for each Dapur ---
  async function createContact(instId: string, data: { name: string; role: string; phone: string; isPrimaryOrderer?: boolean; isSignatory?: boolean }) {
    await prisma.institutionContact.create({ data: { ...data, institutionId: instId } });
  }

  await createContact(dapurSooko.id, { name: "Ibu Siti Aminah", role: "Primary Orderer", phone: "081234560001", isPrimaryOrderer: true });
  await createContact(dapurSooko.id, { name: "Pak Budi Santoso", role: "Manager Dapur", phone: "081234560002", isSignatory: true });

  await createContact(dapurKuwung.id, { name: "Ibu Ratna Dewi", role: "Primary Orderer", phone: "082345678901", isPrimaryOrderer: true });
  await createContact(dapurKuwung.id, { name: "Pak Ahmad Syarif", role: "Kepala Dapur", phone: "082345678902", isSignatory: true });

  await createContact(dapurGedeg.id, { name: "Ibu Lestari", role: "Primary Orderer", phone: "083456789011", isPrimaryOrderer: true });

  await createContact(dapurBlooto.id, { name: "Ibu Kartini", role: "Primary Orderer", phone: "084567890121", isPrimaryOrderer: true });
  await createContact(dapurBlooto.id, { name: "Pak Joko Susilo", role: "Kepala Dapur", phone: "084567890122", isSignatory: true });

  await createContact(dapurWaru.id, { name: "Ibu Endang", role: "Primary Orderer", phone: "086789012341", isPrimaryOrderer: true });

  // --- Dapur Identities (for Customer Portal) ---
  console.log("🆔 Seeding Dapur Identities...");
  const identities = [
    { inst: dapurSooko, displayName: "SPPG Dapur Sooko", desc: "Dapur utama di Sooko, Mojokerto", contact: "Ibu Siti Aminah", phone: "081234560001", addr: "Desa Sooko, Kec. Sooko, Mojokerto" },
    { inst: dapurKuwung, displayName: "SPPG Dapur Kuwung", desc: "Dapur di Kuwung, Mojokerto", contact: "Ibu Ratna Dewi", phone: "082345678901", addr: "Desa Kuwung, Kec. Kuwung, Mojokerto" },
    { inst: dapurGedeg, displayName: "SPPG Dapur Gedeg", desc: "Dapur di Gedeg, Mojokerto", contact: "Ibu Lestari", phone: "083456789011", addr: "Desa Gedeg, Kec. Gedeg, Mojokerto" },
    { inst: dapurBlooto, displayName: "SPPG Dapur Blooto", desc: "Dapur di Blooto, Surabaya — Yayasan Makmur", contact: "Ibu Kartini", phone: "084567890121", addr: "Desa Blooto, Kec. Tambaksari, Surabaya" },
    { inst: dapurWaru, displayName: "SPPG Dapur Waru", desc: "Dapur di Waru, Sidoarjo — Yayasan Makmur", contact: "Ibu Endang", phone: "086789012341", addr: "Desa Waru, Kec. Waru, Sidoarjo" },
  ];

  for (const { inst, displayName, desc, contact, phone, addr } of identities) {
    const existingIdentity = await prisma.dapurIdentity.findUnique({ where: { institutionId: inst.id } });
    if (!existingIdentity) {
      const seedUser = await prisma.user.findFirst({ where: { email: "admin@rizqi-mart.test" } });
      await prisma.dapurIdentity.create({
        data: {
          institutionId: inst.id,
          displayName,
          description: desc,
          primaryContact: contact,
          contactPhone: phone,
          contactEmail: null,
          deliveryAddress: addr,
          isActive: true,
          createdById: seedUser?.id || "seed_default",
        },
      });
    }
  }

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
            { unitId: sellUnit.id, customerType: CustomerType.INSTITUSI, price: opts.sellPrice, effectiveFrom: new Date() },
            ...(opts.retailPrice ? [{ unitId: baseUnit.id, customerType: CustomerType.RETAIL, price: opts.retailPrice, effectiveFrom: new Date() }] : []),
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

  async function upsertPagu(institutionId: string, productId: string, unitId: string, priceCeiling: number, avgWeeklyQty: number) {
    const existing = await prisma.customerProductAgreement.findFirst({
      where: { institutionId, productId, unitId },
    });
    if (!existing) {
      await prisma.customerProductAgreement.create({
        data: {
          institutionId,
          productId,
          unitId,
          priceCeiling,
          averageWeeklyQty: avgWeeklyQty,
          effectiveFrom: new Date("2026-01-01"),
        },
      });
    }
  }

  // Dapur Sooko - 3 PAGU
  await upsertPagu(dapurSooko.id, cimory.id, units[1].id, 125000, 100);
  await upsertPagu(dapurSooko.id, beras.id, units[5].id, 70000, 50);
  await upsertPagu(dapurSooko.id, minyak.id, units[4].id, 39000, 30);

  // Dapur Gedeg - 2 PAGU
  await upsertPagu(dapurGedeg.id, gula.id, units[2].id, 17000, 40);
  await upsertPagu(dapurGedeg.id, aqua.id, units[2].id, 62000, 60);

  // Dapur Blooto - 2 PAGU
  await upsertPagu(dapurBlooto.id, greenfields.id, units[4].id, 26000, 20);
  await upsertPagu(dapurBlooto.id, minyak.id, units[4].id, 40000, 25);

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

  // Cleanup existing sample orders
  for (const on of ["SO-SEED-001", "SO-SEED-002", "SO-SEED-003"]) {
    const existing = await prisma.salesOrder.findUnique({ where: { orderNumber: on } });
    if (existing) {
      await prisma.salesOrderItem.deleteMany({ where: { salesOrderId: existing.id } });
      await prisma.salesOrderStatusHistory.deleteMany({ where: { salesOrderId: existing.id } });
      await prisma.salesOrder.delete({ where: { id: existing.id } });
    }
  }

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

  // Portal Order (dari customer portal)
  const dapurIdentity = await prisma.dapurIdentity.findFirst({ where: { institutionId: dapurSooko.id } });
  if (dapurIdentity) {
    // Cleanup existing portal seed order
    const existingPortal = await prisma.salesOrder.findUnique({ where: { orderNumber: "SO-PORTAL-SEED" } });
    if (existingPortal) {
      await prisma.productRequest.deleteMany({ where: { salesOrderId: existingPortal.id } });
      await prisma.salesOrderItem.deleteMany({ where: { salesOrderId: existingPortal.id } });
      await prisma.salesOrderStatusHistory.deleteMany({ where: { salesOrderId: existingPortal.id } });
      await prisma.notification.deleteMany({ where: { relatedOrderId: existingPortal.id } });
      await prisma.salesOrder.delete({ where: { id: existingPortal.id } });
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const deliveryDeadline = new Date(tomorrow);
    deliveryDeadline.setHours(14, 0, 0, 0);
    const sourcingDeadline = new Date(deliveryDeadline.getTime() - 60 * 60 * 1000);

    await prisma.salesOrder.create({
      data: {
        orderNumber: "SO-PORTAL-SEED",
        channel: "WHATSAPP_B2B",
        orderType: "B2B_GROSIR",
        institutionId: dapurSooko.id,
        dapurIdentityId: dapurIdentity.id,
        entryMethod: "CUSTOMER_PORTAL",
        deliveryMethod: "DELIVERY",
        deliveryAddressText: dapurIdentity.deliveryAddress,
        requestedDeliveryDate: tomorrow,
        requestedDeliveryTime: "14:00",
        deliveryTimeSlot: "SIANG",
        deliveryDeadline,
        sourcingDeadline,
        status: "MENUNGGU_KONFIRMASI",
        fulfillmentStatus: "BELUM_DIPROSES",
        paymentStatus: "BELUM_BAYAR",
        customerStatus: "PENDING_REVIEW",
        customerNote: "Pesanan dari portal, mohon segera diproses. Deadline sourcing 1 jam sebelum pengiriman.",
        subtotal: 300000,
        totalAmount: 300000,
        createdById: adminUser.id,
        statusHistory: {
          create: {
            fromStatus: null,
            toStatus: "MENUNGGU_KONFIRMASI",
            changedById: adminUser.id,
            note: "Pesanan dibuat via portal customer",
            customerNote: "Pesanan Anda sedang ditinjau oleh admin. Estimasi pengiriman: " + tomorrow.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) + " pukul 14:00",
            isVisibleToCustomer: true,
          },
        },
        items: {
          create: [
            {
              productId: cimory.id,
              unitId: units[1].id,
              qty: 5,
              unitSellPrice: 124000,
              unitCostPrice: 100000,
              subtotalSell: 620000,
              subtotalCost: 500000,
              marginAmount: 120000,
              isAvailableFromStock: false,
            },
            {
              productId: beras.id,
              unitId: units[5].id,
              qty: 3,
              unitSellPrice: 68000,
              unitCostPrice: 62000,
              subtotalSell: 204000,
              subtotalCost: 186000,
              marginAmount: 18000,
              isAvailableFromStock: false,
            },
          ],
        },
        productRequests: {
          create: {
            dapurIdentityId: dapurIdentity.id,
            productName: "Telur Ayam Kampung",
            requestedQty: 50,
            requestedUnit: "Kg",
            estimatedPrice: 45000,
            notes: "Telur organik untuk menu harian",
            status: "PENDING",
          },
        },
      },
    });
  }

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

  // Seed sample notifications
  console.log("🔔 Seeding Notifications...");
  if (dapurIdentity && adminUser) {
    const portalOrder = await prisma.salesOrder.findFirst({ where: { orderNumber: "SO-PORTAL-SEED" } });
    if (portalOrder) {
      await prisma.notification.create({
        data: {
          dapurIdentityId: dapurIdentity.id,
          type: "ORDER_STATUS_CHANGED",
          title: `Pesanan ${portalOrder.orderNumber} Dibuat`,
          message: "Pesanan Anda telah dibuat dan sedang ditinjau oleh admin.",
          link: `/portal/orders/${portalOrder.id}`,
          priority: "MEDIUM",
          relatedOrderId: portalOrder.id,
        },
      });

      await prisma.notification.create({
        data: {
          userId: adminUser.id,
          type: "ORDER_STATUS_CHANGED",
          title: `Pesanan Baru: ${portalOrder.orderNumber}`,
          message: "Pesanan dari portal customer perlu direview. Deadline pengiriman besok.",
          link: `/erp/orders/${portalOrder.id}`,
          priority: "HIGH",
          relatedOrderId: portalOrder.id,
        },
      });

      await prisma.notification.create({
        data: {
          userId: adminUser.id,
          type: "DELIVERY_DEADLINE_APPROACHING",
          title: `Deadline Pengiriman: ${portalOrder.orderNumber}`,
          message: "Pengiriman dijadwalkan besok. Siapkan pengadaan barang.",
          link: `/erp/orders/${portalOrder.id}`,
          priority: "HIGH",
          relatedOrderId: portalOrder.id,
        },
      });
    }
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
