import { describe, it, expect, beforeEach } from 'vitest';
import { getDashboardMetrics, getRecentOrders, getTopProducts, getActiveSourcingCount } from '@/lib/services/dashboard.service';
import { createTestProduct, createTestStockBatch, createTestSalesOrder, createTestCustomer, createTestInstitution, createTestSalesOrderItem, createTestSourcingRequest } from '../../fixtures/factories';
import { prismaTest } from '../../setup/test-db';
import Decimal from 'decimal.js';

describe('Dashboard Service - /erp page tests', () => {
  
  describe('getDashboardMetrics()', () => {
    
    it('calculates today sales correctly', async () => {
      const customer = await createTestCustomer();
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Create orders today
      await createTestSalesOrder({
        customerId: customer.id,
        orderType: 'B2C_ECER',
        totalAmount: new Decimal(100000),
        totalMarginAmount: new Decimal(20000),
        status: 'SELESAI',
        createdAt: today,
      });

      await createTestSalesOrder({
        customerId: customer.id,
        orderType: 'B2C_ECER',
        totalAmount: new Decimal(50000),
        totalMarginAmount: new Decimal(10000),
        status: 'DIKONFIRMASI',
        createdAt: today,
      });

      // Create order yesterday (should not be counted)
      await createTestSalesOrder({
        customerId: customer.id,
        orderType: 'B2C_ECER',
        totalAmount: new Decimal(200000),
        totalMarginAmount: new Decimal(40000),
        status: 'SELESAI',
        createdAt: yesterday,
      });

      const metrics = await getDashboardMetrics();

      expect(metrics.salesTodayCount).toBe(2);
      expect(parseFloat(metrics.salesToday)).toBe(150000);
    });

    it('calculates monthly revenue and margin correctly', async () => {
      const customer = await createTestCustomer();
      const thisMonth = new Date();
      const lastMonth = new Date(thisMonth);
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      // Orders this month
      await createTestSalesOrder({
        customerId: customer.id,
        totalAmount: new Decimal(100000),
        totalMarginAmount: new Decimal(20000),
        status: 'SELESAI',
        createdAt: thisMonth,
      });

      await createTestSalesOrder({
        customerId: customer.id,
        totalAmount: new Decimal(150000),
        totalMarginAmount: new Decimal(30000),
        status: 'DIKONFIRMASI',
        createdAt: thisMonth,
      });

      // Order last month (should not be counted)
      await createTestSalesOrder({
        customerId: customer.id,
        totalAmount: new Decimal(500000),
        totalMarginAmount: new Decimal(100000),
        status: 'SELESAI',
        createdAt: lastMonth,
      });

      const metrics = await getDashboardMetrics();

      expect(parseFloat(metrics.revenueMonth)).toBe(250000);
      expect(parseFloat(metrics.marginMonth)).toBe(50000);
    });

    it('excludes cancelled orders from revenue calculations', async () => {
      const customer = await createTestCustomer();

      await createTestSalesOrder({
        customerId: customer.id,
        totalAmount: new Decimal(100000),
        totalMarginAmount: new Decimal(20000),
        status: 'SELESAI',
      });

      await createTestSalesOrder({
        customerId: customer.id,
        totalAmount: new Decimal(200000),
        totalMarginAmount: new Decimal(40000),
        status: 'DIBATALKAN',
      });

      const metrics = await getDashboardMetrics();

      expect(parseFloat(metrics.revenueMonth)).toBe(100000);
      expect(parseFloat(metrics.marginMonth)).toBe(20000);
    });

    it('counts pending orders correctly', async () => {
      const customer = await createTestCustomer();

      // Pending statuses
      await createTestSalesOrder({ customerId: customer.id, status: 'MENUNGGU_KONFIRMASI' });
      await createTestSalesOrder({ customerId: customer.id, status: 'DIKONFIRMASI' });
      await createTestSalesOrder({ customerId: customer.id, status: 'MENUNGGU_PENGADAAN' });
      await createTestSalesOrder({ customerId: customer.id, status: 'SIAP_KIRIM' });
      await createTestSalesOrder({ customerId: customer.id, status: 'DALAM_PENGIRIMAN' });
      await createTestSalesOrder({ customerId: customer.id, status: 'TERKIRIM_MENUNGGU_TTD' });

      // Non-pending statuses
      await createTestSalesOrder({ customerId: customer.id, status: 'SELESAI' });
      await createTestSalesOrder({ customerId: customer.id, status: 'DIBATALKAN' });

      const metrics = await getDashboardMetrics();

      expect(metrics.pendingOrders).toBe(6);
    });

    it('identifies low stock products correctly', async () => {
      // Product with stock below minStockAlert
      const lowStockProduct = await createTestProduct({
        name: 'Low Stock Product',
        minStockAlert: 20,
      });

      await createTestStockBatch(lowStockProduct.id, {
        qtyRemainingBase: new Decimal(15), // Below minStockAlert of 20
      });

      // Product with sufficient stock
      const normalProduct = await createTestProduct({
        name: 'Normal Stock Product',
        minStockAlert: 10,
      });

      await createTestStockBatch(normalProduct.id, {
        qtyRemainingBase: new Decimal(50), // Above minStockAlert
      });

      // Product with zero stock
      const zeroStockProduct = await createTestProduct({
        name: 'Zero Stock Product',
        minStockAlert: 5,
      });

      await createTestStockBatch(zeroStockProduct.id, {
        qtyRemainingBase: new Decimal(0),
      });

      const metrics = await getDashboardMetrics();

      expect(metrics.lowStockCount).toBe(2); // lowStockProduct and zeroStockProduct
    });

    it('identifies expiring batches within 7 days', async () => {
      const product = await createTestProduct();

      const now = new Date();
      const in3Days = new Date(now);
      in3Days.setDate(in3Days.getDate() + 3);

      const in6Days = new Date(now);
      in6Days.setDate(in6Days.getDate() + 6);

      const in10Days = new Date(now);
      in10Days.setDate(in10Days.getDate() + 10);

      // Expiring soon (within 7 days)
      await createTestStockBatch(product.id, {
        expiryDate: in3Days,
        qtyRemainingBase: new Decimal(10),
      });

      await createTestStockBatch(product.id, {
        expiryDate: in6Days,
        qtyRemainingBase: new Decimal(20),
      });

      // Not expiring soon (more than 7 days)
      await createTestStockBatch(product.id, {
        expiryDate: in10Days,
        qtyRemainingBase: new Decimal(30),
      });

      // Already expired (should not be counted as "expiring soon")
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      await createTestStockBatch(product.id, {
        expiryDate: yesterday,
        qtyRemainingBase: new Decimal(5),
      });

      const metrics = await getDashboardMetrics();

      expect(metrics.expiringSoonCount).toBe(2);
    });

    it('counts pending payment validations correctly', async () => {
      const order1 = await createTestSalesOrder({ totalAmount: new Decimal(100000) });
      const order2 = await createTestSalesOrder({ totalAmount: new Decimal(200000) });
      const order3 = await createTestSalesOrder({ totalAmount: new Decimal(300000) });

      await prismaTest.payment.create({
        data: {
          salesOrderId: order1.id,
          paymentNumber: 'PAY-001',
          amount: new Decimal(100000),
          method: 'TRANSFER_BANK',
          status: 'MENUNGGU_VALIDASI',
          paidAt: new Date(),
        },
      });

      await prismaTest.payment.create({
        data: {
          salesOrderId: order2.id,
          paymentNumber: 'PAY-002',
          amount: new Decimal(200000),
          method: 'TRANSFER_BANK',
          status: 'MENUNGGU_VALIDASI',
          paidAt: new Date(),
        },
      });

      await prismaTest.payment.create({
        data: {
          salesOrderId: order3.id,
          paymentNumber: 'PAY-003',
          amount: new Decimal(300000),
          method: 'CASH',
          status: 'LUNAS',
          paidAt: new Date(),
        },
      });

      const metrics = await getDashboardMetrics();

      expect(metrics.pendingPaymentValidations).toBe(2);
    });

    it('calculates unpaid receivables correctly', async () => {
      const customer = await createTestCustomer();

      // Unpaid orders
      await createTestSalesOrder({
        customerId: customer.id,
        totalAmount: new Decimal(100000),
        paymentStatus: 'BELUM_BAYAR',
        status: 'DIKONFIRMASI',
      });

      await createTestSalesOrder({
        customerId: customer.id,
        totalAmount: new Decimal(150000),
        paymentStatus: 'SEBAGIAN',
        status: 'DALAM_PENGIRIMAN',
      });

      // Paid orders (should not be counted)
      await createTestSalesOrder({
        customerId: customer.id,
        totalAmount: new Decimal(200000),
        paymentStatus: 'LUNAS',
        status: 'SELESAI',
      });

      // Cancelled order (should not be counted)
      await createTestSalesOrder({
        customerId: customer.id,
        totalAmount: new Decimal(300000),
        paymentStatus: 'BELUM_BAYAR',
        status: 'DIBATALKAN',
      });

      const metrics = await getDashboardMetrics();

      expect(parseFloat(metrics.unpaidReceivables)).toBe(250000);
    });

    it('handles empty database gracefully', async () => {
      const metrics = await getDashboardMetrics();

      expect(metrics.salesTodayCount).toBe(0);
      expect(parseFloat(metrics.salesToday)).toBe(0);
      expect(parseFloat(metrics.revenueMonth)).toBe(0);
      expect(parseFloat(metrics.marginMonth)).toBe(0);
      expect(metrics.pendingOrders).toBe(0);
      expect(metrics.lowStockCount).toBe(0);
      expect(metrics.expiringSoonCount).toBe(0);
      expect(metrics.pendingPaymentValidations).toBe(0);
      expect(parseFloat(metrics.unpaidReceivables)).toBe(0);
    });
  });

  describe('getRecentOrders()', () => {
    
    it('returns recent orders sorted by date', async () => {
      const customer = await createTestCustomer();

      const order1 = await createTestSalesOrder({
        customerId: customer.id,
        createdAt: new Date('2026-07-01'),
      });

      const order2 = await createTestSalesOrder({
        customerId: customer.id,
        createdAt: new Date('2026-07-03'),
      });

      const order3 = await createTestSalesOrder({
        customerId: customer.id,
        createdAt: new Date('2026-07-02'),
      });

      const orders = await getRecentOrders(10);

      expect(orders.length).toBe(3);
      expect(orders[0].id).toBe(order2.id); // Most recent
      expect(orders[1].id).toBe(order3.id);
      expect(orders[2].id).toBe(order1.id); // Oldest
    });

    it('includes customer and institution info', async () => {
      const customer = await createTestCustomer({ name: 'John Doe' });
      const institution = await createTestInstitution({ name: 'Dapur SPPG 1' });

      await createTestSalesOrder({
        customerId: customer.id,
        orderType: 'B2C_ECER',
      });

      await createTestSalesOrder({
        institutionId: institution.id,
        orderType: 'B2B_GROSIR',
      });

      const orders = await getRecentOrders(10);

      expect(orders[0].institution?.name).toBe('Dapur SPPG 1');
      expect(orders[1].customer?.name).toBe('John Doe');
    });

    it('respects limit parameter', async () => {
      const customer = await createTestCustomer();

      for (let i = 0; i < 15; i++) {
        await createTestSalesOrder({ customerId: customer.id });
      }

      const orders = await getRecentOrders(5);

      expect(orders.length).toBe(5);
    });

    it('returns empty array when no orders exist', async () => {
      const orders = await getRecentOrders(10);

      expect(orders).toEqual([]);
    });
  });

  describe('getTopProducts()', () => {
    
    it('returns top products by revenue', async () => {
      const product1 = await createTestProduct({ name: 'Product A' });
      const product2 = await createTestProduct({ name: 'Product B' });
      const product3 = await createTestProduct({ name: 'Product C' });

      const order = await createTestSalesOrder({
        totalAmount: new Decimal(500000),
      });

      // Product B has highest revenue
      await createTestSalesOrderItem(order.id, product2.id, {
        qty: new Decimal(10),
        unitSellPrice: new Decimal(20000),
        subtotalSell: new Decimal(200000),
      });

      // Product A has medium revenue
      await createTestSalesOrderItem(order.id, product1.id, {
        qty: new Decimal(10),
        unitSellPrice: new Decimal(10000),
        subtotalSell: new Decimal(100000),
      });

      // Product C has lowest revenue
      await createTestSalesOrderItem(order.id, product3.id, {
        qty: new Decimal(5),
        unitSellPrice: new Decimal(5000),
        subtotalSell: new Decimal(25000),
      });

      const topProducts = await getTopProducts(5);

      expect(topProducts.length).toBe(3);
      expect(topProducts[0].name).toBe('Product B');
      expect(parseFloat(topProducts[0].revenue)).toBe(200000);
      expect(topProducts[1].name).toBe('Product A');
      expect(parseFloat(topProducts[1].revenue)).toBe(100000);
      expect(topProducts[2].name).toBe('Product C');
      expect(parseFloat(topProducts[2].revenue)).toBe(25000);
    });

    it('only includes sales from last 30 days', async () => {
      const product = await createTestProduct();

      const recent = new Date();
      const old = new Date();
      old.setDate(old.getDate() - 35); // 35 days ago

      const recentOrder = await createTestSalesOrder({
        createdAt: recent,
      });

      const oldOrder = await createTestSalesOrder({
        createdAt: old,
      });

      await createTestSalesOrderItem(recentOrder.id, product.id, {
        subtotalSell: new Decimal(100000),
        createdAt: recent,
      });

      await createTestSalesOrderItem(oldOrder.id, product.id, {
        subtotalSell: new Decimal(500000),
        createdAt: old,
      });

      const topProducts = await getTopProducts(5);

      // Should only count recent order (100000), not old order (500000)
      expect(topProducts.length).toBe(1);
      expect(parseFloat(topProducts[0].revenue)).toBe(100000);
    });

    it('respects limit parameter', async () => {
      const order = await createTestSalesOrder();

      for (let i = 0; i < 10; i++) {
        const product = await createTestProduct({ name: `Product ${i}` });
        await createTestSalesOrderItem(order.id, product.id, {
          subtotalSell: new Decimal(10000 * (10 - i)),
        });
      }

      const topProducts = await getTopProducts(3);

      expect(topProducts.length).toBe(3);
    });

    it('returns empty array when no sales exist', async () => {
      const topProducts = await getTopProducts(5);

      expect(topProducts).toEqual([]);
    });
  });

  describe('getActiveSourcingCount()', () => {
    
    it('counts active sourcing requests', async () => {
      const product = await createTestProduct();

      await createTestSourcingRequest(product.id, { status: 'DIBUTUHKAN' });
      await createTestSourcingRequest(product.id, { status: 'SEDANG_DIBANDINGKAN' });
      await createTestSourcingRequest(product.id, { status: 'DIPUTUSKAN' });

      // Completed status (should not be counted)
      await createTestSourcingRequest(product.id, { status: 'DIBELI' });

      const count = await getActiveSourcingCount();

      expect(count).toBe(3);
    });

    it('returns zero when no active sourcing requests exist', async () => {
      const count = await getActiveSourcingCount();

      expect(count).toBe(0);
    });
  });
});
