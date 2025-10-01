/**
 * Decision Makers Analyzer for ResearchGPT™
 *
 * GDPR-compliant analysis of key decision makers:
 * - Identifies C-level executives and directors
 * - Calculates influence scores
 * - Maps organizational structure
 * - ONLY includes business contact info from official sources
 * - Provides source attribution for all contact data
 *
 * GDPR Compliance:
 * - No personal email addresses (only business emails)
 * - All contact info must cite source
 * - Data auto-deleted after 6 months
 */

import type {
  DecisionMaker,
  ConfidenceLevel,
} from '@/types/research-gpt';
import type { AggregatedResearchData } from '../data-sources/data-source-factory';

// ============================================================================
// TYPES
// ============================================================================

export interface AnalyzedDecisionMakers {
  c_level: DecisionMaker[];
  vp_level: DecisionMaker[];
  director_level: DecisionMaker[];
  all_decision_makers: DecisionMaker[];
  org_chart: {
    by_department: Record<string, DecisionMaker[]>;
    by_seniority: Record<string, number>;
  };
  summary: {
    total_identified: number;
    with_contact_info: number;
    avg_influence_score: number;
  };
}

// ============================================================================
// DECISION MAKERS ANALYZER
// ============================================================================

export class DecisionMakerAnalyzer {
  /**
   * Analyze decision makers with GDPR compliance
   */
  async analyze(aggregatedData: AggregatedResearchData): Promise<{
    decision_makers: AnalyzedDecisionMakers;
    confidence: ConfidenceLevel;
  }> {
    const startTime = Date.now();

    try {
      const rawDecisionMakers = aggregatedData.decision_makers;

      console.log(`[DecisionMakerAnalyzer] Analyzing ${rawDecisionMakers.length} decision makers...`);

      // GDPR Filter: Remove any personal email addresses
      const gdprCompliant = this.enforceGDPRCompliance(rawDecisionMakers);

      // Enhance decision makers with additional analysis
      const enhanced = this.enhanceDecisionMakers(gdprCompliant);

      // Categorize by seniority
      const c_level = enhanced.filter((dm) => dm.seniority_level === 'c-level');
      const vp_level = enhanced.filter((dm) => dm.seniority_level === 'vp');
      const director_level = enhanced.filter((dm) => dm.seniority_level === 'director');

      // Build org chart
      const org_chart = this.buildOrgChart(enhanced);

      // Calculate summary
      const summary = this.calculateSummary(enhanced);

      // Sort by influence score
      const sorted = enhanced.sort((a, b) => (b.influence_score || 0) - (a.influence_score || 0));

      const decision_makers: AnalyzedDecisionMakers = {
        c_level: c_level.slice(0, 10),
        vp_level: vp_level.slice(0, 10),
        director_level: director_level.slice(0, 10),
        all_decision_makers: sorted.slice(0, 20), // Top 20 by influence
        org_chart,
        summary,
      };

      // Calculate confidence
      const confidence = this.calculateConfidence(decision_makers, aggregatedData);

      const duration = Date.now() - startTime;
      console.log(`[DecisionMakerAnalyzer] Completed in ${duration}ms with ${confidence} confidence`);
      console.log(`[DecisionMakerAnalyzer] Found: ${c_level.length} C-level, ${vp_level.length} VPs, ${director_level.length} Directors`);

      return {
        decision_makers,
        confidence,
      };
    } catch (error) {
      console.error('[DecisionMakerAnalyzer] Error:', error);
      throw error;
    }
  }

  // ============================================================================
  // GDPR COMPLIANCE
  // ============================================================================

  /**
   * Enforce GDPR compliance - remove personal email addresses
   */
  private enforceGDPRCompliance(decisionMakers: DecisionMaker[]): DecisionMaker[] {
    return decisionMakers.map((dm) => {
      // Check if email is personal (not allowed per GDPR)
      if (dm.business_email && this.isPersonalEmail(dm.business_email)) {
        console.warn(`[GDPR] Removing personal email for ${dm.name}: ${dm.business_email}`);
        return {
          ...dm,
          business_email: null, // Remove personal email
        };
      }

      // Ensure contact source is present if contact info exists
      if ((dm.business_email || dm.phone_number) && !dm.contact_source) {
        console.warn(`[GDPR] Missing contact source for ${dm.name}, removing contact info`);
        return {
          ...dm,
          business_email: null,
          phone_number: null,
        };
      }

      return dm;
    });
  }

  /**
   * Check if email is personal (not business)
   */
  private isPersonalEmail(email: string): boolean {
    const personalDomains = [
      'gmail.com',
      'yahoo.com',
      'hotmail.com',
      'outlook.com',
      'icloud.com',
      'aol.com',
      'live.com',
      'msn.com',
      'mail.com',
      'protonmail.com',
    ];

    const domain = email.split('@')[1]?.toLowerCase();
    return personalDomains.includes(domain);
  }

  // ============================================================================
  // ENHANCEMENT METHODS
  // ============================================================================

  /**
   * Enhance decision makers with additional analysis
   */
  private enhanceDecisionMakers(decisionMakers: DecisionMaker[]): DecisionMaker[] {
    return decisionMakers.map((dm) => ({
      ...dm,
      influence_score: dm.influence_score || this.calculateInfluenceScore(dm),
      decision_authority: this.estimateDecisionAuthority(dm),
      budget_authority: this.estimateBudgetAuthority(dm),
      priority_level: this.calculatePriorityLevel(dm),
    }));
  }

  /**
   * Calculate influence score (0-1)
   */
  private calculateInfluenceScore(dm: DecisionMaker): number {
    let score = 0.5; // Base score

    // Seniority level
    switch (dm.seniority_level) {
      case 'c-level':
        score = 1.0;
        break;
      case 'vp':
        score = 0.8;
        break;
      case 'director':
        score = 0.7;
        break;
      case 'manager':
        score = 0.5;
        break;
      default:
        score = 0.3;
    }

    // Boost for specific roles
    const title = (dm.job_title || '').toLowerCase();
    if (title.includes('ceo') || title.includes('founder')) score = 1.0;
    if (title.includes('president')) score = Math.max(score, 0.95);
    if (title.includes('cfo')) score = Math.max(score, 0.9);
    if (title.includes('cto') || title.includes('chief')) score = Math.max(score, 0.85);

    // Boost if we have contact info (more valuable)
    if (dm.business_email) score += 0.05;
    if (dm.linkedin_url) score += 0.03;

    return Math.min(score, 1.0);
  }

  /**
   * Estimate decision authority (what can they approve)
   */
  private estimateDecisionAuthority(dm: DecisionMaker): 'final' | 'recommender' | 'influencer' | 'user' {
    const score = dm.influence_score || this.calculateInfluenceScore(dm);

    if (score >= 0.9) return 'final'; // Can make final decisions
    if (score >= 0.7) return 'recommender'; // Strong recommendation power
    if (score >= 0.5) return 'influencer'; // Influences decisions
    return 'user'; // End user/implementer
  }

  /**
   * Estimate budget authority
   */
  private estimateBudgetAuthority(dm: DecisionMaker): 'unlimited' | 'high' | 'medium' | 'low' {
    const title = (dm.job_title || '').toLowerCase();

    if (title.includes('ceo') || title.includes('cfo')) return 'unlimited';
    if (title.includes('cto') || title.includes('coo')) return 'high';
    if (dm.seniority_level === 'c-level') return 'high';
    if (dm.seniority_level === 'vp') return 'medium';
    if (dm.seniority_level === 'director') return 'medium';
    return 'low';
  }

  /**
   * Calculate priority level for outreach
   */
  private calculatePriorityLevel(dm: DecisionMaker): 'p0' | 'p1' | 'p2' | 'p3' {
    const score = dm.influence_score || this.calculateInfluenceScore(dm);
    const hasContact = !!dm.business_email || !!dm.linkedin_url;

    // P0: C-level with contact info
    if (score >= 0.9 && hasContact) return 'p0';

    // P1: C-level without contact, or VPs with contact
    if (score >= 0.9 || (score >= 0.7 && hasContact)) return 'p1';

    // P2: Directors with contact, or VPs without
    if ((score >= 0.6 && hasContact) || score >= 0.7) return 'p2';

    // P3: Everyone else
    return 'p3';
  }

  // ============================================================================
  // ORG CHART BUILDING
  // ============================================================================

  /**
   * Build organizational chart
   */
  private buildOrgChart(decisionMakers: DecisionMaker[]): {
    by_department: Record<string, DecisionMaker[]>;
    by_seniority: Record<string, number>;
  } {
    const by_department: Record<string, DecisionMaker[]> = {};
    const by_seniority: Record<string, number> = {};

    for (const dm of decisionMakers) {
      // Group by department
      const dept = dm.department || 'Unknown';
      if (!by_department[dept]) {
        by_department[dept] = [];
      }
      by_department[dept].push(dm);

      // Count by seniority
      const seniority = dm.seniority_level || 'unknown';
      by_seniority[seniority] = (by_seniority[seniority] || 0) + 1;
    }

    // Sort department members by influence
    for (const dept in by_department) {
      by_department[dept].sort((a, b) => (b.influence_score || 0) - (a.influence_score || 0));
    }

    return {
      by_department,
      by_seniority,
    };
  }

  // ============================================================================
  // SUMMARY CALCULATION
  // ============================================================================

  /**
   * Calculate summary metrics
   */
  private calculateSummary(decisionMakers: DecisionMaker[]): {
    total_identified: number;
    with_contact_info: number;
    avg_influence_score: number;
  } {
    const total_identified = decisionMakers.length;

    const with_contact_info = decisionMakers.filter(
      (dm) => dm.business_email || dm.phone_number || dm.linkedin_url
    ).length;

    const influenceScores = decisionMakers.map(
      (dm) => dm.influence_score || this.calculateInfluenceScore(dm)
    );

    const avg_influence_score =
      influenceScores.length > 0
        ? influenceScores.reduce((sum, score) => sum + score, 0) / influenceScores.length
        : 0;

    return {
      total_identified,
      with_contact_info,
      avg_influence_score,
    };
  }

  // ============================================================================
  // CONFIDENCE CALCULATION
  // ============================================================================

  /**
   * Calculate confidence in decision maker data
   */
  private calculateConfidence(
    decisionMakers: AnalyzedDecisionMakers,
    data: AggregatedResearchData
  ): ConfidenceLevel {
    let score = 0;
    let maxScore = 10;

    // Number of decision makers found
    if (decisionMakers.all_decision_makers.length >= 10) score += 3;
    else if (decisionMakers.all_decision_makers.length >= 5) score += 2;
    else if (decisionMakers.all_decision_makers.length >= 2) score += 1;

    // C-level representation
    if (decisionMakers.c_level.length >= 3) score += 2;
    else if (decisionMakers.c_level.length >= 1) score += 1;

    // Contact info availability
    const contactPercentage = decisionMakers.summary.total_identified > 0
      ? decisionMakers.summary.with_contact_info / decisionMakers.summary.total_identified
      : 0;

    if (contactPercentage >= 0.5) score += 2;
    else if (contactPercentage >= 0.3) score += 1;

    // Source diversity
    if (data.metadata.sources_fetched.includes('Companies House')) score += 1;
    if (data.metadata.sources_fetched.includes('Company Website')) score += 1;

    // Department coverage
    const deptCount = Object.keys(decisionMakers.org_chart.by_department).length;
    if (deptCount >= 5) score += 1;

    const percentage = score / maxScore;

    if (percentage >= 0.7) return 'high';
    if (percentage >= 0.4) return 'medium';
    return 'low';
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get decision makers by department
   */
  getByDepartment(decisionMakers: DecisionMaker[], department: string): DecisionMaker[] {
    return decisionMakers.filter((dm) => dm.department === department);
  }

  /**
   * Get decision makers with contact info
   */
  getContactable(decisionMakers: DecisionMaker[]): DecisionMaker[] {
    return decisionMakers.filter(
      (dm) => dm.business_email || dm.phone_number || dm.linkedin_url
    );
  }

  /**
   * Get top N decision makers by influence
   */
  getTopInfluencers(decisionMakers: DecisionMaker[], n: number): DecisionMaker[] {
    return decisionMakers
      .sort((a, b) => (b.influence_score || 0) - (a.influence_score || 0))
      .slice(0, n);
  }

  /**
   * Generate outreach priority list
   */
  getOutreachPriority(decisionMakers: DecisionMaker[]): DecisionMaker[] {
    return decisionMakers
      .filter((dm) => dm.priority_level === 'p0' || dm.priority_level === 'p1')
      .sort((a, b) => {
        // Sort by priority first, then influence
        if (a.priority_level !== b.priority_level) {
          return a.priority_level!.localeCompare(b.priority_level!);
        }
        return (b.influence_score || 0) - (a.influence_score || 0);
      });
  }

  /**
   * Validate GDPR compliance
   */
  validateGDPRCompliance(decisionMakers: DecisionMaker[]): {
    isCompliant: boolean;
    violations: string[];
  } {
    const violations: string[] = [];

    for (const dm of decisionMakers) {
      // Check for personal emails
      if (dm.business_email && this.isPersonalEmail(dm.business_email)) {
        violations.push(`Personal email found for ${dm.name}: ${dm.business_email}`);
      }

      // Check for missing source attribution
      if ((dm.business_email || dm.phone_number) && !dm.contact_source) {
        violations.push(`Missing contact source for ${dm.name}`);
      }
    }

    return {
      isCompliant: violations.length === 0,
      violations,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let instance: DecisionMakerAnalyzer | null = null;

export function getDecisionMakerAnalyzer(): DecisionMakerAnalyzer {
  if (!instance) {
    instance = new DecisionMakerAnalyzer();
  }
  return instance;
}

export default DecisionMakerAnalyzer;
