import { PrismaClient } from '@prisma/client';

// Create a separate Prisma client instance for testing
export const prismaTest = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.VITEST_VERBOSE === 'true' ? ['query', 'error', 'warn'] : ['error'],
});

/**
 * Clean all data from test database
 * Order matters due to foreign key constraints
 */
export async function cleanDatabase() {
  const tables = [
    'AIQueryLog',
    'ChatMessage',
    'ChatThread',
    'NotificationLog',
    'AuditLog',
    'Attachment',
    'JournalLine',
    'JournalEntry',
    'OperationalCost',
    'PaymentValidation',
    'Payment',
    'DeliveryNoteItem',
    'DeliveryNote',
    'Invoice',
    'StockMovement',
    'StockBatch',
    'GoodsReceipt',
    'PurchaseOrderItem',
    'PurchaseOrder',
    'SupplierPriceQuote',
    'SourcingRequest',
    'SalesOrderStatusHistory',
    'SalesOrderItem',
    'SalesOrder',
    'CustomerProductAgreement',
    'InstitutionContact',
    'Institution',
    'CustomerAddress',
    'Customer',
    'ProductSellingPrice',
    'ProductUnitConversion',
    'SupplierProduct',
    'Product',
    'ProductCategory',
    'ProductUnit',
    'Supplier',
    'User',
    'ChartOfAccount',
    'DocumentSequence',
  ];

  // DELETE FROM works without FK constraint issues regardless of connection
  for (const table of tables) {
    try {
      await prismaTest.$executeRawUnsafe(`DELETE FROM \`${table}\`;`);
    } catch (error) {
      console.warn(`Warning: Could not clean table ${table}:`, error);
    }
  }
}

/**
 * Disconnect Prisma client after tests
 */
export async function disconnectDatabase() {
  await prismaTest.$disconnect();
}

/**
 * Reset auto-increment counters for clean IDs in tests
 */
export async function resetAutoIncrement() {
  const tables = [
    'User',
    'Customer',
    'Institution',
    'Product',
    'ProductCategory',
    'Supplier',
    'SalesOrder',
    'StockBatch',
    'SourcingRequest',
    'PurchaseOrder',
  ];

  for (const table of tables) {
    try {
      await prismaTest.$executeRawUnsafe(`ALTER TABLE \`${table}\` AUTO_INCREMENT = 1;`);
    } catch (error) {
      // Ignore errors for tables that don't exist or don't have auto-increment
    }
  }
}
