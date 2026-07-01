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

  // 6. Example Product (Cimory dari spec Section 21)
  console.log("🥛 Seeding Example Products...");
  const cimory = await prisma.product.create({
    data: {
      sku: "CIM-UHT-125",
      name: "Susu UHT Full Cream Cimory 125ml",
      categoryId: categories[0].id,
      baseUnitId: units[0].id, // PCS
      isPerishable: true,
      minStockAlert: 100,
      unitConversions: {
        create: [
          {
            unitId: units[1].id, // KARTON
            conversionToBase: 40, // 1 karton = 40 pcs
            isDefaultSellUnit: true,
            isDefaultBuyUnit: true,
          },
        ],
      },
      sellingPrices: {
        create: [
          {
            unitId: units[1].id, // KARTON
            customerType: "INSTITUSI",
            price: 124000, // Harga jual Rp124k/karton
            effectiveFrom: new Date(),
          },
          {
            unitId: units[0].id, // PCS
            customerType: "RETAIL",
            price: 3500, // Harga ecer Rp3.5k/pcs
            effectiveFrom: new Date(),
          },
        ],
      },
    },
  });

  // 7. Supplier Product Link (Cimory di Indogrosir)
  await prisma.supplierProduct.create({
    data: {
      supplierId: suppliers[0].id, // Indogrosir
      productId: cimory.id,
      unitId: units[1].id, // KARTON
      supplierSku: "CIM-125-40",
    },
  });

  // 8. Price Agreement (Cimory untuk Dapur Sooko)
  await prisma.customerProductAgreement.create({
    data: {
      institutionId: dapurSooko.id,
      productId: cimory.id,
      unitId: units[1].id, // KARTON
      priceCeiling: 125000, // Pagu maksimal Rp125k/karton
      averageWeeklyQty: 100,
      effectiveFrom: new Date("2026-01-01"),
      notes: "Kontrak rutin mingguan per spec Section 21",
    },
  });

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
