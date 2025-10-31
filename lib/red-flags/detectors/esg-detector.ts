/**
 * ESG (Environmental, Social, Governance) Detector
 *
 * Detects ESG red flags using:
 * - Disclosure gap analysis (missing metrics)
 * - News sentiment monitoring (negative coverage)
 * - LLM-assisted thematic analysis
 *
 * Data sources: Supabase documents (ESG reports), research_sources (news)
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
 * Material ESG topics that should be disclosed
 */
const MATERIAL_ESG_TOPICS = {
  environmental: [
    'GHG Emissions (Scope 1, 2, 3)',
    'Energy Consumption',
    'Water Usage',
    'Waste Management',
    'Climate Risk Assessment',
  ],
  social: [
    'Employee Diversity & Inclusion',
    'Health & Safety Incidents',
    'Labor Practices',
    'Community Engagement',
    'Human Rights',
  ],
  governance: [
    'Board Composition',
    'Executive Compensation',
    'Business Ethics & Compliance',
    'Data Privacy & Security',
    'Stakeholder Engagement',
  ],
};

/**
 * ESG Red Flag Detector
 */
export class ESGDetector extends BaseDetector {
  readonly name = 'esg';
  readonly category = 'esg' as const;
  readonly version = '1.0.0';

  private llmClient: OpenRouterClient;

  constructor() {
    super();
    const apiKey = process.env.OPENROUTER_API_KEY || '';
    this.llmClient = new OpenRouterClient(apiKey);
  }

  /**
   * Run ESG detection
   */
  async detect(options: DetectorOptions): Promise<DetectorResult> {
    return this.safeExecute(async () => {
      const flags: Partial<RedFlag>[] = [];

      // Run detection methods in parallel
      const [disclosureGaps, newsFlags] = await Promise.allSettled([
        this.detectDisclosureGaps(options),
        this.detectNegativeNewsSentiment(options),
      ]);

      // Collect flags from successful checks
      if (disclosureGaps.status === 'fulfilled') {
        flags.push(...disclosureGaps.value);
      }
      if (newsFlags.status === 'fulfilled' && newsFlags.value) {
        flags.push(newsFlags.value);
      }

      return flags;
    });
  }

  /**
   * Detect ESG disclosure gaps
   */
  private async detectDisclosureGaps(
    options: DetectorOptions
  ): Promise<Partial<RedFlag>[]> {
    const flags: Partial<RedFlag>[] = [];

    // Get ESG disclosure documents
    const esgDocs = await this.getESGDocuments();

    if (esgDocs.length === 0) {
      // No ESG disclosures found - flag this
      return [this.createNoDisclosuresFlag(options)];
    }

    // Analyze documents for topic coverage
    const combinedContent = esgDocs
      .map(d => d.content)
      .join('\n\n')
      .substring(0, 8000); // Limit for LLM

    try {
      const gaps = await this.analyzeESGGaps(combinedContent);

      for (const gap of gaps) {
        const flag = this.createDisclosureGapFlag(gap, options);
        flags.push(flag);
      }
    } catch (error) {
      console.error('[ESGDetector] Disclosure analysis error:', error);
    }

    return flags;
  }

  /**
   * Get ESG disclosure documents
   */
  private async getESGDocuments(): Promise<Array<{ id: string; file_name: string; content: string }>> {
    const supabase = await createClient();

    const { data: documents, error } = await supabase
      .from('documents')
      .select('id, file_name, document_type, ai_classification, extracted_text')
      .or(`document_type.eq.esg_report,document_type.eq.sustainability_report,ai_classification->>document_type.eq.esg_report`)
      .limit(5);

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
   * Analyze ESG disclosure gaps using LLM
   */
  private async analyzeESGGaps(content: string): Promise<Array<{ topic: string; pillar: string; severity: FlagSeverity }>> {
    const prompt = `You are an ESG analyst. Review the following ESG disclosure documents and identify material topic gaps.

MATERIAL ESG TOPICS TO ASSESS:

Environmental:
${MATERIAL_ESG_TOPICS.environmental.map(t => `- ${t}`).join('\n')}

Social:
${MATERIAL_ESG_TOPICS.social.map(t => `- ${t}`).join('\n')}

Governance:
${MATERIAL_ESG_TOPICS.governance.map(t => `- ${t}`).join('\n')}

DISCLOSURE DOCUMENTS:
${content}

TASK: Identify which material topics are missing or inadequately disclosed. Return JSON array with format:
[
  {
    "topic": "GHG Emissions (Scope 1, 2, 3)",
    "pillar": "environmental",
    "severity": "high"
  }
]

Severity guidelines:
- "high": Core material topics missing (GHG emissions, board composition, diversity)
- "medium": Important topics missing (water, health & safety)
- "low": Supporting topics missing or partially covered

If all material topics adequately covered, return empty array: []`;

    try {
      const response = await this.llmClient.complete(prompt, {
        model: 'anthropic/claude-3.5-sonnet',
        temperature: 0.3,
        max_tokens: 1500,
        system_prompt: 'You are an ESG analyst evaluating corporate disclosures against GRI, SASB, and TCFD frameworks.',
      });

      const parsed = JSON.parse(response);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('[ESGDetector] LLM ESG analysis error:', error);
      return [];
    }
  }

  /**
   * Create flag for disclosure gap
   */
  private createDisclosureGapFlag(
    gap: { topic: string; pillar: string; severity: FlagSeverity },
    options: DetectorOptions
  ): Partial<RedFlag> {
    const flag: Partial<RedFlag> = {
      entity_type: options.entityType,
      entity_id: options.entityId,
      category: 'esg',
      title: `ESG Disclosure Gap: ${gap.topic}`,
      description: `Material ESG topic "${gap.topic}" not adequately disclosed. This gap may impact stakeholder perception and regulatory compliance.`,
      severity: gap.severity,
      confidence: 0.75, // LLM-based detection has moderate confidence
      status: 'open',
      first_detected_at: new Date().toISOString(),
      last_updated_at: new Date().toISOString(),
      meta: {
        detector_metadata: {
          disclosure_topic: gap.topic,
          esg_pillar: gap.pillar,
          gap_type: 'disclosure_missing',
          framework: 'GRI/SASB',
        },
      },
    };

    flag.fingerprint = this.generateFingerprint(flag);
    return flag;
  }

  /**
   * Create flag for no disclosures found
   */
  private createNoDisclosuresFlag(options: DetectorOptions): Partial<RedFlag> {
    const flag: Partial<RedFlag> = {
      entity_type: options.entityType,
      entity_id: options.entityId,
      category: 'esg',
      title: 'No ESG Disclosures Found',
      description: 'No ESG or sustainability reports found. Lack of ESG disclosure creates reputational risk and may impact investor/stakeholder confidence.',
      severity: 'high',
      confidence: 1.0,
      status: 'open',
      first_detected_at: new Date().toISOString(),
      last_updated_at: new Date().toISOString(),
      meta: {
        detector_metadata: {
          gap_type: 'no_disclosures',
          expected_topics: Object.values(MATERIAL_ESG_TOPICS).flat(),
        },
      },
    };

    flag.fingerprint = this.generateFingerprint(flag);
    return flag;
  }

  /**
   * Detect negative news sentiment on ESG topics
   */
  private async detectNegativeNewsSentiment(
    options: DetectorOptions
  ): Promise<Partial<RedFlag> | null> {
    const supabase = await createClient();

    // Query news from research_sources
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: newsItems, error } = await supabase
      .from('research_sources')
      .select('id, title, content_preview, url, published_at, metadata')
      .eq('source_type', 'news')
      .gte('published_at', sixMonthsAgo.toISOString())
      .limit(20);

    if (error || !newsItems || newsItems.length === 0) {
      return null;
    }

    // Filter for ESG-related negative news keywords
    const esgNegativeKeywords = [
      'controversy',
      'scandal',
      'violation',
      'breach',
      'lawsuit',
      'discrimination',
      'environmental damage',
      'pollution',
      'fine',
      'penalty',
      'investigation',
    ];

    const negativeNews = newsItems.filter(item => {
      const text = `${item.title} ${item.content_preview}`.toLowerCase();
      return esgNegativeKeywords.some(keyword => text.includes(keyword));
    });

    if (negativeNews.length < 2) {
      return null; // Not significant enough to flag
    }

    // Determine severity based on volume and recency
    let severity: FlagSeverity = 'medium';
    if (negativeNews.length >= 5) {
      severity = 'high';
    }

    const flag: Partial<RedFlag> = {
      entity_type: options.entityType,
      entity_id: options.entityId,
      category: 'esg',
      title: 'Negative ESG News Coverage',
      description: `${negativeNews.length} negative news articles on ESG-related topics in past 6 months. Themes: ${this.extractNewsThemes(negativeNews).join(', ')}. May impact reputation and stakeholder trust.`,
      severity,
      confidence: 0.80,
      status: 'open',
      first_detected_at: new Date().toISOString(),
      last_updated_at: new Date().toISOString(),
      meta: {
        detector_metadata: {
          news_count: negativeNews.length,
          period_months: 6,
          themes: this.extractNewsThemes(negativeNews),
          most_recent: negativeNews[0]?.published_at,
        },
      },
    };

    flag.fingerprint = this.generateFingerprint(flag);
    return flag;
  }

  /**
   * Extract common themes from news items
   */
  private extractNewsThemes(newsItems: Array<{ title: string; content_preview: string }>): string[] {
    const themeKeywords = {
      environmental: ['environment', 'pollution', 'emissions', 'climate', 'waste'],
      labor: ['labor', 'workers', 'employment', 'discrimination', 'harassment'],
      governance: ['governance', 'board', 'executive', 'ethics', 'compliance'],
      safety: ['safety', 'accident', 'injury', 'health'],
      regulatory: ['fine', 'penalty', 'violation', 'investigation', 'lawsuit'],
    };

    const themes = new Set<string>();

    for (const item of newsItems) {
      const text = `${item.title} ${item.content_preview}`.toLowerCase();

      for (const [theme, keywords] of Object.entries(themeKeywords)) {
        if (keywords.some(keyword => text.includes(keyword))) {
          themes.add(theme);
        }
      }
    }

    return Array.from(themes);
  }
}

/**
 * Singleton instance
 */
let esgDetectorInstance: ESGDetector | null = null;

/**
 * Get ESG detector instance
 */
export function getESGDetector(): ESGDetector {
  if (!esgDetectorInstance) {
    esgDetectorInstance = new ESGDetector();
  }
  return esgDetectorInstance;
}
