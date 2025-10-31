/**
 * Cyber Security Detector
 *
 * Detects cyber security red flags using:
 * - LLM-assisted policy gap detection
 * - Historical security incident analysis
 * - Vulnerability tracking
 *
 * Uses OpenRouter API with Claude for policy review.
 * Data sources: Supabase documents (policies), alerts (incidents)
 */

import { BaseDetector } from './base-detector';
import { createClient } from '../../supabase/server';
import { OpenRouterClient } from '../../ai/openrouter';
import {
  RedFlag,
  DetectorResult,
  DetectorOptions,
  FlagSeverity,
} from '../types';

/**
 * Required security policies for compliance
 */
const REQUIRED_POLICIES = [
  'Incident Response Plan',
  'Data Classification Policy',
  'Access Control Policy',
  'Encryption Standards',
  'Vulnerability Management',
  'Security Awareness Training',
  'Business Continuity / Disaster Recovery',
  'Third-Party Risk Management',
];

/**
 * LLM response structure for policy gap detection
 */
interface PolicyGapDetection {
  flag: boolean;
  category: 'cyber';
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  title: string;
  evidence: string;
  explanation: string;
  missing_policy?: string;
}

/**
 * Cyber Security Red Flag Detector
 */
export class CyberDetector extends BaseDetector {
  readonly name = 'cyber';
  readonly category = 'cyber' as const;
  readonly version = '1.0.0';

  private llmClient: OpenRouterClient;

  constructor() {
    super();
    const apiKey = process.env.OPENROUTER_API_KEY || '';
    this.llmClient = new OpenRouterClient(apiKey);
  }

  /**
   * Run cyber security detection
   */
  async detect(options: DetectorOptions): Promise<DetectorResult> {
    return this.safeExecute(async () => {
      const flags: Partial<RedFlag>[] = [];

      // Run detection methods in parallel
      const [policyGaps, incidents] = await Promise.allSettled([
        this.detectPolicyGaps(options),
        this.detectSecurityIncidents(options),
      ]);

      // Collect flags from successful checks
      if (policyGaps.status === 'fulfilled') {
        flags.push(...policyGaps.value);
      }
      if (incidents.status === 'fulfilled' && incidents.value) {
        flags.push(incidents.value);
      }

      return flags;
    });
  }

  /**
   * Detect security policy gaps using LLM
   */
  private async detectPolicyGaps(
    options: DetectorOptions
  ): Promise<Partial<RedFlag>[]> {
    const flags: Partial<RedFlag>[] = [];

    // Get security policy documents
    const policies = await this.getSecurityPolicyDocuments();

    if (policies.length === 0) {
      // No policies found - critical gap
      return [this.createNoPoliciesFlag(options)];
    }

    console.log(`[CyberDetector] Analyzing ${policies.length} security policies`);

    // Combine all policy content
    const combinedContent = policies
      .map(p => `[${p.file_name}]\n${p.content}`)
      .join('\n\n');

    // Analyze for policy gaps
    try {
      const detections = await this.analyzePolicyGaps(combinedContent.substring(0, 8000)); // Limit for LLM

      for (const detection of detections) {
        const flag = this.createFlagFromPolicyGap(detection, options);
        flags.push(flag);
      }
    } catch (error) {
      console.error('[CyberDetector] Policy analysis error:', error);
    }

    return flags;
  }

  /**
   * Get security policy documents from database
   */
  private async getSecurityPolicyDocuments(): Promise<Array<{ id: string; file_name: string; content: string }>> {
    const supabase = await createClient();

    const { data: documents, error } = await supabase
      .from('documents')
      .select('id, file_name, document_type, ai_classification, extracted_text')
      .or(`document_type.eq.security_policy,ai_classification->>document_type.eq.security_policy`)
      .limit(10);

    if (error || !documents) {
      return [];
    }

    return documents
      .filter(doc => doc.extracted_text)
      .map(doc => ({
        id: doc.id,
        file_name: doc.file_name,
        content: doc.extracted_text || '',
      }));
  }

  /**
   * Analyze policy documents for gaps using LLM
   */
  private async analyzePolicyGaps(
    content: string
  ): Promise<PolicyGapDetection[]> {
    const prompt = this.buildPolicyGapPrompt(content);

    try {
      const response = await this.llmClient.complete(prompt, {
        model: 'anthropic/claude-3.5-sonnet',
        temperature: 0.3,
        max_tokens: 2000,
        system_prompt: 'You are a cybersecurity auditor reviewing security policies for compliance with industry standards (ISO 27001, SOC 2, NIST).',
      });

      const parsed = JSON.parse(response);
      const detections = Array.isArray(parsed) ? parsed : [parsed];

      return detections.filter((d: PolicyGapDetection) => d.flag);
    } catch (error) {
      console.error('[CyberDetector] LLM policy analysis error:', error);
      return [];
    }
  }

  /**
   * Build LLM prompt for policy gap detection
   */
  private buildPolicyGapPrompt(content: string): string {
    return `You are a cybersecurity auditor. Analyze the following policy documentation for gaps.

REQUIRED POLICIES:
${REQUIRED_POLICIES.map(p => `- ${p}`).join('\n')}

POLICY DOCUMENTS:
${content}

TASK: Identify which required policies are missing or inadequately covered. For each gap, return:
{
  "flag": true,
  "category": "cyber",
  "severity": "high" | "medium" | "low",
  "confidence": 0.0-1.0,
  "title": "Missing [Policy Name]",
  "evidence": "Relevant excerpt showing gap or 'No evidence found'",
  "explanation": "Why this gap matters and potential impact",
  "missing_policy": "Policy name from required list"
}

Severity guidelines:
- "critical": Core security policies missing (Incident Response, Access Control)
- "high": Important policies missing (Encryption, Vulnerability Management)
- "medium": Supporting policies missing (Training, Third-Party Risk)
- "low": Policy exists but incomplete

Confidence guidelines:
- High (0.8-1.0): Explicit evidence of gap
- Medium (0.5-0.8): Implied gap or partial coverage
- Low (0.0-0.5): Ambiguous or uncertain

Return JSON array of gaps found, or empty array [] if all policies adequately covered.`;
  }

  /**
   * Create flag for missing policy
   */
  private createFlagFromPolicyGap(
    detection: PolicyGapDetection,
    options: DetectorOptions
  ): Partial<RedFlag> {
    const flag: Partial<RedFlag> = {
      entity_type: options.entityType,
      entity_id: options.entityId,
      category: 'cyber',
      title: detection.title,
      description: detection.explanation,
      severity: detection.severity as FlagSeverity,
      confidence: detection.confidence,
      status: 'open',
      first_detected_at: new Date().toISOString(),
      last_updated_at: new Date().toISOString(),
      meta: {
        detector_metadata: {
          gap_type: 'policy_missing',
          missing_policy: detection.missing_policy,
          llm_model: 'anthropic/claude-3.5-sonnet',
        },
      },
    };

    flag.fingerprint = this.generateFingerprint(flag);
    return flag;
  }

  /**
   * Create flag when no policies found at all
   */
  private createNoPoliciesFlag(options: DetectorOptions): Partial<RedFlag> {
    const flag: Partial<RedFlag> = {
      entity_type: options.entityType,
      entity_id: options.entityId,
      category: 'cyber',
      title: 'No Security Policies Documented',
      description: 'No security policy documents found. This represents a critical gap in cybersecurity governance and compliance readiness.',
      severity: 'critical',
      confidence: 1.0,
      status: 'open',
      first_detected_at: new Date().toISOString(),
      last_updated_at: new Date().toISOString(),
      meta: {
        detector_metadata: {
          gap_type: 'no_policies_found',
          required_policies: REQUIRED_POLICIES,
        },
      },
    };

    flag.fingerprint = this.generateFingerprint(flag);
    return flag;
  }

  /**
   * Detect historical security incidents
   */
  private async detectSecurityIncidents(
    options: DetectorOptions
  ): Promise<Partial<RedFlag> | null> {
    const supabase = await createClient();

    // Query for security-related alerts in the past 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const { data: incidents, error } = await supabase
      .from('alerts')
      .select('id, title, severity, created_at, alert_type, description')
      .eq('alert_type', 'security')
      .gte('created_at', twelveMonthsAgo.toISOString())
      .order('created_at', { ascending: false });

    if (error || !incidents || incidents.length === 0) {
      return null; // No incidents (which is good!)
    }

    // Count incidents by severity
    const criticalIncidents = incidents.filter(i => i.severity === 'critical').length;
    const highIncidents = incidents.filter(i => i.severity === 'high').length;

    // Only flag if there are multiple incidents or critical ones
    if (criticalIncidents === 0 && highIncidents < 2) {
      return null;
    }

    // Determine flag severity
    let severity: FlagSeverity = 'medium';
    if (criticalIncidents >= 2) {
      severity = 'critical';
    } else if (criticalIncidents >= 1 || highIncidents >= 3) {
      severity = 'high';
    }

    const flag: Partial<RedFlag> = {
      entity_type: options.entityType,
      entity_id: options.entityId,
      category: 'cyber',
      title: 'Recurring Security Incidents',
      description: `${incidents.length} security incidents in past 12 months (${criticalIncidents} critical, ${highIncidents} high severity). Pattern suggests systemic security issues.`,
      severity,
      confidence: 1.0,
      status: 'open',
      first_detected_at: new Date().toISOString(),
      last_updated_at: new Date().toISOString(),
      meta: {
        detector_metadata: {
          incident_count: incidents.length,
          critical_count: criticalIncidents,
          high_count: highIncidents,
          most_recent: incidents[0].created_at,
        },
      },
    };

    flag.fingerprint = this.generateFingerprint(flag);
    return flag;
  }
}

/**
 * Singleton instance
 */
let cyberDetectorInstance: CyberDetector | null = null;

/**
 * Get cyber detector instance
 */
export function getCyberDetector(): CyberDetector {
  if (!cyberDetectorInstance) {
    cyberDetectorInstance = new CyberDetector();
  }
  return cyberDetectorInstance;
}
