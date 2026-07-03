import { describe, it, expect, beforeAll } from "vitest";
import { prismaTest } from "../../setup/test-db";
import {
  createTestSalesOrder,
  createTestCustomer,
  createTestInstitution,
  createTestUser,
  createTestProduct,
  createTestProductCategory,
  createTestProductUnit,
  createTestStockBatch,
  createTestCustomerProductAgreement,
  createTestSalesOrderStatusHistory,
} from "../../fixtures/factories";
import Decimal from "decimal.js";

const {
  createSalesOrder,
  getSalesOrders,
  getSalesOrderById,
  updateOrderStatus,
  updateFulfillmentStatus,
  updatePaymentStatus,
} = await import("@/lib/services/sales-order.service");

describe("Sales Order Service - /erp/orders page tests", () => {
  describe("getSalesOrders()", () => {
    it("returns all orders when no filter is provided", async () => {
      const user = await createTestUser();
      await createTestSalesOrder({ createdById: user.id });
      await createTestSalesOrder({ createdById: user.id });
      await createTestSalesOrder({ createdById: user.id });

      const { orders, total } = await getSalesOrders({ limit: 50 });
      expect(total).toBeGreaterThanOrEqual(3);
      expect(orders.length).toBeGreaterThanOrEqual(3);
    });

    it("filters by status correctly", async () => {
      const user = await createTestUser();
      await createTestSalesOrder({ createdById: user.id, status: "MENUNGGU_KONFIRMASI" });
      await createTestSalesOrder({ createdById: user.id, status: "DIKONFIRMASI" });
      await createTestSalesOrder({ createdById: user.id, status: "SELESAI" });

      const { orders, total } = await getSalesOrders({ status: "DIKONFIRMASI" });
      expect(total).toBe(1);
      expect(orders[0].status).toBe("DIKONFIRMASI");
    });

    it("filters by order type", async () => {
      const user = await createTestUser();
      const customer = await createTestCustomer();
      const institution = await createTestInstitution();

      await createTestSalesOrder({ createdById: user.id, customerId: customer.id, orderType: "B2C_ECER" });
      await createTestSalesOrder({ createdById: user.id, institutionId: institution.id, orderType: "B2B_GROSIR" });

      const { orders, total } = await getSalesOrders({ orderType: "B2B_GROSIR" });
      expect(total).toBe(1);
      expect(orders[0].orderType).toBe("B2B_GROSIR");
    });

    it("filters by date range", async () => {
      const user = await createTestUser();
      await createTestSalesOrder({ createdById: user.id, createdAt: new Date("2026-06-01") });
      await createTestSalesOrder({ createdById: user.id, createdAt: new Date("2026-06-15") });

      const { orders, total } = await getSalesOrders({
        dateFrom: new Date("2026-06-10"),
        dateTo: new Date("2026-06-20"),
      });
      expect(total).toBe(1);
    });

    it("filters by customer", async () => {
      const user = await createTestUser();
      const customerA = await createTestCustomer();
      const customerB = await createTestCustomer();

      await createTestSalesOrder({ createdById: user.id, customerId: customerA.id });
      await createTestSalesOrder({ createdById: user.id, customerId: customerB.id });

      const { orders, total } = await getSalesOrders({ customerId: customerA.id });
      expect(total).toBe(1);
    });

    it("filters by institution", async () => {
      const user = await createTestUser();
      const instA = await createTestInstitution();
      const instB = await createTestInstitution();

      await createTestSalesOrder({ createdById: user.id, institutionId: instA.id, orderType: "B2B_GROSIR" });
      await createTestSalesOrder({ createdById: user.id, institutionId: instB.id, orderType: "B2B_GROSIR" });

      const { orders, total } = await getSalesOrders({ institutionId: instA.id });
      expect(total).toBe(1);
    });

    it("respects limit parameter", async () => {
      const user = await createTestUser();
      for (let i = 0; i < 10; i++) {
        await createTestSalesOrder({ createdById: user.id });
      }

      const { orders, total } = await getSalesOrders({ limit: 3 });
      expect(orders.length).toBeLessThanOrEqual(3);
      expect(total).toBeGreaterThanOrEqual(10);
    });

    it("respects offset parameter", async () => {
      const user = await createTestUser();
      for (let i = 0; i < 5; i++) {
        await createTestSalesOrder({ createdById: user.id });
      }

      const first = await getSalesOrders({ limit: 2, offset: 0 });
      const second = await getSalesOrders({ limit: 2, offset: 2 });

      expect(first.orders.length).toBe(2);
      expect(second.orders.length).toBe(2);
      expect(first.orders[0].id).not.toBe(second.orders[0].id);
    });

    it("returns orders sorted by latest first", async () => {
      const user = await createTestUser();
      await createTestSalesOrder({ createdById: user.id, createdAt: new Date("2026-07-01") });
      await createTestSalesOrder({ createdById: user.id, createdAt: new Date("2026-07-03") });
      await createTestSalesOrder({ createdById: user.id, createdAt: new Date("2026-07-02") });

      const { orders } = await getSalesOrders({ limit: 10 });
      const dates = orders.map((o: any) => new Date(o.createdAt).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
      }
    });

    it("includes customer name in results", async () => {
      const user = await createTestUser();
      const customer = await createTestCustomer({ name: "Test Customer" });

      await createTestSalesOrder({ createdById: user.id, customerId: customer.id });

      const { orders } = await getSalesOrders({ limit: 10 });
      const match = orders.find((o: any) => o.customer?.name === "Test Customer");
      expect(match).toBeDefined();
    });

    it("includes institution name in results", async () => {
      const user = await createTestUser();
      const institution = await createTestInstitution({ name: "Test Institution" });

      await createTestSalesOrder({ createdById: user.id, institutionId: institution.id, orderType: "B2B_GROSIR" });

      const { orders } = await getSalesOrders({ limit: 10 });
      const match = orders.find((o: any) => o.institution?.name === "Test Institution");
      expect(match).toBeDefined();
    });

    it("returns empty array when no orders match filter", async () => {
      const { orders, total } = await getSalesOrders({ status: "SELESAI" });
      expect(orders).toEqual([]);
      expect(total).toBe(0);
    });
  });

  describe("getSalesOrderById()", () => {
    it("returns order with all relations", async () => {
      const user = await createTestUser();
      const order = await createTestSalesOrder({ createdById: user.id });

      const result = await getSalesOrderById(order.id);
      expect(result).not.toBeNull();
      expect(result!.id).toBe(order.id);
      expect(result!.createdBy).toBeDefined();
      expect(result!.createdBy.name).toBe(user.name);
    });

    it("includes customer information", async () => {
      const user = await createTestUser();
      const customer = await createTestCustomer({ name: "John Customer" });
      const order = await createTestSalesOrder({ createdById: user.id, customerId: customer.id });

      const result = await getSalesOrderById(order.id);
      expect(result!.customer).not.toBeNull();
      expect(result!.customer!.name).toBe("John Customer");
    });

    it("includes institution information", async () => {
      const user = await createTestUser();
      const institution = await createTestInstitution({ name: "B2B Corp" });
      const order = await createTestSalesOrder({ createdById: user.id, institutionId: institution.id, orderType: "B2B_GROSIR" });

      const result = await getSalesOrderById(order.id);
      expect(result!.institution).not.toBeNull();
      expect(result!.institution!.name).toBe("B2B Corp");
    });

    it("returns null for non-existent order", async () => {
      const result = await getSalesOrderById("non-existent-id");
      expect(result).toBeNull();
    });

    it("includes status history ordered by date", async () => {
      const user = await createTestUser();
      const order = await createTestSalesOrder({ createdById: user.id });
      await createTestSalesOrderStatusHistory(order.id, null, "MENUNGGU_KONFIRMASI", user.id, { changedAt: new Date("2026-07-01") });
      await createTestSalesOrderStatusHistory(order.id, "MENUNGGU_KONFIRMASI", "DIKONFIRMASI", user.id, { changedAt: new Date("2026-07-03") });
      await createTestSalesOrderStatusHistory(order.id, "DIKONFIRMASI", "SIAP_KIRIM", user.id, { changedAt: new Date("2026-07-02") });

      const result = await getSalesOrderById(order.id);
      expect(result!.statusHistory.length).toBe(3);
      expect(result!.statusHistory[0].toStatus).toBe("DIKONFIRMASI");
      expect(result!.statusHistory[1].toStatus).toBe("SIAP_KIRIM");
      expect(result!.statusHistory[2].toStatus).toBe("MENUNGGU_KONFIRMASI");
    });
  });

  describe("updateOrderStatus()", () => {
    it("updates status and creates history record", async () => {
      const user = await createTestUser();
      const order = await createTestSalesOrder({ createdById: user.id, status: "MENUNGGU_KONFIRMASI" });

      await updateOrderStatus(order.id, "DIKONFIRMASI" as any, user.id, "Confirmed by admin");

      const result = await getSalesOrderById(order.id);
      expect(result!.status).toBe("DIKONFIRMASI");
      expect(result!.statusHistory.length).toBeGreaterThanOrEqual(1);
      expect(result!.statusHistory[0].toStatus).toBe("DIKONFIRMASI");
    });

    it("rejects invalid status transitions", async () => {
      const user = await createTestUser();
      const order = await createTestSalesOrder({ createdById: user.id, status: "DRAFT" });

      await expect(
        updateOrderStatus(order.id, "SELESAI" as any, user.id)
      ).rejects.toThrow("Invalid status transition");
    });

    it("rejects transition from completed order", async () => {
      const user = await createTestUser();
      const order = await createTestSalesOrder({ createdById: user.id, status: "SELESAI" });

      await expect(
        updateOrderStatus(order.id, "DIBATALKAN" as any, user.id)
      ).rejects.toThrow("Invalid status transition");
    });

    it("accepts DRAFT to MENUNGGU_KONFIRMASI", async () => {
      const user = await createTestUser();
      const order = await createTestSalesOrder({ createdById: user.id, status: "DRAFT" });

      await updateOrderStatus(order.id, "MENUNGGU_KONFIRMASI" as any, user.id);
      const result = await getSalesOrderById(order.id);
      expect(result!.status).toBe("MENUNGGU_KONFIRMASI");
    });

    it("accepts SEDANG_DIKIRIM to SELESAI", async () => {
      const user = await createTestUser();
      const order = await createTestSalesOrder({ createdById: user.id, status: "DALAM_PENGIRIMAN" });

      await updateOrderStatus(order.id, "SELESAI" as any, user.id);
      const result = await getSalesOrderById(order.id);
      expect(result!.status).toBe("SELESAI");
    });
  });

  describe("updateFulfillmentStatus()", () => {
    it("updates fulfillment status", async () => {
      const user = await createTestUser();
      const order = await createTestSalesOrder({ createdById: user.id });

      await updateFulfillmentStatus(order.id, "SEBAGIAN" as any);
      const result = await getSalesOrderById(order.id);
      expect(result!.fulfillmentStatus).toBe("SEBAGIAN");
    });

    it("updates to LENGKAP status", async () => {
      const user = await createTestUser();
      const order = await createTestSalesOrder({ createdById: user.id });

      await updateFulfillmentStatus(order.id, "LENGKAP" as any);
      const result = await getSalesOrderById(order.id);
      expect(result!.fulfillmentStatus).toBe("LENGKAP");
    });
  });

  describe("updatePaymentStatus()", () => {
    it("updates payment status to LUNAS", async () => {
      const user = await createTestUser();
      const order = await createTestSalesOrder({ createdById: user.id });

      await updatePaymentStatus(order.id, "LUNAS" as any);
      const result = await getSalesOrderById(order.id);
      expect(result!.paymentStatus).toBe("LUNAS");
    });

    it("updates payment status to SEBAGIAN", async () => {
      const user = await createTestUser();
      const order = await createTestSalesOrder({ createdById: user.id });

      await updatePaymentStatus(order.id, "SEBAGIAN" as any);
      const result = await getSalesOrderById(order.id);
      expect(result!.paymentStatus).toBe("SEBAGIAN");
    });
  });

  describe("createSalesOrder()", () => {
    async function setupProductWithStock(qty: number = 100) {
      const user = await createTestUser();
      const category = await createTestProductCategory();
      const baseUnit = await createTestProductUnit({ code: "pcs", name: "Pieces" });
      const product = await createTestProduct({ categoryId: category.id, baseUnitId: baseUnit.id });
      const batch = await createTestStockBatch(product.id, {
        qtyReceivedBase: qty,
        qtyRemainingBase: qty,
        unitCostBase: 4000,
      });
      return { user, category, baseUnit, product, batch };
    }

    it("creates B2C order with full stock allocation", async () => {
      const { user, product, baseUnit } = await setupProductWithStock(50);

      const result = await createSalesOrder({
        channel: "ECOMMERCE" as any,
        orderType: "B2C_ECER" as any,
        deliveryMethod: "DELIVERY" as any,
        items: [
          {
            productId: product.id,
            unitId: baseUnit.id,
            qty: 5,
            unitSellPrice: 10000,
            baseUnitConversion: 1,
          },
        ],
        createdById: user.id,
      });

      expect(result).toBeDefined();
      expect(result.orderNumber).toContain("SO/");
      expect(result.status).toBe("MENUNGGU_KONFIRMASI");
      expect(result.items.length).toBe(1);
      expect(result.items[0].qty.toString()).toBe("5");
      expect(result.items[0].unitSellPrice.toString()).toBe("10000");
      expect(result.items[0].isAvailableFromStock).toBe(true);
      expect(Number(result.items[0].unitCostPrice)).toBeGreaterThan(0);
      expect(Number(result.items[0].subtotalSell)).toBe(50000);
      expect(Number(result.totalAmount)).toBe(50000);
    });

    it("creates B2B order with institution reference", async () => {
      const { user, product, baseUnit } = await setupProductWithStock(50);
      const institution = await createTestInstitution();

      const result = await createSalesOrder({
        channel: "WHATSAPP_B2B" as any,
        orderType: "B2B_GROSIR" as any,
        institutionId: institution.id,
        deliveryMethod: "DELIVERY" as any,
        items: [
          {
            productId: product.id,
            unitId: baseUnit.id,
            qty: 10,
            unitSellPrice: 9500,
            baseUnitConversion: 1,
          },
        ],
        createdById: user.id,
      });

      expect(result).toBeDefined();
      expect(result.institution).not.toBeNull();
      expect(result.institution!.name).toBe(institution.name);
      expect(result.status).toBe("MENUNGGU_KONFIRMASI");
      expect(result.items.length).toBe(1);
      expect(result.items[0].isAvailableFromStock).toBe(true);
    });

    it("creates sourcing request when stock is insufficient", async () => {
      const { user, product, baseUnit } = await setupProductWithStock(5);

      const result = await createSalesOrder({
        channel: "ECOMMERCE" as any,
        orderType: "B2C_ECER" as any,
        deliveryMethod: "DELIVERY" as any,
        items: [
          {
            productId: product.id,
            unitId: baseUnit.id,
            qty: 100,
            unitSellPrice: 10000,
            baseUnitConversion: 1,
          },
        ],
        createdById: user.id,
      });

      expect(result).toBeDefined();
      expect(result.status).toBe("DRAFT");

      // Sebagian stok terambil (5 dari 5), sisanya via sourcing
      expect(result.items[0].isAvailableFromStock).toBe(true);

      // sourcing request harus dibuat
      const orderItem = await prismaTest.salesOrderItem.findUnique({
        where: { id: result.items[0].id },
        include: { sourcingRequest: true },
      });
      expect(orderItem?.sourcingRequest).not.toBeNull();
      expect(orderItem?.sourcingRequest!.status).toBe("DIBUTUHKAN");
    });

    it("rejects B2B order with price exceeding PAGU ceiling", async () => {
      const { user, product, baseUnit } = await setupProductWithStock(50);
      const institution = await createTestInstitution();

      // Set PAGU ceiling: harga maksimal 9000
      await createTestCustomerProductAgreement(institution.id, product.id, baseUnit.id, {
        priceCeiling: 9000,
      });

      await expect(
        createSalesOrder({
          channel: "WHATSAPP_B2B" as any,
          orderType: "B2B_GROSIR" as any,
          institutionId: institution.id,
          deliveryMethod: "DELIVERY" as any,
          items: [
            {
              productId: product.id,
              unitId: baseUnit.id,
              qty: 5,
              unitSellPrice: 10000, // exceeds ceiling of 9000
              baseUnitConversion: 1,
            },
          ],
          createdById: user.id,
        })
      ).rejects.toThrow("PAGU validation failed");
    });

    it("allows B2B order with price within PAGU ceiling", async () => {
      const { user, product, baseUnit } = await setupProductWithStock(50);
      const institution = await createTestInstitution();

      await createTestCustomerProductAgreement(institution.id, product.id, baseUnit.id, {
        priceCeiling: 10000,
      });

      const result = await createSalesOrder({
        channel: "WHATSAPP_B2B" as any,
        orderType: "B2B_GROSIR" as any,
        institutionId: institution.id,
        deliveryMethod: "DELIVERY" as any,
        items: [
          {
            productId: product.id,
            unitId: baseUnit.id,
            qty: 5,
            unitSellPrice: 10000,
            baseUnitConversion: 1,
          },
        ],
        createdById: user.id,
      });

      expect(result).toBeDefined();
      expect(result.status).toBe("MENUNGGU_KONFIRMASI");
    });

    it("handles multiple items in one order", async () => {
      const user = await createTestUser();
      const category = await createTestProductCategory();
      const baseUnit = await createTestProductUnit({ code: "pcs", name: "Pieces" });

      const productA = await createTestProduct({ categoryId: category.id, baseUnitId: baseUnit.id, sku: "PROD-A", name: "Product A" });
      const productB = await createTestProduct({ categoryId: category.id, baseUnitId: baseUnit.id, sku: "PROD-B", name: "Product B" });

      await createTestStockBatch(productA.id, { qtyRemainingBase: 50, unitCostBase: 3000 });
      await createTestStockBatch(productB.id, { qtyRemainingBase: 30, unitCostBase: 5000 });

      const result = await createSalesOrder({
        channel: "ECOMMERCE" as any,
        orderType: "B2C_ECER" as any,
        deliveryMethod: "DELIVERY" as any,
        items: [
          {
            productId: productA.id,
            unitId: baseUnit.id,
            qty: 10,
            unitSellPrice: 8000,
            baseUnitConversion: 1,
          },
          {
            productId: productB.id,
            unitId: baseUnit.id,
            qty: 5,
            unitSellPrice: 12000,
            baseUnitConversion: 1,
          },
        ],
        createdById: user.id,
      });

      expect(result.items.length).toBe(2);
      expect(Number(result.totalAmount)).toBe(140000); // (10*8000) + (5*12000)
      expect(Number(result.totalCostAmount)).toBeGreaterThan(0);
      expect(Number(result.totalMarginAmount)).toBeGreaterThan(0);
    });

    it("creates status history entry on order creation", async () => {
      const { user, product, baseUnit } = await setupProductWithStock(50);

      const result = await createSalesOrder({
        channel: "ECOMMERCE" as any,
        orderType: "B2C_ECER" as any,
        deliveryMethod: "DELIVERY" as any,
        items: [
          {
            productId: product.id,
            unitId: baseUnit.id,
            qty: 3,
            unitSellPrice: 10000,
            baseUnitConversion: 1,
          },
        ],
        createdById: user.id,
      });

      const orderWithHistory = await getSalesOrderById(result.id);
      expect(orderWithHistory?.statusHistory.length).toBeGreaterThanOrEqual(1);
      expect(orderWithHistory?.statusHistory[0].toStatus).toBe("MENUNGGU_KONFIRMASI");
    });

    it("decrements stock batch qtyRemainingBase after successful allocation", async () => {
      const { user, product, baseUnit } = await setupProductWithStock(50);

      await createSalesOrder({
        channel: "ECOMMERCE" as any,
        orderType: "B2C_ECER" as any,
        deliveryMethod: "DELIVERY" as any,
        items: [
          {
            productId: product.id,
            unitId: baseUnit.id,
            qty: 10,
            unitSellPrice: 10000,
            baseUnitConversion: 1,
          },
        ],
        createdById: user.id,
      });

      const batches = await prismaTest.stockBatch.findMany({
        where: { productId: product.id },
      });
      const remainingAfter = Number(batches[0].qtyRemainingBase);
      expect(remainingAfter).toBe(40); // 50 - 10
    });

    it("generates unique order number", async () => {
      const { user, product, baseUnit } = await setupProductWithStock(100);

      const resultA = await createSalesOrder({
        channel: "ECOMMERCE" as any,
        orderType: "B2C_ECER" as any,
        deliveryMethod: "DELIVERY" as any,
        items: [{ productId: product.id, unitId: baseUnit.id, qty: 1, unitSellPrice: 5000, baseUnitConversion: 1 }],
        createdById: user.id,
      });

      const resultB = await createSalesOrder({
        channel: "ECOMMERCE" as any,
        orderType: "B2C_ECER" as any,
        deliveryMethod: "DELIVERY" as any,
        items: [{ productId: product.id, unitId: baseUnit.id, qty: 1, unitSellPrice: 5000, baseUnitConversion: 1 }],
        createdById: user.id,
      });

      expect(resultA.orderNumber).not.toBe(resultB.orderNumber);
      expect(resultA.orderNumber).toMatch(/^SO\//);
      expect(resultB.orderNumber).toMatch(/^SO\//);
    });

    it("handles order with free delivery flag", async () => {
      const { user, product, baseUnit } = await setupProductWithStock(50);

      const result = await createSalesOrder({
        channel: "ECOMMERCE" as any,
        orderType: "B2C_ECER" as any,
        deliveryMethod: "DELIVERY" as any,
        isFreeDelivery: true,
        items: [{ productId: product.id, unitId: baseUnit.id, qty: 2, unitSellPrice: 15000, baseUnitConversion: 1 }],
        createdById: user.id,
      });

      expect(result).toBeDefined();
      expect(result.status).toBe("MENUNGGU_KONFIRMASI");
    });

    it("partially allocates stock and creates sourcing for remainder", async () => {
      const { user, product, baseUnit } = await setupProductWithStock(20);

      const result = await createSalesOrder({
        channel: "ECOMMERCE" as any,
        orderType: "B2C_ECER" as any,
        deliveryMethod: "DELIVERY" as any,
        items: [
          {
            productId: product.id,
            unitId: baseUnit.id,
            qty: 50,
            unitSellPrice: 10000,
            baseUnitConversion: 1,
          },
        ],
        createdById: user.id,
      });

      expect(result.status).toBe("DRAFT");
      expect(result.items[0].isAvailableFromStock).toBe(true);

      // Stock batch yang ada harus berkurang (20 diambil dari stock)
      const batches = await prismaTest.stockBatch.findMany({
        where: { productId: product.id },
      });
      expect(Number(batches[0].qtyRemainingBase)).toBe(0);

      // Sourcing request harus dibuat untuk sisa (30)
      const itemWithSourcing = await prismaTest.salesOrderItem.findUnique({
        where: { id: result.items[0].id },
        include: { sourcingRequest: true },
      });
      expect(itemWithSourcing?.sourcingRequest).not.toBeNull();
      expect(Number(itemWithSourcing?.sourcingRequest!.qtyNeeded)).toBeGreaterThan(0);
    });
  });
});
