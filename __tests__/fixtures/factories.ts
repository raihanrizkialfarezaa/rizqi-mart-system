import { prismaTest } from '../setup/test-db';
import { nanoid } from 'nanoid';
import Decimal from 'decimal.js';

/**
 * Test Data Factories
 * Creates test data for ERP testing
 */

// Counter for unique identifiers
let counter = 0;
const getUniqueId = () => ++counter;

// User Factory
export async function createTestUser(overrides: any = {}) {
  return await prismaTest.user.create({
    data: {
      clerkId: overrides.clerkId || `clerk_test_${getUniqueId()}`,
      email: overrides.email || `user${getUniqueId()}@test.com`,
      name: overrides.name || `Test User ${getUniqueId()}`,
      phone: overrides.phone || `08${String(getUniqueId()).padStart(10, '0')}`,
      role: overrides.role || 'ADMIN_TOKO',
      isActive: overrides.isActive ?? true,
      ...overrides,
    },
  });
}

// Product Unit Factory
export async function createTestProductUnit(overrides: any = {}) {
  return await prismaTest.productUnit.create({
    data: {
      code: overrides.code || `unit-${getUniqueId()}`,
      name: overrides.name || `Unit ${getUniqueId()}`,
      ...overrides,
    },
  });
}

// Resolve or create 'pcs' unit (convenience helper)
async function resolvePcsUnit(): Promise<string> {
  let unit = await prismaTest.productUnit.findUnique({ where: { code: 'pcs' } });
  if (!unit) {
    unit = await createTestProductUnit({ code: 'pcs', name: 'Pieces' });
  }
  return unit.id;
}

// Product Category Factory
export async function createTestProductCategory(overrides: any = {}) {
  return await prismaTest.productCategory.create({
    data: {
      name: overrides.name || `Category-${getUniqueId()}`,
      ...overrides,
    },
  });
}

// Product Factory
export async function createTestProduct(overrides: any = {}) {
  let categoryId = overrides.categoryId;
  let baseUnitId = overrides.baseUnitId;
  
  // Create category if not provided
  if (!categoryId) {
    const category = await createTestProductCategory();
    categoryId = category.id;
  }

  // Create or get base unit if not provided
  if (!baseUnitId) {
    baseUnitId = await resolvePcsUnit();
  }

  return await prismaTest.product.create({
    data: {
      sku: overrides.sku || `SKU-${getUniqueId()}`,
      name: overrides.name || `Product ${getUniqueId()}`,
      categoryId,
      baseUnitId,
      minStockAlert: overrides.minStockAlert !== undefined ? new Decimal(overrides.minStockAlert) : new Decimal(10),
      isActive: overrides.isActive ?? true,
      ...overrides,
    },
  });
}

// Stock Batch Factory
export async function createTestStockBatch(productId: number, overrides: any = {}) {
  return await prismaTest.stockBatch.create({
    data: {
      productId,
      batchCode: overrides.batchCode || `BC-${getUniqueId()}`,
      qtyReceivedBase: overrides.qtyReceivedBase !== undefined ? new Decimal(overrides.qtyReceivedBase) : new Decimal(50),
      qtyRemainingBase: overrides.qtyRemainingBase !== undefined ? new Decimal(overrides.qtyRemainingBase) : new Decimal(50),
      unitCostBase: overrides.unitCostBase !== undefined ? new Decimal(overrides.unitCostBase) : new Decimal(4000),
      expiryDate: overrides.expiryDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      ...overrides,
    },
  });
}

// Customer Factory (B2C)
export async function createTestCustomer(overrides: any = {}) {
  return await prismaTest.customer.create({
    data: {
      name: overrides.name || `Customer ${getUniqueId()}`,
      phone: overrides.phone || `08${String(getUniqueId()).padStart(10, '0')}`,
      email: overrides.email || `customer${getUniqueId()}@test.com`,
      ...overrides,
    },
  });
}

// Institution Factory (B2B)
export async function createTestInstitution(overrides: any = {}) {
  return await prismaTest.institution.create({
    data: {
      name: overrides.name || `Institution ${getUniqueId()}`,
      type: overrides.type || 'DAPUR_SPPG',
      address: overrides.address || 'Test Address',
      isActive: overrides.isActive ?? true,
      ...overrides,
    },
  });
}

// Customer Product Agreement (PAGU) Factory
export async function createTestCustomerProductAgreement(
  institutionId: string,
  productId: string,
  unitId: string,
  overrides: any = {}
) {
  return await prismaTest.customerProductAgreement.create({
    data: {
      institutionId,
      productId,
      unitId,
      priceCeiling: overrides.priceCeiling !== undefined ? new Decimal(overrides.priceCeiling) : new Decimal(10000),
      effectiveFrom: overrides.effectiveFrom || new Date('2026-01-01'),
      effectiveUntil: overrides.effectiveUntil || null,
      notes: overrides.notes || null,
      ...overrides,
    },
  });
}

// Sales Order Factory
export async function createTestSalesOrder(overrides: any = {}) {
  let customerId = overrides.customerId;
  let institutionId = overrides.institutionId;
  let createdById = overrides.createdById;

  // Create customer if not provided and order type is B2C
  if (!customerId && overrides.orderType === 'B2C_ECER') {
    const customer = await createTestCustomer();
    customerId = customer.id;
  }

  // Create institution if not provided and order type is B2B
  if (!institutionId && overrides.orderType === 'B2B_GROSIR') {
    const institution = await createTestInstitution();
    institutionId = institution.id;
  }

  // Create user if not provided (required for createdById)
  if (!createdById) {
    const user = await createTestUser();
    createdById = user.id;
  }

  return await prismaTest.salesOrder.create({
    data: {
      orderNumber: overrides.orderNumber || `SO-${getUniqueId()}`,
      orderType: overrides.orderType || 'B2C_ECER',
      channel: overrides.channel || 'ECOMMERCE',
      customerId: customerId || null,
      institutionId: institutionId || null,
      deliveryMethod: overrides.deliveryMethod || 'DELIVERY',
      status: overrides.status || 'MENUNGGU_KONFIRMASI',
      fulfillmentStatus: overrides.fulfillmentStatus || 'BELUM_DIPROSES',
      paymentStatus: overrides.paymentStatus || 'BELUM_BAYAR',
      subtotal: overrides.subtotal !== undefined ? new Decimal(overrides.subtotal) : new Decimal(100000),
      discountAmount: overrides.discountAmount !== undefined ? new Decimal(overrides.discountAmount) : new Decimal(0),
      totalAmount: overrides.totalAmount !== undefined ? new Decimal(overrides.totalAmount) : new Decimal(100000),
      totalCostAmount: overrides.totalCostAmount !== undefined ? new Decimal(overrides.totalCostAmount) : new Decimal(80000),
      totalMarginAmount: overrides.totalMarginAmount !== undefined ? new Decimal(overrides.totalMarginAmount) : new Decimal(20000),
      createdById,
      ...overrides,
    },
  });
}

// Sales Order Item Factory
export async function createTestSalesOrderItem(salesOrderId: number, productId: number, overrides: any = {}) {
  let unitId = overrides.unitId;

  if (!unitId) {
    unitId = await resolvePcsUnit();
  }

  return await prismaTest.salesOrderItem.create({
    data: {
      salesOrderId,
      productId,
      unitId,
      qty: overrides.qty !== undefined ? new Decimal(overrides.qty) : new Decimal(10),
      unitSellPrice: overrides.unitSellPrice !== undefined ? new Decimal(overrides.unitSellPrice) : new Decimal(10000),
      subtotalSell: overrides.subtotalSell !== undefined ? new Decimal(overrides.subtotalSell) : new Decimal(100000),
      unitCostPrice: overrides.unitCostPrice !== undefined ? new Decimal(overrides.unitCostPrice) : new Decimal(4000),
      subtotalCost: overrides.subtotalCost !== undefined ? new Decimal(overrides.subtotalCost) : new Decimal(40000),
      marginAmount: overrides.marginAmount !== undefined ? new Decimal(overrides.marginAmount) : new Decimal(60000),
      isAvailableFromStock: overrides.isAvailableFromStock ?? true,
      ...overrides,
    },
  });
}

// Supplier Factory
export async function createTestSupplier(overrides: any = {}) {
  return await prismaTest.supplier.create({
    data: {
      code: overrides.code || `SUP-${getUniqueId()}`,
      name: overrides.name || `Supplier ${getUniqueId()}`,
      address: overrides.address || 'Test Supplier Address',
      phone: overrides.phone || `021${String(getUniqueId()).padStart(8, '0')}`,
      isActive: overrides.isActive ?? true,
      ...overrides,
    },
  });
}

// Sourcing Request Factory
export async function createTestSourcingRequest(productId: string, overrides: any = {}) {
  let unitId = overrides.unitId;
  let salesOrderItemId = overrides.salesOrderItemId;

  if (!unitId) {
    unitId = await resolvePcsUnit();
  }

  if (!salesOrderItemId) {
    const user = await createTestUser();
    const order = await prismaTest.salesOrder.create({
      data: {
        orderNumber: `SO-SR-${getUniqueId()}`,
        orderType: 'B2C_ECER',
        channel: 'ECOMMERCE',
        deliveryMethod: 'DELIVERY',
        status: 'MENUNGGU_KONFIRMASI',
        fulfillmentStatus: 'BELUM_DIPROSES',
        paymentStatus: 'BELUM_BAYAR',
        subtotal: new Decimal(100000),
        totalAmount: new Decimal(100000),
        createdById: user.id,
      },
    });
    const item = await prismaTest.salesOrderItem.create({
      data: {
        salesOrderId: order.id,
        productId,
        unitId,
        qty: new Decimal(1),
        unitSellPrice: new Decimal(10000),
        subtotalSell: new Decimal(10000),
      },
    });
    salesOrderItemId = item.id;
  }

  return await prismaTest.sourcingRequest.create({
    data: {
      salesOrderItemId,
      productId,
      unitId,
      qtyNeeded: overrides.qtyNeeded !== undefined ? new Decimal(overrides.qtyNeeded) : new Decimal(100),
      deadline: overrides.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: overrides.status || 'DIBUTUHKAN',
      ...overrides,
    },
  });
}

// Purchase Order Factory
export async function createTestPurchaseOrder(supplierId: number, overrides: any = {}) {
  return await prismaTest.purchaseOrder.create({
    data: {
      poNumber: overrides.poNumber || `PO-${getUniqueId()}`,
      poDate: overrides.poDate || new Date(),
      supplierId,
      expectedDeliveryDate: overrides.expectedDeliveryDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: overrides.status || 'DRAFT',
      subtotal: overrides.subtotal !== undefined ? new Decimal(overrides.subtotal) : new Decimal(500000),
      totalDiscount: overrides.totalDiscount !== undefined ? new Decimal(overrides.totalDiscount) : new Decimal(0),
      grandTotal: overrides.grandTotal !== undefined ? new Decimal(overrides.grandTotal) : new Decimal(500000),
      ...overrides,
    },
  });
}

// Sales Order Status History Factory
export async function createTestSalesOrderStatusHistory(
  salesOrderId: string,
  fromStatus: string | null,
  toStatus: string,
  changedById: string,
  overrides: any = {}
) {
  return await prismaTest.salesOrderStatusHistory.create({
    data: {
      salesOrderId,
      fromStatus,
      toStatus,
      changedById,
      ...overrides,
    },
  });
}
