/**
 * Snapshot Analyzer for ResearchGPT™
 *
 * Synthesizes company fundamentals into a comprehensive snapshot:
 * - Company basics (name, founded, type, status)
 * - Industry and business model
 * - Employee count and growth
 * - Revenue estimates
 * - Technology stack
 * - Funding history
 * - Geographic presence
 *
 * Uses AI to enhance and normalize data from multiple sources.
 */

import type {
  CompanySnapshot,
  ConfidenceLevel,
} from '@/types/research-gpt';
import type { AggregatedResearchData } from '../data-sources/data-source-factory';

// ============================================================================
// SNAPSHOT ANALYZER
// ============================================================================

export class SnapshotAnalyzer {
  /**
   * Analyze and synthesize company snapshot from aggregated data
   */
  async analyze(aggregatedData: AggregatedResearchData): Promise<{
    snapshot: CompanySnapshot;
    confidence: ConfidenceLevel;
  }> {
    const startTime = Date.now();

    try {
      // Start with base snapshot from Companies House
      const baseSnapshot = aggregatedData.snapshot;

      // Enhance with additional data
      const snapshot: CompanySnapshot = {
        // Basic information (from Companies House)
        company_name: baseSnapshot.company_name || 'Unknown',
        company_number: baseSnapshot.company_number || null,
        founded_year: baseSnapshot.founded_year || null,
        company_type: baseSnapshot.company_type || null,
        company_status: baseSnapshot.company_status || null,

        // Location
        registered_address: baseSnapshot.registered_address || null,
        headquarters_location: this.extractHeadquarters(baseSnapshot),
        operating_locations: this.extractOperatingLocations(aggregatedData),

        // Industry classification
        industry: baseSnapshot.industry || this.inferIndustry(baseSnapshot, aggregatedData),
        sic_codes: baseSnapshot.sic_codes || [],
        business_model: this.inferBusinessModel(aggregatedData),

        // Company description
        description: baseSnapshot.description || this.generateDescription(aggregatedData),
        mission_statement: null, // Could be extracted from website
        value_proposition: null,

        // Size metrics
        employee_count: this.estimateEmployeeCount(aggregatedData),
        employee_growth_yoy: this.calculateEmployeeGrowth(aggregatedData),
        employee_growth_trend: null, // Would need historical data

        // Financial data
        revenue_estimate: this.estimateRevenue(aggregatedData),
        revenue_growth_yoy: null, // Would need historical data

        // Technology
        tech_stack: baseSnapshot.tech_stack || [],

        // Funding
        funding_rounds: baseSnapshot.funding_rounds || [],
        total_funding: this.calculateTotalFunding(baseSnapshot.funding_rounds),

        // Market presence
        target_market: this.identifyTargetMarket(aggregatedData),
        geographic_presence: this.identifyGeographicPresence(aggregatedData),

        // Metadata
        jurisdiction: baseSnapshot.jurisdiction || 'England & Wales',
        last_updated: new Date().toISOString(),
      };

      // Calculate confidence score
      const confidence = this.calculateConfidence(snapshot, aggregatedData);

      const duration = Date.now() - startTime;
      console.log(`[SnapshotAnalyzer] Completed in ${duration}ms with ${confidence} confidence`);

      return {
        snapshot,
        confidence,
      };
    } catch (error) {
      console.error('[SnapshotAnalyzer] Error:', error);
      throw error;
    }
  }

  // ============================================================================
  // ENHANCEMENT METHODS
  // ============================================================================

  /**
   * Extract headquarters from various sources
   */
  private extractHeadquarters(snapshot: Partial<CompanySnapshot>): string | null {
    if (snapshot.registered_address) {
      const addr = snapshot.registered_address;
      return `${addr.city || ''}, ${addr.country || 'United Kingdom'}`.trim();
    }
    return null;
  }

  /**
   * Extract operating locations from hiring data
   */
  private extractOperatingLocations(data: AggregatedResearchData): string[] {
    const locations = new Set<string>();

    // Extract from registered address
    if (data.snapshot.registered_address?.city) {
      locations.add(data.snapshot.registered_address.city);
    }

    // TODO: Could extract from job postings (location_name from Reed API)
    // For now, return primary location
    return Array.from(locations).slice(0, 5);
  }

  /**
   * Infer industry from multiple data points
   */
  private inferIndustry(
    snapshot: Partial<CompanySnapshot>,
    data: AggregatedResearchData
  ): string | null {
    // Prefer Companies House industry classification
    if (snapshot.industry) {
      return snapshot.industry;
    }

    // Fallback: analyze signals and sources
    const signals = data.buying_signals;
    const keywords = signals
      .map((s) => s.title.toLowerCase() + ' ' + (s.description || '').toLowerCase())
      .join(' ');

    if (keywords.includes('fintech') || keywords.includes('banking')) return 'Financial Technology';
    if (keywords.includes('software') || keywords.includes('saas')) return 'Software & SaaS';
    if (keywords.includes('retail') || keywords.includes('ecommerce')) return 'Retail & E-commerce';
    if (keywords.includes('healthcare') || keywords.includes('medical')) return 'Healthcare';
    if (keywords.includes('education') || keywords.includes('learning')) return 'Education';

    return null;
  }

  /**
   * Infer business model (B2B, B2C, B2B2C, Marketplace)
   */
  private inferBusinessModel(data: AggregatedResearchData): string | null {
    const description = (data.snapshot.description || '').toLowerCase();

    if (description.includes('enterprise') || description.includes('b2b')) return 'B2B';
    if (description.includes('consumer') || description.includes('b2c')) return 'B2C';
    if (description.includes('marketplace') || description.includes('platform')) return 'Marketplace';

    // Default based on company type
    if (data.snapshot.company_type?.includes('plc')) return 'B2C'; // Public companies often B2C
    if (data.snapshot.company_type?.includes('ltd')) return 'B2B'; // Private limited often B2B

    return null;
  }

  /**
   * Generate company description if not available
   */
  private generateDescription(data: AggregatedResearchData): string | null {
    // Use existing description if available
    if (data.snapshot.description) {
      return data.snapshot.description;
    }

    // Generate from available data
    const parts: string[] = [];

    if (data.snapshot.company_name) {
      parts.push(data.snapshot.company_name);
    }

    if (data.snapshot.industry) {
      parts.push(`operates in the ${data.snapshot.industry} industry`);
    }

    if (data.snapshot.company_type) {
      parts.push(`as a ${data.snapshot.company_type}`);
    }

    if (parts.length > 1) {
      return parts.join(' ') + '.';
    }

    return null;
  }

  /**
   * Estimate employee count from job postings
   */
  private estimateEmployeeCount(data: AggregatedResearchData): number | null {
    // Check if we have hiring data
    const hiringSignals = data.buying_signals.filter((s) => s.signal_type === 'hiring');

    if (hiringSignals.length === 0) {
      return null;
    }

    // Heuristic: 5-10 employees per open position
    const openPositions = hiringSignals.length;
    const estimatedEmployees = Math.round(openPositions * 7.5);

    // Cap at reasonable ranges
    if (estimatedEmployees < 10) return 10;
    if (estimatedEmployees > 10000) return 10000;

    return estimatedEmployees;
  }

  /**
   * Calculate employee growth (requires historical data)
   */
  private calculateEmployeeGrowth(data: AggregatedResearchData): number | null {
    // Would require historical job posting data
    // For now, return null
    return null;
  }

  /**
   * Estimate revenue based on company size and type
   */
  private estimateRevenue(data: AggregatedResearchData): {
    amount: number | null;
    currency: string;
    confidence: ConfidenceLevel;
  } | null {
    // Check for revenue signals
    const revenueSignals = data.revenue_signals;

    if (revenueSignals.length === 0) {
      return null;
    }

    // TODO: Could use Companies House accounts data
    // For now, return null (not enough data)
    return null;
  }

  /**
   * Calculate total funding from funding rounds
   */
  private calculateTotalFunding(
    fundingRounds?: Array<{ amount: number | null; currency: string }>
  ): { amount: number; currency: string } | null {
    if (!fundingRounds || fundingRounds.length === 0) {
      return null;
    }

    const total = fundingRounds.reduce((sum, round) => {
      return sum + (round.amount || 0);
    }, 0);

    if (total === 0) return null;

    return {
      amount: total,
      currency: fundingRounds[0].currency || 'GBP',
    };
  }

  /**
   * Identify target market from signals
   */
  private identifyTargetMarket(data: AggregatedResearchData): string[] {
    const markets = new Set<string>();

    const description = (data.snapshot.description || '').toLowerCase();
    const signals = data.buying_signals
      .map((s) => (s.description || '').toLowerCase())
      .join(' ');

    const content = description + ' ' + signals;

    if (content.includes('enterprise') || content.includes('business')) markets.add('Enterprise');
    if (content.includes('sme') || content.includes('small business')) markets.add('SMB');
    if (content.includes('consumer') || content.includes('retail')) markets.add('Consumer');
    if (content.includes('startup')) markets.add('Startups');
    if (content.includes('government') || content.includes('public sector')) markets.add('Government');

    return Array.from(markets);
  }

  /**
   * Identify geographic presence
   */
  private identifyGeographicPresence(data: AggregatedResearchData): string[] {
    const regions = new Set<string>();

    // Always include UK (Companies House data)
    regions.add('United Kingdom');

    // Extract from signals
    const signals = data.buying_signals
      .map((s) => s.title.toLowerCase() + ' ' + (s.description || '').toLowerCase())
      .join(' ');

    if (signals.includes('europe') || signals.includes('european')) regions.add('Europe');
    if (signals.includes('us') || signals.includes('america') || signals.includes('usa')) {
      regions.add('North America');
    }
    if (signals.includes('asia') || signals.includes('apac')) regions.add('Asia Pacific');
    if (signals.includes('global') || signals.includes('worldwide')) regions.add('Global');

    return Array.from(regions);
  }

  // ============================================================================
  // CONFIDENCE CALCULATION
  // ============================================================================

  /**
   * Calculate confidence score based on data completeness
   */
  private calculateConfidence(
    snapshot: CompanySnapshot,
    data: AggregatedResearchData
  ): ConfidenceLevel {
    let score = 0;
    let maxScore = 0;

    // Core fields (high weight)
    maxScore += 10;
    if (snapshot.company_name) score += 2;
    if (snapshot.company_number) score += 2;
    if (snapshot.founded_year) score += 1;
    if (snapshot.company_type) score += 1;
    if (snapshot.company_status) score += 1;
    if (snapshot.industry) score += 2;
    if (snapshot.description) score += 1;

    // Location data
    maxScore += 3;
    if (snapshot.registered_address) score += 2;
    if (snapshot.operating_locations && snapshot.operating_locations.length > 0) score += 1;

    // Size metrics
    maxScore += 3;
    if (snapshot.employee_count) score += 2;
    if (snapshot.revenue_estimate) score += 1;

    // Additional data
    maxScore += 4;
    if (snapshot.tech_stack && snapshot.tech_stack.length > 0) score += 1;
    if (snapshot.funding_rounds && snapshot.funding_rounds.length > 0) score += 1;
    if (snapshot.target_market && snapshot.target_market.length > 0) score += 1;
    if (data.sources.length >= 3) score += 1;

    const percentage = score / maxScore;

    if (percentage >= 0.8) return 'high';
    if (percentage >= 0.5) return 'medium';
    return 'low';
  }

  /**
   * Validate snapshot completeness
   */
  validateSnapshot(snapshot: CompanySnapshot): {
    isValid: boolean;
    missingFields: string[];
  } {
    const missingFields: string[] = [];

    if (!snapshot.company_name) missingFields.push('company_name');
    if (!snapshot.industry) missingFields.push('industry');
    if (!snapshot.description) missingFields.push('description');

    return {
      isValid: missingFields.length === 0,
      missingFields,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let instance: SnapshotAnalyzer | null = null;

export function getSnapshotAnalyzer(): SnapshotAnalyzer {
  if (!instance) {
    instance = new SnapshotAnalyzer();
  }
  return instance;
}

export default SnapshotAnalyzer;
