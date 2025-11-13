/**
 * AI Data Normalizer
 * Uses Claude 3.5 Sonnet to normalize scraped data into structured format
 */

import { createLLMManager, type LLMManager } from '@/lib/llm/manager/LLMManager';
import type { NormalizedCompanyData, ScrapingResult, DataConfidence } from './types';

export class AIDataNormalizer {
  private llmManager: LLMManager | null = null;
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Initialize LLM manager (lazy initialization)
   */
  private async ensureLLMManager(): Promise<LLMManager> {
    if (!this.llmManager) {
      this.llmManager = await createLLMManager({
        userId: this.userId,
        enableFallback: true,
        enableCaching: true,
        enableUsageTracking: true,
      });
    }
    return this.llmManager;
  }

  /**
   * Normalize scraped data from multiple sources
   */
  async normalizeData(
    companyName: string,
    scrapedResults: ScrapingResult[]
  ): Promise<NormalizedCompanyData> {
    // Combine all successful scraping results
    const successfulResults = scrapedResults.filter((r) => r.success);

    if (successfulResults.length === 0) {
      throw new Error('No successful scraping results to normalize');
    }

    // Build context for AI
    const context = this.buildContextFromResults(companyName, successfulResults);

    // Extract structured data using AI
    const normalized = await this.extractWithAI(context);

    // Calculate confidence score
    const confidenceScore = this.calculateConfidenceScore(
      successfulResults,
      normalized
    );

    return {
      ...normalized,
      name: companyName,
      confidence_score: confidenceScore,
      data_sources: successfulResults.map(
        (r) => r.metadata?.provider || 'website'
      ) as any[],
      last_updated: new Date().toISOString(),
    };
  }

  /**
   * Build context from scraping results
   */
  private buildContextFromResults(
    companyName: string,
    results: ScrapingResult[]
  ): string {
    let context = `Company: ${companyName}\n\n`;

    for (const result of results) {
      context += `Source: ${result.source_url}\n`;
      context += `Confidence: ${result.confidence}\n`;

      if (result.data) {
        if (typeof result.data === 'string') {
          context += `Content: ${result.data}\n`;
        } else if (result.data.text) {
          context += `Content: ${result.data.text}\n`;
        }

        if (result.data.structured) {
          context += `Structured Data: ${JSON.stringify(result.data.structured, null, 2)}\n`;
        }

        if (result.data.contact) {
          context += `Contact Info: ${JSON.stringify(result.data.contact, null, 2)}\n`;
        }
      }

      context += '\n---\n\n';
    }

    return context;
  }

  /**
   * Extract structured data using AI
   */
  private async extractWithAI(context: string): Promise<Partial<NormalizedCompanyData>> {
    const prompt = `You are an expert at extracting structured company information from web content.

Analyze the following scraped data and extract structured company information:

${context.substring(0, 15000)}

Extract and return ONLY valid JSON with the following structure (omit fields if not found):

{
  "legal_name": "Full legal company name",
  "website": "https://company.com",
  "description": "Brief description of what the company does (1-2 sentences)",
  "industry": "Primary industry",
  "headquarters": {
    "address": "Full address if found",
    "city": "City name",
    "country": "Country",
    "postcode": "Postcode"
  },
  "employee_count_range": "1-10 | 11-50 | 51-200 | 201-500 | 501-1000 | 1000+",
  "technologies": ["Technology 1", "Technology 2"],
  "key_people": [
    {
      "name": "Person Name",
      "title": "Job Title",
      "linkedin_url": "LinkedIn URL if found"
    }
  ],
  "email": "contact email",
  "phone": "contact phone",
  "linkedin_url": "Company LinkedIn URL",
  "twitter_url": "Company Twitter/X URL"
}

IMPORTANT:
- Return ONLY valid JSON, no markdown formatting
- Only include fields where you have confident information
- Use null for missing required fields
- Be conservative - if unsure, omit the field
- Extract technologies mentioned (e.g., "React", "AWS", "Python")
- Normalize country names to ISO codes when possible (e.g., "United Kingdom" -> "GB")`;

    try {
      const llmManager = await this.ensureLLMManager();
      const response = await llmManager.chat(
        [{ role: 'user', content: prompt }],
        {
          model: 'anthropic/claude-3.5-sonnet',
          maxTokens: 2000,
          temperature: 0.1, // Low temperature for consistency
        }
      );

      // Parse AI response
      const content = response.content.trim();

      // Remove markdown code blocks if present
      const jsonMatch =
        content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) ||
        content.match(/(\{[\s\S]*\})/);

      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      const extracted = JSON.parse(jsonStr);

      return extracted;
    } catch (error) {
      console.error('[AIDataNormalizer] Extraction failed:', error);
      return {};
    }
  }

  /**
   * Calculate overall confidence score
   */
  private calculateConfidenceScore(
    results: ScrapingResult[],
    normalized: Partial<NormalizedCompanyData>
  ): number {
    let score = 0;

    // Base score from source confidence levels
    const avgSourceConfidence =
      results.reduce((sum, r) => {
        const confidenceValue = r.confidence === 'high' ? 100 : r.confidence === 'medium' ? 60 : 30;
        return sum + confidenceValue;
      }, 0) / results.length;

    score += avgSourceConfidence * 0.4; // 40% weight

    // Bonus for number of data sources
    const sourceBonus = Math.min(results.length * 10, 30);
    score += sourceBonus * 0.2; // 20% weight

    // Bonus for completeness of extracted data
    const fields = [
      'legal_name',
      'website',
      'description',
      'industry',
      'headquarters',
      'employee_count_range',
      'email',
      'phone',
    ];

    const completenessScore =
      (fields.filter((f) => normalized[f as keyof NormalizedCompanyData]).length /
        fields.length) *
      100;

    score += completenessScore * 0.4; // 40% weight

    return Math.min(Math.round(score), 100);
  }
}
