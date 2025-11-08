/**
 * Field Normalizer - Normalizes extracted values to consistent formats
 *
 * Handles:
 * - Currency conversion and formatting
 * - Date parsing and ISO8601 conversion
 * - Duration normalization (days, weeks, months, years)
 * - Enum validation and case normalization
 * - Number precision and range validation
 * - Boolean parsing
 */

import type {
  FieldType,
  FieldNormalizer as NormalizerConfig,
  NormalizerResult,
} from '../types';

/**
 * Main field normalizer class
 */
export class FieldNormalizer {
  /**
   * Normalize a value based on field type and normalizer config
   */
  normalize(
    value: unknown,
    fieldType: FieldType,
    config?: NormalizerConfig | null
  ): NormalizerResult {
    if (value === null || value === undefined) {
      return { value: null, normalized: false };
    }

    try {
      switch (fieldType) {
        case 'string':
          return this.normalizeString(value, config);
        case 'number':
          return this.normalizeNumber(value, config);
        case 'boolean':
          return this.normalizeBoolean(value);
        case 'date':
          return this.normalizeDate(value, config);
        case 'enum':
          return this.normalizeEnum(value, config);
        case 'currency':
          return this.normalizeCurrency(value, config);
        case 'duration':
          return this.normalizeDuration(value, config);
        case 'richtext':
          return this.normalizeRichText(value);
        case 'json':
          return this.normalizeJSON(value);
        default:
          return {
            value,
            normalized: false,
            error: `Unknown field type: ${fieldType}`,
          };
      }
    } catch (error) {
      return {
        value: null,
        normalized: false,
        error: error instanceof Error ? error.message : 'Normalization failed',
      };
    }
  }

  /**
   * Normalize string value
   */
  private normalizeString(value: unknown, config?: NormalizerConfig | null): NormalizerResult {
    const str = String(value).trim();

    // Check length constraints
    if (config?.minLength && str.length < config.minLength) {
      return {
        value: null,
        normalized: false,
        error: `String too short (min: ${config.minLength})`,
      };
    }

    if (config?.maxLength && str.length > config.maxLength) {
      return {
        value: str.substring(0, config.maxLength),
        normalized: true,
      };
    }

    // Check pattern if provided
    if (config?.pattern) {
      const regex = new RegExp(config.pattern);
      if (!regex.test(str)) {
        return {
          value: null,
          normalized: false,
          error: 'String does not match required pattern',
        };
      }
    }

    return { value: str, normalized: true };
  }

  /**
   * Normalize number value
   */
  private normalizeNumber(value: unknown, config?: NormalizerConfig | null): NormalizerResult {
    let num: number;

    if (typeof value === 'number') {
      num = value;
    } else if (typeof value === 'string') {
      // Remove common non-numeric characters
      const cleaned = value.replace(/[^0-9.-]/g, '');
      num = parseFloat(cleaned);
    } else {
      return { value: null, normalized: false, error: 'Cannot convert to number' };
    }

    if (isNaN(num)) {
      return { value: null, normalized: false, error: 'Invalid number' };
    }

    // Check range
    if (config?.min !== undefined && num < config.min) {
      return {
        value: null,
        normalized: false,
        error: `Number below minimum (min: ${config.min})`,
      };
    }

    if (config?.max !== undefined && num > config.max) {
      return {
        value: null,
        normalized: false,
        error: `Number above maximum (max: ${config.max})`,
      };
    }

    // Apply precision
    if (config?.precision !== undefined) {
      num = parseFloat(num.toFixed(config.precision));
    }

    return { value: num, normalized: true };
  }

  /**
   * Normalize boolean value
   */
  private normalizeBoolean(value: unknown): NormalizerResult {
    if (typeof value === 'boolean') {
      return { value, normalized: true };
    }

    if (typeof value === 'string') {
      const lower = value.toLowerCase().trim();
      if (['true', 'yes', '1', 'y', 'on', 'enabled'].includes(lower)) {
        return { value: true, normalized: true };
      }
      if (['false', 'no', '0', 'n', 'off', 'disabled'].includes(lower)) {
        return { value: false, normalized: true };
      }
    }

    if (typeof value === 'number') {
      return { value: value !== 0, normalized: true };
    }

    return { value: null, normalized: false, error: 'Cannot convert to boolean' };
  }

  /**
   * Normalize date value to ISO8601 (YYYY-MM-DD)
   */
  private normalizeDate(value: unknown, config?: NormalizerConfig | null): NormalizerResult {
    let date: Date;

    if (value instanceof Date) {
      date = value;
    } else if (typeof value === 'string') {
      date = new Date(value);
    } else if (typeof value === 'number') {
      date = new Date(value);
    } else {
      return { value: null, normalized: false, error: 'Cannot convert to date' };
    }

    if (isNaN(date.getTime())) {
      return { value: null, normalized: false, error: 'Invalid date' };
    }

    // Return in requested format (default: ISO8601)
    const format = config?.format || 'ISO8601';
    if (format === 'ISO8601') {
      return { value: date.toISOString().split('T')[0], normalized: true };
    }

    // Add more format support as needed
    return { value: date.toISOString().split('T')[0], normalized: true };
  }

  /**
   * Normalize enum value
   */
  private normalizeEnum(value: unknown, config?: NormalizerConfig | null): NormalizerResult {
    if (!config?.values || config.values.length === 0) {
      return {
        value: null,
        normalized: false,
        error: 'No allowed values configured for enum',
      };
    }

    const str = String(value);
    const caseInsensitive = config.caseInsensitive ?? true;

    // Find matching enum value
    const match = config.values.find((enumValue) => {
      if (caseInsensitive) {
        return enumValue.toLowerCase() === str.toLowerCase();
      }
      return enumValue === str;
    });

    if (match) {
      return { value: match, normalized: true };
    }

    return {
      value: null,
      normalized: false,
      error: `Value not in allowed list: [${config.values.join(', ')}]`,
    };
  }

  /**
   * Normalize currency value
   */
  private normalizeCurrency(value: unknown, config?: NormalizerConfig | null): NormalizerResult {
    let num: number;

    if (typeof value === 'number') {
      num = value;
    } else if (typeof value === 'string') {
      // Remove currency symbols and formatting
      const cleaned = value.replace(/[$£€¥₹,\s]/g, '');
      num = parseFloat(cleaned);
    } else {
      return { value: null, normalized: false, error: 'Cannot convert to currency' };
    }

    if (isNaN(num)) {
      return { value: null, normalized: false, error: 'Invalid currency value' };
    }

    // Store as numeric value (without symbol)
    // Currency symbol/code stored in config for display
    return {
      value: parseFloat(num.toFixed(2)), // 2 decimal places for currency
      normalized: true,
    };
  }

  /**
   * Normalize duration value
   */
  private normalizeDuration(value: unknown, config?: NormalizerConfig | null): NormalizerResult {
    let num: number;
    let unit: string = config?.unit || 'days';

    if (typeof value === 'number') {
      num = value;
    } else if (typeof value === 'string') {
      // Parse duration strings like "30 days", "3 months", "1 year"
      const match = value.match(/(\d+(?:\.\d+)?)\s*(day|days|week|weeks|month|months|year|years)?/i);
      if (match) {
        num = parseFloat(match[1]);
        if (match[2]) {
          unit = match[2].toLowerCase().replace(/s$/, ''); // Remove plural 's'
          unit = unit + 's'; // Normalize to plural
        }
      } else {
        return { value: null, normalized: false, error: 'Cannot parse duration' };
      }
    } else {
      return { value: null, normalized: false, error: 'Cannot convert to duration' };
    }

    if (isNaN(num)) {
      return { value: null, normalized: false, error: 'Invalid duration value' };
    }

    // Convert to target unit if different
    const targetUnit = config?.unit;
    if (targetUnit && unit !== targetUnit) {
      num = this.convertDuration(num, unit as any, targetUnit);
    }

    return {
      value: {
        value: num,
        unit: targetUnit || unit,
      },
      normalized: true,
    };
  }

  /**
   * Convert duration between units
   */
  private convertDuration(
    value: number,
    fromUnit: 'days' | 'weeks' | 'months' | 'years',
    toUnit: 'days' | 'weeks' | 'months' | 'years'
  ): number {
    // Convert to days first
    let days: number;
    switch (fromUnit) {
      case 'days':
        days = value;
        break;
      case 'weeks':
        days = value * 7;
        break;
      case 'months':
        days = value * 30; // Approximate
        break;
      case 'years':
        days = value * 365; // Approximate
        break;
    }

    // Convert from days to target unit
    switch (toUnit) {
      case 'days':
        return days;
      case 'weeks':
        return days / 7;
      case 'months':
        return days / 30;
      case 'years':
        return days / 365;
    }
  }

  /**
   * Normalize rich text value
   */
  private normalizeRichText(value: unknown): NormalizerResult {
    // For now, just store as string
    // Future: Could add markdown validation/sanitization
    const str = String(value).trim();
    return { value: str, normalized: true };
  }

  /**
   * Normalize JSON value
   */
  private normalizeJSON(value: unknown): NormalizerResult {
    // If already an object/array, return as-is
    if (typeof value === 'object' && value !== null) {
      return { value, normalized: true };
    }

    // If string, try to parse JSON
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return { value: parsed, normalized: true };
      } catch (error) {
        return { value: null, normalized: false, error: 'Invalid JSON' };
      }
    }

    return { value: null, normalized: false, error: 'Cannot convert to JSON' };
  }
}

/**
 * Singleton instance
 */
let normalizerInstance: FieldNormalizer | null = null;

/**
 * Get or create normalizer instance
 */
export function getFieldNormalizer(): FieldNormalizer {
  if (!normalizerInstance) {
    normalizerInstance = new FieldNormalizer();
  }
  return normalizerInstance;
}
