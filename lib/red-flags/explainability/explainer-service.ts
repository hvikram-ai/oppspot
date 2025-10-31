/**
 * Explainer Service
 *
 * Generates human-readable explanations for red flags using:
 * - Pre-canned templates for rule-based detections (financial, operational)
 * - LLM-based generation for complex detections (legal, cyber, ESG)
 *
 * Explanations are cached in flag.meta.explainer with inputs_hash
 * to avoid regenerating for the same inputs.
 *
 * TTL: 6 hours for dynamic content, 7 days for static
 */

import { createHash } from 'crypto';
import {
  RedFlag,
  RedFlagEvidence,
  Explainer,
  FlagCategory,
} from '../types';
import { generateRemediation } from './remediation-generator';

/**
 * Cache TTL in milliseconds
 */
const CACHE_TTL = {
  static: 7 * 24 * 60 * 60 * 1000,  // 7 days for rule-based explanations
  dynamic: 6 * 60 * 60 * 1000,       // 6 hours for LLM-generated explanations
};

/**
 * Explainer Service for generating red flag explanations
 */
export class ExplainerService {
  /**
   * Generate or retrieve cached explanation for a red flag
   *
   * @param flag The red flag to explain
   * @param evidence Supporting evidence for the flag
   * @returns Explainer object with why, key_evidence, remediation, timeframe
   */
  async generateExplanation(
    flag: RedFlag,
    evidence: RedFlagEvidence[]
  ): Promise<Explainer> {
    // Check if we have a valid cached explainer
    const cached = this.getCachedExplainer(flag, evidence);
    if (cached) {
      return cached;
    }

    // Generate new explanation
    const explainer = await this.generateNewExplanation(flag, evidence);

    // Store in flag metadata for caching
    await this.cacheExplainer(flag, evidence, explainer);

    return explainer;
  }

  /**
   * Get cached explainer if valid
   */
  private getCachedExplainer(
    flag: RedFlag,
    evidence: RedFlagEvidence[]
  ): Explainer | null {
    const cached = flag.meta?.explainer;
    if (!cached) {
      return null;
    }

    // Check if inputs have changed
    const currentHash = this.generateInputsHash(flag, evidence);
    if (cached.inputs_hash !== currentHash) {
      return null;
    }

    // Check if cache is expired
    const cachedAt = new Date(cached.cached_at).getTime();
    const now = Date.now();
    const isRuleBased = this.isRuleBasedFlag(flag.category);
    const ttl = isRuleBased ? CACHE_TTL.static : CACHE_TTL.dynamic;

    if (now - cachedAt > ttl) {
      return null;
    }

    // Return cached explainer
    return {
      why: cached.why,
      key_evidence: cached.key_evidence,
      suggested_remediation: cached.suggested_remediation,
      timeframe: cached.timeframe,
    };
  }

  /**
   * Generate new explanation based on flag type
   */
  private async generateNewExplanation(
    flag: RedFlag,
    evidence: RedFlagEvidence[]
  ): Promise<Explainer> {
    const isRuleBased = this.isRuleBasedFlag(flag.category);

    if (isRuleBased) {
      return this.generateRuleBasedExplanation(flag, evidence);
    } else {
      return this.generateLLMBasedExplanation(flag, evidence);
    }
  }

  /**
   * Generate explanation for rule-based flags (financial, operational)
   * Uses pre-canned templates
   */
  private async generateRuleBasedExplanation(
    flag: RedFlag,
    evidence: RedFlagEvidence[]
  ): Promise<Explainer> {
    const why = this.getRuleBasedExplanation(flag);
    const keyEvidence = this.extractKeyEvidence(evidence);
    const remediation = await generateRemediation(flag);

    return {
      why,
      key_evidence: keyEvidence,
      suggested_remediation: remediation.plan,
      timeframe: remediation.timeframe,
    };
  }

  /**
   * Get pre-canned explanation for rule-based flags
   */
  private getRuleBasedExplanation(flag: RedFlag): string {
    const lowerTitle = flag.title.toLowerCase();
    const category = flag.category;

    if (category === 'financial') {
      if (lowerTitle.includes('revenue concentration') || lowerTitle.includes('customer concentration')) {
        return 'High customer concentration creates significant revenue risk. If a major customer is lost or reduces spend, it could materially impact financial performance. Investors and acquirers view this as a key risk factor that can affect valuation multiples.';
      }

      if (lowerTitle.includes('negative nrr') || lowerTitle.includes('net retention')) {
        return 'Negative Net Revenue Retention indicates customers are churning or reducing spend faster than existing customers are expanding. This signals product-market fit issues, customer satisfaction problems, or competitive threats. Sustainable growth requires NRR above 100%.';
      }

      if (lowerTitle.includes('ar aging') || lowerTitle.includes('receivable')) {
        return 'Aging accounts receivable indicates potential collection issues, customer financial distress, or disputes. This ties up working capital and may signal revenue recognition risks if customers cannot pay. Increasing AR aging can be an early warning of customer churn or financial trouble.';
      }

      if (lowerTitle.includes('dso') || lowerTitle.includes('days sales')) {
        return 'High Days Sales Outstanding indicates inefficient collections processes or customer payment issues. This increases working capital requirements and can mask revenue quality problems. Industry benchmarks typically target DSO under 45 days for SaaS businesses.';
      }

      if (lowerTitle.includes('burn rate')) {
        return 'High burn rate relative to cash reserves creates funding risk. If runway drops below 12 months, the business may face pressure to raise capital at unfavorable terms or make drastic cost cuts. This can impact growth plans and employee morale.';
      }
    }

    if (category === 'operational') {
      if (lowerTitle.includes('sla breach')) {
        return 'Recurring SLA breaches indicate capacity, quality, or process issues. This creates customer satisfaction problems, potential contract penalties, and churn risk. Persistent service issues can damage reputation and make customer expansion difficult.';
      }

      if (lowerTitle.includes('backlog')) {
        return 'Growing backlog indicates resource constraints, inefficient processes, or prioritization problems. This can delay time-to-value for customers, impact satisfaction scores, and create downstream operational bottlenecks. Chronic backlog can signal scalability challenges.';
      }

      if (lowerTitle.includes('supplier') || lowerTitle.includes('dependency')) {
        return 'Single-supplier dependency creates business continuity risk. If the supplier experiences disruption, raises prices significantly, or terminates the relationship, it could impact your operations. Due diligence buyers view this as a key risk requiring mitigation.';
      }
    }

    // Default explanation
    return flag.description || 'This flag indicates a potential risk area that requires review and remediation based on automated detection rules.';
  }

  /**
   * Generate explanation for LLM-based flags (legal, cyber, ESG)
   * Uses simple LLM prompt (not full ResearchGPT pipeline)
   */
  private async generateLLMBasedExplanation(
    flag: RedFlag,
    evidence: RedFlagEvidence[]
  ): Promise<Explainer> {
    // For now, use simplified explanations
    // In production, this would call OpenRouter API
    // TODO: Integrate with OpenRouter for LLM-generated explanations

    const why = this.getSimplifiedLLMExplanation(flag);
    const keyEvidence = this.extractKeyEvidence(evidence);
    const remediation = await generateRemediation(flag);

    return {
      why,
      key_evidence: keyEvidence,
      suggested_remediation: remediation.plan,
      timeframe: remediation.timeframe,
    };
  }

  /**
   * Simplified LLM explanation (template-based for now)
   */
  private getSimplifiedLLMExplanation(flag: RedFlag): string {
    const category = flag.category;

    if (category === 'legal') {
      return `This legal risk was identified through contract analysis. ${flag.description || 'The flagged clause or term could create legal or commercial exposure that should be reviewed with legal counsel.'}`;
    }

    if (category === 'cyber') {
      return `This cybersecurity risk was identified through policy review and incident analysis. ${flag.description || 'The identified gap or incident could create security vulnerabilities or compliance issues.'}`;
    }

    if (category === 'esg') {
      return `This ESG risk was identified through disclosure review and news monitoring. ${flag.description || 'The identified gap or negative sentiment could impact stakeholder perception and regulatory compliance.'}`;
    }

    return flag.description || 'This flag requires attention based on automated analysis.';
  }

  /**
   * Extract key evidence titles/summaries
   */
  private extractKeyEvidence(evidence: RedFlagEvidence[]): string[] {
    return evidence
      .sort((a, b) => (b.importance || 0) - (a.importance || 0))
      .slice(0, 5) // Top 5 pieces of evidence
      .map(e => e.title || e.preview || 'Evidence item')
      .filter(Boolean);
  }

  /**
   * Cache explainer in flag metadata
   * Note: This updates the flag object in-memory
   * The caller is responsible for persisting to database
   */
  private async cacheExplainer(
    flag: RedFlag,
    evidence: RedFlagEvidence[],
    explainer: Explainer
  ): Promise<void> {
    const inputsHash = this.generateInputsHash(flag, evidence);

    flag.meta = {
      ...flag.meta,
      explainer: {
        why: explainer.why,
        key_evidence: explainer.key_evidence,
        suggested_remediation: explainer.suggested_remediation,
        timeframe: explainer.timeframe,
        cached_at: new Date().toISOString(),
        model: this.isRuleBasedFlag(flag.category) ? 'rule-based' : 'llm-based',
        inputs_hash: inputsHash,
      },
    };
  }

  /**
   * Generate hash of inputs to detect when explanation needs regeneration
   */
  private generateInputsHash(flag: RedFlag, evidence: RedFlagEvidence[]): string {
    const inputs = {
      category: flag.category,
      title: flag.title,
      description: flag.description,
      severity: flag.severity,
      evidenceCount: evidence.length,
      evidenceTypes: evidence.map(e => e.evidence_type).sort(),
    };

    return createHash('sha256')
      .update(JSON.stringify(inputs))
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Check if flag is rule-based (uses templates) or LLM-based
   */
  private isRuleBasedFlag(category: FlagCategory): boolean {
    return category === 'financial' || category === 'operational';
  }
}

/**
 * Singleton instance
 */
let explainerServiceInstance: ExplainerService | null = null;

/**
 * Get explainer service instance
 */
export function getExplainerService(): ExplainerService {
  if (!explainerServiceInstance) {
    explainerServiceInstance = new ExplainerService();
  }
  return explainerServiceInstance;
}
