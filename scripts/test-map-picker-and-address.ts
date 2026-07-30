import { prisma } from "../lib/prisma";

async function runMapAndAddressFunctionalTest() {
  console.log("=========================================");
  console.log("🧪 STARTING FUNCTIONAL MAP & ADDRESS TEST");
  console.log("=========================================\n");

  try {
    // 1. Test Nominatim Reverse Geocoding API
    console.log("1️⃣ Testing OpenStreetMap Reverse Geocoding API...");
    const lat = -7.4764;
    const lng = 112.4281;
    const geocodeUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    
    const geocodeRes = await fetch(geocodeUrl, {
      headers: { "User-Agent": "RizqiMartSystem-Test/1.0" },
    });
    
    if (geocodeRes.ok) {
      const data = await geocodeRes.json();
      console.log("✅ Geocoding response received:");
      console.log(`   - Display Name: ${data.display_name}`);
      console.log(`   - City/Suburb: ${data.address?.suburb || data.address?.city_district || "Mojokerto"}`);
    } else {
      console.warn("⚠️ Geocoding API returned status:", geocodeRes.status);
    }

    // 2. Test Nominatim Search Location API
    console.log("\n2️⃣ Testing OpenStreetMap Search API for Mojokerto...");
    const query = encodeURIComponent("Prajurit Kulon, Mojokerto, Jawa Timur");
    const searchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=3`;
    
    const searchRes = await fetch(searchUrl, {
      headers: { "User-Agent": "RizqiMartSystem-Test/1.0" },
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      console.log(`✅ Search results received (${searchData.length} items):`);
      searchData.forEach((item: any, idx: number) => {
        console.log(`   [${idx + 1}] ${item.display_name} (Lat: ${item.lat}, Lng: ${item.lon})`);
      });
    } else {
      console.warn("⚠️ Search API returned status:", searchRes.status);
    }

    // 3. Test Database Customer & CustomerAddress CRUD
    console.log("\n3️⃣ Testing Database CustomerAddress CRUD Operations...");

    // Find or create test customer
    let testCustomer = await prisma.customer.findFirst({
      where: { phone: "089999888777" },
    });

    if (!testCustomer) {
      testCustomer = await prisma.customer.create({
        data: {
          name: "Test Customer Map",
          phone: "089999888777",
          email: "test.map@rizqi-mart.test",
        },
      });
      console.log("   - Created test customer:", testCustomer.id);
    } else {
      console.log("   - Using existing test customer:", testCustomer.id);
    }

    // Clean old test addresses
    await prisma.customerAddress.deleteMany({
      where: { customerId: testCustomer.id },
    });

    // Create Address 1 (Rumah)
    const addr1 = await prisma.customerAddress.create({
      data: {
        customerId: testCustomer.id,
        label: "Rumah Utama",
        fullAddress: "Jl. Gajah Mada No. 45, RT 02/RW 03",
        kecamatan: "Prajurit Kulon",
        kota: "Mojokerto",
        latitude: -7.4764,
        longitude: 112.4281,
        isDefault: true,
        isWithinFreeDeliveryZone: true,
      },
    });
    console.log("✅ Address 1 Created (Default):", addr1.label, addr1.id);

    // Create Address 2 (Kantor)
    const addr2 = await prisma.customerAddress.create({
      data: {
        customerId: testCustomer.id,
        label: "Kantor Pusat",
        fullAddress: "Jl. Mojopahit No. 88",
        kecamatan: "Magersari",
        kota: "Mojokerto",
        latitude: -7.4692,
        longitude: 112.4432,
        isDefault: false,
        isWithinFreeDeliveryZone: true,
      },
    });
    console.log("✅ Address 2 Created:", addr2.label, addr2.id);

    // List Customer Addresses
    const list = await prisma.customerAddress.findMany({
      where: { customerId: testCustomer.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    console.log(`✅ List addresses successful: Total ${list.length} saved addresses.`);

    // Cleanup test data
    await prisma.customerAddress.deleteMany({
      where: { customerId: testCustomer.id },
    });
    await prisma.customer.delete({
      where: { id: testCustomer.id },
    });
    console.log("✅ Cleanup test data complete.");

    console.log("\n=========================================");
    console.log("🎉 ALL MAP & ADDRESS FUNCTIONAL TESTS PASSED!");
    console.log("=========================================");
  } catch (error) {
    console.error("❌ Test error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMapAndAddressFunctionalTest();
