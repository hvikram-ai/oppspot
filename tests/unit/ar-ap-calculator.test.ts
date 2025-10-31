/**
 * Unit Test: AR/AP Aging Calculator
 *
 * Tests the accounts receivable and payable aging calculation logic.
 * This test validates calculator functions before implementation (TDD).
 *
 * Expected to FAIL until implementation is complete (T019).
 */

import { test, expect, describe } from '@playwright/test';
import { ARAPCalculator } from '@/lib/financials/calculators/ar-ap-calculator';
import type { Invoice, Payment, COGSEntry } from '@/lib/financials/types';

describe('ARAPCalculator', () => {
  describe('calculateARAging', () => {
    test('TC-ARAP-010: Calculate AR aging buckets from unpaid invoices', () => {
      // Arrange: Mix of current, 30, 60, 90+ day invoices
      const today = new Date('2023-12-31');

      const invoices: Invoice[] = [
        {
          id: '1',
          company_id: 'comp-1',
          external_ref: 'INV-001',
          customer_id: 'cust-1',
          amount: 1000,
          currency: 'GBP',
          invoice_date: '2023-12-25', // 6 days old (current)
          due_date: '2024-01-10',
          status: 'unpaid',
          checksum: 'check1',
          created_at: '2023-12-25T00:00:00Z',
          updated_at: '2023-12-25T00:00:00Z',
        },
        {
          id: '2',
          company_id: 'comp-1',
          external_ref: 'INV-002',
          customer_id: 'cust-2',
          amount: 2000,
          currency: 'GBP',
          invoice_date: '2023-11-20', // 41 days old (30-day bucket)
          due_date: '2023-12-20',
          status: 'unpaid',
          checksum: 'check2',
          created_at: '2023-11-20T00:00:00Z',
          updated_at: '2023-11-20T00:00:00Z',
        },
        {
          id: '3',
          company_id: 'comp-1',
          external_ref: 'INV-003',
          customer_id: 'cust-3',
          amount: 1500,
          currency: 'GBP',
          invoice_date: '2023-10-20', // 72 days old (60-day bucket)
          due_date: '2023-11-20',
          status: 'unpaid',
          checksum: 'check3',
          created_at: '2023-10-20T00:00:00Z',
          updated_at: '2023-10-20T00:00:00Z',
        },
        {
          id: '4',
          company_id: 'comp-1',
          external_ref: 'INV-004',
          customer_id: 'cust-4',
          amount: 3000,
          currency: 'GBP',
          invoice_date: '2023-09-01', // 121 days old (90+ bucket)
          due_date: '2023-10-01',
          status: 'unpaid',
          checksum: 'check4',
          created_at: '2023-09-01T00:00:00Z',
          updated_at: '2023-09-01T00:00:00Z',
        },
      ];

      const calculator = new ARAPCalculator();

      // Act
      const aging = calculator.calculateARAging(invoices, today);

      // Assert: Correct bucket allocation
      expect(aging).toMatchObject({
        ar_current: 1000, // 0-30 days
        ar_30_days: 2000, // 31-60 days
        ar_60_days: 1500, // 61-90 days
        ar_90_plus: 3000, // 90+ days
        ar_total: 7500,
      });
    });

    test('TC-ARAP-011: Exclude paid invoices from AR aging', () => {
      // Arrange
      const today = new Date('2023-12-31');

      const invoices: Invoice[] = [
        {
          id: '1',
          company_id: 'comp-1',
          external_ref: 'INV-001',
          customer_id: 'cust-1',
          amount: 1000,
          currency: 'GBP',
          invoice_date: '2023-12-01',
          due_date: '2023-12-31',
          status: 'unpaid', // UNPAID - should be included
          checksum: 'check1',
          created_at: '2023-12-01T00:00:00Z',
          updated_at: '2023-12-01T00:00:00Z',
        },
        {
          id: '2',
          company_id: 'comp-1',
          external_ref: 'INV-002',
          customer_id: 'cust-2',
          amount: 5000,
          currency: 'GBP',
          invoice_date: '2023-11-01',
          due_date: '2023-12-01',
          status: 'paid', // PAID - should be excluded
          checksum: 'check2',
          created_at: '2023-11-01T00:00:00Z',
          updated_at: '2023-12-15T00:00:00Z',
        },
      ];

      const calculator = new ARAPCalculator();

      // Act
      const aging = calculator.calculateARAging(invoices, today);

      // Assert: Only unpaid invoice counted
      expect(aging.ar_total).toBe(1000);
      expect(aging.ar_current).toBe(1000);
    });

    test('TC-ARAP-012: Handle overdue invoices (past due date)', () => {
      // Arrange: Invoice overdue by 100 days
      const today = new Date('2023-12-31');

      const invoices: Invoice[] = [
        {
          id: '1',
          company_id: 'comp-1',
          external_ref: 'INV-001',
          customer_id: 'cust-1',
          amount: 2500,
          currency: 'GBP',
          invoice_date: '2023-08-01',
          due_date: '2023-09-01', // Overdue by 121 days
          status: 'overdue',
          checksum: 'check1',
          created_at: '2023-08-01T00:00:00Z',
          updated_at: '2023-09-02T00:00:00Z',
        },
      ];

      const calculator = new ARAPCalculator();

      // Act
      const aging = calculator.calculateARAging(invoices, today);

      // Assert: Placed in 90+ bucket
      expect(aging.ar_90_plus).toBe(2500);
      expect(aging.ar_total).toBe(2500);
    });
  });

  describe('calculateAPAging', () => {
    test('TC-ARAP-013: Calculate AP aging buckets from unpaid payables', () => {
      // Arrange: Mix of current, 30, 60, 90+ day payables
      const today = new Date('2023-12-31');

      const cogsEntries: COGSEntry[] = [
        {
          id: '1',
          company_id: 'comp-1',
          external_ref: 'COGS-001',
          category: 'hosting',
          amount: 500,
          currency: 'GBP',
          date: '2023-12-20', // 11 days old (current)
          description: 'AWS bill',
          checksum: 'check1',
          created_at: '2023-12-20T00:00:00Z',
          updated_at: '2023-12-20T00:00:00Z',
        },
        {
          id: '2',
          company_id: 'comp-1',
          external_ref: 'COGS-002',
          category: 'support',
          amount: 1500,
          currency: 'GBP',
          date: '2023-11-15', // 46 days old (30-day bucket)
          description: 'Support contractor',
          checksum: 'check2',
          created_at: '2023-11-15T00:00:00Z',
          updated_at: '2023-11-15T00:00:00Z',
        },
        {
          id: '3',
          company_id: 'comp-1',
          external_ref: 'COGS-003',
          category: 'hosting',
          amount: 1000,
          currency: 'GBP',
          date: '2023-10-15', // 77 days old (60-day bucket)
          description: 'Data center',
          checksum: 'check3',
          created_at: '2023-10-15T00:00:00Z',
          updated_at: '2023-10-15T00:00:00Z',
        },
        {
          id: '4',
          company_id: 'comp-1',
          external_ref: 'COGS-004',
          category: 'licensing',
          amount: 2000,
          currency: 'GBP',
          date: '2023-08-01', // 152 days old (90+ bucket)
          description: 'Software license',
          checksum: 'check4',
          created_at: '2023-08-01T00:00:00Z',
          updated_at: '2023-08-01T00:00:00Z',
        },
      ];

      const calculator = new ARAPCalculator();

      // Act
      const aging = calculator.calculateAPAging(cogsEntries, today);

      // Assert: Correct bucket allocation
      expect(aging).toMatchObject({
        ap_current: 500,
        ap_30_days: 1500,
        ap_60_days: 1000,
        ap_90_plus: 2000,
        ap_total: 5000,
      });
    });
  });

  describe('calculateDSO (Days Sales Outstanding)', () => {
    test('TC-ARAP-014: Calculate DSO from AR and revenue', () => {
      // Arrange
      const arTotal = 30000; // Total accounts receivable
      const totalRevenue = 100000; // Revenue for period
      const days = 90; // Quarter

      const calculator = new ARAPCalculator();

      // Act
      const dso = calculator.calculateDSO(arTotal, totalRevenue, days);

      // Assert: DSO = (AR / Revenue) * Days
      // DSO = (30000 / 100000) * 90 = 27 days
      expect(dso).toBe(27);
    });

    test('TC-ARAP-015: Handle zero revenue gracefully', () => {
      // Arrange
      const arTotal = 10000;
      const totalRevenue = 0; // No revenue
      const days = 90;

      const calculator = new ARAPCalculator();

      // Act
      const dso = calculator.calculateDSO(arTotal, totalRevenue, days);

      // Assert: Return 0 to avoid division by zero
      expect(dso).toBe(0);
    });

    test('TC-ARAP-016: Higher DSO indicates slower collections', () => {
      // Arrange: Scenario 1 - Fast collections (15 days)
      const scenario1 = {
        arTotal: 10000,
        totalRevenue: 60000,
        days: 90,
      };

      // Scenario 2 - Slow collections (45 days)
      const scenario2 = {
        arTotal: 30000,
        totalRevenue: 60000,
        days: 90,
      };

      const calculator = new ARAPCalculator();

      // Act
      const dso1 = calculator.calculateDSO(scenario1.arTotal, scenario1.totalRevenue, scenario1.days);
      const dso2 = calculator.calculateDSO(scenario2.arTotal, scenario2.totalRevenue, scenario2.days);

      // Assert: Scenario 2 has higher DSO (worse)
      expect(dso1).toBe(15);
      expect(dso2).toBe(45);
      expect(dso2).toBeGreaterThan(dso1);
    });
  });

  describe('calculateDPO (Days Payables Outstanding)', () => {
    test('TC-ARAP-017: Calculate DPO from AP and COGS', () => {
      // Arrange
      const apTotal = 20000; // Total accounts payable
      const totalCOGS = 80000; // COGS for period
      const days = 90; // Quarter

      const calculator = new ARAPCalculator();

      // Act
      const dpo = calculator.calculateDPO(apTotal, totalCOGS, days);

      // Assert: DPO = (AP / COGS) * Days
      // DPO = (20000 / 80000) * 90 = 22.5 days
      expect(dpo).toBe(22.5);
    });

    test('TC-ARAP-018: Handle zero COGS gracefully', () => {
      // Arrange
      const apTotal = 5000;
      const totalCOGS = 0; // No COGS
      const days = 90;

      const calculator = new ARAPCalculator();

      // Act
      const dpo = calculator.calculateDPO(apTotal, totalCOGS, days);

      // Assert: Return 0 to avoid division by zero
      expect(dpo).toBe(0);
    });

    test('TC-ARAP-019: Higher DPO indicates slower payments to suppliers', () => {
      // Arrange: Scenario 1 - Fast payments (20 days)
      const scenario1 = {
        apTotal: 10000,
        totalCOGS: 45000,
        days: 90,
      };

      // Scenario 2 - Slow payments (40 days)
      const scenario2 = {
        apTotal: 20000,
        totalCOGS: 45000,
        days: 90,
      };

      const calculator = new ARAPCalculator();

      // Act
      const dpo1 = calculator.calculateDPO(scenario1.apTotal, scenario1.totalCOGS, scenario1.days);
      const dpo2 = calculator.calculateDPO(scenario2.apTotal, scenario2.totalCOGS, scenario2.days);

      // Assert: Scenario 2 has higher DPO (paying slower)
      expect(dpo1).toBe(20);
      expect(dpo2).toBe(40);
      expect(dpo2).toBeGreaterThan(dpo1);
    });
  });

  describe('detectAnomalies', () => {
    test('TC-ARAP-020: Detect AR 90+ days spike exceeding 50% threshold (FR-021)', () => {
      // Arrange: Previous month AR 90+ = 20000, current = 31000 (55% increase)
      const previousAging = {
        ar_current: 50000,
        ar_30_days: 30000,
        ar_60_days: 20000,
        ar_90_plus: 20000,
        ar_total: 120000,
        ap_current: 0,
        ap_30_days: 0,
        ap_60_days: 0,
        ap_90_plus: 0,
        ap_total: 0,
        dso: 45,
        dpo: 30,
      };

      const currentAging = {
        ar_current: 50000,
        ar_30_days: 28000,
        ar_60_days: 20000,
        ar_90_plus: 31000, // 55% increase from 20000
        ar_total: 129000,
        ap_current: 0,
        ap_30_days: 0,
        ap_60_days: 0,
        ap_90_plus: 0,
        ap_total: 0,
        dso: 48,
        dpo: 30,
      };

      const calculator = new ARAPCalculator();

      // Act
      const anomalies = calculator.detectAnomalies(previousAging, currentAging, 50); // 50% threshold

      // Assert: Anomaly detected
      expect(anomalies.length).toBeGreaterThan(0);

      const ar90Anomaly = anomalies.find(a => a.anomaly_type === 'ar_aging_spike');
      expect(ar90Anomaly).toBeDefined();
      expect(ar90Anomaly).toMatchObject({
        severity: 'high',
        metric_name: 'ar_90_plus',
        metric_value: 31000,
        threshold_value: 30000, // 50% increase threshold (20000 * 1.5)
      });
    });

    test('TC-ARAP-021: No anomaly when AR 90+ increase is below threshold', () => {
      // Arrange: Previous AR 90+ = 20000, current = 25000 (25% increase, below 50% threshold)
      const previousAging = {
        ar_current: 50000,
        ar_30_days: 30000,
        ar_60_days: 20000,
        ar_90_plus: 20000,
        ar_total: 120000,
        ap_current: 0,
        ap_30_days: 0,
        ap_60_days: 0,
        ap_90_plus: 0,
        ap_total: 0,
        dso: 45,
        dpo: 30,
      };

      const currentAging = {
        ar_current: 50000,
        ar_30_days: 30000,
        ar_60_days: 20000,
        ar_90_plus: 25000, // Only 25% increase
        ar_total: 125000,
        ap_current: 0,
        ap_30_days: 0,
        ap_60_days: 0,
        ap_90_plus: 0,
        ap_total: 0,
        dso: 46,
        dpo: 30,
      };

      const calculator = new ARAPCalculator();

      // Act
      const anomalies = calculator.detectAnomalies(previousAging, currentAging, 50);

      // Assert: No anomaly
      expect(anomalies).toHaveLength(0);
    });
  });

  describe('calculateARAPAging (complete analysis)', () => {
    test('TC-ARAP-022: Generate full AR/AP aging analysis', () => {
      // Arrange
      const companyId = 'comp-1';
      const periodDate = '2023-12-31';
      const today = new Date(periodDate);

      const invoices: Invoice[] = [
        {
          id: '1',
          company_id: companyId,
          external_ref: 'INV-001',
          customer_id: 'cust-1',
          amount: 5000,
          currency: 'GBP',
          invoice_date: '2023-12-15',
          due_date: '2024-01-15',
          status: 'unpaid',
          checksum: 'check1',
          created_at: '2023-12-15T00:00:00Z',
          updated_at: '2023-12-15T00:00:00Z',
        },
        {
          id: '2',
          company_id: companyId,
          external_ref: 'INV-002',
          customer_id: 'cust-2',
          amount: 8000,
          currency: 'GBP',
          invoice_date: '2023-10-01',
          due_date: '2023-11-01',
          status: 'overdue',
          checksum: 'check2',
          created_at: '2023-10-01T00:00:00Z',
          updated_at: '2023-11-02T00:00:00Z',
        },
      ];

      const cogsEntries: COGSEntry[] = [
        {
          id: '1',
          company_id: companyId,
          external_ref: 'COGS-001',
          category: 'hosting',
          amount: 2000,
          currency: 'GBP',
          date: '2023-12-20',
          description: 'AWS',
          checksum: 'cogscheck1',
          created_at: '2023-12-20T00:00:00Z',
          updated_at: '2023-12-20T00:00:00Z',
        },
      ];

      const totalRevenue = 50000; // For DSO calculation
      const totalCOGS = 10000; // For DPO calculation
      const days = 30; // 1 month

      const calculator = new ARAPCalculator();

      // Act
      const arapAging = calculator.calculateARAPAging({
        companyId,
        periodDate,
        invoices,
        cogsEntries,
        totalRevenue,
        totalCOGS,
        days,
        today,
      });

      // Assert: Complete AR/AP aging record
      expect(arapAging).toMatchObject({
        company_id: companyId,
        period_date: periodDate,
        ar_current: expect.any(Number),
        ar_30_days: expect.any(Number),
        ar_60_days: expect.any(Number),
        ar_90_plus: expect.any(Number),
        ar_total: 13000, // 5000 + 8000
        ap_current: expect.any(Number),
        ap_30_days: expect.any(Number),
        ap_60_days: expect.any(Number),
        ap_90_plus: expect.any(Number),
        ap_total: 2000,
        dso: expect.any(Number),
        dpo: expect.any(Number),
      });

      expect(arapAging.dso).toBeGreaterThan(0);
      expect(arapAging.dpo).toBeGreaterThan(0);
    });
  });

  describe('Edge cases', () => {
    test('TC-ARAP-023: Handle empty invoice list', () => {
      // Arrange
      const invoices: Invoice[] = [];
      const today = new Date('2023-12-31');
      const calculator = new ARAPCalculator();

      // Act
      const aging = calculator.calculateARAging(invoices, today);

      // Assert: All zeros
      expect(aging).toMatchObject({
        ar_current: 0,
        ar_30_days: 0,
        ar_60_days: 0,
        ar_90_plus: 0,
        ar_total: 0,
      });
    });

    test('TC-ARAP-024: Handle empty COGS list', () => {
      // Arrange
      const cogsEntries: COGSEntry[] = [];
      const today = new Date('2023-12-31');
      const calculator = new ARAPCalculator();

      // Act
      const aging = calculator.calculateAPAging(cogsEntries, today);

      // Assert: All zeros
      expect(aging).toMatchObject({
        ap_current: 0,
        ap_30_days: 0,
        ap_60_days: 0,
        ap_90_plus: 0,
        ap_total: 0,
      });
    });
  });
});
