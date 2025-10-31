/**
 * Unit Test: Cohort Calculator
 *
 * Tests the cohort analysis calculation logic for customer retention.
 * This test validates calculator functions before implementation (TDD).
 *
 * Expected to FAIL until implementation is complete (T017).
 */

import { test, expect, describe } from '@playwright/test';
import { CohortCalculator } from '@/lib/financials/calculators/cohort-calculator';
import type { Subscription, Customer } from '@/lib/financials/types';

describe('CohortCalculator', () => {
  describe('identifyCohorts', () => {
    test('TC-COH-009: Group customers by acquisition month', () => {
      // Arrange
      const customers: Customer[] = [
        {
          id: '1',
          company_id: 'comp-1',
          external_ref: 'CUST-001',
          name: 'Customer One',
          email: 'cust1@test.com',
          country: 'GB',
          acquisition_date: '2023-01-15', // Jan cohort
          checksum: 'check1',
          created_at: '2023-01-15T00:00:00Z',
          updated_at: '2023-01-15T00:00:00Z',
        },
        {
          id: '2',
          company_id: 'comp-1',
          external_ref: 'CUST-002',
          name: 'Customer Two',
          email: 'cust2@test.com',
          country: 'GB',
          acquisition_date: '2023-01-20', // Jan cohort (same month)
          checksum: 'check2',
          created_at: '2023-01-20T00:00:00Z',
          updated_at: '2023-01-20T00:00:00Z',
        },
        {
          id: '3',
          company_id: 'comp-1',
          external_ref: 'CUST-003',
          name: 'Customer Three',
          email: 'cust3@test.com',
          country: 'IE',
          acquisition_date: '2023-02-10', // Feb cohort
          checksum: 'check3',
          created_at: '2023-02-10T00:00:00Z',
          updated_at: '2023-02-10T00:00:00Z',
        },
      ];

      const calculator = new CohortCalculator();

      // Act
      const cohorts = calculator.identifyCohorts(customers);

      // Assert: Two cohorts (2023-01 and 2023-02)
      expect(cohorts.size).toBe(2);
      expect(cohorts.has('2023-01-01')).toBe(true);
      expect(cohorts.has('2023-02-01')).toBe(true);

      // Verify customer counts
      expect(cohorts.get('2023-01-01')!.customerIds).toHaveLength(2);
      expect(cohorts.get('2023-02-01')!.customerIds).toHaveLength(1);
    });

    test('TC-COH-010: Normalize acquisition dates to first day of month', () => {
      // Arrange
      const customers: Customer[] = [
        {
          id: '1',
          company_id: 'comp-1',
          external_ref: 'CUST-001',
          name: 'Customer One',
          email: 'cust1@test.com',
          country: 'GB',
          acquisition_date: '2023-01-15', // Mid-month
          checksum: 'check1',
          created_at: '2023-01-15T00:00:00Z',
          updated_at: '2023-01-15T00:00:00Z',
        },
      ];

      const calculator = new CohortCalculator();

      // Act
      const cohorts = calculator.identifyCohorts(customers);

      // Assert: Cohort month is normalized to 2023-01-01
      expect(cohorts.has('2023-01-01')).toBe(true);
      expect(cohorts.has('2023-01-15')).toBe(false);
    });
  });

  describe('calculateRetentionByMonth', () => {
    test('TC-COH-011: Calculate retention for month_offset=0 (acquisition month)', () => {
      // Arrange
      const cohortMonth = '2023-01-01';
      const cohortCustomerIds = ['cust-1', 'cust-2', 'cust-3'];

      const subscriptions: Subscription[] = [
        {
          id: 'sub-1',
          company_id: 'comp-1',
          customer_id: 'cust-1',
          external_ref: 'SUB-001',
          plan_name: 'Enterprise',
          start_date: '2023-01-15',
          end_date: null,
          mrr: 1000,
          currency: 'GBP',
          is_active: true,
          checksum: 'check1',
          created_at: '2023-01-15T00:00:00Z',
          updated_at: '2023-01-15T00:00:00Z',
        },
        {
          id: 'sub-2',
          company_id: 'comp-1',
          customer_id: 'cust-2',
          external_ref: 'SUB-002',
          plan_name: 'Pro',
          start_date: '2023-01-20',
          end_date: null,
          mrr: 500,
          currency: 'GBP',
          is_active: true,
          checksum: 'check2',
          created_at: '2023-01-20T00:00:00Z',
          updated_at: '2023-01-20T00:00:00Z',
        },
        {
          id: 'sub-3',
          company_id: 'comp-1',
          customer_id: 'cust-3',
          external_ref: 'SUB-003',
          plan_name: 'Starter',
          start_date: '2023-01-25',
          end_date: null,
          mrr: 200,
          currency: 'GBP',
          is_active: true,
          checksum: 'check3',
          created_at: '2023-01-25T00:00:00Z',
          updated_at: '2023-01-25T00:00:00Z',
        },
      ];

      const monthOffset = 0; // Acquisition month
      const calculator = new CohortCalculator();

      // Act
      const retention = calculator.calculateRetentionByMonth(
        cohortMonth,
        cohortCustomerIds,
        monthOffset,
        subscriptions
      );

      // Assert: All 3 customers active in month 0
      expect(retention).toMatchObject({
        month_offset: 0,
        customers_active: 3,
        mrr_retained: 1700, // 1000 + 500 + 200
        retention_rate_pct: 100, // 3/3 * 100
      });
    });

    test('TC-COH-012: Calculate retention for month_offset=6 with churn', () => {
      // Arrange
      const cohortMonth = '2023-01-01';
      const cohortCustomerIds = ['cust-1', 'cust-2', 'cust-3'];

      const subscriptions: Subscription[] = [
        {
          id: 'sub-1',
          company_id: 'comp-1',
          customer_id: 'cust-1',
          external_ref: 'SUB-001',
          plan_name: 'Enterprise',
          start_date: '2023-01-15',
          end_date: null,
          mrr: 1000,
          currency: 'GBP',
          is_active: true, // Still active
          checksum: 'check1',
          created_at: '2023-01-15T00:00:00Z',
          updated_at: '2023-07-15T00:00:00Z',
        },
        {
          id: 'sub-2',
          company_id: 'comp-1',
          customer_id: 'cust-2',
          external_ref: 'SUB-002',
          plan_name: 'Pro',
          start_date: '2023-01-20',
          end_date: '2023-04-20', // Churned in month 3
          mrr: 500,
          currency: 'GBP',
          is_active: false,
          checksum: 'check2',
          created_at: '2023-01-20T00:00:00Z',
          updated_at: '2023-04-20T00:00:00Z',
        },
        {
          id: 'sub-3',
          company_id: 'comp-1',
          customer_id: 'cust-3',
          external_ref: 'SUB-003',
          plan_name: 'Starter',
          start_date: '2023-01-25',
          end_date: null,
          mrr: 200,
          currency: 'GBP',
          is_active: true, // Still active
          checksum: 'check3',
          created_at: '2023-01-25T00:00:00Z',
          updated_at: '2023-07-25T00:00:00Z',
        },
      ];

      const monthOffset = 6; // July (6 months after Jan)
      const calculator = new CohortCalculator();

      // Act
      const retention = calculator.calculateRetentionByMonth(
        cohortMonth,
        cohortCustomerIds,
        monthOffset,
        subscriptions
      );

      // Assert: 2 out of 3 customers still active
      expect(retention).toMatchObject({
        month_offset: 6,
        customers_active: 2,
        mrr_retained: 1200, // 1000 + 200
        retention_rate_pct: 66.67, // 2/3 * 100 (rounded to 2 decimals)
      });
    });

    test('TC-COH-013: Handle 100% churn (all customers churned)', () => {
      // Arrange
      const cohortMonth = '2023-01-01';
      const cohortCustomerIds = ['cust-1', 'cust-2'];

      const subscriptions: Subscription[] = [
        {
          id: 'sub-1',
          company_id: 'comp-1',
          customer_id: 'cust-1',
          external_ref: 'SUB-001',
          plan_name: 'Enterprise',
          start_date: '2023-01-15',
          end_date: '2023-03-15', // Churned
          mrr: 1000,
          currency: 'GBP',
          is_active: false,
          checksum: 'check1',
          created_at: '2023-01-15T00:00:00Z',
          updated_at: '2023-03-15T00:00:00Z',
        },
        {
          id: 'sub-2',
          company_id: 'comp-1',
          customer_id: 'cust-2',
          external_ref: 'SUB-002',
          plan_name: 'Pro',
          start_date: '2023-01-20',
          end_date: '2023-02-20', // Churned
          mrr: 500,
          currency: 'GBP',
          is_active: false,
          checksum: 'check2',
          created_at: '2023-01-20T00:00:00Z',
          updated_at: '2023-02-20T00:00:00Z',
        },
      ];

      const monthOffset = 12; // 1 year later
      const calculator = new CohortCalculator();

      // Act
      const retention = calculator.calculateRetentionByMonth(
        cohortMonth,
        cohortCustomerIds,
        monthOffset,
        subscriptions
      );

      // Assert: Zero retention
      expect(retention).toMatchObject({
        month_offset: 12,
        customers_active: 0,
        mrr_retained: 0,
        retention_rate_pct: 0,
      });
    });
  });

  describe('calculateCohortMetrics', () => {
    test('TC-COH-014: Generate cohort metrics for 12 months', () => {
      // Arrange
      const companyId = 'comp-1';

      const customers: Customer[] = [
        {
          id: '1',
          company_id: companyId,
          external_ref: 'CUST-001',
          name: 'Customer One',
          email: 'cust1@test.com',
          country: 'GB',
          acquisition_date: '2023-01-15',
          checksum: 'check1',
          created_at: '2023-01-15T00:00:00Z',
          updated_at: '2023-01-15T00:00:00Z',
        },
        {
          id: '2',
          company_id: companyId,
          external_ref: 'CUST-002',
          name: 'Customer Two',
          email: 'cust2@test.com',
          country: 'GB',
          acquisition_date: '2023-01-20',
          checksum: 'check2',
          created_at: '2023-01-20T00:00:00Z',
          updated_at: '2023-01-20T00:00:00Z',
        },
      ];

      const subscriptions: Subscription[] = [
        {
          id: 'sub-1',
          company_id: companyId,
          customer_id: '1',
          external_ref: 'SUB-001',
          plan_name: 'Enterprise',
          start_date: '2023-01-15',
          end_date: null,
          mrr: 1000,
          currency: 'GBP',
          is_active: true,
          checksum: 'check1',
          created_at: '2023-01-15T00:00:00Z',
          updated_at: '2023-01-15T00:00:00Z',
        },
        {
          id: 'sub-2',
          company_id: companyId,
          customer_id: '2',
          external_ref: 'SUB-002',
          plan_name: 'Pro',
          start_date: '2023-01-20',
          end_date: '2023-06-20', // Churns in month 5
          mrr: 500,
          currency: 'GBP',
          is_active: false,
          checksum: 'check2',
          created_at: '2023-01-20T00:00:00Z',
          updated_at: '2023-06-20T00:00:00Z',
        },
      ];

      const calculator = new CohortCalculator();

      // Act
      const cohortMetrics = calculator.calculateCohortMetrics(
        companyId,
        customers,
        subscriptions,
        12 // Calculate 12 months of retention
      );

      // Assert: Metrics for 2023-01 cohort with 12 month offsets
      const jan2023Cohort = cohortMetrics.filter(m => m.cohort_month === '2023-01-01');

      expect(jan2023Cohort).toHaveLength(13); // Month 0-12 (13 data points)

      // Verify month 0 (acquisition)
      const month0 = jan2023Cohort.find(m => m.month_offset === 0)!;
      expect(month0.customers_active).toBe(2);
      expect(month0.mrr_retained).toBe(1500);
      expect(month0.retention_rate_pct).toBe(100);

      // Verify month 5 (after one churn)
      const month5 = jan2023Cohort.find(m => m.month_offset === 5)!;
      expect(month5.customers_active).toBe(2); // Still both active (churn happens in month 6)

      // Verify month 6 (after churn)
      const month6 = jan2023Cohort.find(m => m.month_offset === 6)!;
      expect(month6.customers_active).toBe(1); // One churned
      expect(month6.mrr_retained).toBe(1000); // Only Enterprise customer remains
      expect(month6.retention_rate_pct).toBe(50); // 1/2 * 100
    });

    test('TC-COH-015: Handle multiple cohorts simultaneously', () => {
      // Arrange
      const companyId = 'comp-1';

      const customers: Customer[] = [
        {
          id: '1',
          company_id: companyId,
          external_ref: 'CUST-001',
          name: 'Jan Customer',
          email: 'jan@test.com',
          country: 'GB',
          acquisition_date: '2023-01-15',
          checksum: 'check1',
          created_at: '2023-01-15T00:00:00Z',
          updated_at: '2023-01-15T00:00:00Z',
        },
        {
          id: '2',
          company_id: companyId,
          external_ref: 'CUST-002',
          name: 'Feb Customer',
          email: 'feb@test.com',
          country: 'GB',
          acquisition_date: '2023-02-10',
          checksum: 'check2',
          created_at: '2023-02-10T00:00:00Z',
          updated_at: '2023-02-10T00:00:00Z',
        },
        {
          id: '3',
          company_id: companyId,
          external_ref: 'CUST-003',
          name: 'Mar Customer',
          email: 'mar@test.com',
          country: 'IE',
          acquisition_date: '2023-03-05',
          checksum: 'check3',
          created_at: '2023-03-05T00:00:00Z',
          updated_at: '2023-03-05T00:00:00Z',
        },
      ];

      const subscriptions: Subscription[] = [
        {
          id: 'sub-1',
          company_id: companyId,
          customer_id: '1',
          external_ref: 'SUB-001',
          plan_name: 'Enterprise',
          start_date: '2023-01-15',
          end_date: null,
          mrr: 1000,
          currency: 'GBP',
          is_active: true,
          checksum: 'check1',
          created_at: '2023-01-15T00:00:00Z',
          updated_at: '2023-01-15T00:00:00Z',
        },
        {
          id: 'sub-2',
          company_id: companyId,
          customer_id: '2',
          external_ref: 'SUB-002',
          plan_name: 'Pro',
          start_date: '2023-02-10',
          end_date: null,
          mrr: 500,
          currency: 'GBP',
          is_active: true,
          checksum: 'check2',
          created_at: '2023-02-10T00:00:00Z',
          updated_at: '2023-02-10T00:00:00Z',
        },
        {
          id: 'sub-3',
          company_id: companyId,
          customer_id: '3',
          external_ref: 'SUB-003',
          plan_name: 'Starter',
          start_date: '2023-03-05',
          end_date: null,
          mrr: 200,
          currency: 'GBP',
          is_active: true,
          checksum: 'check3',
          created_at: '2023-03-05T00:00:00Z',
          updated_at: '2023-03-05T00:00:00Z',
        },
      ];

      const calculator = new CohortCalculator();

      // Act
      const cohortMetrics = calculator.calculateCohortMetrics(
        companyId,
        customers,
        subscriptions,
        6 // 6 months
      );

      // Assert: Metrics for 3 cohorts
      const jan2023 = cohortMetrics.filter(m => m.cohort_month === '2023-01-01');
      const feb2023 = cohortMetrics.filter(m => m.cohort_month === '2023-02-01');
      const mar2023 = cohortMetrics.filter(m => m.cohort_month === '2023-03-01');

      expect(jan2023).toHaveLength(7); // Months 0-6
      expect(feb2023).toHaveLength(7);
      expect(mar2023).toHaveLength(7);

      // Verify each cohort has distinct customer counts
      expect(jan2023[0].customers_active).toBe(1); // 1 customer in Jan cohort
      expect(feb2023[0].customers_active).toBe(1); // 1 customer in Feb cohort
      expect(mar2023[0].customers_active).toBe(1); // 1 customer in Mar cohort
    });
  });

  describe('Edge cases', () => {
    test('TC-COH-016: Handle empty customer list', () => {
      // Arrange
      const customers: Customer[] = [];
      const calculator = new CohortCalculator();

      // Act
      const cohorts = calculator.identifyCohorts(customers);

      // Assert: No cohorts
      expect(cohorts.size).toBe(0);
    });

    test('TC-COH-017: Handle empty subscription list', () => {
      // Arrange
      const cohortMonth = '2023-01-01';
      const cohortCustomerIds = ['cust-1'];
      const subscriptions: Subscription[] = [];
      const calculator = new CohortCalculator();

      // Act
      const retention = calculator.calculateRetentionByMonth(
        cohortMonth,
        cohortCustomerIds,
        0,
        subscriptions
      );

      // Assert: Zero retention (no active subscriptions)
      expect(retention).toMatchObject({
        month_offset: 0,
        customers_active: 0,
        mrr_retained: 0,
        retention_rate_pct: 0,
      });
    });
  });
});
