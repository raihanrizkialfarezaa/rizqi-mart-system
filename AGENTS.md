# Rizqi Mart System - Agent Instructions

Guidelines for agents working in this repository.

## 🧪 Verification & Testing
- **Test Database**: Testing requires a running local MySQL instance. The test DB is configured via `.env.test` as `rizqi_mart_test` (defined in `vitest.config.mjs`). Do not use SQLite/in-memory.
- **Verification Command**: Run `npm run test:run` for vitest tests. Avoid interactive runners.
- **Auto-Sync Schema**: The test runner automatically syncs the schema using `npx prisma db push --skip-generate --accept-data-loss` (via `__tests__/setup/vitest.setup.ts`).
- **Database Cleanups**: Tables are cleaned `beforeEach` test via `cleanDatabase()` in `__tests__/setup/test-db.ts` using a strict foreign-key-safe order.

## 🦕 TypeScript & Type Quirks
- **Factory ID Mismatches**: In `__tests__/fixtures/factories.ts`, some signatures (e.g., `createTestStockBatch`, `createTestSalesOrderItem`, `createTestPurchaseOrder`) type parent IDs as `number` (e.g., `productId: number`). However, all IDs in `schema.prisma` are `String` (CUID). Cast these inputs (e.g., `productId as any`) to bypass compiler errors.
- **Decimal Types**: Financial and quantity values are mapped to Prisma's `Decimal` type. Wrap values in `new Decimal(...)` (imported from `decimal.js`) or use helpers in `lib/utils/decimal.ts`.
- **SalesOrder Relations**: The type `SalesOrderWithItems` returned by `getSalesOrderById` does not statically expose `statusHistory`, `deliveryNote`, `invoice`, or `payments` in its TypeScript declaration, even though they are fetched at runtime. Use type casts or local interfaces when accessing them.

## 🔑 Authentication
- **Local Dev Auth**: Production uses Clerk, but local dev/testing uses a custom JWT session-based mock provider (see `lib/auth/session.ts` and `lib/auth/AuthProvider.tsx`).
- **Login Credentials**: The local test login accepts any email present in the database and *any* password.

## 🛒 Critical Business Rules
- **No Prices on Delivery Notes (Surat Jalan)**: Delivery notes must never expose item prices. Only the `Invoice` contains prices.
- **EFO Stock Allocation**: Stocks are allocated using Expiry-First-Out (EFO) based on `StockBatch.expiryDate`, falling back to FIFO.
- **Payment Validation**: Payments via CASH are immediately marked `LUNAS`. Transfer/QRIS payments under Rp 500,000 require manual validation, whereas payments >= Rp 500,000 are marked `LUNAS` once proof is provided.
