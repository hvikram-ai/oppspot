/**
 * Enhanced Validation and Input Sanitization
 *
 * Provides additional validation layers beyond Zod schemas to prevent:
 * - XSS attacks
 * - SQL injection
 * - Command injection
 * - Data integrity issues
 */

import {
  MAX_TITLE_LENGTH,
  MAX_COMPANY_NAME_LENGTH,
  MAX_URL_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_NOTES_LENGTH,
  MAX_MARKET_SEGMENT_LENGTH,
  ALLOWED_URL_SCHEMES,
} from './constants';
import { ValidationError } from './errors';

// ================================================================
// INPUT SANITIZATION
// ================================================================

/**
 * Sanitize HTML entities to prevent XSS
 */
export function sanitizeHTML(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize text input by trimming and removing control characters
 */
export function sanitizeText(input: string): string {
  return input
    .trim()
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
    .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Sanitize URL to prevent javascript: and data: schemes
 */
export function sanitizeURL(url: string): string {
  const sanitized = url.trim().toLowerCase();

  // Check for dangerous schemes
  const dangerousSchemes = ['javascript:', 'data:', 'vbscript:', 'file:'];
  for (const scheme of dangerousSchemes) {
    if (sanitized.startsWith(scheme)) {
      throw new ValidationError('Invalid URL scheme detected', { url, scheme });
    }
  }

  // Enforce HTTPS or HTTP (allow HTTP for development/testing)
  if (!sanitized.startsWith('https://') && !sanitized.startsWith('http://')) {
    throw new ValidationError('Only HTTP/HTTPS URLs are allowed', { url });
  }

  return url.trim();
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  const sanitized = email.trim().toLowerCase();

  // Basic email format validation
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
  if (!emailRegex.test(sanitized)) {
    throw new ValidationError('Invalid email format', { email });
  }

  return sanitized;
}

// ================================================================
// VALIDATION HELPERS
// ================================================================

/**
 * Validate title field
 */
export function validateTitle(title: string): string {
  const sanitized = sanitizeText(title);

  if (sanitized.length === 0) {
    throw new ValidationError('Title cannot be empty');
  }

  if (sanitized.length > MAX_TITLE_LENGTH) {
    throw new ValidationError(`Title exceeds maximum length of ${MAX_TITLE_LENGTH} characters`, {
      length: sanitized.length,
      max: MAX_TITLE_LENGTH,
    });
  }

  // Check for suspicious patterns
  if (/<script|javascript:|onerror=/i.test(sanitized)) {
    throw new ValidationError('Title contains suspicious content');
  }

  return sanitized;
}

/**
 * Validate company name
 */
export function validateCompanyName(name: string): string {
  const sanitized = sanitizeText(name);

  if (sanitized.length === 0) {
    throw new ValidationError('Company name cannot be empty');
  }

  if (sanitized.length > MAX_COMPANY_NAME_LENGTH) {
    throw new ValidationError(
      `Company name exceeds maximum length of ${MAX_COMPANY_NAME_LENGTH} characters`,
      {
        length: sanitized.length,
        max: MAX_COMPANY_NAME_LENGTH,
      }
    );
  }

  return sanitized;
}

/**
 * Validate website URL
 */
export function validateWebsiteURL(url: string | null | undefined): string | null {
  if (!url) return null;

  const sanitized = sanitizeURL(url);

  if (sanitized.length > MAX_URL_LENGTH) {
    throw new ValidationError(`URL exceeds maximum length of ${MAX_URL_LENGTH} characters`, {
      length: sanitized.length,
      max: MAX_URL_LENGTH,
    });
  }

  // Validate URL format
  try {
    new URL(sanitized);
  } catch {
    throw new ValidationError('Invalid URL format', { url: sanitized });
  }

  return sanitized;
}

/**
 * Validate description field
 */
export function validateDescription(description: string | null | undefined): string | null {
  if (!description) return null;

  const sanitized = sanitizeText(description);

  if (sanitized.length > MAX_DESCRIPTION_LENGTH) {
    throw new ValidationError(
      `Description exceeds maximum length of ${MAX_DESCRIPTION_LENGTH} characters`,
      {
        length: sanitized.length,
        max: MAX_DESCRIPTION_LENGTH,
      }
    );
  }

  return sanitized;
}

/**
 * Validate notes field
 */
export function validateNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;

  const sanitized = sanitizeText(notes);

  if (sanitized.length > MAX_NOTES_LENGTH) {
    throw new ValidationError(`Notes exceed maximum length of ${MAX_NOTES_LENGTH} characters`, {
      length: sanitized.length,
      max: MAX_NOTES_LENGTH,
    });
  }

  return sanitized;
}

/**
 * Validate market segment
 */
export function validateMarketSegment(segment: string | null | undefined): string | null {
  if (!segment) return null;

  const sanitized = sanitizeText(segment);

  if (sanitized.length > MAX_MARKET_SEGMENT_LENGTH) {
    throw new ValidationError(
      `Market segment exceeds maximum length of ${MAX_MARKET_SEGMENT_LENGTH} characters`,
      {
        length: sanitized.length,
        max: MAX_MARKET_SEGMENT_LENGTH,
      }
    );
  }

  return sanitized;
}

/**
 * Validate email for sharing
 */
export function validateShareEmail(email: string): string {
  const sanitized = sanitizeEmail(email);

  // Additional checks for known disposable email domains (optional)
  const disposableDomains = ['tempmail.com', 'guerrillamail.com', '10minutemail.com'];
  const domain = sanitized.split('@')[1];

  if (disposableDomains.includes(domain)) {
    throw new ValidationError('Disposable email addresses are not allowed', { email: sanitized });
  }

  return sanitized;
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid: string, fieldName = 'ID'): string {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(uuid)) {
    throw new ValidationError(`Invalid ${fieldName} format`, { uuid });
  }

  return uuid.toLowerCase();
}

/**
 * Validate pricing value
 */
export function validatePrice(price: number | null | undefined): number | null {
  if (price === null || price === undefined) return null;

  if (price < 0) {
    throw new ValidationError('Price cannot be negative', { price });
  }

  if (price > 1_000_000_000) {
    throw new ValidationError('Price exceeds maximum allowed value', { price });
  }

  return price;
}

/**
 * Validate year value
 */
export function validateYear(year: number | null | undefined): number | null {
  if (year === null || year === undefined) return null;

  const currentYear = new Date().getFullYear();

  if (year < 1800) {
    throw new ValidationError('Year cannot be before 1800', { year });
  }

  if (year > currentYear + 10) {
    throw new ValidationError('Year cannot be more than 10 years in the future', { year });
  }

  return year;
}

// ================================================================
// BATCH VALIDATION
// ================================================================

interface AnalysisInput {
  title: string;
  target_company_name: string;
  target_company_website?: string | null;
  description?: string | null;
  market_segment?: string | null;
  [key: string]: unknown;
}

interface CompetitorInput {
  competitor_name: string;
  competitor_website?: string | null;
  notes?: string | null;
  [key: string]: unknown;
}

interface ShareInput {
  user_email: string;
  [key: string]: unknown;
}

/**
 * Validate and sanitize competitive analysis input
 */
export function validateAnalysisInput(input: AnalysisInput): AnalysisInput {
  return {
    ...input,
    title: validateTitle(input.title),
    target_company_name: validateCompanyName(input.target_company_name),
    target_company_website: validateWebsiteURL(input.target_company_website),
    description: validateDescription(input.description),
    market_segment: validateMarketSegment(input.market_segment),
  };
}

/**
 * Validate and sanitize competitor input
 */
export function validateCompetitorInput(input: CompetitorInput): CompetitorInput {
  return {
    ...input,
    competitor_name: validateCompanyName(input.competitor_name),
    competitor_website: validateWebsiteURL(input.competitor_website),
    notes: validateNotes(input.notes),
  };
}

/**
 * Validate and sanitize share invitation input
 */
export function validateShareInput(input: ShareInput): ShareInput {
  return {
    ...input,
    user_email: validateShareEmail(input.user_email),
  };
}

// ================================================================
// SEARCH QUERY SANITIZATION
// ================================================================

/**
 * Sanitize search query to prevent injection attacks
 */
export function sanitizeSearchQuery(query: string): string {
  // Remove dangerous SQL/NoSQL operators
  let sanitized = query.trim();

  // Remove SQL injection patterns
  sanitized = sanitized.replace(/['";\\-]/g, '');

  // Remove NoSQL injection patterns
  sanitized = sanitized.replace(/[{}$]/g, '');

  // Limit length
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200);
  }

  return sanitized;
}

/**
 * Validate pagination parameters
 */
export function validatePagination(params: {
  limit?: string | number;
  offset?: string | number;
}): {
  limit: number;
  offset: number;
} {
  let limit = typeof params.limit === 'string' ? parseInt(params.limit) : params.limit || 20;
  let offset = typeof params.offset === 'string' ? parseInt(params.offset) : params.offset || 0;

  // Enforce limits
  if (limit < 1) limit = 1;
  if (limit > 100) limit = 100;
  if (offset < 0) offset = 0;

  return { limit, offset };
}
