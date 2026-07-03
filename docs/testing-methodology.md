# Vitest Comprehensive Testing Methodology

> Panduan ini mendokumentasikan metodologi yang digunakan untuk menulis, menjalankan,
> dan mengiterasi hingga 100% robust test coverage pada sebuah page ERP spesifik.
> Cocok digunakan sebagai konteks awal untuk AI di session baru agar langsung dapat
> mereplikasi proses yang sama persis tanpa kehilangan konteks.

---

## 1. Overview

### Tujuan
Melakukan verifikasi menyeluruh pada semua logic dan fitur yang ada dalam scope sebuah halaman tertentu (misal: `/erp`, `/orders`, `/inventory`) melalui **Vitest unit & integration tests** dengan target **100% passing**.

### Kapan Metode Ini Digunakan
- Ada page baru / page existing yang belum memiliki test coverage
- Ingin memastikan semua business logic berfungsi sesuai Prisma schema
- Perlu regression safety net sebelum refactor atau penambahan fitur
- Validasi integritas data terhadap actual database (bukan mock)

### Expected Outcome
- Semua service functions dalam scope page ter-test (happy path, edge case, empty state)
- 100% test passing rate (0 failures, 0 errors)
- Test factories selaras dengan Prisma schema (tidak ada field mismatch)
- Coverage mencakup aggregasi, filtering, relasi, dan enum validation

---

## 2. Methodology Summary: 7-Phase Iterative Workflow

```
Phase 1: Goal Definition ──→ Target page, list features, choose approach
         ↓
Phase 2: Infrastructure ──→ Vitest config, test DB, factories, env
         ↓
Phase 3: Test Writing ────→ Comprehensive test per service function
         ↓
Phase 4: First Execution ─→ Run all tests, capture pass/fail ratio
         ↓
Phase 5: Root Cause Analysis → For each failure: read schema, find mismatch
         ↓
Phase 6: Surgical Fixes ──→ Fix one mismatch at a time, re-run, track progress
         ↓
Phase 7: Final Verify ────→ 100% passed? Document. Done. Else → back to Phase 5
```

### Golden Rules
- **Schema-first**: Always verify against Prisma schema before writing fix code
- **Surgical edits only**: Setiap fix harus kecil (<30 lines), fokus pada satu issue
- **Iterate fast**: Fix → re-run → analyze → fix lagi, jangan batch semua fix
- **No guessing**: Kalau error "Unknown argument X", cek schema dulu — jangan asal hapus/tambah
- **Track progress**: Catat jumlah passing setiap run (contoh: 11→14→16→17→19)

---

## 3. Prerequisites

Sebelum memulai, pastikan infrastructure ini sudah ada atau siap dibuat:

### 3.1 Test Database
- Database test terpisah dari production (contoh: `rizqi_mart_test`)
- Bisa di-reset setiap test suite (truncate semua tabel)
- Koneksi via `DATABASE_URL` di `.env.test`

### 3.2 Vitest Configuration
- `vitest.config.mjs` with:
  ```js
  globals: true,
  environment: 'node',
  setupFiles: ['./__tests__/setup/vitest.setup.ts'],
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  env: { DATABASE_URL: 'mysql://...' }
  ```
- Test scripts in `package.json`:
  ```json
  "test": "vitest",
  "test:run": "vitest run",
  "test:coverage": "vitest run --coverage"
  ```

### 3.3 Database Setup & Cleanup
- File: `__tests__/setup/test-db.ts`
  - `cleanDatabase()` — truncates all tables in FK-safe order
  - `disconnectDatabase()` — cleanup after all tests
  - `resetAutoIncrement()` — optional, for clean IDs
- File: `__tests__/setup/vitest.setup.ts`
  - `beforeAll`: load env, run `prisma db push`
  - `beforeEach`: call `cleanDatabase()`
  - `afterAll`: call `disconnectDatabase()`

### 3.4 Test Data Factories
- File: `__tests__/fixtures/factories.ts`
- Pattern: `createTestXxx(overrides: any = {})` yang langsung `prismaTest.xxx.create({...})`
- Auto-create dependencies jika tidak di-override
- Gunakan counter unik (`getUniqueId()`) untuk data yang perlu unique

### 3.5 Environment File
- `.env.test`: `DATABASE_URL` menunjuk ke test database
- API keys atau konfigurasi lain yang di-mock

---

## 4. Phase-by-Phase Detail

### Phase 1: Goal Definition

**Aktivitas:**
1. Identifikasi target page URL (contoh: `http://localhost:3000/erp`)
2. Identifikasi semua service functions yang dipanggil oleh page tersebut
3. Catat semua logic yang perlu di-test:
   - Data aggregation (SUM, COUNT, GROUP BY)
   - Filtering by date range
   - Status-based filtering
   - Relationship includes
   - Empty state handling
   - Edge cases (zero values, cancelled status, etc.)

**Use Case dari Session Ini:**
Target: `/erp` dashboard page
Service functions ditemukan di `lib/services/dashboard.service.ts`:
- `getDashboardMetrics()` — 8 metrik aggregate (today sales, monthly revenue, margin, pending orders, low stock, expiring batches, pending payments, unpaid receivables)
- `getRecentOrders(limit)` — order terbaru dengan relasi customer & institution
- `getTopProducts(limit)` — top produk berdasarkan revenue 30 hari terakhir
- `getActiveSourcingCount()` — hitung sourcing request aktif

### Phase 2: Test Infrastructure Setup

**Aktivitas:**
1. Install dependencies:
   ```bash
   npm install -D vitest @vitest/ui dotenv
   ```
2. Create `vitest.config.mjs`:
   ```js
   import { defineConfig } from 'vitest/config';
   import path from 'path';
   export default defineConfig({
     test: {
       globals: true,
       environment: 'node',
       setupFiles: ['./__tests__/setup/vitest.setup.ts'],
       testTimeout: 30000,
       hookTimeout: 30000,
     },
     resolve: {
       alias: { '@': path.resolve(__dirname, '.') },
     },
   });
   ```
3. Create `.env.test` dengan `DATABASE_URL` dan mock config
4. Create database helpers (`test-db.ts`, `vitest.setup.ts`)
5. Create factories (`factories.ts`)

**Important Config Notes (dari pengalaman):**
- Gunakan `vitest.config.mjs` (bukan `.ts` atau `.js`) untuk menghindari `ERR_REQUIRE_ESM`
- Set `DATABASE_URL` langsung di `vitest.config.mjs` block `env` jika `.env.test` tidak terbaca
- `__dirname` tidak tersedia di ES modules — gunakan `fileURLToPath(import.meta.url)` di setup file

### Phase 3: Comprehensive Test Writing

**Test Structure:**
```
__tests__/unit/services/<service-name>.service.test.ts
  describe('<Service Name> - <page path> tests')
    describe('<functionName>()')
      it('test case 1 ...')
      it('test case 2 ...')
      ...
```

**What to Test for Each Function:**

| Aspect | Contoh Kasus |
|--------|-------------|
| Happy path | Data normal, return values benar |
| Empty state | Tidak ada data sama sekali → return 0 / [] |
| Date filtering | Data hari ini vs bulan lalu vs 30 hari |
| Status filtering | Active vs cancelled vs completed |
| Aggregation | SUM revenue, COUNT orders, GROUP BY product |
| Relationship | Customer name, institution name di-include |
| Limit parameter | 5, 10, default value |
| Edge cases | Zero stock, expired yesterday, null relations |
| Enum validation | Status value valid sesuai Prisma enum |

**Use Case dari Session Ini (contoh test pattern):**

```typescript
// Happy path — basic metric calculation
it('calculates today sales correctly', async () => {
  const order = await createTestSalesOrder({
    totalAmount: new Decimal(150000),
  });
  const metrics = await getDashboardMetrics();
  expect(metrics.salesToday).toBe('150000');
  expect(metrics.salesTodayCount).toBe(1);
});

// Empty state — no data
it('handles empty database gracefully', async () => {
  const metrics = await getDashboardMetrics();
  expect(metrics.salesToday).toBe('0');
  expect(metrics.salesTodayCount).toBe(0);
  expect(metrics.pendingOrders).toBe(0);
  expect(metrics.unpaidReceivables).toBe('0');
});

// Status filtering — exclude cancelled
it('excludes cancelled orders from revenue calculations', async () => {
  await createTestSalesOrder({ totalAmount: new Decimal(50000), status: 'DIBATALKAN' });
  const metrics = await getDashboardMetrics();
  expect(metrics.revenueMonth).toBe('0');
});

// Date boundary — only last 30 days
it('only includes sales from last 30 days', async () => {
  await createTestSalesOrderItem(recentOrder.id, product.id, { ... });
  await createTestSalesOrderItem(oldOrder.id, product.id, { createdAt: oldDate, ... });
  const topProducts = await getTopProducts(5);
  expect(topProducts.length).toBe(1); // Only recent counted
});
```

### Phase 4: Initial Test Execution

**Command:**
```bash
npm run test:run    # atau npx vitest run --reporter=verbose
```

**Aktivitas:**
1. Jalankan semua tests
2. Catat hasil: `N passed / M failed` — ini adalah **baseline**
3. Catat error messages lengkap untuk setiap failure
4. Jangan fix apapun dulu — analisis dulu semua error

**Use Case dari Session Ini:**
- First run: `0 passed / (banyak error)` — factories belum match schema
- Setelah setup & factory fixes: `11 passed / 8 failed`
- Progress track: `11→14→16→17→19`

### Phase 5: Schema Mismatch Analysis

**Untuk setiap test failure, lakukan:**

1. **Read the Prisma error message carefully** — Prisma selalu memberi tahu:
   - `Unknown argument X` → field `X` tidak ada di schema → HAPUS dari factory/test
   - `Argument X is missing` → field `X` required tapi tidak di-provide → TAMBAH ke factory
   - `Invalid value for argument X. Expected Y` → enum value tidak valid → CEK enum definition
   - `X is missing` untuk relation → butuh foreign key / nested create

2. **Verifikasi dengan membaca Prisma schema:**
   ```bash
   # Cara cepat baca satu model dari schema
   # Buka file prisma/schema.prisma, cari model terkait
   ```
   Bandingkan field-by-field antara schema dengan factory code.

3. **Categories of mismatches (dari pengalaman):**

| Category | Contoh Error | Root Cause | Fix Action |
|----------|-------------|------------|------------|
| Missing required field | `Argument unitCostBase is missing` | Factory tidak provide field required | Tambah field dengan default value |
| Unknown field | `Unknown argument costPrice` | Factory pakai field yang tidak ada di schema | Hapus field dari factory |
| Wrong field name | `Unknown argument paymentDate` | Test pakai nama `paymentDate`, schema punya `paidAt` | Rename ke nama yang benar |
| Invalid enum value | `Expected PaymentStatus, got TERVALIDASI` | Test pakai value yang tidak ada di enum | Ganti dengan value valid dari enum schema |
| Missing relation | `Argument salesOrderItem is missing` | Relation required tapi tidak disediakan | Auto-create relasi di factory |
| Cascade dependency | Error setelah fix satu field, muncul error field lain | Schema punya field lain yang juga required | Iterasi: fix satu per satu |

**Use Case dari Session Ini — Progres Analisis:**
```
Iterasi 1 (11/19): 5 errors → [stockQty→qtyReceivedBase, paymentMethod→method, 
                                 Institution.phone, SalesOrderItem.salesOrder, 
                                 SourcingRequest.deadline]

Iterasi 2 (14/19): 5 errors → [+] unitCostBase, paymentDate→paidAt, 
                                SourcingRequest.salesOrderItemId, 
                                customer info sort order, pricePerUnit→unitSellPrice

Iterasi 3 (16/19): 3 errors → [−] customer info sort, payment date ✓
                                [−] SELESAI→DIBELI (SourcingStatus enum)
                                [−] batchNumber (not in schema)

Iterasi 4 (17/19): 2 errors → [−] PaymentStatus.TERVALIDASI→LUNAS ✓
                                [−] StockBatch.costPrice (not in schema)

Iterasi 5 (19/19): 0 errors → ALL PASSED ✓
```

### Phase 6: Surgical Fixes (Iterative)

**Prinsip:**
- Fix **satu mismatch per iterasi** (atau beberapa yang independen)
- Setiap edit harus **<30 lines** — jangan rewrite entire file
- **Re-run tests setelah setiap fix** untuk verifikasi
- Catat progress (`N passed / 19` → `N+1 passed / 19`)

**Fix Priority:**
1. Factory issues (missing fields, wrong field names) — karena mempengaruhi banyak test
2. Test code issues (wrong enum values, wrong field names)
3. Logic issues (wrong assertions, sort order)

**Teknik Surgical Edit yang Terbukti Efektif:**
```typescript
// Mengubah nama field (replaceAll aman untuk test file):
edit({
  filePath: '.../test.ts',
  oldString: 'paymentMethod',
  newString: 'method',
  replaceAll: true,
});

// Menambah field yang missing (satu baris):
edit({
  filePath: '.../factories.ts',
  oldString: `qtyRemainingBase: ...`,
  newString: `qtyRemainingBase: ...,\nunitCostBase: new Decimal(4000),`,
});

// Menghapus field yang tidak ada di schema:
edit({
  filePath: '.../factories.ts',
  oldString: 'batchNumber: ...,\n',
  newString: '',
});

// Mengganti enum value yang salah:
edit({
  filePath: '.../test.ts',
  oldString: "status: 'TERVALIDASI'",
  newString: "status: 'LUNAS'",
});
```

### Phase 7: Final Verification & Documentation

**Verifikasi:**
```bash
npx vitest run --reporter=verbose
# Expected output:
# Test Files  1 passed (1)
#      Tests  19 passed (19)
```

**Dokumentasi (opsional tapi direkomendasikan):**
- Catat semua fix yang dilakukan (bisa di AGENTS.md atau issue tracker)
- Update factories jika ada field baru yang ditemukan
- Pastikan tidak ada dead code / commented-out code yang tersisa

---

## 5. Factory Pattern Best Practices

Factory adalah komponen paling kritis. Factory yang salah = semua test gagal.

### 5.1 Factory Structure Template

```typescript
// __tests__/fixtures/factories.ts
import { prismaTest } from '../setup/test-db';
import Decimal from 'decimal.js';

let counter = 0;
const getUniqueId = () => ++counter;

export async function createTestXxx(overrides: any = {}) {
  // 1. Resolve dependencies yang mungkin perlu auto-create
  let dependencyId = overrides.dependencyId;
  if (!dependencyId) {
    const dep = await createTestDependency();
    dependencyId = dep.id;
  }

  // 2. Create dengan Prisma, gunakan defaults + overrides
  return await prismaTest.xxx.create({
    data: {
      // Required fields with defaults
      field1: overrides.field1 || `default-value-${getUniqueId()}`,
      field2: overrides.field2 ?? true,
      numericField: overrides.numericField !== undefined
        ? new Decimal(overrides.numericField)
        : new Decimal(100),
      
      // Foreign keys
      dependencyId,
      
      // Spread overrides LAST — allows override of any field
      ...overrides,
    },
  });
}
```

### 5.2 Key Rules

1. **Setiap factory harus match persis dengan Prisma schema** — jangan asal copy dari factory lain
2. **Gunakan `...overrides` di akhir** — biarkan caller override field apapun
3. **Auto-create dependencies** dengan lazy pattern (create only if needed)
4. **Gunakan `getUniqueId()`** untuk field unique (SKU, order number, dll)
5. **Gunakan `new Decimal()`** untuk field Decimal — jangan pakai number langsung
6. **Untuk optional field**: beri default dengan `??` (nullish coalescing) — bedakan falsy 0 vs undefined
7. **Untuk date field**: gunakan `new Date()` dengan offset yang masuk akal (90 hari untuk expiry, 7 hari untuk deadline)

### 5.3 Cascading Dependency Pattern

Beberapa model punya required relation chain yang panjang. Contoh dari session ini:

```
SourcingRequest
  └── requires salesOrderItemId ──→ SalesOrderItem
       └── requires salesOrderId  ──→ SalesOrder
       │    └── requires createdById ──→ User
       └── requires unitId        ──→ ProductUnit
```

Solusi di factory: **auto-create chain** dengan urutan yang benar:
```typescript
export async function createTestSourcingRequest(productId: number, overrides = {}) {
  // Resolve unitId (find or create 'pcs')
  let unitId = overrides.unitId;
  if (!unitId) {
    let unit = await prismaTest.productUnit.findUnique({ where: { code: 'pcs' } });
    if (!unit) unit = await prismaTest.productUnit.create({ data: { code: 'pcs', name: 'Pieces' } });
    unitId = unit.id;
  }

  // Resolve salesOrderItemId (create chain: User → SalesOrder → SalesOrderItem)
  let salesOrderItemId = overrides.salesOrderItemId;
  if (!salesOrderItemId) {
    const user = await createTestUser();
    const order = await prismaTest.salesOrder.create({ data: { ... } });
    const item = await prismaTest.salesOrderItem.create({ data: { salesOrderId: order.id, productId, unitId, ... } });
    salesOrderItemId = item.id;
  }

  return await prismaTest.sourcingRequest.create({
    data: { salesOrderItemId, productId, unitId, ...overrides },
  });
}
```

---

## 6. Troubleshooting Reference

### 6.1 Error Pattern Recognition

| Prisma Error Message | Probable Cause | Action |
|---------------------|---------------|--------|
| `Unknown argument X` | Field `X` tidak ada di schema | Hapus dari data object |
| `Argument X is missing` | Field `X` required tidak di-provide | Tambah field dengan default |
| `Invalid value for argument X. Expected Y` | Nilai tidak valid untuk enum | Cek enum definition, ganti value |
| `X ... is missing` (relation) | Required relation tidak di-set | Tambah foreign key atau nested create |
| `Type mismatch` | Decimal vs number, String vs Int | Konversi tipe data yang benar |

### 6.2 Factory Debug Checklist

Saat factory gagal, check:

- [ ] Apakah semua field **required** di schema ada di factory?
- [ ] Apakah tidak ada field yang **tidak ada** di schema?
- [ ] Apakah tipe data match? (Decimal vs number, String vs Int, DateTime vs Date)
- [ ] Apakah enum values match persis? (case-sensitive, underscore vs not)
- [ ] Apakah foreign keys mereferensi record yang benar-benar ada?
- [ ] Apakah `...overrides` tidak membawa field yang tidak dikenal?
- [ ] Apakah `createTestDependency()` dipanggil dengan urutan yang benar?

### 6.3 Schema Verification Commands

```bash
# Baca full model dari schema
cd B:\app\rizqi-mart-system
$content = Get-Content -LiteralPath "prisma\schema.prisma" -Raw
$start = $content.IndexOf("model NamaModel {")
$end = $content.IndexOf("`n}", $start) + 2
$content.Substring($start, $end - $start)

# Cek enum values
Select-String -Pattern "enum NamaEnum {" -Path "prisma\schema.prisma" -Context 0,10

# Cari apakah suatu field ada di schema
Select-String -Pattern "namaField" -Path "prisma\schema.prisma"
```

---

## 7. Success Criteria Checklist

- [ ] **19/19 tests passing** (atau jumlah test sesuai scope)
- [ ] Tidak ada `PrismaClientValidationError` sama sekali
- [ ] Tidak ada `PrismaClientKnownRequestError`
- [ ] Tidak ada assertion failures (`expected X to be Y`)
- [ ] Semua service functions dalam scope ter-cover:
  - [ ] Happy path (data normal)
  - [ ] Empty state (database kosong)
  - [ ] Date filtering (hari ini, bulan ini, 30 hari, expired)
  - [ ] Status filtering (active vs cancelled vs completed)
  - [ ] Aggregation (SUM, COUNT, GROUP BY)
  - [ ] Relationship includes (customer, institution, product)
  - [ ] Limit parameter
- [ ] All factories match Prisma schema exactly (verified by passing tests)
- [ ] Test suite runs cleanly: `vitest run` → `1 passed, 19 passed`
- [ ] Test suite runs consistently (rerun gives same result)

---

## 8. Quick Reference: Session Kickoff

Saat akan memulai testing page baru di session AI baru, berikan:

1. **Target page URL** dan path file service yang akan di-test
2. **List service functions** yang perlu di-cover
3. **Existing test infrastructure location** (`__tests__/setup/`, `__tests__/fixtures/`)
4. **Current test pass rate** (kalau sudah ada yang jalan)
5. **Perintah**: "Gunakan metodologi yang didokumentasikan di `docs/testing-methodology.md` untuk melakukan comprehensive testing pada halaman ini. Target: 100% passing."

---
*Version: 1.0 — Last updated: 2026-07-03*
*Methodology validated on: /erp dashboard page — 19 tests, 19 passed (100%)*
