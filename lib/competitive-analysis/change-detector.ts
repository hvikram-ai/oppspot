/**
 * Change Detection Service
 *
 * Compares competitive analysis snapshots to detect significant changes:
 * - Moat score changes (±10 points = significant)
 * - Feature parity shifts (±15% = significant)
 * - Pricing changes (any change = significant)
 * - New competitors added
 * - Platform threat level changes
 *
 * Part of T014 Phase 3 implementation
 */

import type { DashboardData } from './types';

export type ChangeDetectionResult = {
  has_significant_changes: boolean;
  moat_changed: boolean;
  moat_change_details?: {
    old_score: number;
    new_score: number;
    change: number;
    direction: 'increased' | 'decreased';
  };
  parity_changed: boolean;
  parity_change_details?: {
    old_avg: number;
    new_avg: number;
    change: number;
    direction: 'increased' | 'decreased';
  };
  pricing_changed: boolean;
  pricing_change_details?: {
    changes_count: number;
    competitors_affected: string[];
  };
  competitors_changed: boolean;
  competitor_change_details?: {
    added: number;
    removed: number;
    new_competitors: string[];
  };
  platform_threat_changed: boolean;
  platform_threat_details?: {
    old_level: 'high' | 'medium' | 'low';
    new_level: 'high' | 'medium' | 'low';
  };
  summary: string[];
};

/**
 * Detect significant changes between two dashboard snapshots
 */
export function detectSignificantChanges(
  before: DashboardData,
  after: DashboardData
): ChangeDetectionResult {
  const changes: ChangeDetectionResult = {
    has_significant_changes: false,
    moat_changed: false,
    parity_changed: false,
    pricing_changed: false,
    competitors_changed: false,
    platform_threat_changed: false,
    summary: [],
  };

  // 1. Check moat score changes (±10 points = significant)
  if (before.moat_score && after.moat_score) {
    const oldMoat = before.moat_score.overall_moat_score;
    const newMoat = after.moat_score.overall_moat_score;
    const moatChange = newMoat - oldMoat;

    if (Math.abs(moatChange) >= 10) {
      changes.moat_changed = true;
      changes.has_significant_changes = true;
      changes.moat_change_details = {
        old_score: oldMoat,
        new_score: newMoat,
        change: moatChange,
        direction: moatChange > 0 ? 'increased' : 'decreased',
      };
      changes.summary.push(
        `Moat strength ${moatChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(moatChange).toFixed(1)} points (${oldMoat} → ${newMoat})`
      );
    }
  }

  // 2. Check feature parity changes (±15% = significant)
  const oldParity = calculateAverageParity(before);
  const newParity = calculateAverageParity(after);
  const parityChange = newParity - oldParity;

  if (Math.abs(parityChange) >= 15) {
    changes.parity_changed = true;
    changes.has_significant_changes = true;
    changes.parity_change_details = {
      old_avg: oldParity,
      new_avg: newParity,
      change: parityChange,
      direction: parityChange > 0 ? 'increased' : 'decreased',
    };
    changes.summary.push(
      `Average feature parity ${parityChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(parityChange).toFixed(1)}% (${oldParity.toFixed(1)}% → ${newParity.toFixed(1)}%)`
    );
  }

  // 3. Check pricing changes
  const pricingChanges = detectPricingChanges(before, after);
  if (pricingChanges.count > 0) {
    changes.pricing_changed = true;
    changes.has_significant_changes = true;
    changes.pricing_change_details = {
      changes_count: pricingChanges.count,
      competitors_affected: pricingChanges.competitors,
    };
    changes.summary.push(
      `Pricing updated for ${pricingChanges.count} competitor${pricingChanges.count > 1 ? 's' : ''}: ${pricingChanges.competitors.slice(0, 3).join(', ')}${pricingChanges.competitors.length > 3 ? '...' : ''}`
    );
  }

  // 4. Check competitor changes
  const competitorChanges = detectCompetitorChanges(before, after);
  if (competitorChanges.added > 0 || competitorChanges.removed > 0) {
    changes.competitors_changed = true;
    changes.has_significant_changes = true;
    changes.competitor_change_details = {
      added: competitorChanges.added,
      removed: competitorChanges.removed,
      new_competitors: competitorChanges.new_names,
    };

    if (competitorChanges.added > 0) {
      changes.summary.push(
        `${competitorChanges.added} new competitor${competitorChanges.added > 1 ? 's' : ''} added: ${competitorChanges.new_names.join(', ')}`
      );
    }
    if (competitorChanges.removed > 0) {
      changes.summary.push(
        `${competitorChanges.removed} competitor${competitorChanges.removed > 1 ? 's' : ''} removed`
      );
    }
  }

  // 5. Check platform threat level changes
  const oldThreat = calculatePlatformThreat(before);
  const newThreat = calculatePlatformThreat(after);

  if (oldThreat !== newThreat) {
    changes.platform_threat_changed = true;
    changes.has_significant_changes = true;
    changes.platform_threat_details = {
      old_level: oldThreat,
      new_level: newThreat,
    };
    changes.summary.push(
      `Platform threat level changed from ${oldThreat.toUpperCase()} to ${newThreat.toUpperCase()}`
    );
  }

  return changes;
}

/**
 * Calculate average feature parity across all competitors
 */
function calculateAverageParity(data: DashboardData): number {
  if (!data.competitors || data.competitors.length === 0) return 0;

  const parityScores = data.competitors
    .map(c => c.parity_score?.parity_score)
    .filter((s): s is number => s !== undefined && s !== null);

  if (parityScores.length === 0) return 0;

  return parityScores.reduce((sum, s) => sum + s, 0) / parityScores.length;
}

/**
 * Detect pricing changes between snapshots
 */
function detectPricingChanges(
  before: DashboardData,
  after: DashboardData
): { count: number; competitors: string[] } {
  const changes: string[] = [];

  if (!before.pricing_comparisons || !after.pricing_comparisons) {
    return { count: 0, competitors: [] };
  }

  // Create maps for quick lookup
  const beforePricing = new Map(
    before.pricing_comparisons.map(p => [
      p.competitor_company_id,
      p.representative_price
    ])
  );

  const afterPricing = new Map(
    after.pricing_comparisons.map(p => [
      p.competitor_company_id,
      p.representative_price
    ])
  );

  // Check for price changes
  for (const [competitorId, newPrice] of afterPricing.entries()) {
    const oldPrice = beforePricing.get(competitorId);

    if (oldPrice !== undefined && oldPrice !== newPrice) {
      // Find competitor name
      const competitor = after.competitors?.find(
        c => c.competitor_company_id === competitorId
      );
      if (competitor) {
        changes.push(competitor.competitor_name);
      }
    }
  }

  return { count: changes.length, competitors: changes };
}

/**
 * Detect competitor additions/removals
 */
function detectCompetitorChanges(
  before: DashboardData,
  after: DashboardData
): { added: number; removed: number; new_names: string[] } {
  const beforeIds = new Set(
    before.competitors?.map(c => c.competitor_company_id) || []
  );
  const afterIds = new Set(
    after.competitors?.map(c => c.competitor_company_id) || []
  );

  const added = [...afterIds].filter(id => !beforeIds.has(id));
  const removed = [...beforeIds].filter(id => !afterIds.has(id));

  const newNames = added
    .map(id => {
      const competitor = after.competitors?.find(
        c => c.competitor_company_id === id
      );
      return competitor?.competitor_name;
    })
    .filter((name): name is string => name !== undefined);

  return {
    added: added.length,
    removed: removed.length,
    new_names: newNames,
  };
}

/**
 * Calculate platform threat level
 */
function calculatePlatformThreat(
  data: DashboardData
): 'high' | 'medium' | 'low' {
  if (!data.moat_score) return 'medium';

  const PLATFORM_COMPETITORS = ['Miro', 'Microsoft Whiteboard', 'FigJam'];

  const moatScore = data.moat_score.overall_moat_score;
  const hasPlatformCompetitor = data.competitors?.some(c =>
    PLATFORM_COMPETITORS.includes(c.competitor_name)
  );

  if (moatScore < 50 && hasPlatformCompetitor) return 'high';
  if (moatScore < 70 && hasPlatformCompetitor) return 'medium';
  return 'low';
}
