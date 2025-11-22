/**
 * Client-side filter utilities
 * Pure functions that don't require server access
 */

import type { AdvancedFilters } from '@/types/filters';

/**
 * Count active filters in a filter object
 */
export function countActiveFilters(filters: AdvancedFilters): number {
  let count = 0;

  // Helper to count non-empty values in an object
  const countNonEmpty = (obj: Record<string, unknown> | undefined): number => {
    if (!obj) return 0;
    return Object.values(obj).filter(v => {
      if (Array.isArray(v)) return v.length > 0;
      if (typeof v === 'boolean') return true;
      if (typeof v === 'number') return true;
      if (typeof v === 'string') return v.length > 0;
      return v !== null && v !== undefined;
    }).length;
  };

  count += countNonEmpty(filters.keywords);
  count += countNonEmpty(filters.similarTargets);
  count += countNonEmpty(filters.firmographics);
  count += countNonEmpty(filters.size);
  count += countNonEmpty(filters.growth);
  count += countNonEmpty(filters.marketPresence);
  count += countNonEmpty(filters.funding);
  count += countNonEmpty(filters.workflow);
  count += countNonEmpty(filters.crm);
  count += countNonEmpty(filters.options);

  return count;
}
