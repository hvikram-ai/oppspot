/**
 * Unit Test: KPI Calculator
 *
 * Tests the core KPI calculation logic for SaaS metrics.
 * This test validates calculator functions before implementation (TDD).
 *
 * Expected to FAIL until implementation is complete (T016).
 */

import { test, expect, describe } from '@playwright/test';
import { KPICalculator } from '@/lib/financials/calculators/kpi-calculator';
import type {
  Subscription,
  Payment,
  COGSEntry,
  SalesMarketingCost,
  KPISnapshot,
} from '@/lib/financials/types';

describe('KPICalculator', () => {
  describe('calculateARR (Annual Recurring Revenue)', () => {
    test('TC-KPI-001: Calculate ARR from active subscriptions', () => {
      // Arrange
      const subscriptions: Subscription[] = [
        {
          id: '1',
          company_id: 'comp-1',
          customer_id: 'cust-1',
          external_ref: 'SUB-001',
          plan_name: 'Enterprise',
          start_date: '2023-01-01',
          end_date: null,
          mrr: 5000,
          currency: 'GBP',
          is_active: true,
          checksum: 'check1',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
        {
          id: '2',
          company_id: 'comp-1',
          customer_id: 'cust-2',
          external_ref: 'SUB-002',
          plan_name: 'Pro',
          start_date: '2023-02-01',
          end_date: null,
          mrr: 1200,
          currency: 'GBP',
          is_active: true,
          checksum: 'check2',
          created_at: '2023-02-01T00:00:00Z',
          updated_at: '2023-02-01T00:00:00Z',
        },
      ];

      const calculator = new KPICalculator();

      // Act
      const arr = calculator.calculateARR(subscriptions);

      // Assert: ARR = SUM(active MRR) * 12
      expect(arr).toBe((5000 + 1200) * 12); // 74,400
    });

    test('TC-KPI-002: Exclude inactive subscriptions from ARR calculation', () => {
      // Arrange
      const subscriptions: Subscription[] = [
        {
          id: '1',
          company_id: 'comp-1',
          customer_id: 'cust-1',
          external_ref: 'SUB-001',
          plan_name: 'Enterprise',
          start_date: '2023-01-01',
          end_date: null,
          mrr: 5000,
          currency: 'GBP',
          is_active: true,
          checksum: 'check1',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
        {
          id: '2',
          company_id: 'comp-1',
          customer_id: 'cust-2',
          external_ref: 'SUB-002',
          plan_name: 'Pro',
          start_date: '2023-02-01',
          end_date: '2023-08-01',
          mrr: 1200,
          currency: 'GBP',
          is_active: false, // CHURNED
          checksum: 'check2',
          created_at: '2023-02-01T00:00:00Z',
          updated_at: '2023-08-01T00:00:00Z',
        },
      ];

      const calculator = new KPICalculator();

      // Act
      const arr = calculator.calculateARR(subscriptions);

      // Assert: Only active subscription counted
      expect(arr).toBe(5000 * 12); // 60,000
    });
  });

  describe('calculateMRR (Monthly Recurring Revenue)', () => {
    test('TC-KPI-003: Calculate MRR from active subscriptions', () => {
      // Arrange
      const subscriptions: Subscription[] = [
        {
          id: '1',
          company_id: 'comp-1',
          customer_id: 'cust-1',
          external_ref: 'SUB-001',
          plan_name: 'Enterprise',
          start_date: '2023-01-01',
          end_date: null,
          mrr: 5000,
          currency: 'GBP',
          is_active: true,
          checksum: 'check1',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
        {
          id: '2',
          company_id: 'comp-1',
          customer_id: 'cust-2',
          external_ref: 'SUB-002',
          plan_name: 'Pro',
          start_date: '2023-02-01',
          end_date: null,
          mrr: 1200,
          currency: 'GBP',
          is_active: true,
          checksum: 'check2',
          created_at: '2023-02-01T00:00:00Z',
          updated_at: '2023-02-01T00:00:00Z',
        },
      ];

      const calculator = new KPICalculator();

      // Act
      const mrr = calculator.calculateMRR(subscriptions);

      // Assert: MRR = SUM(active MRR)
      expect(mrr).toBe(5000 + 1200); // 6,200
    });
  });

  describe('calculateNRR (Net Revenue Retention)', () => {
    test('TC-KPI-004: Calculate NRR with expansion and churn', () => {
      // Arrange
      const startMRR = 10000;
      const expansionMRR = 2000; // Upsells/upgrades
      const contractionMRR = 500; // Downgrades
      const churnMRR = 1500; // Churned customers

      const calculator = new KPICalculator();

      // Act
      const nrr = calculator.calculateNRR(startMRR, expansionMRR, contractionMRR, churnMRR);

      // Assert: NRR = (Start + Expansion - Contraction - Churn) / Start * 100
      // NRR = (10000 + 2000 - 500 - 1500) / 10000 * 100 = 100%
      expect(nrr).toBe(100);
    });

    test('TC-KPI-005: NRR > 100% indicates net expansion', () => {
      // Arrange: Strong expansion, minimal churn
      const startMRR = 10000;
      const expansionMRR = 3000;
      const contractionMRR = 200;
      const churnMRR = 500;

      const calculator = new KPICalculator();

      // Act
      const nrr = calculator.calculateNRR(startMRR, expansionMRR, contractionMRR, churnMRR);

      // Assert: NRR = (10000 + 3000 - 200 - 500) / 10000 * 100 = 123%
      expect(nrr).toBe(123);
      expect(nrr).toBeGreaterThan(100); // Net expansion
    });

    test('TC-KPI-006: NRR < 100% indicates net contraction', () => {
      // Arrange: High churn, low expansion
      const startMRR = 10000;
      const expansionMRR = 500;
      const contractionMRR = 800;
      const churnMRR = 2000;

      const calculator = new KPICalculator();

      // Act
      const nrr = calculator.calculateNRR(startMRR, expansionMRR, contractionMRR, churnMRR);

      // Assert: NRR = (10000 + 500 - 800 - 2000) / 10000 * 100 = 77%
      expect(nrr).toBe(77);
      expect(nrr).toBeLessThan(100); // Net contraction
    });
  });

  describe('calculateGRR (Gross Revenue Retention)', () => {
    test('TC-KPI-007: Calculate GRR excluding expansion', () => {
      // Arrange
      const startMRR = 10000;
      const contractionMRR = 500;
      const churnMRR = 1000;

      const calculator = new KPICalculator();

      // Act
      const grr = calculator.calculateGRR(startMRR, contractionMRR, churnMRR);

      // Assert: GRR = (Start - Contraction - Churn) / Start * 100
      // GRR = (10000 - 500 - 1000) / 10000 * 100 = 85%
      expect(grr).toBe(85);
    });

    test('TC-KPI-008: GRR cannot exceed 100% (no expansion included)', () => {
      // Arrange: Perfect retention
      const startMRR = 10000;
      const contractionMRR = 0;
      const churnMRR = 0;

      const calculator = new KPICalculator();

      // Act
      const grr = calculator.calculateGRR(startMRR, contractionMRR, churnMRR);

      // Assert: GRR = 100% (maximum)
      expect(grr).toBe(100);
      expect(grr).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateGrossMargin', () => {
    test('TC-KPI-009: Calculate gross margin from revenue and COGS', () => {
      // Arrange
      const totalRevenue = 100000;
      const cogsEntries: COGSEntry[] = [
        {
          id: '1',
          company_id: 'comp-1',
          external_ref: 'COGS-001',
          category: 'hosting',
          amount: 15000,
          currency: 'GBP',
          date: '2023-01-01',
          description: 'AWS costs',
          checksum: 'check1',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
        {
          id: '2',
          company_id: 'comp-1',
          external_ref: 'COGS-002',
          category: 'support',
          amount: 10000,
          currency: 'GBP',
          date: '2023-01-01',
          description: 'Support team',
          checksum: 'check2',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ];

      const calculator = new KPICalculator();

      // Act
      const grossMarginPct = calculator.calculateGrossMargin(totalRevenue, cogsEntries);

      // Assert: Gross Margin = (Revenue - COGS) / Revenue * 100
      // Gross Margin = (100000 - 25000) / 100000 * 100 = 75%
      expect(grossMarginPct).toBe(75);
    });

    test('TC-KPI-010: Handle zero revenue gracefully', () => {
      // Arrange
      const totalRevenue = 0;
      const cogsEntries: COGSEntry[] = [];

      const calculator = new KPICalculator();

      // Act
      const grossMarginPct = calculator.calculateGrossMargin(totalRevenue, cogsEntries);

      // Assert: Return 0 when no revenue
      expect(grossMarginPct).toBe(0);
    });
  });

  describe('calculateCAC (Customer Acquisition Cost)', () => {
    test('TC-KPI-011: Calculate CAC from sales/marketing costs', () => {
      // Arrange
      const salesMarketingCosts: SalesMarketingCost[] = [
        {
          id: '1',
          company_id: 'comp-1',
          external_ref: 'SM-001',
          category: 'advertising',
          amount: 30000,
          currency: 'GBP',
          date: '2023-01-01',
          description: 'Google Ads',
          checksum: 'check1',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
        {
          id: '2',
          company_id: 'comp-1',
          external_ref: 'SM-002',
          category: 'salaries',
          amount: 20000,
          currency: 'GBP',
          date: '2023-01-01',
          description: 'Sales team salaries',
          checksum: 'check2',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ];

      const newCustomers = 10;

      const calculator = new KPICalculator();

      // Act
      const cac = calculator.calculateCAC(salesMarketingCosts, newCustomers);

      // Assert: CAC = Total S&M Costs / New Customers
      // CAC = (30000 + 20000) / 10 = 5000
      expect(cac).toBe(5000);
    });

    test('TC-KPI-012: Handle zero new customers gracefully', () => {
      // Arrange
      const salesMarketingCosts: SalesMarketingCost[] = [
        {
          id: '1',
          company_id: 'comp-1',
          external_ref: 'SM-001',
          category: 'advertising',
          amount: 10000,
          currency: 'GBP',
          date: '2023-01-01',
          description: 'Ads',
          checksum: 'check1',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ];

      const newCustomers = 0; // No acquisitions

      const calculator = new KPICalculator();

      // Act
      const cac = calculator.calculateCAC(salesMarketingCosts, newCustomers);

      // Assert: Return 0 when no new customers (avoid division by zero)
      expect(cac).toBe(0);
    });
  });

  describe('calculateLTV (Lifetime Value)', () => {
    test('TC-KPI-013: Calculate LTV from ARPU and retention', () => {
      // Arrange
      const arpu = 200; // Average Revenue Per User (monthly)
      const grr = 95; // Gross Revenue Retention (%)
      const grossMarginPct = 75; // Gross Margin (%)

      const calculator = new KPICalculator();

      // Act
      const ltv = calculator.calculateLTV(arpu, grr, grossMarginPct);

      // Assert: LTV = ARPU * Gross Margin * (1 / Churn Rate)
      // Churn Rate = 100 - GRR = 5%
      // LTV = 200 * 0.75 * (1 / 0.05) = 200 * 0.75 * 20 = 3000
      expect(ltv).toBe(3000);
    });

    test('TC-KPI-014: Handle 100% GRR (zero churn) gracefully', () => {
      // Arrange: Perfect retention (infinite LTV)
      const arpu = 200;
      const grr = 100; // No churn
      const grossMarginPct = 75;

      const calculator = new KPICalculator();

      // Act
      const ltv = calculator.calculateLTV(arpu, grr, grossMarginPct);

      // Assert: Return very high number or Infinity
      // Avoid division by zero (churn = 0%)
      expect(ltv).toBeGreaterThan(100000); // Effectively infinite
    });
  });

  describe('calculateARPU (Average Revenue Per User)', () => {
    test('TC-KPI-015: Calculate ARPU from MRR and customer count', () => {
      // Arrange
      const mrr = 10000;
      const customerCount = 50;

      const calculator = new KPICalculator();

      // Act
      const arpu = calculator.calculateARPU(mrr, customerCount);

      // Assert: ARPU = MRR / Customer Count
      // ARPU = 10000 / 50 = 200
      expect(arpu).toBe(200);
    });

    test('TC-KPI-016: Handle zero customers gracefully', () => {
      // Arrange
      const mrr = 10000;
      const customerCount = 0;

      const calculator = new KPICalculator();

      // Act
      const arpu = calculator.calculateARPU(mrr, customerCount);

      // Assert: Return 0 when no customers
      expect(arpu).toBe(0);
    });
  });

  describe('calculateSnapshot (full KPI snapshot)', () => {
    test('TC-KPI-017: Generate complete KPI snapshot for a period', () => {
      // Arrange: Sample data for one month
      const companyId = 'comp-1';
      const periodDate = '2023-01-01';

      const subscriptions: Subscription[] = [
        {
          id: '1',
          company_id: companyId,
          customer_id: 'cust-1',
          external_ref: 'SUB-001',
          plan_name: 'Enterprise',
          start_date: '2023-01-01',
          end_date: null,
          mrr: 5000,
          currency: 'GBP',
          is_active: true,
          checksum: 'check1',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ];

      const payments: Payment[] = [
        {
          id: '1',
          company_id: companyId,
          external_ref: 'PAY-001',
          amount: 5000,
          currency: 'GBP',
          payment_date: '2023-01-15',
          status: 'paid',
          invoice_id: 'inv-1',
          checksum: 'paycheck1',
          created_at: '2023-01-15T00:00:00Z',
          updated_at: '2023-01-15T00:00:00Z',
        },
      ];

      const cogsEntries: COGSEntry[] = [
        {
          id: '1',
          company_id: companyId,
          external_ref: 'COGS-001',
          category: 'hosting',
          amount: 1000,
          currency: 'GBP',
          date: '2023-01-01',
          description: 'AWS',
          checksum: 'cogscheck1',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ];

      const salesMarketingCosts: SalesMarketingCost[] = [
        {
          id: '1',
          company_id: companyId,
          external_ref: 'SM-001',
          category: 'advertising',
          amount: 2000,
          currency: 'GBP',
          date: '2023-01-01',
          description: 'Ads',
          checksum: 'smcheck1',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ];

      const calculator = new KPICalculator();

      // Act
      const snapshot = calculator.calculateSnapshot({
        companyId,
        periodDate,
        subscriptions,
        payments,
        cogsEntries,
        salesMarketingCosts,
        previousSnapshot: null, // First month
        newCustomers: 1,
        churnedCustomers: 0,
      });

      // Assert: All KPI fields calculated
      expect(snapshot).toMatchObject({
        company_id: companyId,
        period_date: periodDate,
        arr: expect.any(Number),
        mrr: expect.any(Number),
        nrr: expect.any(Number),
        grr: expect.any(Number),
        customer_count: expect.any(Number),
        churned_customers: 0,
        new_customers: 1,
        expansion_mrr: expect.any(Number),
        contraction_mrr: expect.any(Number),
        churn_mrr: expect.any(Number),
        gross_margin_pct: expect.any(Number),
        cac: expect.any(Number),
        ltv: expect.any(Number),
        arpu: expect.any(Number),
      });

      expect(snapshot.arr).toBe(5000 * 12); // 60,000
      expect(snapshot.mrr).toBe(5000);
      expect(snapshot.customer_count).toBe(1);
    });
  });
});
