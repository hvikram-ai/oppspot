/**
 * CSV Parser for Financial Data Upload
 *
 * Handles parsing and validation of CSV files for customers, subscriptions,
 * invoices, payments, COGS, and sales/marketing costs.
 *
 * Features:
 * - Row-by-row validation using Zod schemas
 * - Single currency enforcement (FR-002)
 * - Checksum generation (SHA-256) for idempotency
 * - Error accumulation with line numbers
 * - Type-safe parsing with comprehensive error reporting
 */

import Papa from 'papaparse';
import crypto from 'crypto';
import { z } from 'zod';
import {
  CustomerRowSchema,
  SubscriptionRowSchema,
  InvoiceRowSchema,
  PaymentRowSchema,
  COGSRowSchema,
  SalesMarketingRowSchema,
  type CustomerRow,
  type SubscriptionRow,
  type InvoiceRow,
  type PaymentRow,
  type COGSRow,
  type SalesMarketingRow,
} from '@/lib/financials/types';

/**
 * CSV file type identifier
 */
export type CSVFileType =
  | 'customers'
  | 'subscriptions'
  | 'invoices'
  | 'payments'
  | 'cogs'
  | 'sales_marketing';

/**
 * Parsed CSV result with validated rows and errors
 */
export interface ParsedCSVResult<T> {
  success: boolean;
  rows: T[];
  errors: CSVError[];
  metadata: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    currency?: string; // Detected currency (single currency enforcement)
  };
}

/**
 * CSV parsing error with context
 */
export interface CSVError {
  row: number; // 1-indexed row number (excluding header)
  field?: string;
  message: string;
  code: string;
}

/**
 * CSV column mapping (expected columns for each file type)
 */
const REQUIRED_COLUMNS: Record<CSVFileType, string[]> = {
  customers: ['customer_id', 'name', 'email', 'country', 'acquisition_date'],
  subscriptions: ['customer_id', 'plan', 'currency', 'start_date', 'mrr'],
  invoices: ['invoice_id', 'customer_id', 'amount', 'currency', 'invoice_date', 'due_date'],
  payments: ['payment_id', 'invoice_id', 'amount', 'currency', 'payment_date'],
  cogs: ['cogs_id', 'category', 'amount', 'currency', 'date', 'description'],
  sales_marketing: ['cost_id', 'category', 'amount', 'currency', 'date', 'description'],
};

/**
 * Zod schema mapping for each file type
 */
const SCHEMA_MAP: Record<CSVFileType, z.ZodSchema> = {
  customers: CustomerRowSchema,
  subscriptions: SubscriptionRowSchema,
  invoices: InvoiceRowSchema,
  payments: PaymentRowSchema,
  cogs: COGSRowSchema,
  sales_marketing: SalesMarketingRowSchema,
};

/**
 * CSV Parser class
 */
export class CSVParser {
  /**
   * Parse CSV file with validation
   */
  async parse<T>(
    fileContent: string,
    fileType: CSVFileType
  ): Promise<ParsedCSVResult<T>> {
    const errors: CSVError[] = [];
    const validRows: T[] = [];
    let detectedCurrency: string | undefined;

    // Parse CSV using papaparse
    const parseResult = Papa.parse<Record<string, string>>(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
      transform: (value) => value.trim(),
    });

    // Check for parsing errors
    if (parseResult.errors.length > 0) {
      parseResult.errors.forEach((error) => {
        errors.push({
          row: error.row ? error.row + 1 : 0,
          message: error.message,
          code: 'PARSE_ERROR',
        });
      });
    }

    // Validate column headers
    const columnErrors = this.validateColumns(
      parseResult.meta.fields || [],
      fileType
    );
    if (columnErrors.length > 0) {
      return {
        success: false,
        rows: [],
        errors: columnErrors,
        metadata: {
          totalRows: 0,
          validRows: 0,
          invalidRows: 0,
        },
      };
    }

    // Validate each row
    const schema = SCHEMA_MAP[fileType];
    const currencies = new Set<string>();

    parseResult.data.forEach((row, index) => {
      const rowNumber = index + 1; // 1-indexed (excluding header)

      try {
        // Validate row against schema
        const validatedRow = schema.parse(row);

        // Track currencies for single currency enforcement (FR-002)
        if ('currency' in validatedRow && validatedRow.currency) {
          currencies.add(validatedRow.currency as string);
        }

        // Generate checksum for idempotency
        const rowWithChecksum = {
          ...validatedRow,
          checksum: this.generateChecksum(validatedRow),
        };

        validRows.push(rowWithChecksum as T);
      } catch (error) {
        if (error instanceof z.ZodError) {
          // Extract Zod validation errors
          error.errors.forEach((zodError) => {
            errors.push({
              row: rowNumber,
              field: zodError.path.join('.'),
              message: zodError.message,
              code: zodError.code,
            });
          });
        } else {
          // Generic error
          errors.push({
            row: rowNumber,
            message: error instanceof Error ? error.message : 'Unknown error',
            code: 'VALIDATION_ERROR',
          });
        }
      }
    });

    // Enforce single currency (FR-002)
    if (currencies.size > 1) {
      errors.push({
        row: 0, // Global error (not specific to a row)
        message: `Multiple currencies detected: ${Array.from(currencies).join(', ')}. Only one currency is allowed per company (FR-002).`,
        code: 'MIXED_CURRENCIES',
      });

      return {
        success: false,
        rows: [],
        errors,
        metadata: {
          totalRows: parseResult.data.length,
          validRows: 0,
          invalidRows: parseResult.data.length,
        },
      };
    }

    detectedCurrency = currencies.size === 1 ? Array.from(currencies)[0] : undefined;

    return {
      success: errors.length === 0,
      rows: validRows,
      errors,
      metadata: {
        totalRows: parseResult.data.length,
        validRows: validRows.length,
        invalidRows: parseResult.data.length - validRows.length,
        currency: detectedCurrency,
      },
    };
  }

  /**
   * Validate CSV column headers
   */
  private validateColumns(
    actualColumns: string[],
    fileType: CSVFileType
  ): CSVError[] {
    const errors: CSVError[] = [];
    const requiredColumns = REQUIRED_COLUMNS[fileType];
    const normalizedActual = actualColumns.map((col) => col.toLowerCase().trim());

    // Check for missing required columns
    const missingColumns = requiredColumns.filter(
      (col) => !normalizedActual.includes(col)
    );

    if (missingColumns.length > 0) {
      errors.push({
        row: 0, // Header error
        message: `Missing required columns: ${missingColumns.join(', ')}`,
        code: 'MISSING_COLUMNS',
      });
    }

    return errors;
  }

  /**
   * Generate SHA-256 checksum for row data (idempotency)
   */
  private generateChecksum(data: unknown): string {
    // Sort keys for consistent hashing
    const sortedData = this.sortObject(data);
    const dataString = JSON.stringify(sortedData);
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Recursively sort object keys for consistent hashing
   */
  private sortObject(obj: unknown): unknown {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sortObject(item));
    }

    const sorted: Record<string, unknown> = {};
    Object.keys(obj as Record<string, unknown>)
      .sort()
      .forEach((key) => {
        sorted[key] = this.sortObject((obj as Record<string, unknown>)[key]);
      });

    return sorted;
  }

  /**
   * Parse multiple CSV files in batch
   */
  async parseBatch(
    files: Array<{ content: string; type: CSVFileType }>
  ): Promise<Record<CSVFileType, ParsedCSVResult<unknown>>> {
    const results: Record<string, ParsedCSVResult<unknown>> = {};

    for (const file of files) {
      results[file.type] = await this.parse(file.content, file.type);
    }

    return results as Record<CSVFileType, ParsedCSVResult<unknown>>;
  }

  /**
   * Validate currency consistency across multiple files
   */
  validateCrossFileCurrency(
    results: Record<string, ParsedCSVResult<unknown>>
  ): { valid: boolean; currencies: string[]; error?: string } {
    const currencies = new Set<string>();

    Object.values(results).forEach((result) => {
      if (result.metadata.currency) {
        currencies.add(result.metadata.currency);
      }
    });

    if (currencies.size > 1) {
      return {
        valid: false,
        currencies: Array.from(currencies),
        error: `Multiple currencies detected across files: ${Array.from(currencies).join(', ')}. Only one currency is allowed per company (FR-002).`,
      };
    }

    return {
      valid: true,
      currencies: Array.from(currencies),
    };
  }
}

/**
 * Helper function to format CSV errors for user display
 */
export function formatCSVErrors(errors: CSVError[]): string[] {
  return errors.map((error) => {
    const rowInfo = error.row > 0 ? `Row ${error.row}` : 'File';
    const fieldInfo = error.field ? ` (${error.field})` : '';
    return `${rowInfo}${fieldInfo}: ${error.message}`;
  });
}

/**
 * Helper function to validate CSV file size
 */
export function validateFileSize(
  fileSize: number,
  maxSizeBytes: number = 10 * 1024 * 1024 // 10MB default
): { valid: boolean; error?: string } {
  if (fileSize > maxSizeBytes) {
    return {
      valid: false,
      error: `File size (${(fileSize / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${(maxSizeBytes / 1024 / 1024).toFixed(2)}MB)`,
    };
  }

  return { valid: true };
}

/**
 * Helper function to detect CSV file type from filename
 */
export function detectFileType(filename: string): CSVFileType | null {
  const normalized = filename.toLowerCase();

  if (normalized.includes('customer')) return 'customers';
  if (normalized.includes('subscription')) return 'subscriptions';
  if (normalized.includes('invoice')) return 'invoices';
  if (normalized.includes('payment')) return 'payments';
  if (normalized.includes('cogs')) return 'cogs';
  if (normalized.includes('sales') || normalized.includes('marketing'))
    return 'sales_marketing';

  return null;
}
