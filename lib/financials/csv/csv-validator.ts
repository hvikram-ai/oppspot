/**
 * CSV Validator Service
 *
 * Provides comprehensive validation for financial CSV data including:
 * - Business rule validation (dates, amounts, currencies)
 * - Cross-row validation (referential integrity)
 * - Data consistency checks
 * - Batch validation for performance
 */

import type {
  CustomerRow,
  SubscriptionRow,
  InvoiceRow,
  PaymentRow,
  COGSRow,
  SalesMarketingCostRow,
} from '@/lib/financials/types';
import type { CSVError } from './csv-parser';

/**
 * Validation rule interface
 */
interface ValidationRule<T> {
  name: string;
  validate: (data: T[], existingData?: unknown) => CSVError[];
}

/**
 * CSV Validator class
 */
export class CSVValidator {
  /**
   * Validate customer data
   */
  validateCustomers(customers: CustomerRow[]): CSVError[] {
    const errors: CSVError[] = [];

    // Rule 1: Check for duplicate customer IDs
    const customerIds = new Map<string, number>();
    customers.forEach((customer, index) => {
      const rowNumber = index + 1;
      if (customerIds.has(customer.customer_id)) {
        errors.push({
          row: rowNumber,
          field: 'customer_id',
          message: `Duplicate customer_id "${customer.customer_id}" (first seen at row ${customerIds.get(customer.customer_id)})`,
          code: 'DUPLICATE_ID',
        });
      } else {
        customerIds.set(customer.customer_id, rowNumber);
      }
    });

    // Rule 2: Validate acquisition dates are not in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    customers.forEach((customer, index) => {
      const acquisitionDate = new Date(customer.acquisition_date);
      acquisitionDate.setHours(0, 0, 0, 0);

      if (acquisitionDate > today) {
        errors.push({
          row: index + 1,
          field: 'acquisition_date',
          message: `Acquisition date cannot be in the future (${customer.acquisition_date})`,
          code: 'FUTURE_DATE',
        });
      }
    });

    // Rule 3: Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    customers.forEach((customer, index) => {
      if (!emailRegex.test(customer.email)) {
        errors.push({
          row: index + 1,
          field: 'email',
          message: `Invalid email format: ${customer.email}`,
          code: 'INVALID_EMAIL',
        });
      }
    });

    return errors;
  }

  /**
   * Validate subscription data
   */
  validateSubscriptions(
    subscriptions: SubscriptionRow[],
    customerIds?: Set<string>
  ): CSVError[] {
    const errors: CSVError[] = [];

    // Rule 1: Check for duplicate subscription references
    const subRefs = new Map<string, number>();
    subscriptions.forEach((sub, index) => {
      const rowNumber = index + 1;
      const refKey = `${sub.customer_id}-${sub.plan}-${sub.start_date}`;

      if (subRefs.has(refKey)) {
        errors.push({
          row: rowNumber,
          field: 'customer_id',
          message: `Duplicate subscription for customer "${sub.customer_id}", plan "${sub.plan}" starting on ${sub.start_date}`,
          code: 'DUPLICATE_SUBSCRIPTION',
        });
      } else {
        subRefs.set(refKey, rowNumber);
      }
    });

    // Rule 2: Validate customer references (if customer data provided)
    if (customerIds) {
      subscriptions.forEach((sub, index) => {
        if (!customerIds.has(sub.customer_id)) {
          errors.push({
            row: index + 1,
            field: 'customer_id',
            message: `Referenced customer_id "${sub.customer_id}" not found in customers file`,
            code: 'INVALID_REFERENCE',
          });
        }
      });
    }

    // Rule 3: Validate date logic (end_date must be after start_date)
    subscriptions.forEach((sub, index) => {
      if (sub.end_date) {
        const startDate = new Date(sub.start_date);
        const endDate = new Date(sub.end_date);

        if (endDate <= startDate) {
          errors.push({
            row: index + 1,
            field: 'end_date',
            message: `End date (${sub.end_date}) must be after start date (${sub.start_date})`,
            code: 'INVALID_DATE_RANGE',
          });
        }
      }
    });

    // Rule 4: Validate MRR is positive
    subscriptions.forEach((sub, index) => {
      if (sub.mrr <= 0) {
        errors.push({
          row: index + 1,
          field: 'mrr',
          message: `MRR must be positive (got ${sub.mrr})`,
          code: 'INVALID_AMOUNT',
        });
      }
    });

    // Rule 5: Validate status consistency
    subscriptions.forEach((sub, index) => {
      const hasEndDate = !!sub.end_date;
      const isChurned = sub.status === 'churned';

      // If has end_date, status should be 'churned'
      if (hasEndDate && !isChurned) {
        errors.push({
          row: index + 1,
          field: 'status',
          message: `Subscription has end_date (${sub.end_date}) but status is "${sub.status}". Expected "churned".`,
          code: 'INCONSISTENT_STATUS',
        });
      }

      // If status is 'churned', should have end_date
      if (isChurned && !hasEndDate) {
        errors.push({
          row: index + 1,
          field: 'status',
          message: `Subscription status is "churned" but no end_date provided`,
          code: 'INCONSISTENT_STATUS',
        });
      }
    });

    return errors;
  }

  /**
   * Validate invoice data
   */
  validateInvoices(
    invoices: InvoiceRow[],
    customerIds?: Set<string>
  ): CSVError[] {
    const errors: CSVError[] = [];

    // Rule 1: Check for duplicate invoice IDs
    const invoiceIds = new Map<string, number>();
    invoices.forEach((invoice, index) => {
      const rowNumber = index + 1;
      if (invoiceIds.has(invoice.invoice_id)) {
        errors.push({
          row: rowNumber,
          field: 'invoice_id',
          message: `Duplicate invoice_id "${invoice.invoice_id}" (first seen at row ${invoiceIds.get(invoice.invoice_id)})`,
          code: 'DUPLICATE_ID',
        });
      } else {
        invoiceIds.set(invoice.invoice_id, rowNumber);
      }
    });

    // Rule 2: Validate customer references
    if (customerIds) {
      invoices.forEach((invoice, index) => {
        if (!customerIds.has(invoice.customer_id)) {
          errors.push({
            row: index + 1,
            field: 'customer_id',
            message: `Referenced customer_id "${invoice.customer_id}" not found in customers file`,
            code: 'INVALID_REFERENCE',
          });
        }
      });
    }

    // Rule 3: Validate due_date is after invoice_date
    invoices.forEach((invoice, index) => {
      const invoiceDate = new Date(invoice.invoice_date);
      const dueDate = new Date(invoice.due_date);

      if (dueDate < invoiceDate) {
        errors.push({
          row: index + 1,
          field: 'due_date',
          message: `Due date (${invoice.due_date}) must be on or after invoice date (${invoice.invoice_date})`,
          code: 'INVALID_DATE_RANGE',
        });
      }
    });

    // Rule 4: Validate amount is positive
    invoices.forEach((invoice, index) => {
      if (invoice.amount <= 0) {
        errors.push({
          row: index + 1,
          field: 'amount',
          message: `Invoice amount must be positive (got ${invoice.amount})`,
          code: 'INVALID_AMOUNT',
        });
      }
    });

    // Rule 5: Validate status values
    const validStatuses = ['paid', 'unpaid', 'overdue', 'cancelled'];
    invoices.forEach((invoice, index) => {
      if (invoice.status && !validStatuses.includes(invoice.status)) {
        errors.push({
          row: index + 1,
          field: 'status',
          message: `Invalid status "${invoice.status}". Must be one of: ${validStatuses.join(', ')}`,
          code: 'INVALID_STATUS',
        });
      }
    });

    return errors;
  }

  /**
   * Validate payment data
   */
  validatePayments(
    payments: PaymentRow[],
    invoiceIds?: Set<string>
  ): CSVError[] {
    const errors: CSVError[] = [];

    // Rule 1: Check for duplicate payment IDs
    const paymentIds = new Map<string, number>();
    payments.forEach((payment, index) => {
      const rowNumber = index + 1;
      if (paymentIds.has(payment.payment_id)) {
        errors.push({
          row: rowNumber,
          field: 'payment_id',
          message: `Duplicate payment_id "${payment.payment_id}" (first seen at row ${paymentIds.get(payment.payment_id)})`,
          code: 'DUPLICATE_ID',
        });
      } else {
        paymentIds.set(payment.payment_id, rowNumber);
      }
    });

    // Rule 2: Validate invoice references
    if (invoiceIds) {
      payments.forEach((payment, index) => {
        if (!invoiceIds.has(payment.invoice_id)) {
          errors.push({
            row: index + 1,
            field: 'invoice_id',
            message: `Referenced invoice_id "${payment.invoice_id}" not found in invoices file`,
            code: 'INVALID_REFERENCE',
          });
        }
      });
    }

    // Rule 3: Validate amount is positive
    payments.forEach((payment, index) => {
      if (payment.amount <= 0) {
        errors.push({
          row: index + 1,
          field: 'amount',
          message: `Payment amount must be positive (got ${payment.amount})`,
          code: 'INVALID_AMOUNT',
        });
      }
    });

    // Rule 4: Validate payment_date is not in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    payments.forEach((payment, index) => {
      const paymentDate = new Date(payment.payment_date);
      paymentDate.setHours(0, 0, 0, 0);

      if (paymentDate > today) {
        errors.push({
          row: index + 1,
          field: 'payment_date',
          message: `Payment date cannot be in the future (${payment.payment_date})`,
          code: 'FUTURE_DATE',
        });
      }
    });

    return errors;
  }

  /**
   * Validate COGS data
   */
  validateCOGS(cogs: COGSRow[]): CSVError[] {
    const errors: CSVError[] = [];

    // Rule 1: Check for duplicate COGS IDs
    const cogsIds = new Map<string, number>();
    cogs.forEach((entry, index) => {
      const rowNumber = index + 1;
      if (cogsIds.has(entry.cogs_id)) {
        errors.push({
          row: rowNumber,
          field: 'cogs_id',
          message: `Duplicate cogs_id "${entry.cogs_id}" (first seen at row ${cogsIds.get(entry.cogs_id)})`,
          code: 'DUPLICATE_ID',
        });
      } else {
        cogsIds.set(entry.cogs_id, rowNumber);
      }
    });

    // Rule 2: Validate amount is positive
    cogs.forEach((entry, index) => {
      if (entry.amount <= 0) {
        errors.push({
          row: index + 1,
          field: 'amount',
          message: `COGS amount must be positive (got ${entry.amount})`,
          code: 'INVALID_AMOUNT',
        });
      }
    });

    // Rule 3: Validate category values
    const validCategories = ['hosting', 'support', 'licensing', 'infrastructure', 'other'];
    cogs.forEach((entry, index) => {
      if (!validCategories.includes(entry.category)) {
        errors.push({
          row: index + 1,
          field: 'category',
          message: `Invalid category "${entry.category}". Must be one of: ${validCategories.join(', ')}`,
          code: 'INVALID_CATEGORY',
        });
      }
    });

    return errors;
  }

  /**
   * Validate sales/marketing cost data
   */
  validateSalesMarketing(costs: SalesMarketingCostRow[]): CSVError[] {
    const errors: CSVError[] = [];

    // Rule 1: Check for duplicate cost IDs
    const costIds = new Map<string, number>();
    costs.forEach((cost, index) => {
      const rowNumber = index + 1;
      if (costIds.has(cost.cost_id)) {
        errors.push({
          row: rowNumber,
          field: 'cost_id',
          message: `Duplicate cost_id "${cost.cost_id}" (first seen at row ${costIds.get(cost.cost_id)})`,
          code: 'DUPLICATE_ID',
        });
      } else {
        costIds.set(cost.cost_id, rowNumber);
      }
    });

    // Rule 2: Validate amount is positive
    costs.forEach((cost, index) => {
      if (cost.amount <= 0) {
        errors.push({
          row: index + 1,
          field: 'amount',
          message: `Sales/marketing cost must be positive (got ${cost.amount})`,
          code: 'INVALID_AMOUNT',
        });
      }
    });

    // Rule 3: Validate category values
    const validCategories = ['advertising', 'salaries', 'events', 'tools', 'other'];
    costs.forEach((cost, index) => {
      if (!validCategories.includes(cost.category)) {
        errors.push({
          row: index + 1,
          field: 'category',
          message: `Invalid category "${cost.category}". Must be one of: ${validCategories.join(', ')}`,
          code: 'INVALID_CATEGORY',
        });
      }
    });

    return errors;
  }

  /**
   * Validate cross-file referential integrity
   */
  validateCrossFileIntegrity(data: {
    customers?: CustomerRow[];
    subscriptions?: SubscriptionRow[];
    invoices?: InvoiceRow[];
    payments?: PaymentRow[];
  }): CSVError[] {
    const errors: CSVError[] = [];

    // Build reference sets
    const customerIds = new Set(data.customers?.map((c) => c.customer_id) || []);
    const invoiceIds = new Set(data.invoices?.map((i) => i.invoice_id) || []);

    // Validate subscriptions reference customers
    if (data.subscriptions && customerIds.size > 0) {
      const subErrors = this.validateSubscriptions(
        data.subscriptions,
        customerIds
      );
      errors.push(...subErrors);
    }

    // Validate invoices reference customers
    if (data.invoices && customerIds.size > 0) {
      const invErrors = this.validateInvoices(data.invoices, customerIds);
      errors.push(...invErrors);
    }

    // Validate payments reference invoices
    if (data.payments && invoiceIds.size > 0) {
      const payErrors = this.validatePayments(data.payments, invoiceIds);
      errors.push(...payErrors);
    }

    return errors;
  }

  /**
   * Validate all data in batch (performance optimized)
   */
  validateBatch(data: {
    customers?: CustomerRow[];
    subscriptions?: SubscriptionRow[];
    invoices?: InvoiceRow[];
    payments?: PaymentRow[];
    cogs?: COGSRow[];
    salesMarketing?: SalesMarketingCostRow[];
  }): Record<string, CSVError[]> {
    const allErrors: Record<string, CSVError[]> = {};

    // Validate each entity type
    if (data.customers) {
      allErrors.customers = this.validateCustomers(data.customers);
    }

    if (data.subscriptions) {
      allErrors.subscriptions = this.validateSubscriptions(data.subscriptions);
    }

    if (data.invoices) {
      allErrors.invoices = this.validateInvoices(data.invoices);
    }

    if (data.payments) {
      allErrors.payments = this.validatePayments(data.payments);
    }

    if (data.cogs) {
      allErrors.cogs = this.validateCOGS(data.cogs);
    }

    if (data.salesMarketing) {
      allErrors.salesMarketing = this.validateSalesMarketing(data.salesMarketing);
    }

    // Validate cross-file integrity
    const crossFileErrors = this.validateCrossFileIntegrity(data);
    if (crossFileErrors.length > 0) {
      allErrors.crossFile = crossFileErrors;
    }

    return allErrors;
  }
}

/**
 * Helper function to count total errors across all files
 */
export function countTotalErrors(
  errorMap: Record<string, CSVError[]>
): number {
  return Object.values(errorMap).reduce(
    (total, errors) => total + errors.length,
    0
  );
}

/**
 * Helper function to check if validation passed
 */
export function isValidationSuccess(
  errorMap: Record<string, CSVError[]>
): boolean {
  return countTotalErrors(errorMap) === 0;
}
