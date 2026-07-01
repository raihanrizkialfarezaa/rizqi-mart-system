# Rizqi Mart System - ERP + POS + E-Commerce

Sistem hybrid untuk toko sembako dengan fitur B2C (ecer) dan B2B (grosir SPPG MBG).

## 🏗️ Arsitektur

- **Database**: MySQL dengan Prisma ORM (39 models)
- **Backend**: Next.js 14 App Router + Server Actions
- **Frontend**: React + Tailwind CSS + shadcn/ui
- **Auth**: Clerk
- **File Storage**: Cloudinary
- **Payment**: Midtrans
- **Realtime**: Pusher (untuk chat)

## 📦 Fitur Terimplementasi (Fase 1+2)

### ✅ Core Business Logic
- Inventory management dengan FIFO/EFO (Expiry-First-Out)
- Sales order lifecycle (B2C & B2B)
- Procurement & sourcing dengan price comparison
- Document generation (surat jalan & nota)
- Payment processing dengan validation workflow
- Margin calculation (gross & net)

### ✅ Database Schema
- 39 models lengkap
- 15 enums untuk type safety
- Relasi dua arah konsisten
- Audit trail untuk semua transaksi

## 🚀 Setup & Installation

### Prerequisites
- Node.js 18+ 
- MySQL 8+
- npm atau yarn

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
```bash
cp .env.example .env
```

Edit `.env` dan isi variabel berikut:

```env
# Database (sudah ada: rizqi-mart)
DATABASE_URL="mysql://root:password@localhost:3306/rizqi-mart"

# Clerk (signup di clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# Cloudinary (signup di cloudinary.com)
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"

# Midtrans (signup di midtrans.com)
MIDTRANS_SERVER_KEY="your_server_key"
MIDTRANS_CLIENT_KEY="your_client_key"
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY="your_client_key"

# Pusher (signup di pusher.com)
PUSHER_APP_ID="your_app_id"
PUSHER_KEY="your_key"
PUSHER_SECRET="your_secret"
NEXT_PUBLIC_PUSHER_KEY="your_key"

# Store Settings
CASHLESS_VALIDATION_THRESHOLD="500000"
STORE_CODE="VVS"
```

### 3. Database Migration
```bash
# Generate Prisma Client
npx prisma generate

# Run migrations (create tables)
npx prisma migrate dev --name init

# Seed initial data
npm run db:seed
```

### 4. Run Development Server
```bash
npm run dev
```

Buka browser: http://localhost:3000

## 📂 Project Structure

```
rizqi-mart-system/
├── app/
│   ├── (ecommerce)/          # B2C storefront (customer-facing)
│   ├── (pos)/                # POS terminal (kasir)
│   ├── (erp)/                # ERP dashboard (owner/admin)
│   └── api/                  # API routes & webhooks
├── lib/
│   ├── services/             # Business logic layer
│   │   ├── inventory.service.ts
│   │   ├── sales-order.service.ts
│   │   ├── procurement.service.ts
│   │   ├── delivery-note.service.ts
│   │   ├── invoice.service.ts
│   │   └── payment.service.ts
│   ├── utils/                # Utilities
│   │   ├── decimal.ts
│   │   ├── date.ts
│   │   ├── document-numbering.ts
│   │   └── cloudinary.ts
│   └── prisma.ts             # Prisma client
├── components/
│   ├── ui/                   # shadcn/ui components
│   └── shared/               # Shared components
├── prisma/
│   ├── schema.prisma         # Database schema (39 models)
│   └── seed.ts               # Initial data
└── public/
```

## 🎯 Roadmap

### ✅ Fase 1+2: Foundation & Core Logic (COMPLETED)
- Database schema
- Service layer
- Business logic

### 🔄 Fase 3: E-Commerce B2C (IN PROGRESS)
- Storefront UI
- Product catalog
- Shopping cart
- Checkout flow
- Order tracking

### ⏳ Fase 4: Finance & ERP UI
- Dashboard
- Reports (neraca, laba rugi, arus kas)
- Accounting interface
- Audit logs viewer

### ⏳ Fase 5: AI Agentic Features
- AI agent for analytics
- Function calling
- Text-to-SQL (read-only, guarded)
- Smart insights

## 📖 Key Business Rules

### Inventory (FIFO/EFO)
- Produk dengan expiry date terdekat keluar duluan
- Batch tracking untuk traceability
- Real-time stock calculation

### Sales Order State Machine
```
DRAFT → MENUNGGU_KONFIRMASI → DIKONFIRMASI → 
SIAP_KIRIM → DALAM_PENGIRIMAN → SELESAI
```

### Payment Validation
- CASH: langsung LUNAS
- TRANSFER/QRIS < Rp500k: butuh validasi admin
- TRANSFER/QRIS ≥ Rp500k: langsung LUNAS (dengan bukti)

### Documents (B2B)
- Surat Jalan: TANPA harga, 2 tanda tangan (dapur + kantor pusat)
- Nota: DENGAN harga, 1 tanda tangan (kantor pusat)

## 🛠️ Development Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server

# Database
npm run db:generate      # Generate Prisma Client
npm run db:migrate       # Run migrations
npm run db:push          # Push schema changes (no migration)
npm run db:seed          # Seed initial data
npm run db:studio        # Open Prisma Studio

# Code Quality
npm run lint             # Lint code
npm run typecheck        # TypeScript check
```

## 🔒 Security Notes

- Semua routes protected by Clerk middleware
- Role-based access control (RBAC)
- Decimal.js untuk precision math (hindari floating point errors)
- Input validation dengan Zod
- SQL injection prevention (Prisma ORM)

## 📝 API Documentation

Service layer functions can be called from:
- Server Actions (recommended)
- API Routes
- Server Components

Example:
```typescript
import { createSalesOrder } from '@/lib/services/sales-order.service';

const order = await createSalesOrder({
  channel: 'ECOMMERCE',
  orderType: 'B2C_ECER',
  customerId: 'cuid...',
  items: [...],
  createdById: 'cuid...',
});
```

## 🐛 Troubleshooting

### Database Connection Error
- Pastikan MySQL running
- Cek credentials di .env
- Cek database "rizqi-mart" sudah dibuat

### Prisma Client Not Found
```bash
npx prisma generate
```

### Migration Failed
```bash
npx prisma migrate reset  # ⚠️ Hati-hati: menghapus data
npx prisma migrate dev
```

## 📞 Support

Untuk pertanyaan atau issues, buat issue di repository ini.

## 📄 License

Private project - All rights reserved.
