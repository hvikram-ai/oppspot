/**
 * Unit Test: Revenue Concentration Calculator
 *
 * Tests the revenue concentration analysis logic (HHI and top-N percentages).
 * This test validates calculator functions before implementation (TDD).
 *
 * Expected to FAIL until implementation is complete (T018).
 */

import { test, expect, describe } from '@playwright/test';
import { ConcentrationCalculator } from '@/lib/financials/calculators/concentration-calculator';
import type { Subscription } from '@/lib/financials/types';

describe('ConcentrationCalculator', () => {
  describe('calculateHHI (Herfindahl-Hirschman Index)', () => {
    test('TC-CONC-010: Calculate HHI for evenly distributed revenue', () => {
      // Arrange: 4 customers with equal MRR (25% each)
      const subscriptions: Subscription[] = [
        {
          id: '1',
          company_id: 'comp-1',
          customer_id: 'cust-1',
          external_ref: 'SUB-001',
          plan_name: 'Pro',
          start_date: '2023-01-01',
          end_date: null,
          mrr: 1000,
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
          start_date: '2023-01-01',
          end_date: null,
          mrr: 1000,
          currency: 'GBP',
          is_active: true,
          checksum: 'check2',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
        {
          id: '3',
          company_id: 'comp-1',
          customer_id: 'cust-3',
          external_ref: 'SUB-003',
          plan_name: 'Pro',
          start_date: '2023-01-01',
          end_date: null,
          mrr: 1000,
          currency: 'GBP',
          is_active: true,
          checksum: 'check3',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
        {
          id: '4',
          company_id: 'comp-1',
          customer_id: 'cust-4',
          external_ref: 'SUB-004',
          plan_name: 'Pro',
          start_date: '2023-01-01',
          end_date: null,
          mrr: 1000,
          currency: 'GBP',
          is_active: true,
          checksum: 'check4',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ];

      const calculator = new ConcentrationCalculator();

      // Act
      const hhi = calculator.calculateHHI(subscriptions);

      // Assert: HHI = sum of squared market shares
      // Each customer: (1000/4000)^2 = 0.25^2 = 0.0625
      // HHI = (0.0625 + 0.0625 + 0.0625 + 0.0625) * 10000 = 2500
      expect(hhi).toBe(2500);
    });

    test('TC-CONC-011: Calculate HHI for highly concentrated revenue (monopoly)', () => {
      // Arrange: 1 customer with 100% of revenue
      const subscriptions: Subscription[] = [
        {
          id: '1',
          company_id: 'comp-1',
          customer_id: 'cust-1',
          external_ref: 'SUB-001',
          plan_name: 'Enterprise',
          start_date: '2023-01-01',
          end_date: null,
          mrr: 10000,
          currency: 'GBP',
          is_active: true,
          checksum: 'check1',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ];

      const calculator = new ConcentrationCalculator();

      // Act
      const hhi = calculator.calculateHHI(subscriptions);

      // Assert: HHI = (1.0)^2 * 10000 = 10000 (maximum concentration)
      expect(hhi).toBe(10000);
    });

    test('TC-CONC-012: Calculate HHI for moderately concentrated revenue', () => {
      // Arrange: Uneven distribution (60%, 20%, 10%, 10%)
      const subscriptions: Subscription[] = [
        {
          id: '1',
          company_id: 'comp-1',
          customer_id: 'cust-1',
          external_ref: 'SUB-001',
          plan_name: 'Enterprise',
          start_date: '2023-01-01',
          end_date: null,
          mrr: 6000, // 60%
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
          start_date: '2023-01-01',
          end_date: null,
          mrr: 2000, // 20%
          currency: 'GBP',
          is_active: true,
          checksum: 'check2',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
        {
          id: '3',
          company_id: 'comp-1',
          customer_id: 'cust-3',
          external_ref: 'SUB-003',
          plan_name: 'Starter',
          start_date: '2023-01-01',
          end_date: null,
          mrr: 1000, // 10%
          currency: 'GBP',
          is_active: true,
          checksum: 'check3',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
        {
          id: '4',
          company_id: 'comp-1',
          customer_id: 'cust-4',
          external_ref: 'SUB-004',
          plan_name: 'Starter',
          start_date: '2023-01-01',
          end_date: null,
          mrr: 1000, // 10%
          currency: 'GBP',
          is_active: true,
          checksum: 'check4',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ];

      const calculator = new ConcentrationCalculator();

      // Act
      const hhi = calculator.calculateHHI(subscriptions);

      // Assert: HHI = (0.6^2 + 0.2^2 + 0.1^2 + 0.1^2) * 10000
      // HHI = (0.36 + 0.04 + 0.01 + 0.01) * 10000 = 4200
      expect(hhi).toBe(4200);
    });
  });

  describe('calculateTopNPercentages', () => {
    test('TC-CONC-013: Calculate top-1, top-3, top-5, top-10 customer percentages', () => {
      // Arrange: 10 customers with varying MRR
      const subscriptions: Subscription[] = Array.from({ length: 10 }, (_, i) => ({
        id: `${i + 1}`,
        company_id: 'comp-1',
        customer_id: `cust-${i + 1}`,
        external_ref: `SUB-00${i + 1}`,
        plan_name: 'Pro',
        start_date: '2023-01-01',
        end_date: null,
        mrr: (10 - i) * 100, // 1000, 900, 800, ..., 100
        currency: 'GBP',
        is_active: true,
        checksum: `check${i + 1}`,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      }));

      const calculator = new ConcentrationCalculator();

      // Act
      const topN = calculator.calculateTopNPercentages(subscriptions);

      // Assert: Total MRR = 1000 + 900 + ... + 100 = 5500
      // Top-1: 1000 / 5500 = 18.18%
      // Top-3: (1000 + 900 + 800) / 5500 = 49.09%
      // Top-5: (1000 + 900 + 800 + 700 + 600) / 5500 = 72.73%
      // Top-10: 100% (all customers)

      expect(topN.top_1_customer_pct).toBeCloseTo(18.18, 2);
      expect(topN.top_3_customers_pct).toBeCloseTo(49.09, 2);
      expect(topN.top_5_customers_pct).toBeCloseTo(72.73, 2);
      expect(topN.top_10_customers_pct).toBe(100);
    });

    test('TC-CONC-014: Detect high concentration risk (top-1 > 25%)', () => {
      // Arrange: One dominant customer (35% of revenue)
      const subscriptions: Subscription[] = [
        {
          id: '1',
          company_id: 'comp-1',
          customer_id: 'cust-1',
          external_ref: 'SUB-001',
          plan_name: 'Enterprise',
          start_date: '2023-01-01',
          end_date: null,
          mrr: 3500, // 35%
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
          start_date: '2023-01-01',
          end_date: null,
          mrr: 3250, // 32.5%
          currency: 'GBP',
          is_active: true,
          checksum: 'check2',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
        {
          id: '3',
          company_id: 'comp-1',
          customer_id: 'cust-3',
          external_ref: 'SUB-003',
          plan_name: 'Starter',
          start_date: '2023-01-01',
          end_date: null,
          mrr: 3250, // 32.5%
          currency: 'GBP',
          is_active: true,
          checksum: 'check3',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ];

      const calculator = new ConcentrationCalculator();

      // Act
      const topN = calculator.calculateTopNPercentages(subscriptions);

      // Assert: Top-1 exceeds 25% threshold (FR-016)
      expect(topN.top_1_customer_pct).toBe(35);
      expect(topN.top_1_customer_pct).toBeGreaterThan(25); // Risk threshold
    });

    test('TC-CONC-015: Handle fewer than N customers gracefully', () => {
      // Arrange: Only 2 customers (fewer than top-5, top-10)
      const subscriptions: Subscription[] = [
        {
          id: '1',
          company_id: 'comp-1',
          customer_id: 'cust-1',
          external_ref: 'SUB-001',
          plan_name: 'Pro',
          start_date: '2023-01-01',
          end_date: null,
          mrr: 600,
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
          plan_name: 'Starter',
          start_date: '2023-01-01',
          end_date: null,
          mrr: 400,
          currency: 'GBP',
          is_active: true,
          checksum: 'check2',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ];

      const calculator = new ConcentrationCalculator();

      // Act
      const topN = calculator.calculateTopNPercentages(subscriptions);

      // Assert: All percentages capped at 100%
      expect(topN.top_1_customer_pct).toBe(60); // 600/1000
      expect(topN.top_3_customers_pct).toBe(100); // Only 2 customers
      expect(topN.top_5_customers_pct).toBe(100);
      expect(topN.top_10_customers_pct).toBe(100);
    });
  });

  describe('determineRiskLevel', () => {
    test('TC-CONC-016: Classify as high risk when HHI > 1500', () => {
      // Arrange
      const hhi = 1800;
      const calculator = new ConcentrationCalculator();

      // Act
      const riskLevel = calculator.determineRiskLevel(hhi);

      // Assert
      expect(riskLevel).toBe('high');
    });

    test('TC-CONC-017: Classify as medium risk when HHI 1000-1500', () => {
      // Arrange
      const hhi = 1250;
      const calculator = new ConcentrationCalculator();

      // Act
      const riskLevel = calculator.determineRiskLevel(hhi);

      // Assert
      expect(riskLevel).toBe('medium');
    });

    test('TC-CONC-018: Classify as low risk when HHI < 1000', () => {
      // Arrange
      const hhi = 850;
      const calculator = new ConcentrationCalculator();

      // Act
      const riskLevel = calculator.determineRiskLevel(hhi);

      // Assert
      expect(riskLevel).toBe('low');
    });
  });

  describe('calculateConcentration (complete analysis)', () => {
    test('TC-CONC-019: Generate full concentration analysis', () => {
      // Arrange
      const companyId = 'comp-1';
      const periodDate = '2023-12-01';

      const subscriptions: Subscription[] = [
        {
          id: '1',
          company_id: companyId,
          customer_id: 'cust-1',
          external_ref: 'SUB-001',
          plan_name: 'Enterprise',
          start_date: '2023-01-01',
          end_date: null,
          mrr: 5000, // 50%
          currency: 'GBP',
          is_active: true,
          checksum: 'check1',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-12-01T00:00:00Z',
        },
        {
          id: '2',
          company_id: companyId,
          customer_id: 'cust-2',
          external_ref: 'SUB-002',
          plan_name: 'Pro',
          start_date: '2023-02-01',
          end_date: null,
          mrr: 3000, // 30%
          currency: 'GBP',
          is_active: true,
          checksum: 'check2',
          created_at: '2023-02-01T00:00:00Z',
          updated_at: '2023-12-01T00:00:00Z',
        },
        {
          id: '3',
          company_id: companyId,
          customer_id: 'cust-3',
          external_ref: 'SUB-003',
          plan_name: 'Starter',
          start_date: '2023-03-01',
          end_date: null,
          mrr: 2000, // 20%
          currency: 'GBP',
          is_active: true,
          checksum: 'check3',
          created_at: '2023-03-01T00:00:00Z',
          updated_at: '2023-12-01T00:00:00Z',
        },
      ];

      const calculator = new ConcentrationCalculator();

      // Act
      const concentration = calculator.calculateConcentration(
        companyId,
        periodDate,
        subscriptions
      );

      // Assert: Complete concentration record
      expect(concentration).toMatchObject({
        company_id: companyId,
        period_date: periodDate,
        hhi: expect.any(Number),
        top_1_customer_pct: 50,
        top_3_customers_pct: 100,
        top_5_customers_pct: 100,
        top_10_customers_pct: 100,
        risk_level: expect.stringMatching(/^(low|medium|high)$/),
      });

      // HHI = (0.5^2 + 0.3^2 + 0.2^2) * 10000 = 3800 (high)
      expect(concentration.hhi).toBe(3800);
      expect(concentration.risk_level).toBe('high');
    });
  });

  describe('Edge cases', () => {
    test('TC-CONC-020: Handle zero revenue (no subscriptions)', () => {
      // Arrange
      const subscriptions: Subscription[] = [];
      const calculator = new ConcentrationCalculator();

      // Act
      const hhi = calculator.calculateHHI(subscriptions);
      const topN = calculator.calculateTopNPercentages(subscriptions);

      // Assert: Return 0 for all metrics
      expect(hhi).toBe(0);
      expect(topN).toMatchObject({
        top_1_customer_pct: 0,
        top_3_customers_pct: 0,
        top_5_customers_pct: 0,
        top_10_customers_pct: 0,
      });
    });

    test('TC-CONC-021: Exclude inactive subscriptions from concentration', () => {
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
          is_active: true, // ACTIVE
          checksum: 'check1',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-12-01T00:00:00Z',
        },
        {
          id: '2',
          company_id: 'comp-1',
          customer_id: 'cust-2',
          external_ref: 'SUB-002',
          plan_name: 'Pro',
          start_date: '2023-02-01',
          end_date: '2023-11-01',
          mrr: 10000, // High MRR but inactive
          currency: 'GBP',
          is_active: false, // CHURNED
          checksum: 'check2',
          created_at: '2023-02-01T00:00:00Z',
          updated_at: '2023-11-01T00:00:00Z',
        },
      ];

      const calculator = new ConcentrationCalculator();

      // Act
      const topN = calculator.calculateTopNPercentages(subscriptions);

      // Assert: Only active subscription counted
      expect(topN.top_1_customer_pct).toBe(100); // Only cust-1 (5000 MRR)
    });
  });
});
