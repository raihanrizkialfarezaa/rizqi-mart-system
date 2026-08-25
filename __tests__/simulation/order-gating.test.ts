import { describe, beforeEach, afterAll, it, expect } from 'vitest';
import { prismaTest, cleanDatabase, disconnectDatabase } from '../setup/test-db';
import { createTestUser, createTestProduct, createTestCustomer, createTestSalesOrder, createTestSalesOrderItem, createTestProductUnit } from '../fixtures/factories';

// ─── Helpers replicating production logic (must stay in sync with app code) ───

const ELIGIBLE_STATUSES = ["SIAP_KIRIM", "DALAM_PENGIRIMAN", "TERKIRIM_MENUNGGU_TTD"];

function canConfirmReceivedClient(order: any): boolean {
  const isCancelled = order.status === "DIBATALKAN";
  const isCompleted = order.status === "SELESAI";
  const isPaymentSettled = order.paymentStatus === "LUNAS";
  const isEligible = ELIGIBLE_STATUSES.includes(order.status) || (order.deliveryMethod === "PICKUP" && order.status === "DIKONFIRMASI" && isPaymentSettled);
  return !isCancelled && !isCompleted && isPaymentSettled && isEligible;
}

function getConfirmBlockReason(order: any): string | null {
  if (order.status === "DIBATALKAN" || order.status === "SELESAI") return null;
  const primaryMethod = order.payments?.[0]?.method || null;
  const isCOD = primaryMethod === "CASH";
  if (order.paymentStatus !== "LUNAS") {
    if (isCOD) return "COD belum dikonfirmasi kurir/admin";
    if (order.paymentStatus === "MENUNGGU_VALIDASI") return "Menunggu validasi admin";
    return "Selesaikan pembayaran terlebih dahulu";
  }
  const isEligible = ELIGIBLE_STATUSES.includes(order.status) || (order.deliveryMethod === "PICKUP" && order.status === "DIKONFIRMASI");
  if (!isEligible) return "Pesanan belum siap dikirim";
  return null;
}

// Simulate PATCH /api/ecommerce/orders/[id] MARK_RECEIVED server guard
async function simulateMarkReceived(orderId: string): Promise<{ ok: boolean; status: number; error?: string }> {
  const order = await prismaTest.salesOrder.findUnique({ where: { id: orderId }, include: { payments: true } });
  if (!order) return { ok: false, status: 404, error: "not found" };
  if (order.status === "SELESAI" || order.status === "DIBATALKAN") return { ok: false, status: 400, error: "Status pesanan tidak valid untuk diselesaikan" };

  const ELIGIBLE = ["SIAP_KIRIM", "DALAM_PENGIRIMAN", "TERKIRIM_MENUNGGU_TTD"];
  const isPickupEligible = order.deliveryMethod === "PICKUP" && order.status === "DIKONFIRMASI" && order.paymentStatus === "LUNAS";
  const isEligible = ELIGIBLE.includes(order.status) || isPickupEligible;
  if (!isEligible) return { ok: false, status: 400, error: "Belum siap dikirim" };
  if (order.paymentStatus !== "LUNAS") {
    const isCOD = order.payments[0]?.method === "CASH";
    return { ok: false, status: 402, error: isCOD ? "COD belum dikonfirmasi" : "Belum lunas" };
  }
  // Success: update to SELESAI
  await prismaTest.salesOrder.update({ where: { id: orderId }, data: { status: "SELESAI", fulfillmentStatus: "LENGKAP" } });
  return { ok: true, status: 200 };
}

// Simulate UPLOAD proof logic (mirrors route.ts)
async function simulateUploadProof(orderId: string, proofUrl: string) {
  const order = await prismaTest.salesOrder.findUnique({ where: { id: orderId }, include: { payments: true } });
  if (!order) throw new Error("order not found");
  const primary = order.payments[0];
  if (primary && primary.method === "CASH") throw new Error("COD tidak perlu bukti transfer");
  const threshold = parseFloat(process.env.CASHLESS_VALIDATION_THRESHOLD || "500000");
  const amount = Number(order.totalAmount);
  const isSmall = amount < threshold;
  const newStatus = isSmall ? "MENUNGGU_VALIDASI" : "LUNAS";
  if (primary) {
    await prismaTest.payment.update({ where: { id: primary.id }, data: { proofFileUrl: proofUrl, status: newStatus as any, requiresValidation: isSmall, paidAt: newStatus === "LUNAS" ? new Date() : null } });
  } else {
    await prismaTest.payment.create({ data: { paymentNumber: `PAY-${Date.now()}`, salesOrderId: orderId, method: "TRANSFER_BANK", amount, status: newStatus as any, requiresValidation: isSmall, proofFileUrl: proofUrl } });
  }
  await prismaTest.salesOrder.update({ where: { id: orderId }, data: { paymentStatus: newStatus as any } });
  return newStatus;
}

// Simulate admin validation for small cashless
async function simulateAdminValidate(paymentId: string, approved: boolean) {
  const payment = await prismaTest.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new Error("payment not found");
  const newStatus = approved ? "LUNAS" : "DITOLAK";
  await prismaTest.payment.update({ where: { id: paymentId }, data: { status: newStatus as any, paidAt: approved ? new Date() : null } });
  await prismaTest.salesOrder.update({ where: { id: payment.salesOrderId }, data: { paymentStatus: newStatus as any } });
  if (approved) {
    // Need a real user for FK
    const admin = await prismaTest.user.findFirst() || await createTestUser({ role: "ADMIN_TOKO" });
    await prismaTest.paymentValidation.create({ data: { paymentId, validatedById: admin.id, isApproved: true } } as any);
  }
  return newStatus;
}

// Simulate admin COD confirm (courier collects cash)
async function simulateAdminCODConfirm(orderId: string) {
  const order = await prismaTest.salesOrder.findUnique({ where: { id: orderId }, include: { payments: true } });
  const pay = order?.payments[0];
  if (!pay) throw new Error("no payment");
  await prismaTest.payment.update({ where: { id: pay.id }, data: { status: "LUNAS" as any, paidAt: new Date() } });
  await prismaTest.salesOrder.update({ where: { id: orderId }, data: { paymentStatus: "LUNAS" as any } });
}

// Helper to create order with specific payment method & delivery & amount, mimicking POST /api/ecommerce/orders
async function createOrderWithPayment(opts: { paymentMethod: "CASH"|"TRANSFER_BANK"|"QRIS"; deliveryMethod: "DELIVERY"|"PICKUP"; totalAmount: number; status?: string; }) {
  const customer = await createTestCustomer();
  const user = await createTestUser();
  const product = await createTestProduct();
  const unit = await prismaTest.productUnit.findUnique({ where: { code: 'pcs' } });
  const unitId = unit!.id;

  const order = await createTestSalesOrder({
    customerId: customer.id,
    createdById: user.id,
    deliveryMethod: opts.deliveryMethod,
    status: opts.status || "DRAFT",
    paymentStatus: "BELUM_BAYAR",
    totalAmount: opts.totalAmount,
    subtotal: opts.totalAmount,
    orderType: "B2C_ECER",
  });
  await createTestSalesOrderItem(order.id, product.id, { unitId, qty: 1, unitSellPrice: opts.totalAmount, subtotalSell: opts.totalAmount });

  const threshold = parseFloat(process.env.CASHLESS_VALIDATION_THRESHOLD || "500000");
  const requiresValidation = (opts.paymentMethod === "TRANSFER_BANK" || opts.paymentMethod === "QRIS") && opts.totalAmount < threshold;

  const payment = await prismaTest.payment.create({
    data: {
      paymentNumber: `PAY-${Date.now()}-${Math.random().toString(36).slice(2,4)}`,
      salesOrderId: order.id,
      method: opts.paymentMethod as any,
      amount: opts.totalAmount,
      status: "BELUM_BAYAR" as any,
      requiresValidation,
    }
  });

  const full = await prismaTest.salesOrder.findUnique({ where: { id: order.id }, include: { payments: true } });
  return { order: full!, payment, customer, user, product };
}

describe("Order Gating Simulation: all payment × delivery flows until SELESAI", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });
  afterAll(async () => {
    await disconnectDatabase();
  });

  // ─── TABLE-DRIVEN: every combination ───
  const matrix = [
    { paymentMethod: "CASH" as const, deliveryMethod: "DELIVERY" as const, amount: 100000, label: "COD DELIVERY kecil (<500k)" },
    { paymentMethod: "CASH" as const, deliveryMethod: "PICKUP" as const, amount: 100000, label: "COD PICKUP kecil" },
    { paymentMethod: "CASH" as const, deliveryMethod: "DELIVERY" as const, amount: 600000, label: "COD DELIVERY besar (>=500k)" },
    { paymentMethod: "TRANSFER_BANK" as const, deliveryMethod: "DELIVERY" as const, amount: 100000, label: "Transfer DELIVERY kecil (butuh validasi)" },
    { paymentMethod: "TRANSFER_BANK" as const, deliveryMethod: "DELIVERY" as const, amount: 600000, label: "Transfer DELIVERY besar (auto-LUNAS dengan bukti)" },
    { paymentMethod: "TRANSFER_BANK" as const, deliveryMethod: "PICKUP" as const, amount: 100000, label: "Transfer PICKUP kecil" },
    { paymentMethod: "QRIS" as const, deliveryMethod: "DELIVERY" as const, amount: 100000, label: "QRIS DELIVERY kecil" },
    { paymentMethod: "QRIS" as const, deliveryMethod: "DELIVERY" as const, amount: 600000, label: "QRIS DELIVERY besar" },
    { paymentMethod: "QRIS" as const, deliveryMethod: "PICKUP" as const, amount: 600000, label: "QRIS PICKUP besar" },
  ];

  for (const tc of matrix) {
    it(`Flow: ${tc.label} — blocks before LUNAS & fulfillment, succeeds after`, async () => {
      const { order } = await createOrderWithPayment({ paymentMethod: tc.paymentMethod, deliveryMethod: tc.deliveryMethod, totalAmount: tc.amount });

      // 1) Initial: BELUM_BAYAR + DRAFT → must block MARK_RECEIVED (402 or 400)
      let res = await simulateMarkReceived(order.id);
      expect(res.ok).toBe(false);
      expect([400,402]).toContain(res.status);

      // 2) Client gating also blocks
      let fresh = await prismaTest.salesOrder.findUnique({ where: { id: order.id }, include: { payments: true } });
      expect(canConfirmReceivedClient(fresh!)).toBe(false);

      // 3) Move to SIAP_KIRIM but still BELUM_BAYAR → still blocked by payment (402)
      await prismaTest.salesOrder.update({ where: { id: order.id }, data: { status: "SIAP_KIRIM" } });
      res = await simulateMarkReceived(order.id);
      expect(res.ok).toBe(false);
      expect(res.status).toBe(402);
      fresh = await prismaTest.salesOrder.findUnique({ where: { id: order.id }, include: { payments: true } });
      expect(canConfirmReceivedClient(fresh!)).toBe(false);
      expect(getConfirmBlockReason(fresh!)).toBeTruthy();

      // 4) Branch per method
      if (tc.paymentMethod === "CASH") {
        // COD: upload proof must be rejected
        await expect(simulateUploadProof(order.id, "https://example.com/bukti.jpg")).rejects.toThrow(/COD/);

        // Admin courier confirms cash collection → LUNAS
        await simulateAdminCODConfirm(order.id);
        fresh = await prismaTest.salesOrder.findUnique({ where: { id: order.id }, include: { payments: true } });
        expect(fresh!.paymentStatus).toBe("LUNAS");

        // Now move to DALAM_PENGIRIMAN → should be eligible
        await prismaTest.salesOrder.update({ where: { id: order.id }, data: { status: "DALAM_PENGIRIMAN" } });
        fresh = await prismaTest.salesOrder.findUnique({ where: { id: order.id }, include: { payments: true } });
        expect(canConfirmReceivedClient(fresh!)).toBe(true);

        res = await simulateMarkReceived(order.id);
        expect(res.ok).toBe(true);
        fresh = await prismaTest.salesOrder.findUnique({ where: { id: order.id } }) as any;
        expect(fresh!.status).toBe("SELESAI");

      } else {
        // Prepaid: upload proof
        const newStatus = await simulateUploadProof(order.id, "https://example.com/bukti.jpg");
        fresh = await prismaTest.salesOrder.findUnique({ where: { id: order.id }, include: { payments: true } });

        if (tc.amount < 500000) {
          // Small → MENUNGGU_VALIDASI → still blocked (402)
          expect(newStatus).toBe("MENUNGGU_VALIDASI");
          expect(fresh!.paymentStatus).toBe("MENUNGGU_VALIDASI");
          // try confirm in SIAP_KIRIM with MENUNGGU_VALIDASI → blocked
          await prismaTest.salesOrder.update({ where: { id: order.id }, data: { status: "DALAM_PENGIRIMAN" } });
          res = await simulateMarkReceived(order.id);
          expect(res.ok).toBe(false);
          expect(res.status).toBe(402);

          // Admin validates → LUNAS
          const pay = fresh!.payments[0];
          await simulateAdminValidate(pay.id, true);
          fresh = await prismaTest.salesOrder.findUnique({ where: { id: order.id }, include: { payments: true } });
          expect(fresh!.paymentStatus).toBe("LUNAS");
        } else {
          // Large → directly LUNAS
          expect(newStatus).toBe("LUNAS");
          expect(fresh!.paymentStatus).toBe("LUNAS");
          await prismaTest.salesOrder.update({ where: { id: order.id }, data: { status: "DALAM_PENGIRIMAN" } });
        }

        // Now LUNAS + DALAM_PENGIRIMAN → should succeed
        fresh = await prismaTest.salesOrder.findUnique({ where: { id: order.id }, include: { payments: true } });
        expect(canConfirmReceivedClient(fresh!)).toBe(true);
        res = await simulateMarkReceived(order.id);
        expect(res.ok).toBe(true);
        fresh = await prismaTest.salesOrder.findUnique({ where: { id: order.id } }) as any;
        expect(fresh!.status).toBe("SELESAI");
      }
    });
  }

  it("Prepaid: cannot confirm when status still DRAFT/MENUNGGU_KONFIRMASI even if already LUNAS", async () => {
    const { order, payment } = await createOrderWithPayment({ paymentMethod: "TRANSFER_BANK", deliveryMethod: "DELIVERY", totalAmount: 600000 });
    // Simulate large amount upload → auto LUNAS
    await simulateUploadProof(order.id, "https://example.com/bukti.jpg");
    let fresh = await prismaTest.salesOrder.findUnique({ where: { id: order.id }, include: { payments: true } });
    expect(fresh!.paymentStatus).toBe("LUNAS");
    // Still DRAFT → blocked by fulfillment (400)
    let res = await simulateMarkReceived(order.id);
    expect(res.ok).toBe(false);
    expect(res.status).toBe(400);
    expect(canConfirmReceivedClient(fresh!)).toBe(false);

    // Move to MENUNGGU_KONFIRMASI → still blocked
    await prismaTest.salesOrder.update({ where: { id: order.id }, data: { status: "MENUNGGU_KONFIRMASI" } });
    res = await simulateMarkReceived(order.id);
    expect(res.ok).toBe(false);
    expect(res.status).toBe(400);

    // Move to SIAP_KIRIM → now eligible
    await prismaTest.salesOrder.update({ where: { id: order.id }, data: { status: "SIAP_KIRIM" } });
    fresh = await prismaTest.salesOrder.findUnique({ where: { id: order.id }, include: { payments: true } });
    expect(canConfirmReceivedClient(fresh!)).toBe(true);
    res = await simulateMarkReceived(order.id);
    expect(res.ok).toBe(true);
  });

  it("PICKUP edge: DIKONFIRMASI + LUNAS is eligible for PICKUP (ambil di toko)", async () => {
    const { order } = await createOrderWithPayment({ paymentMethod: "QRIS", deliveryMethod: "PICKUP", totalAmount: 600000 });
    await simulateUploadProof(order.id, "https://example.com/bukti.jpg"); // -> LUNAS
    await prismaTest.salesOrder.update({ where: { id: order.id }, data: { status: "DIKONFIRMASI" } });
    let fresh = await prismaTest.salesOrder.findUnique({ where: { id: order.id }, include: { payments: true } });
    expect(fresh!.paymentStatus).toBe("LUNAS");
    expect(canConfirmReceivedClient(fresh!)).toBe(true);
    const res = await simulateMarkReceived(order.id);
    expect(res.ok).toBe(true);
  });

  it("PICKUP + COD: DIKONFIRMASI but still BELUM_BAYAR must stay blocked", async () => {
    const { order } = await createOrderWithPayment({ paymentMethod: "CASH", deliveryMethod: "PICKUP", totalAmount: 100000 });
    await prismaTest.salesOrder.update({ where: { id: order.id }, data: { status: "DIKONFIRMASI" } });
    let fresh = await prismaTest.salesOrder.findUnique({ where: { id: order.id }, include: { payments: true } });
    expect(fresh!.paymentStatus).toBe("BELUM_BAYAR");
    expect(canConfirmReceivedClient(fresh!)).toBe(false);
    const res = await simulateMarkReceived(order.id);
    expect(res.ok).toBe(false);
    expect([400,402]).toContain(res.status);
  });

  it("Upload proof for COD must be rejected (server guard)", async () => {
    const { order } = await createOrderWithPayment({ paymentMethod: "CASH", deliveryMethod: "DELIVERY", totalAmount: 100000 });
    await expect(simulateUploadProof(order.id, "https://example.com/bukti.jpg")).rejects.toThrow(/COD/);
  });

  it("Large prepaid auto-LUNAS without admin validation, small needs admin", async () => {
    const small = await createOrderWithPayment({ paymentMethod: "TRANSFER_BANK", deliveryMethod: "DELIVERY", totalAmount: 100000 });
    const large = await createOrderWithPayment({ paymentMethod: "TRANSFER_BANK", deliveryMethod: "DELIVERY", totalAmount: 600000 });

    const smallStatus = await simulateUploadProof(small.order.id, "https://example.com/bukti.jpg");
    const largeStatus = await simulateUploadProof(large.order.id, "https://example.com/bukti.jpg");

    expect(smallStatus).toBe("MENUNGGU_VALIDASI");
    expect(largeStatus).toBe("LUNAS");
  });
});
