/**
 * PII Scrubber Utility
 *
 * Removes personally identifiable information (PII) from evidence previews
 * to comply with data privacy requirements (FR-012).
 *
 * Scrubs:
 * - Email addresses
 * - Phone numbers (various formats)
 * - Credit card numbers
 * - Social security numbers / National Insurance numbers
 *
 * Also truncates text to maximum length to prevent storing large text blocks.
 */

/**
 * Maximum length for evidence preview text (200 characters)
 */
const MAX_PREVIEW_LENGTH = 200;

/**
 * Regex patterns for PII detection
 */
const PII_PATTERNS = {
  // Email addresses: user@domain.com
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

  // Phone numbers: various formats
  // +44 20 1234 5678, (123) 456-7890, 123-456-7890, +1-123-456-7890
  phone: /(\+\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/g,

  // Credit card numbers: 16 digits with optional spaces/dashes
  creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,

  // UK National Insurance: AA 12 34 56 C
  ukNI: /\b[A-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-Z]\b/g,

  // US SSN: 123-45-6789
  usSSN: /\b\d{3}-\d{2}-\d{4}\b/g,
};

/**
 * Replacement tokens for scrubbed PII
 */
const REPLACEMENTS = {
  email: '[EMAIL]',
  phone: '[PHONE]',
  creditCard: '[CARD]',
  ukNI: '[NI]',
  usSSN: '[SSN]',
};

/**
 * Scrub PII from text
 *
 * Removes email addresses, phone numbers, and other sensitive data.
 * Truncates to maximum length while preserving word boundaries.
 *
 * @param text Input text that may contain PII
 * @returns Scrubbed text with PII removed and length limited
 */
export function scrubPII(text: string): string {
  if (!text) {
    return '';
  }

  let scrubbed = text;

  // Remove email addresses
  scrubbed = scrubbed.replace(PII_PATTERNS.email, REPLACEMENTS.email);

  // Remove phone numbers
  scrubbed = scrubbed.replace(PII_PATTERNS.phone, REPLACEMENTS.phone);

  // Remove credit card numbers
  scrubbed = scrubbed.replace(PII_PATTERNS.creditCard, REPLACEMENTS.creditCard);

  // Remove UK National Insurance numbers
  scrubbed = scrubbed.replace(PII_PATTERNS.ukNI, REPLACEMENTS.ukNI);

  // Remove US SSN
  scrubbed = scrubbed.replace(PII_PATTERNS.usSSN, REPLACEMENTS.usSSN);

  // Truncate to max length
  scrubbed = truncateText(scrubbed, MAX_PREVIEW_LENGTH);

  return scrubbed.trim();
}

/**
 * Truncate text to maximum length while preserving word boundaries
 *
 * @param text Input text
 * @param maxLength Maximum length (default: 200)
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number = MAX_PREVIEW_LENGTH): string {
  if (text.length <= maxLength) {
    return text;
  }

  // Find the last space before maxLength
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  // If there's a space, truncate at the space to preserve word boundaries
  if (lastSpace > 0) {
    return truncated.substring(0, lastSpace) + '...';
  }

  // Otherwise, just truncate at maxLength
  return truncated + '...';
}

/**
 * Check if text contains PII (for validation)
 *
 * @param text Text to check
 * @returns True if PII is detected
 */
export function containsPII(text: string): boolean {
  if (!text) {
    return false;
  }

  return (
    PII_PATTERNS.email.test(text) ||
    PII_PATTERNS.phone.test(text) ||
    PII_PATTERNS.creditCard.test(text) ||
    PII_PATTERNS.ukNI.test(text) ||
    PII_PATTERNS.usSSN.test(text)
  );
}

/**
 * Scrub PII from evidence preview specifically
 *
 * This is the main function used when storing evidence.
 * Ensures preview text:
 * - Has no PII
 * - Is truncated to 200 characters
 * - Preserves readability
 *
 * @param preview Evidence preview text
 * @returns Scrubbed and truncated preview
 */
export function scrubEvidencePreview(preview: string | null | undefined): string | null {
  if (!preview) {
    return null;
  }

  return scrubPII(preview);
}

/**
 * Batch scrub multiple text fields
 *
 * Useful for scrubbing multiple evidence items at once.
 *
 * @param texts Array of text strings
 * @returns Array of scrubbed text strings
 */
export function batchScrubPII(texts: (string | null)[]): (string | null)[] {
  return texts.map(text => text ? scrubPII(text) : null);
}
