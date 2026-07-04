import { prisma } from "../lib/prisma";

async function main() {
  const products = await prisma.product.findMany({
    include: {
      baseUnit: true,
      unitConversions: {
        include: {
          unit: true,
        },
      },
    },
  });

  console.log("PRODUCTS AND THEIR CONVERSIONS:");
  products.forEach((p) => {
    console.log(`- Product: ${p.name} (${p.sku})`);
    console.log(`  Base Unit: ${p.baseUnit.code}`);
    console.log(`  Conversions:`, p.unitConversions.map(uc => `${uc.unit.code} (factor: ${uc.conversionToBase})`));
  });
}

main().catch(console.error);
